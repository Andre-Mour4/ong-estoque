import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import ErroCampo from "../components/ErroCampo";
import {
  formatarData,
  formatarQuantidade,
  lerQuantidade,
  textoValidade,
} from "../utils/formatacao";
import "../styles/formularios.css";
import "../styles/selos.css";
import "./DarSaidaPage.css";

// Tela "Dar saída": registra uma saída em um LOTE (POST /api/movimentacoes).
// Fluxo: escolher o item -> escolher o lote (já vem sugerido o que vence primeiro)
// -> quantidade e destino.
// Aceita /saida?lote=ID (o botão "Dar saída" do Painel e do Estoque já abre assim).

// Atalhos de destino. Edite à vontade para combinar com o dia a dia da ONG.
const DESTINOS_RAPIDOS = ["Entrega a família", "Descarte"];
const ORDEM_CAMPOS = ["itemId", "loteId", "quantidade", "destino"];

// itemId e loteId = null significa "a pessoa ainda não mexeu": a tela sugere sozinha.
const FORM_INICIAL = {
  itemId: null,
  loteId: null,
  quantidade: "",
  destino: "",
  observacao: "",
};

// Itens que têm estoque (um por item), agrupados por categoria para o <select>.
function listarItensEmEstoque(lotes) {
  const itens = new Map();
  for (const lote of lotes) {
    const existente = itens.get(lote.item_id);
    if (existente) {
      existente.total += lote.quantidade_atual;
    } else {
      itens.set(lote.item_id, {
        id: lote.item_id,
        nome: lote.item,
        unidade: lote.unidade,
        categoria: lote.categoria ?? "Sem categoria",
        total: lote.quantidade_atual,
      });
    }
  }

  const grupos = new Map();
  const ordenados = [...itens.values()].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR")
  );
  for (const item of ordenados) {
    if (!grupos.has(item.categoria)) grupos.set(item.categoria, []);
    grupos.get(item.categoria).push(item);
  }
  return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
}

