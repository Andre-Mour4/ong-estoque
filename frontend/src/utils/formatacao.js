// Funções pequenas de formatação e leitura de valores, compartilhadas pelas telas.

// Data de hoje no formato AAAA-MM-DD (no fuso do computador).
export function hojeISO() {
  return new Date().toLocaleDateString("sv-SE");
}

// "2026-11-05" -> "05/11/2026"
export function formatarData(iso) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// "2026-10-11T14:30:00.000Z" -> "11/10, 14:30"
export function formatarDataHora(iso) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// (7, "pacote") -> "7 pacote"
export function formatarQuantidade(valor, unidade) {
  return `${valor.toLocaleString("pt-BR")} ${unidade}`;
}

// Texto do selo de validade a partir de "dias_para_vencer" da API.
export function textoValidade(dias) {
  if (dias === null || dias === undefined) return "Sem validade";
  if (dias < 0) return `Vencido há ${-dias} ${-dias === 1 ? "dia" : "dias"}`;
  if (dias === 0) return "Vence hoje";
  return `Vence em ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

// Lê o que a pessoa digitou. Aceita "10", "2.5" e "2,5".
// Devolve null se for inválida (vazia, zero, negativa ou com 3+ casas decimais).
export function lerQuantidade(texto) {
  const normal = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normal)) return null;
  const numero = Number(normal);
  return numero > 0 ? numero : null;
}