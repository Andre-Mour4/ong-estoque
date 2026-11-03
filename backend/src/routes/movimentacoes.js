const express = require("express");
const pool = require("../db");
const {
  lerId,
  lerData,
  lerQuantidade,
  comTransacao,
} = require("../utils/helpers");

const { exigirPermissao } = require("../middleware/auth");

const router = express.Router();

const TIPOS = ["entrada", "saida"];

// POST /api/movimentacoes -> registra uma saída (ou estorno) em um lote
// Corpo: { lote_id, tipo: "saida" | "entrada", quantidade, destino?, observacao? }
//
// Doação nova NÃO é feita aqui: ela vira um lote novo (POST /api/lotes).
// "entrada" aqui serve para estornar uma saída lançada errado e nunca
// ultrapassa a quantidade inicial do lote.
router.post("/", exigirPermissao("dar_saida"), async (req, res) => {
  const body = req.body;

  const loteId = lerId(body?.lote_id);
  if (!loteId) return res.status(400).json({ erro: "lote_id é obrigatório." });

  const tipo = body?.tipo;
  if (!TIPOS.includes(tipo)) {
    return res.status(400).json({ erro: "tipo deve ser 'entrada' ou 'saida'." });
  }

  const quantidade = lerQuantidade(body?.quantidade);
  if (quantidade === null) {
    return res.status(400).json({
      erro: "quantidade deve ser maior que zero (até 2 casas decimais).",
    });
  }

  const destino = String(body?.destino ?? "").trim() || null;
  if (destino && destino.length > 160) {
    return res
      .status(400)
      .json({ erro: "destino pode ter no máximo 160 caracteres." });
  }
  const observacao = String(body?.observacao ?? "").trim() || null;

  try {
    const resultado = await comTransacao(async (cliente) => {
      // O próprio UPDATE confere o estoque, então duas saídas ao mesmo tempo
      // nunca deixam o lote negativo.
      const atualizacao =
        tipo === "saida"
          ? await cliente.query(
              `UPDATE lotes SET quantidade_atual = quantidade_atual - $1
                WHERE id = $2 AND quantidade_atual >= $1`,
              [quantidade, loteId]
            )
          : await cliente.query(
              `UPDATE lotes SET quantidade_atual = quantidade_atual + $1
                WHERE id = $2 AND quantidade_atual + $1 <= quantidade_inicial`,
              [quantidade, loteId]
            );

      if (atualizacao.rowCount === 0) {
        const lote = await cliente.query(
          `SELECT quantidade_atual::float8 AS quantidade_atual
             FROM lotes WHERE id = $1`,
          [loteId]
        );
        if (!lote.rows[0]) return { status: 404, erro: "Lote não encontrado." };
        if (tipo === "saida") {
          return {
            status: 400,
            erro: `Quantidade maior que o estoque do lote (disponível: ${lote.rows[0].quantidade_atual}).`,
          };
        }
        return {
          status: 400,
          erro: "A entrada ultrapassa a quantidade inicial do lote. Para uma nova doação, cadastre um novo lote.",
        };
      }

      const movimentacao = await cliente.query(
        `INSERT INTO movimentacoes
           (lote_id, usuario_id, tipo, quantidade, destino, observacao)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [loteId, req.usuario.id, tipo, quantidade, destino, observacao]
      );
      const lote = await cliente.query(
        `SELECT quantidade_atual::float8 AS quantidade_atual
           FROM lotes WHERE id = $1`,
        [loteId]
      );
      return {
        id: movimentacao.rows[0].id,
        quantidade_atual: lote.rows[0].quantidade_atual,
      };
    });

    if (resultado.erro) {
      return res.status(resultado.status).json({ erro: resultado.erro });
    }

    res.status(201).json({
      id: resultado.id,
      lote_id: loteId,
      tipo,
      quantidade,
      destino,
      observacao,
      quantidade_atual_do_lote: resultado.quantidade_atual,
    });
  } catch (erro) {
    console.error("Erro ao registrar movimentação:", erro.message);
    res.status(500).json({ erro: "Erro ao registrar movimentação." });
  }
});

// GET /api/movimentacoes -> histórico (mais recentes primeiro)
// Filtros: lote_id, item_id, tipo, data_inicio, data_fim (AAAA-MM-DD), limite (padrão 100, máx. 500)
router.get("/", exigirPermissao("ver_historico"), async (req, res) => {
  const condicoes = [];
  const params = [];

  for (const [campo, coluna] of [
    ["lote_id", "m.lote_id"],
    ["item_id", "l.item_id"],
  ]) {
    if (req.query[campo] !== undefined) {
      const id = lerId(req.query[campo]);
      if (!id) return res.status(400).json({ erro: `${campo} inválido.` });
      params.push(id);
      condicoes.push(`${coluna} = $${params.length}`);
    }
  }

  if (req.query.tipo !== undefined) {
    if (!TIPOS.includes(req.query.tipo)) {
      return res
        .status(400)
        .json({ erro: "tipo deve ser 'entrada' ou 'saida'." });
    }
    params.push(req.query.tipo);
    condicoes.push(`m.tipo = $${params.length}`);
  }

  for (const [campo, operador] of [
    ["data_inicio", ">="],
    ["data_fim", "<="],
  ]) {
    if (req.query[campo] !== undefined) {
      const data = lerData(req.query[campo]);
      if (!data) {
        return res
          .status(400)
          .json({ erro: `${campo} deve estar no formato AAAA-MM-DD.` });
      }
      params.push(data);
      condicoes.push(`m.criado_em::date ${operador} $${params.length}::date`);
    }
  }

  let limite = 100;
  if (req.query.limite !== undefined) {
    limite = Number(req.query.limite);
    if (!Number.isInteger(limite) || limite < 1 || limite > 500) {
      return res
        .status(400)
        .json({ erro: "limite deve ser um inteiro entre 1 e 500." });
    }
  }
  params.push(limite);

  const where = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";

  try {
    const { rows } = await pool.query(
      `SELECT m.id, m.lote_id, l.item_id, i.nome AS item, i.unidade, m.tipo,
              m.quantidade::float8 AS quantidade, m.destino, m.observacao,
              m.criado_em, u.nome AS usuario
         FROM movimentacoes m
         JOIN lotes l ON l.id = m.lote_id
         JOIN itens i ON i.id = l.item_id
         LEFT JOIN usuarios u ON u.id = m.usuario_id
         ${where}
        ORDER BY m.criado_em DESC, m.id DESC
        LIMIT $${params.length}`,
      params
    );
    res.json(rows);
  } catch (erro) {
    console.error("Erro ao listar movimentações:", erro.message);
    res.status(500).json({ erro: "Erro ao listar movimentações." });
  }
});

module.exports = router;