export default function DarSaidaPage() {
  const [params] = useSearchParams();
  const [resultado, setResultado] = useState(null); // { lotes } ou { erro }
  const [tentativa, setTentativa] = useState(0);
  const [form, setForm] = useState(FORM_INICIAL);
  const [errosCampo, setErrosCampo] = useState({});
  const [erroServidor, setErroServidor] = useState("");
  const [sucesso, setSucesso] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const avisoRef = useRef(null);

  // Lotes com estoque, já ordenados pela validade mais próxima.
  useEffect(() => {
    let ativo = true;
    api("/api/lotes")
      .then((lotes) => {
        if (ativo) setResultado({ lotes });
      })
      .catch((e) => {
        if (ativo) setResultado({ erro: e.message });
      });
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  // Leva a pessoa até o aviso de sucesso/erro (o botão fica no fim do formulário).
  useEffect(() => {
    if (sucesso || erroServidor) avisoRef.current?.focus();
  }, [sucesso, erroServidor]);

  function recarregar() {
    setResultado(null);
    setTentativa((valor) => valor + 1);
  }

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErrosCampo((atual) => ({ ...atual, [campo]: undefined }));
  }

  if (resultado?.erro) {
    return (
      <div className="pagina-form">
        <div className="aviso aviso--erro" role="alert">
          <strong>Não foi possível carregar o estoque</strong>
          {resultado.erro}
          <div className="aviso__links">
            <button type="button" className="btn btn--pequeno" onClick={recarregar}>
              Tentar de novo
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!resultado) {
    return (
      <div className="pagina-form">
        <p className="pagina-form__intro">Carregando...</p>
      </div>
    );
  }

  const { lotes } = resultado;

  if (lotes.length === 0) {
    return (
      <div className="pagina-form">
        <section className="form-cartao">
          <h2>Não há nada em estoque</h2>
          <p className="pagina-form__intro">
            Para dar saída, primeiro registre uma doação em{" "}
            <Link to="/doacao">Registrar doação</Link>.
          </p>
        </section>
      </div>
    );
  }

  // --- Seleção atual (o que a pessoa escolheu ou o que sugerimos) ---
  const loteDoLink = lotes.find((l) => String(l.id) === params.get("lote"));
  const itemId = form.itemId ?? (loteDoLink ? String(loteDoLink.item_id) : "");
  const lotesDoItem = lotes.filter((l) => String(l.item_id) === itemId);
  const maisCedo = lotesDoItem[0]; // a API já manda ordenado pela validade
  const escolhido =
    form.loteId !== null
      ? lotesDoItem.find((l) => String(l.id) === form.loteId)
      : undefined;
  const sugerido = form.itemId === null && loteDoLink ? loteDoLink : maisCedo;
  const loteSelecionado = escolhido ?? sugerido;

  const existeLoteQueVenceAntes =
    loteSelecionado &&
    maisCedo &&
    maisCedo.data_validade &&
    maisCedo.data_validade !== loteSelecionado.data_validade;

  function validar() {
    const erros = {};
    if (!itemId) {
      erros.itemId = "Selecione o item que saiu.";
    } else if (!loteSelecionado) {
      erros.loteId = "Escolha de qual lote vai sair.";
    }

    const quantidade = lerQuantidade(form.quantidade);
    if (quantidade === null) {
      erros.quantidade =
        "Informe uma quantidade maior que zero, com até 2 casas decimais (ex.: 2,5).";
    } else if (loteSelecionado && quantidade > loteSelecionado.quantidade_atual) {
      erros.quantidade = `Só há ${formatarQuantidade(
        loteSelecionado.quantidade_atual,
        loteSelecionado.unidade
      )} disponível neste lote.`;
    }

    if (form.destino.trim().length > 160) {
      erros.destino = "O destino pode ter no máximo 160 caracteres.";
    }
    return erros;
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErroServidor("");
    setSucesso(null);

    const erros = validar();
    const primeiroComErro = ORDEM_CAMPOS.find((campo) => erros[campo]);
    if (primeiroComErro) {
      setErrosCampo(erros);
      document.getElementById(primeiroComErro)?.focus();
      return;
    }

    const quantidade = lerQuantidade(form.quantidade);
    const esgotaOItem =
      lotesDoItem.length === 1 && quantidade === loteSelecionado.quantidade_atual;

    setEnviando(true);
    try {
      const movimentacao = await api("/api/movimentacoes", {
        metodo: "POST",
        corpo: {
          lote_id: loteSelecionado.id,
          tipo: "saida",
          quantidade,
          destino: form.destino.trim() || null,
          observacao: form.observacao.trim() || null,
        },
      });

      setSucesso({
        item: loteSelecionado.item,
        unidade: loteSelecionado.unidade,
        quantidade,
        restante: movimentacao.quantidade_atual_do_lote,
      });
      // Mantém item, lote e destino: facilita várias saídas seguidas para o mesmo lugar.
      setForm((atual) => {
        const proximo = { ...atual, quantidade: "", observacao: "" };
        return esgotaOItem ? { ...proximo, itemId: "", loteId: null } : proximo;
      });
      setErrosCampo({});
      setTentativa((valor) => valor + 1); // atualiza as quantidades disponíveis
    } catch (e) {
      setErroServidor(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina-form">
      <p className="pagina-form__intro">
        Escolha o item, depois de qual lote ele vai sair e quanto. Sugerimos sempre o
        lote que <strong>vence primeiro</strong>, para nada estragar no estoque.
      </p>

      <section className="form-cartao">
        {sucesso && (
          <div
            ref={avisoRef}
            tabIndex={-1}
            className="aviso aviso--sucesso"
            role="status"
            style={{ marginBottom: 18 }}
          >
            <strong>Saída registrada!</strong>
            {formatarQuantidade(sucesso.quantidade, sucesso.unidade)} de {sucesso.item}.{" "}
            {sucesso.restante > 0
              ? `Restam ${formatarQuantidade(sucesso.restante, sucesso.unidade)} neste lote.`
              : "Este lote acabou."}
            <div className="aviso__links">
              <Link to="/estoque">Ver estoque</Link>
              <Link to="/">Voltar ao Painel</Link>
            </div>
          </div>
        )}

        {erroServidor && (
          <div
            ref={avisoRef}
            tabIndex={-1}
            className="aviso aviso--erro"
            role="alert"
            style={{ marginBottom: 18 }}
          >
            <strong>Não foi possível registrar</strong>
            {erroServidor}
          </div>
        )}

        <form className="form" onSubmit={enviar} noValidate>
          <div className="campo">
            <label className="campo__rotulo" htmlFor="itemId">
              Item *
            </label>
            <select
              id="itemId"
              className="entrada"
              value={itemId}
              onChange={(e) =>
                setForm((atual) => ({
                  ...atual,
                  itemId: e.target.value,
                  loteId: null,
                  quantidade: "",
                }))
              }
              disabled={enviando}
              aria-invalid={Boolean(errosCampo.itemId)}
              aria-describedby={errosCampo.itemId ? "erro-itemId" : undefined}
            >
              <option value="">Selecione o item...</option>
              {listarItensEmEstoque(lotes).map(([categoria, lista]) => (
                <optgroup key={categoria} label={categoria}>
                  {lista.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome} ({formatarQuantidade(item.total, item.unidade)} em estoque)
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ErroCampo id="erro-itemId" texto={errosCampo.itemId} />
          </div>

          {itemId && lotesDoItem.length > 0 && (
            <fieldset className="lote-opcoes">
              <legend className="campo__rotulo">De qual lote vai sair? *</legend>
              {lotesDoItem.map((lote, indice) => {
                const marcado = loteSelecionado?.id === lote.id;
                return (
                  <label
                    key={lote.id}
                    className={`lote-opcao ${marcado ? "lote-opcao--ativo" : ""}`}
                  >
                    <input
                      id={indice === 0 ? "loteId" : undefined}
                      type="radio"
                      name="lote"
                      value={lote.id}
                      checked={marcado}
                      onChange={() => atualizar("loteId", String(lote.id))}
                      disabled={enviando}
                    />
                    <div className="lote-opcao__texto">
                      <strong>
                        {lote.data_validade
                          ? `Validade ${formatarData(lote.data_validade)}`
                          : "Sem validade"}
                        {indice === 0 && lotesDoItem.length > 1 && lote.data_validade
                          ? " · sugerido"
                          : ""}
                      </strong>
                      <span>
                        {formatarQuantidade(lote.quantidade_atual, lote.unidade)}{" "}
                        disponíveis · {lote.doador ?? "Doador não informado"} · chegou em{" "}
                        {formatarData(lote.data_entrada)}
                      </span>
                    </div>
                    {lote.status !== "sem_validade" && (
                      <span className={`selo selo--${lote.status}`}>
                        {textoValidade(lote.dias_para_vencer)}
                      </span>
                    )}
                  </label>
                );
              })}
              <ErroCampo id="erro-loteId" texto={errosCampo.loteId} />
              {existeLoteQueVenceAntes && (
                <p className="campo__aviso">
                  Existe um lote que vence antes (
                  {formatarData(maisCedo.data_validade)}). O comum é retirar primeiro o
                  que vence antes.
                </p>
              )}
              {loteSelecionado?.status === "vencido" && (
                <p className="campo__aviso">
                  Este lote já venceu. Se for descartar, use o destino &quot;Descarte&quot;.
                </p>
              )}
            </fieldset>
          )}

          <div className="campo">
            <label className="campo__rotulo" htmlFor="quantidade">
              Quantidade *
            </label>
            <div
              className={`entrada-sufixo ${
                errosCampo.quantidade ? "entrada-sufixo--erro" : ""
              }`}
            >
              <input
                id="quantidade"
                type="text"
                inputMode="decimal"
                placeholder="Ex.: 3"
                value={form.quantidade}
                onChange={(e) => atualizar("quantidade", e.target.value)}
                disabled={enviando || !loteSelecionado}
                aria-invalid={Boolean(errosCampo.quantidade)}
                aria-describedby={errosCampo.quantidade ? "erro-quantidade" : "ajuda-quantidade"}
                autoComplete="off"
              />
              <span className="entrada-sufixo__texto">
                {loteSelecionado ? loteSelecionado.unidade : "unid."}
              </span>
            </div>
            <ErroCampo id="erro-quantidade" texto={errosCampo.quantidade} />
            <p className="campo__ajuda" id="ajuda-quantidade">
              {loteSelecionado ? (
                <>
                  Disponível neste lote:{" "}
                  {formatarQuantidade(
                    loteSelecionado.quantidade_atual,
                    loteSelecionado.unidade
                  )}
                  .{" "}
                  <button
                    type="button"
                    className="link-botao"
                    onClick={() =>
                      atualizar(
                        "quantidade",
                        String(loteSelecionado.quantidade_atual).replace(".", ",")
                      )
                    }
                  >
                    Retirar tudo
                  </button>
                </>
              ) : (
                "Escolha o item e o lote primeiro."
              )}
            </p>
          </div>

          <div className="campo">
            <label className="campo__rotulo" htmlFor="destino">
              Destino
            </label>
            <input
              id="destino"
              type="text"
              className="entrada"
              placeholder="Ex.: Entrega a família, evento da ONG"
              maxLength={160}
              value={form.destino}
              onChange={(e) => atualizar("destino", e.target.value)}
              disabled={enviando}
              aria-invalid={Boolean(errosCampo.destino)}
              aria-describedby={errosCampo.destino ? "erro-destino" : undefined}
              autoComplete="off"
            />
            <ErroCampo id="erro-destino" texto={errosCampo.destino} />
            <div className="chips-destino">
              {DESTINOS_RAPIDOS.map((destino) => (
                <button
                  key={destino}
                  type="button"
                  className="chip-destino"
                  onClick={() => atualizar("destino", destino)}
                  disabled={enviando}
                >
                  {destino}
                </button>
              ))}
            </div>
            <p className="campo__ajuda">
              Use algo genérico, como &quot;Entrega a família&quot;. Não escreva nomes,
              endereços ou dados de pessoas atendidas (principalmente crianças).
            </p>
          </div>

          <div className="campo">
            <label className="campo__rotulo" htmlFor="observacao">
              Observação
            </label>
            <textarea
              id="observacao"
              className="entrada"
              placeholder="Opcional."
              value={form.observacao}
              onChange={(e) => atualizar("observacao", e.target.value)}
              disabled={enviando}
            />
            <p className="campo__ajuda">
              Não registre dados pessoais de pessoas atendidas.
            </p>
          </div>

          <div className="form__acoes">
            <button
              type="submit"
              className="btn btn--primario"
              disabled={enviando}
              aria-busy={enviando}
            >
              {enviando ? "Registrando..." : "Registrar saída"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}