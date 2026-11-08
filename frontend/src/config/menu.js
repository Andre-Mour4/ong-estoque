// Mapa das telas do sistema. O menu (☰) e o título da barra do topo leem daqui.
//
// "permissao" (opcional): a tela só aparece no menu para quem tem essa permissão (admin vê tudo).
//
// Para adicionar uma tela nova:
//   1. crie a página em src/pages/
//   2. registre a rota no App.jsx
//   3. acrescente uma linha neste arquivo
export const GRUPOS_MENU = [
  {
    titulo: null,
    itens: [{ caminho: "/", rotulo: "Painel" }],
  },
  {
    titulo: "Operação",
    itens: [
      { caminho: "/estoque", rotulo: "Estoque" },
      { caminho: "/doacao", rotulo: "Registrar doação", permissao: "registrar_doacao" },
      { caminho: "/saida", rotulo: "Dar saída", permissao: "dar_saida" },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      { caminho: "/itens", rotulo: "Itens", permissao: "gerenciar_itens" },
      { caminho: "/doadores", rotulo: "Doadores", permissao: "gerenciar_doadores" },
    ],
  },
  {
    titulo: "Consultas",
    itens: [{ caminho: "/historico", rotulo: "Histórico", permissao: "ver_historico" }],
  },
  {
    titulo: "Administração",
    apenasAdmin: true,
    itens: [{ caminho: "/usuarios", rotulo: "Usuários" }],
  },
];

// Telas que ficam no rodapé do menu, em "Minha conta".
export const TELAS_EXTRAS = [{ caminho: "/conta", rotulo: "Trocar senha" }];

// Nome da tela a partir do endereço (usado no título da barra do topo).
export function tituloDaTela(caminho) {
  const todas = [...GRUPOS_MENU.flatMap((grupo) => grupo.itens), ...TELAS_EXTRAS];
  return todas.find((item) => item.caminho === caminho)?.rotulo ?? "";
}