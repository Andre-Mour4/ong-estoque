import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import {
  formatarData,
  formatarDataHora,
  formatarQuantidade,
  textoValidade,
} from "../utils/formatacao";
import "../styles/formularios.css";
import "../styles/selos.css";
import "./EstoquePage.css";

// Tela "Estoque": lista os LOTES que estão no estoque (GET /api/lotes).
// Os filtros de situação, categoria e esgotados ficam na URL
// (ex.: /estoque?status=vencendo), então os cards do Painel já abrem filtrados.

const FILTROS_STATUS = [
  { valor: "", rotulo: "Todos", chave: "total_lotes" },
  { valor: "vencido", rotulo: "Vencidos", chave: "vencidos" },
  { valor: "vencendo", rotulo: "Vencendo", chave: "vencendo" },
  { valor: "ok", rotulo: "Em dia", chave: "ok" },
  { valor: "sem_validade", rotulo: "Sem validade", chave: "sem_validade" },
];
const STATUS_VALIDOS = FILTROS_STATUS.map((f) => f.valor).filter(Boolean);

function montarConsulta({ status, categoriaId, busca, esgotados }) {
  const consulta = new URLSearchParams();
  if (status) consulta.set("status", status);
  if (categoriaId) consulta.set("categoria_id", categoriaId);
  if (busca) consulta.set("busca", busca);
  if (esgotados) consulta.set("incluir_zerados", "true");
  return consulta.toString();
}

