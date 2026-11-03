import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import "../styles/formularios.css";

// Tela "Registrar doação": cada doação vira um LOTE (POST /api/lotes),
// com quantidade e validade próprias.

function hojeISO() {
  return new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD
}

function formatarData(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Aceita "10", "2.5" e "2,5". Devolve null se for inválida (zero, negativa, 3+ casas).
function lerQuantidade(texto) {
  const normal = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normal)) return null;
  const numero = Number(normal);
  return numero > 0 ? numero : null;
}

function criarFormInicial(itemId) {
  return {
    itemId,
    quantidade: "",
    validade: "",
    doadorId: "",
    dataEntrada: hojeISO(),
    observacao: "",
  };
}

function agruparPorCategoria(itens) {
  const grupos = new Map();
  for (const item of itens) {
    const categoria = item.categoria ?? "Sem categoria";
    if (!grupos.has(categoria)) grupos.set(categoria, []);
    grupos.get(categoria).push(item);
  }
  return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
}

function ErroCampo({ id, texto }) {
  if (!texto) return null;
  return (
    <p className="campo__erro" id={id}>
      {texto}
    </p>
  );
}

const ORDEM_CAMPOS = ["itemId", "quantidade", "validade", "dataEntrada"];

export default function DoacaoPage() {
  const [params] = useSearchParams();
  const [hoje] = useState(hojeISO);
  const [dados, setDados] = useState(null); // { itens, doadores }
  const [erroCarga, setErroCarga] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [form, setForm] = useState(() => criarFormInicial(params.get("item") ?? ""));
  const [errosCampo, setErrosCampo] = useState({});
  const [erroServidor, setErroServidor] = useState("");
  const [loteRegistrado, setLoteRegistrado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const avisoRef = useRef(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([api("/api/itens"), api("/api/doadores")])
      .then(([itens, doadores]) => {
        if (ativo) setDados({ itens, doadores });
      })
      .catch((e) => {
        if (ativo) setErroCarga(e.message);
      });
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  // Leva a pessoa até o aviso de sucesso/erro (o botão fica no fim do formulário).
  useEffect(() => {
    if (loteRegistrado || erroServidor) avisoRef.current?.focus();
  }, [loteRegistrado, erroServidor]);

  function tentarCarregarDeNovo() {
    setErroCarga("");
    setDados(null);
    setTentativa((valor) => valor + 1);
  }

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErrosCampo((atual) => ({ ...atual, [campo]: undefined }));
  }

  if (erroCarga) {
    return (
      <div className="pagina-form">
        <div className="aviso aviso--erro" role="alert">
          <strong>Não foi possível carregar a tela</strong>
          {erroCarga}
          <div className="aviso__links">
            <button type="button" className="btn" onClick={tentarCarregarDeNovo}>
              Tentar de novo
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="pagina-form">
        <p className="pagina-form__intro">Carregando...</p>
      </div>
    );
  }

  const { itens, doadores } = dados;

  if (itens.length === 0) {
    return (
      <div className="pagina-form">
        <section className="form-cartao">
          <h2>Nenhum item cadastrado</h2>
          <p className="pagina-form__intro">
            Para registrar uma doação, primeiro cadastre o produto em{" "}
            <Link to="/itens">Itens</Link>.
          </p>
        </section>
      </div>
    );
  }

  const itemSelecionado = itens.find((item) => String(item.id) === form.itemId);
  const controlaValidade = Boolean(itemSelecionado?.controla_validade);
  const validadeJaPassou = controlaValidade && form.validade && form.validade < hoje;

  function validar() {
    const erros = {};
    if (!itemSelecionado) erros.itemId = "Selecione o item que foi doado.";
    if (lerQuantidade(form.quantidade) === null) {
      erros.quantidade =
        "Informe uma quantidade maior que zero, com até 2 casas decimais (ex.: 2,5).";
    }
    if (controlaValidade && !form.validade) {
      erros.validade = "Informe a data de validade deste item.";
    }
    if (form.dataEntrada && form.dataEntrada > hoje) {
      erros.dataEntrada = "A data de entrada não pode ser no futuro.";
    }
    return erros;
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErroServidor("");
    setLoteRegistrado(null);

    const erros = validar();
    const primeiroComErro = ORDEM_CAMPOS.find((campo) => erros[campo]);
    if (primeiroComErro) {
      setErrosCampo(erros);
      document.getElementById(primeiroComErro)?.focus();
      return;
    }

    setEnviando(true);
    try {
      const lote = await api("/api/lotes", {
        metodo: "POST",
        corpo: {
          item_id: Number(form.itemId),
          quantidade: lerQuantidade(form.quantidade),
          doador_id: form.doadorId ? Number(form.doadorId) : null,
          data_validade: controlaValidade ? form.validade : null,
          data_entrada: form.dataEntrada || null,
          observacao: form.observacao.trim() || null,
        },
      });
      setLoteRegistrado(lote);
      // Mantém doador e data de entrada: facilita registrar várias coisas do mesmo doador.
      setForm((atual) => ({
        ...criarFormInicial(""),
        doadorId: atual.doadorId,
        dataEntrada: atual.dataEntrada,
      }));
      setErrosCampo({});
    } catch (e) {
      setErroServidor(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina-form">
      <p className="pagina-form__intro">
        Preencha o que chegou. Cada doação vira um <strong>lote</strong>, com
        quantidade e validade próprias, e assim o sistema avisa quando algo estiver
        perto de vencer.
      </p>

      <section className="form-cartao">
        {loteRegistrado && (
          <div
            ref={avisoRef}
            tabIndex={-1}
            className="aviso aviso--sucesso"
            role="status"
            style={{ marginBottom: 18 }}
          >
            <strong>Doação registrada!</strong>
            {loteRegistrado.quantidade_inicial.toLocaleString("pt-BR")}{" "}
            {loteRegistrado.unidade} de {loteRegistrado.item}
            {loteRegistrado.data_validade
              ? ` · vence em ${formatarData(loteRegistrado.data_validade)}`
              : " · sem validade"}
            .
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
              value={form.itemId}
              onChange={(e) => atualizar("itemId", e.target.value)}
              disabled={enviando}
              aria-invalid={Boolean(errosCampo.itemId)}
              aria-describedby={errosCampo.itemId ? "erro-itemId" : "ajuda-itemId"}
            >
              <option value="">Selecione o item...</option>
              {agruparPorCategoria(itens).map(([categoria, lista]) => (
                <optgroup key={categoria} label={categoria}>
                  {lista.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome} ({item.unidade})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ErroCampo id="erro-itemId" texto={errosCampo.itemId} />
            <p className="campo__ajuda" id="ajuda-itemId">
              Não achou? <Link to="/itens">Cadastre um novo item</Link>.
            </p>
          </div>

          <div className="campos-linha">
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
                  placeholder="Ex.: 10"
                  value={form.quantidade}
                  onChange={(e) => atualizar("quantidade", e.target.value)}
                  disabled={enviando}
                  aria-invalid={Boolean(errosCampo.quantidade)}
                  aria-describedby={errosCampo.quantidade ? "erro-quantidade" : undefined}
                  autoComplete="off"
                />
                <span className="entrada-sufixo__texto">
                  {itemSelecionado ? itemSelecionado.unidade : "unid."}
                </span>
              </div>
              <ErroCampo id="erro-quantidade" texto={errosCampo.quantidade} />
            </div>

            <div className="campo">
              <label className="campo__rotulo" htmlFor="validade">
                Data de validade{controlaValidade ? " *" : ""}
              </label>
              <input
                id="validade"
                type="date"
                className="entrada"
                value={controlaValidade ? form.validade : ""}
                onChange={(e) => atualizar("validade", e.target.value)}
                disabled={enviando || !controlaValidade}
                aria-invalid={Boolean(errosCampo.validade)}
                aria-describedby="ajuda-validade"
              />
              <ErroCampo id="erro-validade" texto={errosCampo.validade} />
              <p className="campo__ajuda" id="ajuda-validade">
                {!itemSelecionado && "Escolha o item primeiro."}
                {itemSelecionado &&
                  !controlaValidade &&
                  "Este item não tem validade (ex.: roupas, brinquedos). Não precisa preencher."}
                {controlaValidade && "Está impressa na embalagem."}
              </p>
              {validadeJaPassou && (
                <p className="campo__aviso">
                  Essa data já passou: o lote será registrado como vencido.
                </p>
              )}
            </div>
          </div>

          <div className="campos-linha">
            <div className="campo">
              <label className="campo__rotulo" htmlFor="doadorId">
                Doador
              </label>
              <select
                id="doadorId"
                className="entrada"
                value={form.doadorId}
                onChange={(e) => atualizar("doadorId", e.target.value)}
                disabled={enviando}
              >
                <option value="">Não informado</option>
                {doadores.map((doador) => (
                  <option key={doador.id} value={doador.id}>
                    {doador.nome}
                  </option>
                ))}
              </select>
              <p className="campo__ajuda">
                Opcional. <Link to="/doadores">Cadastrar doador</Link>.
              </p>
            </div>

            <div className="campo">
              <label className="campo__rotulo" htmlFor="dataEntrada">
                Data em que chegou
              </label>
              <input
                id="dataEntrada"
                type="date"
                className="entrada"
                max={hoje}
                value={form.dataEntrada}
                onChange={(e) => atualizar("dataEntrada", e.target.value)}
                disabled={enviando}
                aria-invalid={Boolean(errosCampo.dataEntrada)}
                aria-describedby={errosCampo.dataEntrada ? "erro-dataEntrada" : undefined}
              />
              <ErroCampo id="erro-dataEntrada" texto={errosCampo.dataEntrada} />
            </div>
          </div>

          <div className="campo">
            <label className="campo__rotulo" htmlFor="observacao">
              Observação
            </label>
            <textarea
              id="observacao"
              className="entrada"
              placeholder="Opcional. Ex.: caixa com 2 unidades amassadas."
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
              {enviando ? "Registrando..." : "Registrar doação"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}