export const GRUPOS_MENU = [
  {
    titulo: null,
    itens: [{ caminho: "/", rotulo: "Painel" }],
  },
  {
    titulo: "Operação",
    itens: [
      { caminho: "/estoque", rotulo: "Estoque" },
      { caminho: "/doacao", rotulo: "Registrar doação" },
      { caminho: "/saida", rotulo: "Dar saída" },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      { caminho: "/itens", rotulo: "Itens" },
      { caminho: "/doadores", rotulo: "Doadores" },
    ],
  },
  {
    titulo: "Consultas",
    itens: [{ caminho: "/historico", rotulo: "Histórico" }],
  },
  {
    titulo: "Administração",
    apenasAdmin: true,
    itens: [{ caminho: "/usuarios", rotulo: "Usuários" }],
  },
];

export const TELAS_EXTRAS = [{ caminho: "/conta", rotulo: "Trocar senha" }];

export function tituloDaTela(caminho) {
  const todas = [...GRUPOS_MENU.flatMap((grupo) => grupo.itens), ...TELAS_EXTRAS];
  return todas.find((item) => item.caminho === caminho)?.rotulo ?? "";
}