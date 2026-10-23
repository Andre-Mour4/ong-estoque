import { useEffect, useState } from "react";
import { api } from "../services/api";

// Busca um endereço da API (GET) e acompanha o carregamento.
//
//   const itens = useApi("/api/itens?busca=arroz");
//   itens.dados       -> o que a API devolveu (null enquanto não chegou nada)
//   itens.erro        -> mensagem de erro em português ("" se estiver tudo certo)
//   itens.carregando  -> true enquanto busca (os dados antigos continuam em "dados")
//   itens.recarregar()-> busca de novo
//
// Quando o endereço muda (ex.: um filtro novo), busca sozinho outra vez.
export function useApi(caminho) {
  const [tentativa, setTentativa] = useState(0);
  const [resultado, setResultado] = useState(null); // { chave, dados } ou { chave, erro }
  const chave = `${caminho}#${tentativa}`;

  useEffect(() => {
    let ativo = true;
    api(caminho)
      .then((dados) => {
        if (ativo) setResultado({ chave, dados });
      })
      .catch((e) => {
        if (ativo) setResultado({ chave, erro: e.message });
      });
    return () => {
      ativo = false;
    };
  }, [caminho, chave]);

  const atual = resultado !== null && resultado.chave === chave;

  return {
    dados: resultado?.dados ?? null,
    erro: atual ? (resultado.erro ?? "") : "",
    carregando: !atual,
    recarregar: () => setTentativa((valor) => valor + 1),
  };
}