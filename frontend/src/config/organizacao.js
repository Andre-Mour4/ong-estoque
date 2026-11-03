// Dados da ONG usados nos textos legais (Política de Privacidade e Termos de Uso).
// Preencha uma vez aqui: as duas páginas se atualizam sozinhas.
// Enquanto houver "[PREENCHER" em algum campo, as páginas mostram um aviso de rascunho.
export const ORGANIZACAO = {
  nome: "Sonho de um Menino",
  razaoSocial: "[PREENCHER: razão social da ONG]",
  cnpj: "[PREENCHER: CNPJ da ONG]",
  cidadeUf: "[PREENCHER: cidade/UF]",
  // Canal para pedidos sobre dados pessoais (acesso, correção, eliminação...).
  emailPrivacidade: "[PREENCHER: e-mail do canal de privacidade]",
  responsavelDados: "[PREENCHER: nome de quem responde pelos dados na ONG]",
  // Quanto tempo o histórico e os dados de ex-voluntários são mantidos.
  prazoRetencao: "[PREENCHER: prazo de guarda, definido com a ONG]",
  // Onde o sistema fica hospedado (ex.: Vercel e Oracle Cloud).
  hospedagem: "[PREENCHER: serviços de hospedagem usados]",
  foro: "[PREENCHER: foro da comarca]",
  ultimaAtualizacao: "[PREENCHER: data da última revisão]",
};

export const TEXTOS_PENDENTES = Object.values(ORGANIZACAO).some((valor) =>
  String(valor).includes("[PREENCHER")
);