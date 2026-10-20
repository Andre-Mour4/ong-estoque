// Ponto único de comunicação com o backend.
//
// Uso:
//   const itens = await api("/api/itens?busca=arroz");
//   await api("/api/itens", { metodo: "POST", corpo: { nome: "Feijao 1kg" } });
//
// - Manda o token de login automaticamente.
// - Se der erro, lança um ErroApi cuja "message" já é a mensagem em português
//   que veio do backend (pronta para mostrar na tela).
// - Se a sessão expirar (401), desloga o usuário sozinho.

// No deploy, defina VITE_API_URL com o endereço do backend.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const CHAVE_TOKEN = "ong_estoque_token";

let aoPerderSessao = null;

export function lerToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

export function salvarToken(token) {
  try {
    localStorage.setItem(CHAVE_TOKEN, token);
  } catch {
    // Sem armazenamento disponível: o login vale só até recarregar a página.
  }
}

export function removerToken() {
  try {
    localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    // nada a fazer
  }
}

// O AuthContext registra aqui o que fazer quando o backend responde 401.
export function definirAoPerderSessao(funcao) {
  aoPerderSessao = funcao;
}

export class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
  }
}

export async function api(
  caminho,
  { metodo = "GET", corpo, autenticado = true } = {}
) {
  const cabecalhos = {};
  if (corpo !== undefined) cabecalhos["Content-Type"] = "application/json";

  const token = lerToken();
  if (autenticado && token) cabecalhos.Authorization = `Bearer ${token}`;

  let resposta;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi(
      "Não foi possível conectar ao servidor. Verifique se ele está no ar.",
      0
    );
  }

  let dados = null;
  try {
    dados = await resposta.json();
  } catch {
    // resposta sem corpo JSON
  }

  if (!resposta.ok) {
    // 401 em rota protegida = sessão expirada ou inválida.
    if (resposta.status === 401 && autenticado && aoPerderSessao) {
      aoPerderSessao();
    }
    throw new ErroApi(
      dados?.erro ?? "Erro inesperado. Tente novamente.",
      resposta.status
    );
  }

  return dados;
}