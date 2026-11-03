import { useState } from "react";
import { api } from "../services/api";
import { useApi } from "../hooks/useApi";
import { useAtraso } from "../hooks/useAtraso";
import Dialogo from "../components/Dialogo";
import ErroCampo from "../components/ErroCampo";
import "../styles/formularios.css";
import "../styles/selos.css";
import "../styles/listas.css";

// Tela "Doadores": cadastro de quem doa (GET/POST/PUT/DELETE /api/doadores).

const TIPOS = [
  { valor: "pessoa_fisica", rotulo: "Pessoa física" },
  { valor: "empresa", rotulo: "Empresa" },
  { valor: "campanha", rotulo: "Campanha" },
];
const ROTULO_DO_TIPO = Object.fromEntries(TIPOS.map((t) => [t.valor, t.rotulo]));
const ORDEM_CAMPOS = ["nome", "contato"];

function FormularioDoador({ doador, aoSalvar, aoCancelar }) {
  const editando = Boolean(doador);
  const [form, setForm] = useState({
    nome: doador?.nome ?? "",
    tipo: doador?.tipo ?? "pessoa_fisica",
    contato: doador?.contato ?? "",
  });
  const [erros, setErros] = useState({});
  const [erroServidor, setErroServidor] = useState("");
  const [enviando, setEnviando] = useState(false);

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  function validar() {
    const problemas = {};
    const nome = form.nome.trim();
    if (!nome) problemas.nome = "Informe o nome do doador.";
    else if (nome.length > 160) {
      problemas.nome = "O nome pode ter no máximo 160 caracteres.";
    }
    if (form.contato.trim().length > 160) {
      problemas.contato = "O contato pode ter no máximo 160 caracteres.";
    }
    return problemas;
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErroServidor("");

    const problemas = validar();
    const primeiroComErro = ORDEM_CAMPOS.find((campo) => problemas[campo]);
    if (primeiroComErro) {
      setErros(problemas);
      document.getElementById(`doador-${primeiroComErro}`)?.focus();
      return;
    }

    setEnviando(true);
    try {
      const corpo = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        contato: form.contato.trim() || null,
      };
      const salvo = editando
        ? await api(`/api/doadores/${doador.id}`, { metodo: "PUT", corpo })
        : await api("/api/doadores", { metodo: "POST", corpo });
      aoSalvar(salvo, { editando });
    } catch (e) {
      setErroServidor(e.message);
      setEnviando(false);
    }
  }

  return (
    <form className="form" onSubmit={enviar} noValidate>
      {erroServidor && (
        <div className="aviso aviso--erro" role="alert">
          <strong>Não foi possível salvar</strong>
          {erroServidor}
        </div>
      )}

      <div className="campo">
        <label className="campo__rotulo" htmlFor="doador-nome">
          Nome *
        </label>
        <input
          id="doador-nome"
          type="text"
          className="entrada"
          placeholder="Ex.: Mercado Central"
          maxLength={160}
          value={form.nome}
          onChange={(e) => atualizar("nome", e.target.value)}
          disabled={enviando}
          aria-invalid={Boolean(erros.nome)}
          aria-describedby={erros.nome ? "erro-doador-nome" : undefined}
          autoComplete="off"
          data-autofocus
        />
        <ErroCampo id="erro-doador-nome" texto={erros.nome} />
      </div>

      <div className="campo">
        <label className="campo__rotulo" htmlFor="doador-tipo">
          Tipo
        </label>
        <select
          id="doador-tipo"
          className="entrada"
          value={form.tipo}
          onChange={(e) => atualizar("tipo", e.target.value)}
          disabled={enviando}
        >
          {TIPOS.map((tipo) => (
            <option key={tipo.valor} value={tipo.valor}>
              {tipo.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label className="campo__rotulo" htmlFor="doador-contato">
          Contato
        </label>
        <input
          id="doador-contato"
          type="text"
          className="entrada"
          placeholder="Telefone ou e-mail (opcional)"
          maxLength={160}
          value={form.contato}
          onChange={(e) => atualizar("contato", e.target.value)}
          disabled={enviando}
          aria-invalid={Boolean(erros.contato)}
          aria-describedby={erros.contato ? "erro-doador-contato" : undefined}
          autoComplete="off"
        />
        <ErroCampo id="erro-doador-contato" texto={erros.contato} />
        <p className="campo__ajuda">
          Use só telefone ou e-mail de contato. Não informe CPF, RG nem endereço.
        </p>
      </div>

      <div className="form__acoes">
        <button type="button" className="btn" onClick={aoCancelar} disabled={enviando}>
          Cancelar
        </button>
        <button
          type="submit"
          className="btn btn--primario"
          disabled={enviando}
          aria-busy={enviando}
        >
          {enviando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar doador"}
        </button>
      </div>
    </form>
  );
}

function ConfirmarExclusao({ doador, aoConcluir, aoCancelar }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function confirmar() {
    setEnviando(true);
    setErro("");
    try {
      await api(`/api/doadores/${doador.id}`, { metodo: "DELETE" });
      aoConcluir();
    } catch (e) {
      // Ex.: "Este doador tem lotes vinculados e não pode ser apagado."
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <div className="confirmacao">
      <p>
        Apagar o doador <strong>{doador.nome}</strong>? Esta ação não pode ser desfeita.
      </p>
      <p className="campo__ajuda">
        Doadores que já têm doações registradas não podem ser apagados, para o histórico
        continuar completo.
      </p>
      {erro && (
        <div className="aviso aviso--erro" role="alert">
          {erro}
        </div>
      )}
      <div className="form__acoes">
        <button type="button" className="btn" onClick={aoCancelar} disabled={enviando}>
          {erro ? "Fechar" : "Cancelar"}
        </button>
        {!erro && (
          <button
            type="button"
            className="btn btn--perigo-cheio"
            onClick={confirmar}
            disabled={enviando}
            aria-busy={enviando}
          >
            {enviando ? "Apagando..." : "Apagar doador"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DoadoresPage() {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");
  const buscaAplicada = useAtraso(busca.trim());

  const consulta = new URLSearchParams();
  if (buscaAplicada) consulta.set("busca", buscaAplicada);
  if (tipo) consulta.set("tipo", tipo);

  const doadores = useApi(`/api/doadores?${consulta.toString()}`);

  const [dialogo, setDialogo] = useState(null); // { tipo: "form" | "apagar", doador? }
  const [aviso, setAviso] = useState("");

  const temFiltro = Boolean(buscaAplicada || tipo);
  const lista = doadores.dados;

  function aoSalvarDoador(salvo, { editando }) {
    setDialogo(null);
    setAviso(
      editando
        ? `Doador “${salvo.nome}” atualizado.`
        : `Doador “${salvo.nome}” cadastrado.`
    );
    doadores.recarregar();
  }

  function aoApagarDoador() {
    const nome = dialogo.doador.nome;
    setDialogo(null);
    setAviso(`Doador “${nome}” apagado.`);
    doadores.recarregar();
  }

  function limparFiltros() {
    setBusca("");
    setTipo("");
  }

  let tituloDialogo = "";
  if (dialogo?.tipo === "form") {
    tituloDialogo = dialogo.doador ? "Editar doador" : "Novo doador";
  } else if (dialogo?.tipo === "apagar") {
    tituloDialogo = "Apagar doador";
  }

  return (
    <div className="pagina-lista">
      <p className="pagina-lista__intro">
        Cadastre quem doa (pessoa, empresa ou campanha). Ao registrar uma doação, você
        escolhe o doador e depois consegue saber de onde veio cada lote.
      </p>

      <section className="barra-filtros" aria-label="Busca e filtros">
        <div className="campo">
          <label className="campo__rotulo" htmlFor="busca-doador">
            Buscar doador
          </label>
          <input
            id="busca-doador"
            type="search"
            className="entrada"
            placeholder="Ex.: mercado"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="campo">
          <label className="campo__rotulo" htmlFor="filtro-tipo">
            Tipo
          </label>
          <select
            id="filtro-tipo"
            className="entrada"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="">Todos</option>
            {TIPOS.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn btn--primario"
          onClick={() => setDialogo({ tipo: "form", doador: null })}
        >
          Novo doador
        </button>
      </section>

      {aviso && (
        <div className="aviso aviso--sucesso" role="status">
          <strong>{aviso}</strong>
          <div className="aviso__links">
            <button type="button" className="link-botao" onClick={() => setAviso("")}>
              Fechar aviso
            </button>
          </div>
        </div>
      )}

      {doadores.erro && (
        <div className="aviso aviso--erro" role="alert">
          <strong>Não foi possível carregar os doadores</strong>
          {doadores.erro}
          <div className="aviso__links">
            <button
              type="button"
              className="btn btn--pequeno"
              onClick={doadores.recarregar}
            >
              Tentar de novo
            </button>
          </div>
        </div>
      )}

      {!doadores.erro && !lista && <p className="pagina-lista__intro">Carregando...</p>}

      {!doadores.erro && lista && (
        <>
          <div className="registros-resumo">
            <span aria-live="polite">
              {doadores.carregando
                ? "Atualizando..."
                : `${lista.length} ${lista.length === 1 ? "doador" : "doadores"}`}
            </span>
            {temFiltro && (
              <button type="button" className="link-botao" onClick={limparFiltros}>
                Limpar filtros
              </button>
            )}
          </div>

          {lista.length === 0 ? (
            <section className="vazio-cartao">
              <h2>
                {temFiltro ? "Nenhum doador encontrado" : "Nenhum doador cadastrado"}
              </h2>
              <p>
                {temFiltro
                  ? "Nada combina com a busca ou com o tipo escolhido."
                  : "Clique em “Novo doador” para cadastrar o primeiro."}
              </p>
            </section>
          ) : (
            <ul
              className={`registros ${doadores.carregando ? "registros--carregando" : ""}`}
            >
              {lista.map((doador) => (
                <li key={doador.id} className="registro">
                  <div className="registro__principal">
                    <strong>{doador.nome}</strong>
                    <span>
                      {ROTULO_DO_TIPO[doador.tipo] ?? doador.tipo} ·{" "}
                      {doador.contato ?? "sem contato"}
                    </span>
                  </div>

                  <div className="registro__acoes">
                    <button
                      type="button"
                      className="btn btn--pequeno"
                      onClick={() => setDialogo({ tipo: "form", doador })}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn--pequeno btn--perigo"
                      onClick={() => setDialogo({ tipo: "apagar", doador })}
                    >
                      Apagar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Dialogo
        aberto={dialogo !== null}
        titulo={tituloDialogo}
        aoFechar={() => setDialogo(null)}
      >
        {dialogo?.tipo === "form" && (
          <FormularioDoador
            doador={dialogo.doador}
            aoSalvar={aoSalvarDoador}
            aoCancelar={() => setDialogo(null)}
          />
        )}
        {dialogo?.tipo === "apagar" && (
          <ConfirmarExclusao
            doador={dialogo.doador}
            aoConcluir={aoApagarDoador}
            aoCancelar={() => setDialogo(null)}
          />
        )}
      </Dialogo>
    </div>
  );
}