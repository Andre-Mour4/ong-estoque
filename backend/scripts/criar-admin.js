// Cria o primeiro usuário administrador (ou mais um, se precisar).
//
// Uso (rode de dentro da pasta backend/):
//   node scripts/criar-admin.js "Seu Nome" seu@email.com SuaSenha123
//
// Dica: use uma senha só com letras e números, para o terminal não
// interpretar símbolos como $ ou ".

require("dotenv").config();
const pool = require("../src/db");
const { validarSenha, gerarHash } = require("../src/utils/senha");

async function main() {
  const [nome, emailBruto, senha] = process.argv.slice(2);

  if (!nome || !emailBruto || !senha) {
    console.error('Uso: node scripts/criar-admin.js "Nome" email@exemplo.com senha');
    process.exitCode = 1;
    return;
  }

  const erroSenha = validarSenha(senha);
  if (erroSenha) {
    console.error(erroSenha);
    process.exitCode = 1;
    return;
  }

  try {
    const hash = await gerarHash(senha);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, perfil)
       VALUES ($1, $2, $3, 'admin') RETURNING id, nome, email, perfil`,
      [nome.trim(), emailBruto.trim().toLowerCase(), hash]
    );
    console.log("Administrador criado:", rows[0]);
  } catch (erro) {
    if (erro.code === "23505") {
      console.error("Já existe um usuário com esse e-mail.");
    } else {
      console.error("Erro ao criar administrador:", erro.message);
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();