export default function EstoquePage() {
  const [params, setParams] = useSearchParams();

  // Filtros guardados na URL (valores inválidos são ignorados).
  const statusParam = params.get("status") ?? "";
  const status = STATUS_VALIDOS.includes(statusParam) ? statusParam : "";
  const categoriaParam = params.get("categoria_id") ?? "";
  const categoriaId = /^\d+$/.test(categoriaParam) ? categoriaParam : "";
  const esgotados = params.get("esgotados") === "1";

  // A busca por nome espera a pessoa parar de digitar antes de consultar.
  const [buscaDigitada, setBuscaDigitada] = useState("");
  const [busca, setBusca] = useState("");

  const [tentativa, setTentativa] = useState(0);
  const [base, setBase] = useState(null); // { resumo, categorias } ou { erro }
  const [resultado, setResultado] = useState(null); // { chave, lotes } ou { chave, erro }

  const dialogoRef = useRef(null);
  const [detalheId, setDetalheId] = useState(null);
  const [detalhe, setDetalhe] = useState(null); // { id, lote } ou { id, erro }

  const textoConsulta = montarConsulta({ status, categoriaId, busca, esgotados });
  const chave = `${textoConsulta}#${tentativa}`;

  useEffect(() => {
    const espera = setTimeout(() => setBusca(buscaDigitada.trim()), 350);
    return () => clearTimeout(espera);
  }, [buscaDigitada]);

  // Contagens dos botões de situação e lista de categorias.
  useEffect(() => {
    let ativo = true;
    Promise.all([api("/api/lotes/resumo"), api("/api/categorias")])
      .then(([resumo, categorias]) => {
        if (ativo) setBase({ resumo, categorias });
      })
      .catch((e) => {
        if (ativo) setBase({ erro: e.message });
      });
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  // Lista de lotes: busca de novo sempre que um filtro muda.
  useEffect(() => {
    let ativo = true;
    api(`/api/lotes?${textoConsulta}`)
      .then((lotes) => {
        if (ativo) setResultado({ chave, lotes });
      })
      .catch((e) => {
        if (ativo) setResultado({ chave, erro: e.message });
      });
    return () => {
      ativo = false;
    };
  }, [chave, textoConsulta]);

  // Detalhes de um lote (abre no diálogo).
  useEffect(() => {
    if (detalheId === null) return undefined;
    let ativo = true;
    api(`/api/lotes/${detalheId}`)
      .then((lote) => {
        if (ativo) setDetalhe({ id: detalheId, lote });
      })
      .catch((e) => {
        if (ativo) setDetalhe({ id: detalheId, erro: e.message });
      });
    return () => {
      ativo = false;
    };
  }, [detalheId]);

  function definirFiltro(nome, valor) {
    setParams(
      (atual) => {
        const novo = new URLSearchParams(atual);
        if (valor) novo.set(nome, valor);
        else novo.delete(nome);
        return novo;
      },
      { replace: true }
    );
  }

  function limparFiltros() {
    setBuscaDigitada("");
    setBusca("");
    setParams({}, { replace: true });
  }

  function recarregar() {
    setResultado(null);
    setTentativa((valor) => valor + 1);
  }

  function abrirDetalhes(id) {
    setDetalheId(id);
    if (dialogoRef.current && !dialogoRef.current.open) {
      dialogoRef.current.showModal();
    }
  }

  function fecharDetalhes() {
    dialogoRef.current?.close();
  }

  const categorias = base?.categorias ?? [];
  const resumo = base?.resumo ?? null;
  const temFiltro = Boolean(status || categoriaId || busca || esgotados);
  const carregando = !resultado || resultado.chave !== chave;
  const lotes = resultado?.lotes ?? null;
  const erroLista = resultado && resultado.chave === chave ? resultado.erro : "";

  const detalheCarregando = detalheId !== null && detalhe?.id !== detalheId;
  const lote = detalhe?.id === detalheId ? detalhe?.lote : null;
  const erroDetalhe = detalhe?.id === detalheId ? detalhe?.erro : "";

  return (
    <div className="estoque">
      <p className="estoque__intro">
        Aqui estão todos os lotes que estão no estoque, com o que vence primeiro no
        topo. Use os botões de situação para ver só o que precisa de atenção.
      </p>

      <section className="filtros" aria-label="Filtros do estoque">
        <div className="filtros__linha">
          <div className="campo">
            <label className="campo__rotulo" htmlFor="busca">
              Buscar item
            </label>
            <input
              id="busca"
              type="search"
              className="entrada"
              placeholder="Ex.: arroz"
              value={buscaDigitada}
              onChange={(e) => setBuscaDigitada(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="campo">
            <label className="campo__rotulo" htmlFor="categoria">
              Categoria
            </label>
            <select
              id="categoria"
              className="entrada"
              value={categoriaId}
              onChange={(e) => definirFiltro("categoria_id", e.target.value)}
            >
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>
          </div>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={esgotados}
              onChange={(e) => definirFiltro("esgotados", e.target.checked ? "1" : "")}
            />
            Mostrar esgotados
          </label>
        </div>

        <div className="chips" role="group" aria-label="Situação da validade">
          {FILTROS_STATUS.map((filtro) => (
            <button
              key={filtro.valor || "todos"}
              type="button"
              className="chip"
              aria-pressed={status === filtro.valor}
              onClick={() => definirFiltro("status", filtro.valor)}
            >
              {filtro.rotulo}
              {resumo && <span className="chip__n">{resumo[filtro.chave]}</span>}
            </button>
          ))}
        </div>
      </section>

      {erroLista && (
        <div className="aviso aviso--erro" role="alert">
          <strong>Não foi possível carregar o estoque</strong>
          {erroLista}
          <div className="aviso__links">
            <button type="button" className="btn btn--pequeno" onClick={recarregar}>
              Tentar de novo
            </button>
          </div>
        </div>
      )}

      {!erroLista && !lotes && <p className="estoque__intro">Carregando...</p>}

      {!erroLista && lotes && (
        <>
          <div className="estoque__resumo">
            <span aria-live="polite">
              {carregando
                ? "Atualizando..."
                : `${lotes.length} ${lotes.length === 1 ? "lote" : "lotes"}`}
            </span>
            {temFiltro && (
              <button type="button" className="link-botao" onClick={limparFiltros}>
                Limpar filtros
              </button>
            )}
          </div>

          {lotes.length === 0 ? (
            <section className="tabela-cartao estoque__vazio">
              <h2>Nenhum lote encontrado</h2>
              {temFiltro ? (
                <p>
                  Nada combina com os filtros escolhidos.{" "}
                  <button type="button" className="link-botao" onClick={limparFiltros}>
                    Limpar filtros
                  </button>
                </p>
              ) : (
                <p>
                  O estoque está vazio. Comece em{" "}
                  <Link to="/doacao">Registrar doação</Link>.
                </p>
              )}
            </section>
          ) : (
            <section
              className={`tabela-cartao ${carregando ? "tabela-cartao--carregando" : ""}`}
            >
              <table className="tabela">
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Quantidade</th>
                    <th scope="col">Validade</th>
                    <th scope="col">Doador</th>
                    <th scope="col">Chegou em</th>
                    <th scope="col">
                      <span className="so-leitor">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lotes.map((item) => (
                    <tr key={item.id}>
                      <td className="tabela__item">
                        <strong>{item.item}</strong>
                        <small>{item.categoria ?? "Sem categoria"}</small>
                      </td>
                      <td data-label="Quantidade">
                        <div className="tabela__duas-linhas">
                          <span>
                            {formatarQuantidade(item.quantidade_atual, item.unidade)}
                          </span>
                          <small>
                            de {item.quantidade_inicial.toLocaleString("pt-BR")} recebidos
                          </small>
                        </div>
                      </td>
                      <td data-label="Validade">
                        <div className="tabela__duas-linhas">
                          {item.data_validade && (
                            <span>{formatarData(item.data_validade)}</span>
                          )}
                          <span className={`selo selo--${item.status}`}>
                            {textoValidade(item.dias_para_vencer)}
                          </span>
                        </div>
                      </td>
                      <td data-label="Doador">{item.doador ?? "—"}</td>
                      <td data-label="Chegou em">{formatarData(item.data_entrada)}</td>
                      <td className="tabela__acoes">
                        <button
                          type="button"
                          className="btn btn--pequeno"
                          onClick={() => abrirDetalhes(item.id)}
                        >
                          Detalhes
                        </button>
                        {item.quantidade_atual > 0 ? (
                          <Link
                            className="btn btn--pequeno btn--primario"
                            to={`/saida?lote=${item.id}`}
                          >
                            Dar saída
                          </Link>
                        ) : (
                          <span className="selo selo--esgotado">Esgotado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

      <dialog
        ref={dialogoRef}
        className="dialogo"
        aria-labelledby="dialogo-titulo"
        onClose={() => setDetalheId(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) fecharDetalhes();
        }}
      >
        <div className="dialogo__corpo">
          <div className="dialogo__topo">
            <h2 id="dialogo-titulo">Detalhes do lote</h2>
            <button
              type="button"
              className="dialogo__fechar"
              aria-label="Fechar"
              onClick={fecharDetalhes}
            >
              ×
            </button>
          </div>

          {detalheId !== null && detalheCarregando && <p>Carregando...</p>}
          {erroDetalhe && <p className="campo__erro">{erroDetalhe}</p>}

          {lote && (
            <>
              <dl className="detalhe">
                <dt>Item</dt>
                <dd>{lote.item}</dd>
                <dt>Categoria</dt>
                <dd>{lote.categoria ?? "Sem categoria"}</dd>
                <dt>Quantidade</dt>
                <dd>
                  {formatarQuantidade(lote.quantidade_atual, lote.unidade)} de{" "}
                  {lote.quantidade_inicial.toLocaleString("pt-BR")} recebidos
                </dd>
                <dt>Validade</dt>
                <dd>
                  {lote.data_validade ? `${formatarData(lote.data_validade)} · ` : ""}
                  <span className={`selo selo--${lote.status}`}>
                    {textoValidade(lote.dias_para_vencer)}
                  </span>
                </dd>
                <dt>Doador</dt>
                <dd>{lote.doador ?? "Não informado"}</dd>
                <dt>Chegou em</dt>
                <dd>{formatarData(lote.data_entrada)}</dd>
                {lote.observacao && (
                  <>
                    <dt>Observação</dt>
                    <dd>{lote.observacao}</dd>
                  </>
                )}
              </dl>

              {lote.quantidade_atual > 0 && (
                <Link className="btn btn--primario" to={`/saida?lote=${lote.id}`}>
                  Dar saída neste lote
                </Link>
              )}

              <h3>Histórico do lote</h3>
              <ul className="historico">
                {lote.movimentacoes.map((mov) => (
                  <li key={mov.id}>
                    <span className={`selo selo--${mov.tipo}`}>
                      {mov.tipo === "entrada" ? "Entrada" : "Saída"}
                    </span>
                    <div>
                      <strong>{formatarQuantidade(mov.quantidade, lote.unidade)}</strong>
                      <span>
                        {formatarDataHora(mov.criado_em)}
                        {mov.usuario ? ` · ${mov.usuario}` : ""}
                        {mov.destino ? ` · para ${mov.destino}` : ""}
                        {mov.observacao ? ` · ${mov.observacao}` : ""}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}