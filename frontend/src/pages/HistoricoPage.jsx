import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { formatarQuantidade, hojeISO } from "../utils/formatacao";
import "../styles/formularios.css";
import "../styles/selos.css";
import "./EstoquePage.css"; // reaproveita os estilos de filtros e de tabela do Estoque
import "./HistoricoPage.css";

// Tela "Histórico": todas as entradas e saídas (GET /api/movimentacoes).
// Exige a permissão "ver_historico". Sem ela, a API responde 403 e a tela mostra o aviso.

const LIMITE = 500; // máximo de registros que a API devolve por consulta
const NAO_INFORMADO = "Não informado";

const TIPOS = [
  { valor: "", rotulo: "Todas" },
  { valor: "entrada", rotulo: "Entradas" },
  { valor: "saida", rotulo: "Saídas" },
];

// "2026-11-05" + (-6) -> "2026-10-30"
function somarDias(iso, dias) {
  const data = new Date(`${iso}T12:00:00`);
  data.setDate(data.getDate() + dias);
  return data.toLocaleDateString("sv-SE");
}

function formatarDataHoraCompleta(iso) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoricoPage() {
  const [hoje] = useState(hojeISO);
  const inicioPadrao = somarDias(hoje, -29); // últimos 30 dias

  const [tipo, setTipo] = useState("");
  const [itemId, setItemId] = useState("");
  const [inicio, setInicio] = useState(inicioPadrao);
  const [fim, setFim] = useState("");
  const [pessoa, setPessoa] = useState("");

  const consulta = new URLSearchParams({ limite: String(LIMITE) });
  if (tipo) consulta.set("tipo", tipo);
  if (itemId) consulta.set("item_id", itemId);
  if (inicio) consulta.set("data_inicio", inicio);
  if (fim) consulta.set("data_fim", fim);

  const historico = useApi(`/api/movimentacoes?${consulta.toString()}`);
  const itens = useApi("/api/itens");

  const atalhosPeriodo = [
    { rotulo: "Hoje", inicio: hoje, fim: hoje },
    { rotulo: "7 dias", inicio: somarDias(hoje, -6), fim: "" },
    { rotulo: "30 dias", inicio: inicioPadrao, fim: "" },
    { rotulo: "Tudo", inicio: "", fim: "" },
  ];

  const periodoInvalido = Boolean(inicio && fim && inicio > fim);
  const temFiltro = Boolean(
    tipo || itemId || pessoa || inicio !== inicioPadrao || fim !== ""
  );

  function limparFiltros() {
    setTipo("");
    setItemId("");
    setInicio(inicioPadrao);
    setFim("");
    setPessoa("");
  }

  // "Quem fez" filtra entre os registros que já chegaram (a API não filtra por pessoa).
  const lista = historico.dados;
  const pessoas = lista
    ? [...new Set(lista.map((mov) => mov.usuario ?? NAO_INFORMADO))].sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      )
    : [];
  const filtrada = lista
    ? lista.filter((mov) => !pessoa || (mov.usuario ?? NAO_INFORMADO) === pessoa)
    : null;
  const entradas = filtrada ? filtrada.filter((mov) => mov.tipo === "entrada").length : 0;
  const saidas = filtrada ? filtrada.length - entradas : 0;

  return (
    <div className="estoque">
      <p className="estoque__intro">
        Tudo o que entrou e saiu do estoque, com quem registrou e quando. Use os filtros
        para achar uma movimentação específica.
      </p>

      <section className="filtros" aria-label="Filtros do histórico">
        <div className="hist-grupos">
          <div className="campo">
            <span className="campo__rotulo" id="rotulo-tipo">
              Tipo
            </span>
            <div className="chips" role="group" aria-labelledby="rotulo-tipo">
              {TIPOS.map((opcao) => (
                <button
                  key={opcao.valor || "todas"}
                  type="button"
                  className="chip"
                  aria-pressed={tipo === opcao.valor}
                  onClick={() => setTipo(opcao.valor)}
                >
                  {opcao.rotulo}
                </button>
              ))}
            </div>
          </div>

          <div className="campo">
            <span className="campo__rotulo" id="rotulo-periodo">
              Período
            </span>
            <div className="chips" role="group" aria-labelledby="rotulo-periodo">
              {atalhosPeriodo.map((atalho) => (
                <button
                  key={atalho.rotulo}
                  type="button"
                  className="chip"
                  aria-pressed={inicio === atalho.inicio && fim === atalho.fim}
                  onClick={() => {
                    setInicio(atalho.inicio);
                    setFim(atalho.fim);
                  }}
                >
                  {atalho.rotulo}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="hist-campos">
          <div className="campo">
            <label className="campo__rotulo" htmlFor="hist-inicio">
              De
            </label>
            <input
              id="hist-inicio"
              type="date"
              className="entrada"
              max={hoje}
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              aria-invalid={periodoInvalido}
              aria-describedby={periodoInvalido ? "erro-periodo" : undefined}
            />
          </div>

          <div className="campo">
            <label className="campo__rotulo" htmlFor="hist-fim">
              Até
            </label>
            <input
              id="hist-fim"
              type="date"
              className="entrada"
              max={hoje}
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              aria-invalid={periodoInvalido}
              aria-describedby={periodoInvalido ? "erro-periodo" : undefined}
            />
          </div>

          <div className="campo">
            <label className="campo__rotulo" htmlFor="hist-item">
              Item
            </label>
            <select
              id="hist-item"
              className="entrada"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
            >
              <option value="">Todos os itens</option>
              {(itens.dados ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label className="campo__rotulo" htmlFor="hist-pessoa">
              Quem fez
            </label>
            <select
              id="hist-pessoa"
              className="entrada"
              value={pessoa}
              onChange={(e) => setPessoa(e.target.value)}
              disabled={pessoas.length === 0}
            >
              <option value="">Todas as pessoas</option>
              {pessoas.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {periodoInvalido && (
          <p className="campo__erro" id="erro-periodo">
            A data inicial é depois da data final. Ajuste o período.
          </p>
        )}
      </section>

      {historico.erro && (
        <div className="aviso aviso--erro" role="alert">
          <strong>Não foi possível carregar o histórico</strong>
          {historico.erro}
          <div className="aviso__links">
            <button
              type="button"
              className="btn btn--pequeno"
              onClick={historico.recarregar}
            >
              Tentar de novo
            </button>
          </div>
        </div>
      )}

      {!historico.erro && !lista && <p className="estoque__intro">Carregando...</p>}

      {!historico.erro && filtrada && (
        <>
          <div className="estoque__resumo">
            <span aria-live="polite">
              {historico.carregando
                ? "Atualizando..."
                : `${filtrada.length} ${
                    filtrada.length === 1 ? "movimentação" : "movimentações"
                  } · ${entradas} ${entradas === 1 ? "entrada" : "entradas"} · ${saidas} ${
                    saidas === 1 ? "saída" : "saídas"
                  }`}
            </span>
            {temFiltro && (
              <button type="button" className="link-botao" onClick={limparFiltros}>
                Limpar filtros
              </button>
            )}
          </div>

          {lista.length >= LIMITE && (
            <p className="campo__aviso">
              Mostrando as {LIMITE} movimentações mais recentes deste filtro. Use o período
              para ver as mais antigas.
            </p>
          )}

          {filtrada.length === 0 ? (
            <section className="tabela-cartao estoque__vazio">
              <h2>Nenhuma movimentação encontrada</h2>
              <p>
                Nada combina com os filtros escolhidos.{" "}
                {temFiltro && (
                  <button type="button" className="link-botao" onClick={limparFiltros}>
                    Limpar filtros
                  </button>
                )}
              </p>
            </section>
          ) : (
            <section
              className={`tabela-cartao ${
                historico.carregando ? "tabela-cartao--carregando" : ""
              }`}
            >
              <table className="tabela">
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Quantidade</th>
                    <th scope="col">Quando</th>
                    <th scope="col">Detalhes</th>
                    <th scope="col">Quem fez</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrada.map((mov) => (
                    <tr key={mov.id}>
                      <td className="tabela__item">
                        <strong>{mov.item}</strong>
                        <small>Lote {mov.lote_id}</small>
                      </td>
                      <td data-label="Tipo">
                        <span className={`selo selo--${mov.tipo}`}>
                          {mov.tipo === "entrada" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td data-label="Quantidade">
                        {formatarQuantidade(mov.quantidade, mov.unidade)}
                      </td>
                      <td data-label="Quando">{formatarDataHoraCompleta(mov.criado_em)}</td>
                      <td data-label="Detalhes">
                        {mov.destino || mov.observacao ? (
                          <div className="tabela__duas-linhas">
                            {mov.destino && <span>Para: {mov.destino}</span>}
                            {mov.observacao && <small>{mov.observacao}</small>}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-label="Quem fez">{mov.usuario ?? NAO_INFORMADO}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}