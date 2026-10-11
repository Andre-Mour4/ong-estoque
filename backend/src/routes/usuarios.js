const express = require("express");
const pool = require("../db");
const { vazio, lerId } = require("../utils/helpers");
const { validarSenha, gerarHash } = require("../utils/senha");

// Estas rotas são montadas no server.js com "autenticar" + "apenasAdmin".
const router = express.Router();

const PERFIS = ["admin", "voluntario"];
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// A senha (hash) nunca é devolvida pela API.
const COLUNAS = "id, nome, email, perfil, ativo, criado_em";

function validarNome(body) {
  const nome = String(body?.nome ?? "").trim();
  if (!nome) return { erro: "O nome é obrigatório." };
  if (nome.length > 120) {
    return { erro: "O nome pode ter no máximo 120 caracteres." };
  }
  return { nome };
}

function validarPerfil(valor, padrao) {
  const perfil = valor === undefined ? padrao : valor;
  if (!PERFIS.includes(perfil)) {
    return { erro: `perfil deve ser um destes: ${PERFIS.join(", ")}.` };
  }
  return { perfil };
}

// GET /api/usuarios -> lista usuários
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${COLUNAS} FROM usuarios ORDER BY nome`
    );
    res.json(rows);
  } catch (erro) {
    console.error("Erro ao listar usuários:", erro.message);
    res.status(500).json({ erro: "Erro ao listar usuários." });
  }
});

// POST /api/usuarios -> cria usuário { nome, email, senha, perfil? }
router.post("/", async (req, res) => {
  const body = req.body;

  const { erro: erroNome, nome } = validarNome(body);
  if (erroNome) return res.status(400).json({ erro: erroNome });

  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!EMAIL_VALIDO.test(email) || email.length > 160) {
    return res.status(400).json({ erro: "E-mail inválido." });
  }

  const { erro: erroPerfil, perfil } = validarPerfil(body?.perfil, "voluntario");
  if (erroPerfil) return res.status(400).json({ erro: erroPerfil });

  const erroSenha = validarSenha(body?.senha);
  if (erroSenha) return res.status(400).json({ erro: erroSenha });

  try {
    const hash = await gerarHash(body.senha);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, perfil)
       VALUES ($1, $2, $3, $4) RETURNING ${COLUNAS}`,
      [nome, email, hash, perfil]
    );
    res.status(201).json(rows[0]);
  } catch (erro) {
    if (erro.code === "23505") {
      return res.status(409).json({ erro: "Já existe um usuário com esse e-mail." });
    }
    console.error("Erro ao criar usuário:", erro.message);
    res.status(500).json({ erro: "Erro ao criar usuário." });
  }
});

// PUT /api/usuarios/:id -> edita { nome, perfil, ativo, senha? }
// Para desligar alguém, envie "ativo": false (usuários não são apagados).
router.put("/:id", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const body = req.body;

  const { erro: erroNome, nome } = validarNome(body);
  if (erroNome) return res.status(400).json({ erro: erroNome });

  const { erro: erroPerfil, perfil } = validarPerfil(body?.perfil, "voluntario");
  if (erroPerfil) return res.status(400).json({ erro: erroPerfil });

  const ativo = body?.ativo === undefined ? true : body.ativo;
  if (typeof ativo !== "boolean") {
    return res.status(400).json({ erro: "ativo deve ser true ou false." });
  }

  // Evita o admin se trancar para fora do sistema.
  if (id === req.usuario.id && (!ativo || perfil !== "admin")) {
    return res
      .status(400)
      .json({ erro: "Você não pode desativar nem rebaixar o seu próprio usuário." });
  }

  let novoHash = null;
  if (!vazio(body?.senha)) {
    const erroSenha = validarSenha(body.senha);
    if (erroSenha) return res.status(400).json({ erro: erroSenha });
    novoHash = await gerarHash(body.senha);
  }

  try {
    const { rows } = await pool.query(
      `UPDATE usuarios
          SET nome = $1, perfil = $2, ativo = $3,
              senha_hash = COALESCE($4, senha_hash)
        WHERE id = $5
        RETURNING ${COLUNAS}`,
      [nome, perfil, ativo, novoHash, id]
    );
    if (!rows[0]) return res.status(404).json({ erro: "Usuário não encontrado." });
    res.json(rows[0]);
  } catch (erro) {
    console.error("Erro ao editar usuário:", erro.message);
    res.status(500).json({ erro: "Erro ao editar usuário." });
  }
});

module.exports = router;