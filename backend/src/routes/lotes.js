const express = require("express");
const pool = require("../db");
const {
  vazio,
  lerId,
  lerData,
  lerQuantidade,
  comTransacao,
} = require("../utils/helpers");

const router = express.Router();

// Um lote "vence em breve" se a validade cai dentro desta janela (em dias).
const DIAS_ALERTA_PADRAO = 30;
const STATUS = ["vencido", "vencendo", "ok", "sem_validade"];

// Consulta base. O $1 é sempre a janela de alerta (dias).
// status: vencido (vermelho), vencendo (amarelo), ok (verde), sem_validade.
const SELECT_LOTES = `
  SELECT l.id, l.item_id, i.nome AS item, i.unidade, c.nome AS categoria,
         l.doador_id, d.nome AS doador,
         l.quantidade_inicial::float8 AS quantidade_inicial,
         l.quantidade_atual::float8   AS quantidade_atual,
         to_char(l.data_validade, 'YYYY-MM-DD') AS data_validade,
         to_char(l.data_entrada, 'YYYY-MM-DD')  AS data_entrada,
         l.observacao,
         (l.data_validade - CURRENT_DATE) AS dias_para_vencer,
         CASE
           WHEN l.data_validade IS NULL THEN 'sem_validade'
           WHEN l.data_validade < CURRENT_DATE THEN 'vencido'
           WHEN l.data_validade <= CURRENT_DATE + $1::int THEN 'vencendo'
           ELSE 'ok'
         END AS status
    FROM lotes l
    JOIN itens i ON i.id = l.item_id
    LEFT JOIN categorias c ON c.id = i.categoria_id
    LEFT JOIN doadores d ON d.id = l.doador_id
`;

// Janela de alerta enviada em ?dias=. Devolve null se for inválida.
function lerDias(valor) {
  if (valor === undefined) return DIAS_ALERTA_PADRAO;
  const dias = Number(valor);
  return Number.isInteger(dias) && dias >= 0 && dias <= 3650 ? dias : null;
}

async function buscarLote(id) {
  const { rows } = await pool.query(`${SELECT_LOTES} WHERE l.id = $2`, [
    DIAS_ALERTA_PADRAO,
    id,
  ]);
  return rows[0] || null;
}

// GET /api/lotes -> lista lotes com estoque (ordenados pela validade mais próxima)
// Filtros: item_id, doador_id, categoria_id, busca, status, dias, incluir_zerados=true
router.get("/", async (req, res) => {
  const dias = lerDias(req.query.dias);
  if (dias === null) {
    return res
      .status(400)
      .json({ erro: "dias deve ser um inteiro entre 0 e 3650." });
  }

  const params = [dias];
  const condicoes = [];

  if (req.query.incluir_zerados !== "true") {
    condicoes.push("l.quantidade_atual > 0");
  }

  const filtros = [
    ["item_id", "l.item_id"],
    ["doador_id", "l.doador_id"],
    ["categoria_id", "i.categoria_id"],
  ];
  for (const [campo, coluna] of filtros) {
    if (req.query[campo] !== undefined) {
      const id = lerId(req.query[campo]);
      if (!id) return res.status(400).json({ erro: `${campo} inválido.` });
      params.push(id);
      condicoes.push(`${coluna} = $${params.length}`);
    }
  }

  const busca = String(req.query.busca ?? "").trim();
  if (busca) {
    params.push(`%${busca}%`);
    condicoes.push(`i.nome ILIKE $${params.length}`);
  }

  let filtroStatus = "";
  if (req.query.status !== undefined) {
    if (!STATUS.includes(req.query.status)) {
      return res
        .status(400)
        .json({ erro: `status deve ser um destes: ${STATUS.join(", ")}.` });
    }
    params.push(req.query.status);
    filtroStatus = `WHERE t.status = $${params.length}`;
  }

  const where = condicoes.length ? condicoes.join(" AND ") : "TRUE";

  try {
    const { rows } = await pool.query(
      `SELECT * FROM (${SELECT_LOTES} WHERE ${where}) t ${filtroStatus}
        ORDER BY t.data_validade ASC NULLS LAST, t.id`,
      params
    );
    res.json(rows);
  } catch (erro) {
    console.error("Erro ao listar lotes:", erro.message);
    res.status(500).json({ erro: "Erro ao listar lotes." });
  }
});

