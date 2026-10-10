const express = require("express");
const pool = require("../db");
const { lerId } = require("../utils/helpers");

const router = express.Router();

const TIPOS = ["pessoa_fisica", "empresa", "campanha"];

// Valida e normaliza o corpo enviado no POST e no PUT.
function validarCorpo(body) {
  const nome = String(body?.nome ?? "").trim();
  if (!nome) return { erro: "O nome do doador é obrigatório." };
  if (nome.length > 160) {
    return { erro: "O nome pode ter no máximo 160 caracteres." };
  }

  const tipo = body?.tipo === undefined ? "pessoa_fisica" : body.tipo;
  if (!TIPOS.includes(tipo)) {
    return { erro: `tipo deve ser um destes: ${TIPOS.join(", ")}.` };
  }

  const contato = String(body?.contato ?? "").trim() || null;
  if (contato && contato.length > 160) {
    return { erro: "O contato pode ter no máximo 160 caracteres." };
  }

  return { dados: { nome, tipo, contato } };
}

// GET /api/doadores?busca=mercado&tipo=empresa -> lista doadores
router.get("/", async (req, res) => {
  const condicoes = [];
  const params = [];

  const busca = String(req.query.busca ?? "").trim();
  if (busca) {
    params.push(`%${busca}%`);
    condicoes.push(`nome ILIKE $${params.length}`);
  }

  if (req.query.tipo !== undefined) {
    if (!TIPOS.includes(req.query.tipo)) {
      return res
        .status(400)
        .json({ erro: `tipo deve ser um destes: ${TIPOS.join(", ")}.` });
    }
    params.push(req.query.tipo);
    condicoes.push(`tipo = $${params.length}`);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";

  try {
    const { rows } = await pool.query(
      `SELECT id, nome, tipo, contato FROM doadores ${where} ORDER BY nome`,
      params
    );
    res.json(rows);
  } catch (erro) {
    console.error("Erro ao listar doadores:", erro.message);
    res.status(500).json({ erro: "Erro ao listar doadores." });
  }
});

// GET /api/doadores/:id -> um doador
router.get("/:id", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  try {
    const { rows } = await pool.query(
      "SELECT id, nome, tipo, contato FROM doadores WHERE id = $1",
      [id]
    );
    if (!rows[0]) return res.status(404).json({ erro: "Doador não encontrado." });
    res.json(rows[0]);
  } catch (erro) {
    console.error("Erro ao buscar doador:", erro.message);
    res.status(500).json({ erro: "Erro ao buscar doador." });
  }
});

// POST /api/doadores -> cria um doador
router.post("/", async (req, res) => {
  const { erro, dados } = validarCorpo(req.body);
  if (erro) return res.status(400).json({ erro });

  try {
    const { rows } = await pool.query(
      `INSERT INTO doadores (nome, tipo, contato)
       VALUES ($1, $2, $3) RETURNING id, nome, tipo, contato`,
      [dados.nome, dados.tipo, dados.contato]
    );
    res.status(201).json(rows[0]);
  } catch (erroBanco) {
    console.error("Erro ao criar doador:", erroBanco.message);
    res.status(500).json({ erro: "Erro ao criar doador." });
  }
});

// PUT /api/doadores/:id -> edita um doador (envie todos os campos)
router.put("/:id", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const { erro, dados } = validarCorpo(req.body);
  if (erro) return res.status(400).json({ erro });

  try {
    const { rows } = await pool.query(
      `UPDATE doadores SET nome = $1, tipo = $2, contato = $3
        WHERE id = $4 RETURNING id, nome, tipo, contato`,
      [dados.nome, dados.tipo, dados.contato, id]
    );
    if (!rows[0]) return res.status(404).json({ erro: "Doador não encontrado." });
    res.json(rows[0]);
  } catch (erroBanco) {
    console.error("Erro ao editar doador:", erroBanco.message);
    res.status(500).json({ erro: "Erro ao editar doador." });
  }
});

// DELETE /api/doadores/:id -> apaga, só se não tiver lotes vinculados
router.delete("/:id", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  try {
    const lotes = await pool.query(
      "SELECT COUNT(*)::int AS total FROM lotes WHERE doador_id = $1",
      [id]
    );
    if (lotes.rows[0].total > 0) {
      return res.status(409).json({
        erro: "Este doador tem lotes vinculados e não pode ser apagado.",
      });
    }

    const resultado = await pool.query("DELETE FROM doadores WHERE id = $1", [id]);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: "Doador não encontrado." });
    }
    res.json({ mensagem: "Doador apagado." });
  } catch (erro) {
    console.error("Erro ao apagar doador:", erro.message);
    res.status(500).json({ erro: "Erro ao apagar doador." });
  }
});

module.exports = router;