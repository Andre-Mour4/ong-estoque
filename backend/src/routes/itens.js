const express = require("express");
const pool = require("../db");

const router = express.Router();

// Consulta base: item + nome da categoria + estoque total (soma dos lotes).
const SELECT_ITEM = `
  SELECT i.id, i.nome, i.unidade, i.controla_validade, i.ativo,
         i.categoria_id, c.nome AS categoria,
         COALESCE(SUM(l.quantidade_atual), 0)::float8 AS estoque_total
    FROM itens i
    LEFT JOIN categorias c ON c.id = i.categoria_id
    LEFT JOIN lotes l ON l.item_id = i.id
`;
const GROUP_ITEM = "GROUP BY i.id, c.nome";

// Converte um valor em id inteiro positivo; devolve null se for inválido.
function lerId(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Valida e normaliza o corpo enviado no POST e no PUT.
function validarCorpo(body) {
  const nome = String(body?.nome ?? "").trim();
  if (!nome) return { erro: "O nome do item é obrigatório." };
  if (nome.length > 120) {
    return { erro: "O nome pode ter no máximo 120 caracteres." };
  }

  const unidade = String(body?.unidade ?? "").trim() || "un";
  if (unidade.length > 20) {
    return { erro: "A unidade pode ter no máximo 20 caracteres." };
  }

  let controlaValidade = true;
  if (body?.controla_validade !== undefined) {
    if (typeof body.controla_validade !== "boolean") {
      return { erro: "controla_validade deve ser true ou false." };
    }
    controlaValidade = body.controla_validade;
  }

  let categoriaId = null;
  const bruto = body?.categoria_id;
  if (bruto !== undefined && bruto !== null && bruto !== "") {
    categoriaId = lerId(bruto);
    if (!categoriaId) return { erro: "categoria_id inválido." };
  }

  return { dados: { nome, unidade, controlaValidade, categoriaId } };
}

// Traduz erros conhecidos do PostgreSQL em respostas amigáveis.
function responderErroBanco(erro, res, acao) {
  // 23505 = UNIQUE (nome + categoria já existem)
  if (erro.code === "23505") {
    return res
      .status(409)
      .json({ erro: "Já existe um item com esse nome nessa categoria." });
  }
  // 23503 = FOREIGN KEY (categoria não existe)
  if (erro.code === "23503") {
    return res.status(400).json({ erro: "Categoria não encontrada." });
  }
  console.error(`Erro ao ${acao} item:`, erro.message);
  return res.status(500).json({ erro: `Erro ao ${acao} item.` });
}

async function buscarItem(id) {
  const { rows } = await pool.query(
    `${SELECT_ITEM} WHERE i.id = $1 ${GROUP_ITEM}`,
    [id]
  );
  return rows[0] || null;
}

// GET /api/itens?busca=arroz&categoria_id=1 -> lista itens ativos
router.get("/", async (req, res) => {
  const condicoes = ["i.ativo = TRUE"];
  const params = [];

  const busca = String(req.query.busca ?? "").trim();
  if (busca) {
    params.push(`%${busca}%`);
    condicoes.push(`i.nome ILIKE $${params.length}`);
  }

  if (req.query.categoria_id !== undefined) {
    const categoriaId = lerId(req.query.categoria_id);
    if (!categoriaId) {
      return res.status(400).json({ erro: "categoria_id inválido." });
    }
    params.push(categoriaId);
    condicoes.push(`i.categoria_id = $${params.length}`);
  }

  try {
    const { rows } = await pool.query(
      `${SELECT_ITEM} WHERE ${condicoes.join(" AND ")} ${GROUP_ITEM} ORDER BY i.nome`,
      params
    );
    res.json(rows);
  } catch (erro) {
    console.error("Erro ao listar itens:", erro.message);
    res.status(500).json({ erro: "Erro ao listar itens." });
  }
});

// GET /api/itens/:id -> um item
router.get("/:id", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  try {
    const item = await buscarItem(id);
    if (!item) return res.status(404).json({ erro: "Item não encontrado." });
    res.json(item);
  } catch (erro) {
    console.error("Erro ao buscar item:", erro.message);
    res.status(500).json({ erro: "Erro ao buscar item." });
  }
});

// POST /api/itens -> cria um item
router.post("/", async (req, res) => {
  const { erro, dados } = validarCorpo(req.body);
  if (erro) return res.status(400).json({ erro });

  try {
    const { rows } = await pool.query(
      `INSERT INTO itens (nome, categoria_id, unidade, controla_validade)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [dados.nome, dados.categoriaId, dados.unidade, dados.controlaValidade]
    );
    const item = await buscarItem(rows[0].id);
    res.status(201).json(item);
  } catch (erroBanco) {
    responderErroBanco(erroBanco, res, "criar");
  }
});

// PUT /api/itens/:id -> edita um item (envie todos os campos)
router.put("/:id", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const { erro, dados } = validarCorpo(req.body);
  if (erro) return res.status(400).json({ erro });

  try {
    const resultado = await pool.query(
      `UPDATE itens
          SET nome = $1, categoria_id = $2, unidade = $3, controla_validade = $4
        WHERE id = $5`,
      [dados.nome, dados.categoriaId, dados.unidade, dados.controlaValidade, id]
    );
    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: "Item não encontrado." });
    }
    const item = await buscarItem(id);
    res.json(item);
  } catch (erroBanco) {
    responderErroBanco(erroBanco, res, "editar");
  }
});

// DELETE /api/itens/:id -> desativa o item (não apaga, preserva o histórico)
router.delete("/:id", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  try {
    const resultado = await pool.query(
      "UPDATE itens SET ativo = FALSE WHERE id = $1",
      [id]
    );
    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: "Item não encontrado." });
    }
    res.json({ mensagem: "Item desativado." });
  } catch (erro) {
    console.error("Erro ao desativar item:", erro.message);
    res.status(500).json({ erro: "Erro ao desativar item." });
  }
});

module.exports = router;