// GET /api/lotes/resumo?dias=30 -> contagem por status (para os cards do painel)
router.get("/resumo", async (req, res) => {
  const dias = lerDias(req.query.dias);
  if (dias === null) {
    return res
      .status(400)
      .json({ erro: "dias deve ser um inteiro entre 0 e 3650." });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE data_validade < CURRENT_DATE)::int AS vencidos,
         COUNT(*) FILTER (WHERE data_validade >= CURRENT_DATE
                            AND data_validade <= CURRENT_DATE + $1::int)::int AS vencendo,
         COUNT(*) FILTER (WHERE data_validade > CURRENT_DATE + $1::int)::int AS ok,
         COUNT(*) FILTER (WHERE data_validade IS NULL)::int AS sem_validade,
         COUNT(*)::int AS total_lotes
       FROM lotes
       WHERE quantidade_atual > 0`,
      [dias]
    );
    res.json({ dias_alerta: dias, ...rows[0] });
  } catch (erro) {
    console.error("Erro ao gerar resumo de lotes:", erro.message);
    res.status(500).json({ erro: "Erro ao gerar resumo de lotes." });
  }
});

// GET /api/lotes/:id -> um lote com o histórico de movimentações
router.get("/:id", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  try {
    const lote = await buscarLote(id);
    if (!lote) return res.status(404).json({ erro: "Lote não encontrado." });

    const movimentacoes = await pool.query(
      `SELECT m.id, m.tipo, m.quantidade::float8 AS quantidade,
              m.destino, m.observacao, m.criado_em, u.nome AS usuario
         FROM movimentacoes m
         LEFT JOIN usuarios u ON u.id = m.usuario_id
        WHERE m.lote_id = $1
        ORDER BY m.criado_em DESC, m.id DESC`,
      [id]
    );
    res.json({ ...lote, movimentacoes: movimentacoes.rows });
  } catch (erro) {
    console.error("Erro ao buscar lote:", erro.message);
    res.status(500).json({ erro: "Erro ao buscar lote." });
  }
});

// POST /api/lotes -> registra uma doação (cria o lote + a movimentação de entrada)
router.post("/", async (req, res) => {
  const body = req.body;

  const itemId = lerId(body?.item_id);
  if (!itemId) return res.status(400).json({ erro: "item_id é obrigatório." });

  const quantidade = lerQuantidade(body?.quantidade);
  if (quantidade === null) {
    return res.status(400).json({
      erro: "quantidade deve ser maior que zero (até 2 casas decimais).",
    });
  }

  let doadorId = null;
  if (!vazio(body?.doador_id)) {
    doadorId = lerId(body.doador_id);
    if (!doadorId) return res.status(400).json({ erro: "doador_id inválido." });
  }

  let dataValidade = null;
  if (!vazio(body?.data_validade)) {
    dataValidade = lerData(body.data_validade);
    if (!dataValidade) {
      return res
        .status(400)
        .json({ erro: "data_validade deve estar no formato AAAA-MM-DD." });
    }
  }

  let dataEntrada = null; // se não vier, o banco usa a data de hoje
  if (!vazio(body?.data_entrada)) {
    dataEntrada = lerData(body.data_entrada);
    if (!dataEntrada) {
      return res
        .status(400)
        .json({ erro: "data_entrada deve estar no formato AAAA-MM-DD." });
    }
  }

  const observacao = String(body?.observacao ?? "").trim() || null;

  try {
    const itemConsulta = await pool.query(
      "SELECT controla_validade FROM itens WHERE id = $1 AND ativo = TRUE",
      [itemId]
    );
    const item = itemConsulta.rows[0];
    if (!item) {
      return res
        .status(404)
        .json({ erro: "Item não encontrado ou desativado." });
    }
    if (item.controla_validade && !dataValidade) {
      return res.status(400).json({
        erro: "Este item controla validade: informe data_validade (AAAA-MM-DD).",
      });
    }
    // Item sem controle de validade (roupa, brinquedo...) nunca guarda data.
    if (!item.controla_validade) dataValidade = null;

    const loteId = await comTransacao(async (cliente) => {
      const lote = await cliente.query(
        `INSERT INTO lotes
           (item_id, doador_id, quantidade_inicial, quantidade_atual,
            data_validade, data_entrada, observacao)
         VALUES ($1, $2, $3, $3, $4, COALESCE($5::date, CURRENT_DATE), $6)
         RETURNING id`,
        [itemId, doadorId, quantidade, dataValidade, dataEntrada, observacao]
      );
      const id = lote.rows[0].id;

      await cliente.query(
        `INSERT INTO movimentacoes (lote_id, usuario_id, tipo, quantidade, observacao)
         VALUES ($1, $2, 'entrada', $3, 'Entrada inicial do lote')`,
        [id, req.usuario.id, quantidade]
      );
      return id;
    });

    res.status(201).json(await buscarLote(loteId));
  } catch (erro) {
    // 23503 = FOREIGN KEY (doador não existe)
    if (erro.code === "23503") {
      return res.status(400).json({ erro: "Doador não encontrado." });
    }
    console.error("Erro ao criar lote:", erro.message);
    res.status(500).json({ erro: "Erro ao criar lote." });
  }
});

// PUT /api/lotes/:id -> corrige doador, validade e observação do lote.
// Quantidades NÃO mudam aqui: use /api/movimentacoes.
router.put("/:id", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const body = req.body;

  let doadorId = null;
  if (!vazio(body?.doador_id)) {
    doadorId = lerId(body.doador_id);
    if (!doadorId) return res.status(400).json({ erro: "doador_id inválido." });
  }

  let dataValidade = null;
  if (!vazio(body?.data_validade)) {
    dataValidade = lerData(body.data_validade);
    if (!dataValidade) {
      return res
        .status(400)
        .json({ erro: "data_validade deve estar no formato AAAA-MM-DD." });
    }
  }

  const observacao = String(body?.observacao ?? "").trim() || null;

  try {
    const consulta = await pool.query(
      `SELECT i.controla_validade
         FROM lotes l JOIN itens i ON i.id = l.item_id
        WHERE l.id = $1`,
      [id]
    );
    if (!consulta.rows[0]) {
      return res.status(404).json({ erro: "Lote não encontrado." });
    }
    if (consulta.rows[0].controla_validade && !dataValidade) {
      return res.status(400).json({
        erro: "Este item controla validade: informe data_validade (AAAA-MM-DD).",
      });
    }
    if (!consulta.rows[0].controla_validade) dataValidade = null;

    await pool.query(
      `UPDATE lotes SET doador_id = $1, data_validade = $2, observacao = $3
        WHERE id = $4`,
      [doadorId, dataValidade, observacao, id]
    );
    res.json(await buscarLote(id));
  } catch (erro) {
    if (erro.code === "23503") {
      return res.status(400).json({ erro: "Doador não encontrado." });
    }
    console.error("Erro ao editar lote:", erro.message);
    res.status(500).json({ erro: "Erro ao editar lote." });
  }
});

module.exports = router;