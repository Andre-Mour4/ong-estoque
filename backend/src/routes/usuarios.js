const express = require("express");
const crypto = require("crypto");
const pool = require("../db");
const { vazio, lerId } = require("../utils/helpers");
const { validarSenha, gerarHash } = require("../utils/senha");
const {
  PERMISSOES,
  CHAVES,
  MODELOS,
  validarPermissoes,
} = require("../utils/permissoes");

// Estas rotas são montadas no server.js com "autenticar" + "apenasAdmin".
const router = express.Router();

const PERFIS = ["admin", "voluntario"];
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// A senha (hash) nunca é devolvida pela API.
const COLUNAS =
  "id, nome, email, perfil, ativo, permissoes, deve_trocar_senha, anonimizado_em, criado_em";
const MSG_ULTIMO_ADMIN = "Precisa existir pelo menos um administrador ativo.";

// Senha temporária aleatória, sem caracteres que confundem (0/O, 1/l/I).
function gerarSenhaTemporaria() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from(crypto.randomBytes(12), (byte) => alfabeto[byte % alfabeto.length]).join("");
}

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

// Admin sempre fica com todas as permissões. Voluntário usa as enviadas;
// se nada foi enviado, usa "padrao" (null = manter as que já tinha).
function resolverPermissoes(perfil, enviadas, padrao) {
  if (perfil === "admin") return { permissoes: CHAVES };
  if (enviadas === undefined) return { permissoes: padrao };
  return validarPermissoes(enviadas);
}

// Usa a senha enviada (validando) ou gera uma temporária.
function definirSenha(enviada) {
  if (vazio(enviada)) return { senha: gerarSenhaTemporaria(), gerada: true };
  const erro = validarSenha(enviada);
  if (erro) return { erro };
  return { senha: enviada, gerada: false };
}

async function buscarUsuario(id) {
  const { rows } = await pool.query(
    `SELECT ${COLUNAS} FROM usuarios WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function existeOutroAdminAtivo(id) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM usuarios
      WHERE perfil = 'admin' AND ativo = TRUE AND id <> $1`,
    [id]
  );
  return rows[0].total > 0;
}

// GET /api/usuarios/permissoes -> lista de permissões e modelos (para montar as caixinhas)
router.get("/permissoes", (req, res) => {
  res.json({ permissoes: PERMISSOES, modelos: MODELOS });
});

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

