// Cria um usuário administrador (o primeiro, ou mais um, se precisar).
//
// Uso (rode de dentro da pasta backend/):
//   node scripts/criar-admin.js "Seu Nome" seu@email.com SuaSenha123
//   node scripts/criar-admin.js "Seu Nome" seu@email.com SuaSenha123 --sem-troca
//
// Por padrão a senha é TEMPORÁRIA: a pessoa é obrigada a trocá-la no primeiro acesso
// (isso exige a tela "Trocar senha" no frontend). Use --sem-troca só em desenvolvimento.
//
// Dica: use uma senha só com letras e números, para o terminal não
// interpretar símbolos como $ ou ".

require("dotenv").config();
const pool = require("../src/db");
const { validarSenha, gerarHash } = require("../src/utils/senha");
const { CHAVES } = require("../src/utils/permissoes");

async function main() {
  const argumentos = process.argv.slice(2);
  const semTroca = argumentos.includes("--sem-troca");
  const [nome, emailBruto, senha] = argumentos.filter((a) => !a.startsWith("--"));

  if (!nome || !emailBruto || !senha) {
    console.error(
      'Uso: node scripts/criar-admin.js "Nome" email@exemplo.com senha [--sem-troca]'
    );
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
      `INSERT INTO usuarios (nome, email, senha_hash, perfil, permissoes, deve_trocar_senha)
       VALUES ($1, $2, $3, 'admin', $4, $5)
       RETURNING id, nome, email, perfil, deve_trocar_senha`,
      [nome.trim(), emailBruto.trim().toLowerCase(), hash, CHAVES, !semTroca]
    );
    console.log("Administrador criado:", rows[0]);
    if (!semTroca) {
      console.log("A senha é temporária: será pedido que ela seja trocada no primeiro acesso.");
    }
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