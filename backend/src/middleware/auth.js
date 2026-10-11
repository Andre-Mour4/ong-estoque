require("dotenv").config();
const jwt = require("jsonwebtoken");
const pool = require("../db");

if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET não definido. Adicione no arquivo .env (veja o .env.example)."
  );
}

// Exige login: lê o token do cabeçalho "Authorization: Bearer <token>",
// confere se o usuário ainda existe e está ativo e preenche req.usuario.
async function autenticar(req, res, next) {
  const [tipo, token] = (req.headers.authorization || "").split(" ");
  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ erro: "Login necessário." });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch {
    return res
      .status(401)
      .json({ erro: "Sessão inválida ou expirada. Faça login novamente." });
  }

  try {
    const { rows } = await pool.query(
      "SELECT id, nome, email, perfil, ativo FROM usuarios WHERE id = $1",
      [payload.sub]
    );
    const usuario = rows[0];
    if (!usuario || !usuario.ativo) {
      return res
        .status(401)
        .json({ erro: "Usuário inativo ou não encontrado." });
    }
    req.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    };
    next();
  } catch (erro) {
    console.error("Erro ao autenticar:", erro.message);
    res.status(500).json({ erro: "Erro ao autenticar." });
  }
}

// Use depois do "autenticar": libera só quem tem perfil admin.
function apenasAdmin(req, res, next) {
  if (req.usuario?.perfil !== "admin") {
    return res
      .status(403)
      .json({ erro: "Acesso restrito a administradores." });
  }
  next();
}

module.exports = { autenticar, apenasAdmin };