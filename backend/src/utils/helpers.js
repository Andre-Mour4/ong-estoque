const pool = require("../db");

// Campo não enviado, nulo ou vazio.
function vazio(valor) {
  return valor === undefined || valor === null || valor === "";
}

// Id inteiro positivo, ou null se for inválido.
function lerId(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Data no formato AAAA-MM-DD (e que exista no calendário), ou null.
function lerData(valor) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return null;
  }
  const data = new Date(`${valor}T00:00:00Z`);
  if (Number.isNaN(data.getTime())) return null;
  return data.toISOString().slice(0, 10) === valor ? valor : null;
}

// Quantidade positiva com no máximo 2 casas decimais, ou null.
function lerQuantidade(valor) {
  const numero =
    typeof valor === "string" && valor.trim() !== "" ? Number(valor) : valor;
  if (typeof numero !== "number" || !Number.isFinite(numero)) return null;
  if (numero <= 0 || numero > 9999999999) return null;
  const centavos = numero * 100;
  if (Math.abs(centavos - Math.round(centavos)) > 1e-6) return null;
  return numero;
}

// Executa várias queries como uma unidade só: ou tudo é gravado, ou nada.
async function comTransacao(funcao) {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const resultado = await funcao(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}

module.exports = { vazio, lerId, lerData, lerQuantidade, comTransacao };