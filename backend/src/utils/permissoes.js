// Permissões que o administrador pode dar a cada usuário.
// O perfil "admin" sempre pode tudo e não depende desta lista.
//
// Todo usuário logado vê Painel, Estoque, itens, doadores (sem o contato) e categorias,
// porque precisa disso para trabalhar. As permissões controlam as AÇÕES.
const PERMISSOES = [
  { chave: "registrar_doacao", rotulo: "Registrar doação" },
  { chave: "dar_saida", rotulo: "Dar saída" },
  { chave: "gerenciar_itens", rotulo: "Gerenciar itens e categorias" },
  { chave: "gerenciar_doadores", rotulo: "Gerenciar doadores (inclui ver o contato)" },
  { chave: "ver_historico", rotulo: "Ver o histórico de movimentações" },
];

const CHAVES = PERMISSOES.map((permissao) => permissao.chave);

// Modelos prontos para o admin escolher na hora de criar o usuário.
const MODELOS = {
  administrador: CHAVES,
  voluntario: ["registrar_doacao", "dar_saida"],
  consulta: [],
};

// Confere uma lista enviada pela API. Devolve { permissoes } ou { erro }.
function validarPermissoes(valor) {
  if (!Array.isArray(valor)) return { erro: "permissoes deve ser uma lista." };

  const unicas = [...new Set(valor)];
  const invalidas = unicas.filter((chave) => !CHAVES.includes(chave));
  if (invalidas.length > 0) {
    return {
      erro: `Permissões inválidas: ${invalidas.join(", ")}. Válidas: ${CHAVES.join(", ")}.`,
    };
  }
  return { permissoes: unicas };
}

function temPermissao(usuario, chave) {
  return usuario?.perfil === "admin" || Boolean(usuario?.permissoes?.includes(chave));
}

module.exports = { PERMISSOES, CHAVES, MODELOS, validarPermissoes, temPermissao };