// POST /api/usuarios -> cria usuário { nome, email, perfil?, permissoes?, senha? }
// Sem "senha", o sistema gera uma temporária e devolve em "senha_temporaria" (só nesta resposta).
// O usuário novo sempre precisa trocar a senha no primeiro acesso.
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

  const { erro: erroPermissoes, permissoes } = resolverPermissoes(
    perfil,
    body?.permissoes,
    MODELOS.voluntario
  );
  if (erroPermissoes) return res.status(400).json({ erro: erroPermissoes });

  const { erro: erroSenha, senha, gerada } = definirSenha(body?.senha);
  if (erroSenha) return res.status(400).json({ erro: erroSenha });

  try {
    const hash = await gerarHash(senha);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, perfil, permissoes, deve_trocar_senha)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING ${COLUNAS}`,
      [nome, email, hash, perfil, permissoes]
    );
    res
      .status(201)
      .json({ ...rows[0], ...(gerada ? { senha_temporaria: senha } : {}) });
  } catch (erro) {
    if (erro.code === "23505") {
      return res.status(409).json({ erro: "Já existe um usuário com esse e-mail." });
    }
    console.error("Erro ao criar usuário:", erro.message);
    res.status(500).json({ erro: "Erro ao criar usuário." });
  }
});

// PUT /api/usuarios/:id -> edita { nome, perfil, ativo, permissoes? }
// Para desligar alguém, envie "ativo": false (usuários não são apagados).
// "permissoes" omitido = mantém as atuais. A senha NÃO muda aqui: use /redefinir-senha.
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

  try {
    const atual = await buscarUsuario(id);
    if (!atual) return res.status(404).json({ erro: "Usuário não encontrado." });
    if (atual.anonimizado_em) {
      return res.status(400).json({ erro: "Usuário anonimizado não pode ser editado." });
    }

    const deixaDeSerAdminAtivo =
      atual.perfil === "admin" && atual.ativo && (perfil !== "admin" || !ativo);
    if (deixaDeSerAdminAtivo && !(await existeOutroAdminAtivo(id))) {
      return res.status(400).json({ erro: MSG_ULTIMO_ADMIN });
    }

    // Admin rebaixado sem permissões enviadas recebe o modelo "voluntário".
    const padrao = atual.perfil === "admin" && perfil !== "admin" ? MODELOS.voluntario : null;
    const { erro: erroPermissoes, permissoes } = resolverPermissoes(
      perfil,
      body?.permissoes,
      padrao
    );
    if (erroPermissoes) return res.status(400).json({ erro: erroPermissoes });

    const { rows } = await pool.query(
      `UPDATE usuarios
          SET nome = $1, perfil = $2, ativo = $3,
              permissoes = COALESCE($4, permissoes)
        WHERE id = $5
        RETURNING ${COLUNAS}`,
      [nome, perfil, ativo, permissoes, id]
    );
    res.json(rows[0]);
  } catch (erro) {
    console.error("Erro ao editar usuário:", erro.message);
    res.status(500).json({ erro: "Erro ao editar usuário." });
  }
});

// POST /api/usuarios/:id/redefinir-senha { senha? } -> nova senha temporária
// Sem "senha", gera uma e devolve em "senha_temporaria" (só nesta resposta).
// A pessoa precisa trocar a senha no próximo acesso.
router.post("/:id/redefinir-senha", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  if (id === req.usuario.id) {
    return res.status(400).json({
      erro: "Para trocar a sua própria senha, use a opção Minha conta.",
    });
  }

  const { erro: erroSenha, senha, gerada } = definirSenha(req.body?.senha);
  if (erroSenha) return res.status(400).json({ erro: erroSenha });

  try {
    const atual = await buscarUsuario(id);
    if (!atual) return res.status(404).json({ erro: "Usuário não encontrado." });
    if (atual.anonimizado_em) {
      return res.status(400).json({ erro: "Usuário anonimizado não pode ter a senha redefinida." });
    }

    const hash = await gerarHash(senha);
    await pool.query(
      "UPDATE usuarios SET senha_hash = $1, deve_trocar_senha = TRUE WHERE id = $2",
      [hash, id]
    );
    res.json({
      mensagem: "Senha redefinida. A pessoa deverá trocá-la no próximo acesso.",
      ...(gerada ? { senha_temporaria: senha } : {}),
    });
  } catch (erro) {
    console.error("Erro ao redefinir senha:", erro.message);
    res.status(500).json({ erro: "Erro ao redefinir senha." });
  }
});

// POST /api/usuarios/:id/anonimizar -> remove os dados pessoais (LGPD) e desativa.
// O histórico continua, mas "quem fez" passa a aparecer como "Usuário anonimizado".
router.post("/:id/anonimizar", async (req, res) => {
  const id = lerId(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  if (id === req.usuario.id) {
    return res.status(400).json({ erro: "Você não pode anonimizar o seu próprio usuário." });
  }

  try {
    const atual = await buscarUsuario(id);
    if (!atual) return res.status(404).json({ erro: "Usuário não encontrado." });
    if (atual.anonimizado_em) {
      return res.status(409).json({ erro: "Este usuário já foi anonimizado." });
    }
    if (atual.perfil === "admin" && atual.ativo && !(await existeOutroAdminAtivo(id))) {
      return res.status(400).json({ erro: MSG_ULTIMO_ADMIN });
    }

    const { rows } = await pool.query(
      `UPDATE usuarios
          SET nome = 'Usuário anonimizado',
              email = 'anonimizado-' || id || '@anonimizado.invalid',
              senha_hash = '!',
              perfil = 'voluntario',
              permissoes = '{}',
              deve_trocar_senha = FALSE,
              ativo = FALSE,
              anonimizado_em = NOW()
        WHERE id = $1
        RETURNING ${COLUNAS}`,
      [id]
    );
    res.json(rows[0]);
  } catch (erro) {
    console.error("Erro ao anonimizar usuário:", erro.message);
    res.status(500).json({ erro: "Erro ao anonimizar usuário." });
  }
});

module.exports = router;