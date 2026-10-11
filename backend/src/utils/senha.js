const bcrypt = require("bcryptjs");

const CUSTO_HASH = 10;

// Devolve a mensagem de erro se a senha não servir, ou null se estiver ok.
function validarSenha(senha) {
  if (typeof senha !== "string" || senha.length < 8) {
    return "A senha deve ter pelo menos 8 caracteres.";
  }
  // O bcrypt só considera os primeiros 72 bytes da senha.
  if (Buffer.byteLength(senha, "utf8") > 72) {
    return "A senha é muito longa (máximo de 72 caracteres).";
  }
  return null;
}

// Gera o hash que vai para o banco. A senha em texto nunca é salva.
function gerarHash(senha) {
  return bcrypt.hash(senha, CUSTO_HASH);
}

module.exports = { validarSenha, gerarHash };