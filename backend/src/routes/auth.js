const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { autenticar } = require("../middleware/auth");
const { validarSenha, gerarHash } = require("../utils/senha");

const router = express.Router();

// Usado quando o e-mail não existe, para o tempo de resposta ser parecido
// e ninguém descobrir quais e-mails estão cadastrados.
const HASH_FALSO = bcrypt.hashSync("senha-falsa-para-igualar-o-tempo", 10);

// POST /api/auth/login  { "email": "...", "senha": "..." } -> { token, usuario }
router.post("/login", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const senha = String(req.body?.senha ?? "");

  if (!email || !senha) {
    return res.status(400).json({ erro: "Informe e-mail e senha." });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, nome, email, perfil, ativo, senha_hash, permissoes, deve_trocar_senha
         FROM usuarios WHERE email = $1`,
      [email]
    );
    const usuario = rows[0];

    const senhaCorreta = await bcrypt.compare(
      senha,
      usuario ? usuario.senha_hash : HASH_FALSO
    );

    if (!usuario || !usuario.ativo || !senhaCorreta) {
      return res.status(401).json({ erro: "E-mail ou senha incorretos." });
    }

    const token = jwt.sign({ perfil: usuario.perfil }, process.env.JWT_SECRET, {
      subject: String(usuario.id),
      expiresIn: process.env.JWT_EXPIRA || "8h",
      algorithm: "HS256",
    });

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        permissoes: usuario.permissoes,
        deve_trocar_senha: usuario.deve_trocar_senha,
      },
    });
  } catch (erro) {
    console.error("Erro no login:", erro.message);
    res.status(500).json({ erro: "Erro ao fazer login." });
  }
});

// GET /api/auth/me -> dados de quem está logado (o front usa para validar a sessão)
router.get("/me", autenticar, (req, res) => {
  res.json({ usuario: req.usuario });
});

// POST /api/auth/trocar-senha  { "senha_atual": "...", "senha_nova": "..." }
router.post("/trocar-senha", autenticar, async (req, res) => {
  const senhaAtual = String(req.body?.senha_atual ?? "");
  const senhaNova = req.body?.senha_nova;

  const erroSenha = validarSenha(senhaNova);
  if (erroSenha) return res.status(400).json({ erro: erroSenha });

  try {
    const { rows } = await pool.query(
      "SELECT senha_hash FROM usuarios WHERE id = $1",
      [req.usuario.id]
    );
    const confere = await bcrypt.compare(senhaAtual, rows[0].senha_hash);
    if (!confere) {
      return res.status(400).json({ erro: "Senha atual incorreta." });
    }

    if (senhaAtual === senhaNova) {
      return res
        .status(400)
        .json({ erro: "A nova senha precisa ser diferente da atual." });
    }

    const novoHash = await gerarHash(senhaNova);
    await pool.query("UPDATE usuarios SET senha_hash = $1, deve_trocar_senha = FALSE WHERE id = $2", [
      novoHash,
      req.usuario.id,
    ]);
    res.json({ mensagem: "Senha alterada." });
  } catch (erro) {
    console.error("Erro ao trocar senha:", erro.message);
    res.status(500).json({ erro: "Erro ao trocar senha." });
  }
});

module.exports = router;