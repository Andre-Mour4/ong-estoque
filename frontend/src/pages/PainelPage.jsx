import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import GraficoRosca from "../components/GraficoRosca";
import "./PainelPage.css";

const MS_DIA = 24 * 60 * 60 * 1000;

const ACOES = [
  {
    para: "/doacao",
    titulo: "Registrar doação",
    texto: "Chegou algo novo? Cadastre o lote aqui.",
    destaque: true,
  },
  {
    para: "/saida",
    titulo: "Dar saída",
    texto: "Entregou algo? Baixe do estoque.",
  },
  {
    para: "/itens",
    titulo: "Novo item",
    texto: "Primeiro cadastre o produto.",
  },
];

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function textoValidade(dias) {
  if (dias === null) return "Sem validade";
  if (dias < 0) return `Vencido há ${-dias} ${-dias === 1 ? "dia" : "dias"}`;
  if (dias === 0) return "Vence hoje";
  return `Vence em ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

function formatarQuantidade(valor, unidade) {
  return `${valor.toLocaleString("pt-BR")} ${unidade}`;
}

function formatarDataHora(iso) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function montarCards(resumo) {
  return [
    {
      chave: "vencidos",
      rotulo: "Vencidos",
      ajuda: "Já passaram da validade",
      cor: "var(--color-status-vencido)",
      filtro: "vencido",
    },
    {
      chave: "vencendo",
      rotulo: "Vencendo",
      ajuda: `Vencem em até ${resumo.dias_alerta} dias`,
      cor: "var(--color-status-vencendo)",
      filtro: "vencendo",
    },
    {
      chave: "ok",
      rotulo: "Em dia",
      ajuda: "Dentro da validade",
      cor: "var(--color-status-ok)",
      filtro: "ok",
    },
    {
      chave: "sem_validade",
      rotulo: "Sem validade",
      ajuda: "Roupas, brinquedos etc.",
      cor: "var(--color-status-sem-validade)",
      filtro: "sem_validade",
    },
  ];
}

function fraseDeAtencao(resumo) {
  if (resumo.total_lotes === 0) return "Ainda não há doações registradas.";

  const atencao = resumo.vencidos + resumo.vencendo;
  if (atencao === 0) return "Está tudo em dia por aqui.";

  const quantos =
    atencao === 1 ? "1 lote precisa de atenção" : `${atencao} lotes precisam de atenção`;
  const vencidos =
    resumo.vencidos > 0
      ? `, sendo ${resumo.vencidos} já ${resumo.vencidos === 1 ? "vencido" : "vencidos"}`
      : "";
  return `Hoje ${quantos}${vencidos}.`;
}

export default function PainelPage() {
  const { usuario } = useAuth();
  const [dados, setDados] = useState(null); // { resumo, lotes, movimentacoes }
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [visao, setVisao] = useState("lotes"); // "lotes" ou "movimentacoes"
  const [cumprimento] = useState(saudacao);

  // Busca tudo de uma vez. Para mexer nos dados do painel, comece por aqui.
  useEffect(() => {
    let ativo = true;
    const dataInicio = new Date(Date.now() - 30 * MS_DIA).toLocaleDateString(
      "sv-SE"
    ); // AAAA-MM-DD

    Promise.all([
      api("/api/lotes/resumo"),
      api("/api/lotes"),
      api(`/api/movimentacoes?data_inicio=${dataInicio}&limite=500`),
    ])
      .then(([resumo, lotes, movimentacoes]) => {
        if (ativo) setDados({ resumo, lotes, movimentacoes });
      })
      .catch((e) => {
        if (ativo) setErro(e.message);
      });

    return () => {
      ativo = false;
    };
  }, [tentativa]);

  function tentarDeNovo() {
    setErro("");
    setDados(null);
    setTentativa((valor) => valor + 1);
  }

  const primeiroNome = usuario.nome.split(" ")[0];

  if (erro) {
    return (
      <div className="cartao painel__erro" role="alert">
        <h2>Não foi possível carregar o painel</h2>
        <p>{erro}</p>
        <button type="button" className="botao" onClick={tentarDeNovo}>
          Tentar de novo
        </button>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="painel" aria-busy="true" aria-label="Carregando o painel">
        <div className="esqueleto" style={{ height: 64, maxWidth: 420 }} />
        <div className="painel__cards">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="esqueleto" style={{ height: 104 }} />
          ))}
        </div>
        <div className="esqueleto" style={{ height: 260 }} />
      </div>
    );
  }

  const { resumo, lotes, movimentacoes } = dados;
  const cards = montarCards(resumo);
  const urgentes = lotes
    .filter((lote) => lote.status === "vencido" || lote.status === "vencendo")
    .slice(0, 6);
  const recentes = movimentacoes.slice(0, 6);
  const entradas = movimentacoes.filter((m) => m.tipo === "entrada").length;
  const saidas = movimentacoes.length - entradas;

  const dadosRosca =
    visao === "lotes"
      ? [
          { rotulo: "Vencidos", valor: resumo.vencidos, cor: "var(--color-status-vencido)" },
          { rotulo: "Vencendo", valor: resumo.vencendo, cor: "var(--color-status-vencendo)" },
          { rotulo: "Em dia", valor: resumo.ok, cor: "var(--color-status-ok)" },
          {
            rotulo: "Sem validade",
            valor: resumo.sem_validade,
            cor: "var(--color-status-sem-validade)",
          },
        ]
      : [
          { rotulo: "Entradas", valor: entradas, cor: "var(--color-accent-blue)" },
          { rotulo: "Saídas", valor: saidas, cor: "var(--color-accent-orange)" },
        ];

  const alerta = resumo.vencidos + resumo.vencendo > 0;

  return (
    <div className="painel">
      <section>
        <h2 className="painel__saudacao">
          {cumprimento}, {primeiroNome}!
        </h2>
        <p className={`painel__atencao ${alerta ? "painel__atencao--alerta" : ""}`}>
          {fraseDeAtencao(resumo)}
        </p>
      </section>

      {resumo.total_lotes === 0 && (
        <section className="cartao painel__guia">
          <h3>Comece por aqui</h3>
          <ol>
            <li>
              Cadastre os produtos em <Link to="/itens">Itens</Link>.
            </li>
            <li>
              Registre a primeira doação em{" "}
              <Link to="/doacao">Registrar doação</Link>.
            </li>
            <li>Volte ao Painel: os alertas de validade aparecem aqui.</li>
          </ol>
        </section>
      )}

      <section className="painel__cards" aria-label="Situação do estoque">
        {cards.map((card) => (
          <Link
            key={card.chave}
            to={`/estoque?status=${card.filtro}`}
            className="cartao card-status"
            style={{ "--cor": card.cor }}
          >
            <span className="card-status__numero">{resumo[card.chave]}</span>
            <span className="card-status__rotulo">{card.rotulo}</span>
            <span className="card-status__ajuda">{card.ajuda}</span>
          </Link>
        ))}
      </section>

      <div className="painel__linha">
        <section className="cartao">
          <div className="cartao__topo">
            <h3>Visão geral</h3>
            <div className="abas" role="group" aria-label="Escolher gráfico">
              <button
                type="button"
                className="aba"
                aria-pressed={visao === "lotes"}
                onClick={() => setVisao("lotes")}
              >
                Situação dos lotes
              </button>
              <button
                type="button"
                className="aba"
                aria-pressed={visao === "movimentacoes"}
                onClick={() => setVisao("movimentacoes")}
              >
                Entradas e saídas
              </button>
            </div>
          </div>

          <GraficoRosca
            dados={dadosRosca}
            rotuloCentro={visao === "lotes" ? "lotes" : "movimentações"}
          />

          <p className="painel__nota">
            {visao === "lotes"
              ? "Considera só os lotes que ainda têm estoque."
              : `Movimentações dos últimos 30 dias${
                  movimentacoes.length >= 500 ? " (as 500 mais recentes)" : ""
                }.`}
          </p>
        </section>

        <section className="cartao">
          <h3>O que você quer fazer?</h3>
          <div className="acoes">
            {ACOES.map((acao) => (
              <Link
                key={acao.para}
                to={acao.para}
                className={`acao ${acao.destaque ? "acao--destaque" : ""}`}
              >
                <strong>{acao.titulo}</strong>
                <span>{acao.texto}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="painel__linha painel__linha--inferior">
        <section className="cartao">
          <div className="cartao__topo">
            <h3>Vencendo primeiro</h3>
            <Link className="painel__ver-todos" to="/estoque?status=vencendo">
              Ver estoque
            </Link>
          </div>

          {urgentes.length === 0 ? (
            <p className="painel__vazio">
              Nenhum lote vencido ou perto de vencer. Tudo em dia!
            </p>
          ) : (
            <ul className="lista">
              {urgentes.map((lote) => (
                <li key={lote.id} className="linha">
                  <div className="linha__principal">
                    <strong>{lote.item}</strong>
                    <span>
                      {formatarQuantidade(lote.quantidade_atual, lote.unidade)} ·{" "}
                      {lote.doador ?? "Doador não informado"}
                    </span>
                  </div>
                  <span className={`selo selo--${lote.status}`}>
                    {textoValidade(lote.dias_para_vencer)}
                  </span>
                  <Link className="botao botao--leve" to={`/saida?lote=${lote.id}`}>
                    Dar saída
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="cartao">
          <div className="cartao__topo">
            <h3>Últimas movimentações</h3>
            <Link className="painel__ver-todos" to="/historico">
              Ver histórico
            </Link>
          </div>

          {recentes.length === 0 ? (
            <p className="painel__vazio">
              Nenhuma movimentação nos últimos 30 dias.
            </p>
          ) : (
            <ul className="lista">
              {recentes.map((mov) => (
                <li key={mov.id} className="linha">
                  <span className={`selo selo--${mov.tipo}`}>
                    {mov.tipo === "entrada" ? "Entrada" : "Saída"}
                  </span>
                  <div className="linha__principal">
                    <strong>
                      {formatarQuantidade(mov.quantidade, mov.unidade)} de {mov.item}
                    </strong>
                    <span>
                      {formatarDataHora(mov.criado_em)}
                      {mov.usuario ? ` · ${mov.usuario}` : ""}
                      {mov.destino ? ` · para ${mov.destino}` : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}