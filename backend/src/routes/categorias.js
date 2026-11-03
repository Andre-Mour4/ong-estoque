const express = require("express");
const pool = require("../db");

const { exigirPermissao } = require("../middleware/auth");

const router = express.Router();

// GET /api/categorias -> lista todas as categorias em ordem alfabética
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nome FROM categorias ORDER BY nome"
    );
    res.json(rows);
  } catch (erro) {
    console.error("Erro ao listar categorias:", erro.message);
    res.status(500).json({ erro: "Erro ao listar categorias." });
  }
});

// POST /api/categorias  { "nome": "Medicamentos" } -> cria uma categoria
router.post("/", exigirPermissao("gerenciar_itens"), async (req, res) => {
  const nome = String(req.body?.nome ?? "").trim();

  if (!nome) {
    return res.status(400).json({ erro: "O nome da categoria é obrigatório." });
  }

  try {
    const { rows } = await pool.query(
      "INSERT INTO categorias (nome) VALUES ($1) RETURNING id, nome",
      [nome]
    );
    res.status(201).json(rows[0]);
  } catch (erro) {
    // 23505 = violação de UNIQUE (já existe categoria com esse nome)
    if (erro.code === "23505") {
      return res
        .status(409)
        .json({ erro: "Já existe uma categoria com esse nome." });
    }
    console.error("Erro ao criar categoria:", erro.message);
    res.status(500).json({ erro: "Erro ao criar categoria." });
  }
});

module.exports = router;