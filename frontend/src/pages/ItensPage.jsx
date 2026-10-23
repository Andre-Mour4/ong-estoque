import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { useApi } from "../hooks/useApi";
import { useAtraso } from "../hooks/useAtraso";
import Dialogo from "../components/Dialogo";
import ErroCampo from "../components/ErroCampo";
import { formatarQuantidade } from "../utils/formatacao";
import "../styles/formularios.css";
import "../styles/selos.css";
import "../styles/listas.css";

// Tela "Itens": cadastro dos produtos (GET/POST/PUT/DELETE /api/itens).
// O ITEM é o tipo de produto (ex.: "Feijão 1kg"). A quantidade fica nos lotes.

const UNIDADES_COMUNS = [
  "un",
  "kg",
  "g",
  "l",
  "ml",
  "pacote",
  "caixa",
  "lata",
  "garrafa",
  "saco",
  "pote",
  "par",
];
const NOVA_CATEGORIA = "__nova__";
const ORDEM_CAMPOS = ["nome", "novaCategoria", "unidade"];

function FormularioItem({ item, categorias, aoSalvar, aoCancelar }) {
  const editando = Boolean(item);
  const [form, setForm] = useState({
    nome: item?.nome ?? "",
    categoriaId: item?.categoria_id ? String(item.categoria_id) : "",
    novaCategoria: "",
    unidade: item?.unidade ?? "un",
    controlaValidade: item?.controla_validade ?? true,
  });
  // Categorias criadas aqui dentro (aparecem no select mesmo se o cadastro falhar depois).
  const [categoriasNovas, setCategoriasNovas] = useState([]);
  const [erros, setErros] = useState({});
  const [erroServidor, setErroServidor] = useState("");
  const [enviando, setEnviando] = useState(false);

  const opcoesCategoria = [...categorias, ...categoriasNovas].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR")
  );

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  function validar() {
    const problemas = {};
    const nome = form.nome.trim();
    if (!nome) problemas.nome = "Informe o nome do item.";
    else if (nome.length > 120) {
      problemas.nome = "O nome pode ter no máximo 120 caracteres.";
    }

    if (form.categoriaId === NOVA_CATEGORIA && !form.novaCategoria.trim()) {
      problemas.novaCategoria = "Digite o nome da nova categoria.";
    }

    const unidade = form.unidade.trim();
    if (!unidade) problemas.unidade = "Informe a unidade (ex.: kg, pacote, un).";
    else if (unidade.length > 20) {
      problemas.unidade = "A unidade pode ter no máximo 20 caracteres.";
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
      document.getElementById(`item-${primeiroComErro}`)?.focus();
      return;
    }

    setEnviando(true);
    let categoriaCriada = false;
    try {
      let categoriaId =
        form.categoriaId && form.categoriaId !== NOVA_CATEGORIA
          ? Number(form.categoriaId)
          : null;

      if (form.categoriaId === NOVA_CATEGORIA) {
        const nova = await api("/api/categorias", {
          metodo: "POST",
          corpo: { nome: form.novaCategoria.trim() },
        });
        categoriaId = nova.id;
        categoriaCriada = true;
        // Se o cadastro do item falhar, a tentativa seguinte já usa esta categoria.
        setCategoriasNovas((atual) => [...atual, nova]);
        setForm((atual) => ({ ...atual, categoriaId: String(nova.id), novaCategoria: "" }));
      }

      const corpo = {
        nome: form.nome.trim(),
        categoria_id: categoriaId,
        unidade: form.unidade.trim(),
        controla_validade: form.controlaValidade,
      };
      const salvo = editando
        ? await api(`/api/itens/${item.id}`, { metodo: "PUT", corpo })
        : await api("/api/itens", { metodo: "POST", corpo });

      aoSalvar(salvo, { editando, categoriaCriada });
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
        <label className="campo__rotulo" htmlFor="item-nome">
          Nome do item *
        </label>
        <input
          id="item-nome"
          type="text"
          className="entrada"
          placeholder="Ex.: Feijão 1kg"
          maxLength={120}
          value={form.nome}
          onChange={(e) => atualizar("nome", e.target.value)}
          disabled={enviando}
          aria-invalid={Boolean(erros.nome)}
          aria-describedby={erros.nome ? "erro-item-nome" : undefined}
          autoComplete="off"
          data-autofocus
        />
        <ErroCampo id="erro-item-nome" texto={erros.nome} />
      </div>

      <div className="campo">
        <label className="campo__rotulo" htmlFor="item-categoria">
          Categoria
        </label>
        <select
          id="item-categoria"
          className="entrada"
          value={form.categoriaId}
          onChange={(e) => atualizar("categoriaId", e.target.value)}
          disabled={enviando}
        >
          <option value="">Sem categoria</option>
          {opcoesCategoria.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
          <option value={NOVA_CATEGORIA}>+ Nova categoria...</option>
        </select>
      </div>

      {form.categoriaId === NOVA_CATEGORIA && (
        <div className="campo">
          <label className="campo__rotulo" htmlFor="item-novaCategoria">
            Nome da nova categoria *
          </label>
          <input
            id="item-novaCategoria"
            type="text"
            className="entrada"
            placeholder="Ex.: Medicamentos"
            value={form.novaCategoria}
            onChange={(e) => atualizar("novaCategoria", e.target.value)}
            disabled={enviando}
            aria-invalid={Boolean(erros.novaCategoria)}
            aria-describedby={erros.novaCategoria ? "erro-item-novaCategoria" : undefined}
            autoComplete="off"
          />
          <ErroCampo id="erro-item-novaCategoria" texto={erros.novaCategoria} />
        </div>
      )}

      <div className="campo">
        <label className="campo__rotulo" htmlFor="item-unidade">
          Unidade *
        </label>
        <input
          id="item-unidade"
          type="text"
          className="entrada"
          list="unidades-comuns"
          maxLength={20}
          value={form.unidade}
          onChange={(e) => atualizar("unidade", e.target.value)}
          disabled={enviando}
          aria-invalid={Boolean(erros.unidade)}
          aria-describedby={erros.unidade ? "erro-item-unidade" : "ajuda-item-unidade"}
          autoComplete="off"
        />
        <datalist id="unidades-comuns">
          {UNIDADES_COMUNS.map((unidade) => (
            <option key={unidade} value={unidade} />
          ))}
        </datalist>
        <ErroCampo id="erro-item-unidade" texto={erros.unidade} />
        <p className="campo__ajuda" id="ajuda-item-unidade">
          Como o item é contado: kg, pacote, un... Escolha da lista ou digite.
        </p>
      </div>

      <div className="campo">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.controlaValidade}
            onChange={(e) => atualizar("controlaValidade", e.target.checked)}
            disabled={enviando}
          />
          Este item tem data de validade
        </label>
        <p className="campo__ajuda">
          Desmarque para roupas, brinquedos e outros itens que não vencem.
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
          {enviando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar item"}
        </button>
      </div>
    </form>
  );
}

function ConfirmarDesativacao({ item, aoConcluir, aoCancelar }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function confirmar() {
    setEnviando(true);
    setErro("");
    try {
      await api(`/api/itens/${item.id}`, { metodo: "DELETE" });
      aoConcluir();
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <div className="confirmacao">
      <p>
        Desativar o item <strong>{item.nome}</strong>? Ele some desta lista e não aparece
        mais para novas doações.
      </p>
      {item.estoque_total > 0 && (
        <p className="campo__aviso">
          Atenção: ainda há {formatarQuantidade(item.estoque_total, item.unidade)} em
          estoque. Os lotes continuam no estoque e dá para dar saída neles, mas não será
          possível registrar novas doações deste item.
        </p>
      )}
      <p className="campo__ajuda">
        Não é possível reativar um item por esta tela. Em caso de engano, peça ajuda a quem
        cuida do sistema.
      </p>
      {erro && (
        <div className="aviso aviso--erro" role="alert">
          {erro}
        </div>
      )}
      <div className="form__acoes">
        <button type="button" className="btn" onClick={aoCancelar} disabled={enviando}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn--perigo-cheio"
          onClick={confirmar}
          disabled={enviando}
          aria-busy={enviando}
        >
          {enviando ? "Desativando..." : "Desativar item"}
        </button>
      </div>
    </div>
  );
}

export default function ItensPage() {
  const [busca, setBusca] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const buscaAplicada = useAtraso(busca.trim());

  const consulta = new URLSearchParams();
  if (buscaAplicada) consulta.set("busca", buscaAplicada);
  if (categoriaId) consulta.set("categoria_id", categoriaId);

  const itens = useApi(`/api/itens?${consulta.toString()}`);
  const categorias = useApi("/api/categorias");

  const [dialogo, setDialogo] = useState(null); // { tipo: "form" | "desativar", item? }
  const [aviso, setAviso] = useState(null); // { texto, link? }

  const temFiltro = Boolean(buscaAplicada || categoriaId);
  const listaItens = itens.dados;

  function aoSalvarItem(salvo, { editando, categoriaCriada }) {
    setDialogo(null);
    setAviso({
      texto: editando
        ? `Item “${salvo.nome}” atualizado.`
        : `Item “${salvo.nome}” cadastrado.`,
      link: editando
        ? null
        : { para: `/doacao?item=${salvo.id}`, texto: "Registrar uma doação deste item" },
    });
    itens.recarregar();
    if (categoriaCriada) categorias.recarregar();
  }

  function aoDesativarItem() {
    const nome = dialogo.item.nome;
    setDialogo(null);
    setAviso({ texto: `Item “${nome}” desativado.`, link: null });
    itens.recarregar();
  }

  function limparFiltros() {
    setBusca("");
    setCategoriaId("");
  }

  let tituloDialogo = "";
  if (dialogo?.tipo === "form") {
    tituloDialogo = dialogo.item ? "Editar item" : "Novo item";
  } else if (dialogo?.tipo === "desativar") {
    tituloDialogo = "Desativar item";
  }

  return (
    <div className="pagina-lista">
      <p className="pagina-lista__intro">
        Aqui ficam os produtos que a ONG recebe. Cadastre o item uma vez; a cada doação,
        o que chega vira um lote com quantidade e validade próprias.
      </p>

      <section className="barra-filtros" aria-label="Busca e filtros">
        <div className="campo">
          <label className="campo__rotulo" htmlFor="busca-item">
            Buscar item
          </label>
          <input
            id="busca-item"
            type="search"
            className="entrada"
            placeholder="Ex.: arroz"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="campo">
          <label className="campo__rotulo" htmlFor="filtro-categoria">
            Categoria
          </label>
          <select
            id="filtro-categoria"
            className="entrada"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="">Todas</option>
            {(categorias.dados ?? []).map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn btn--primario"
          onClick={() => setDialogo({ tipo: "form", item: null })}
        >
          Novo item
        </button>
      </section>

      {aviso && (
        <div className="aviso aviso--sucesso" role="status">
          <strong>{aviso.texto}</strong>
          <div className="aviso__links">
            {aviso.link && <Link to={aviso.link.para}>{aviso.link.texto}</Link>}
            <button type="button" className="link-botao" onClick={() => setAviso(null)}>
              Fechar aviso
            </button>
          </div>
        </div>
      )}

      {itens.erro && (
        <div className="aviso aviso--erro" role="alert">
          <strong>Não foi possível carregar os itens</strong>
          {itens.erro}
          <div className="aviso__links">
            <button type="button" className="btn btn--pequeno" onClick={itens.recarregar}>
              Tentar de novo
            </button>
          </div>
        </div>
      )}

      {!itens.erro && !listaItens && (
        <p className="pagina-lista__intro">Carregando...</p>
      )}

      {!itens.erro && listaItens && (
        <>
          <div className="registros-resumo">
            <span aria-live="polite">
              {itens.carregando
                ? "Atualizando..."
                : `${listaItens.length} ${listaItens.length === 1 ? "item" : "itens"}`}
            </span>
            {temFiltro && (
              <button type="button" className="link-botao" onClick={limparFiltros}>
                Limpar filtros
              </button>
            )}
          </div>

          {listaItens.length === 0 ? (
            <section className="vazio-cartao">
              <h2>{temFiltro ? "Nenhum item encontrado" : "Nenhum item cadastrado"}</h2>
              <p>
                {temFiltro
                  ? "Nada combina com a busca ou com a categoria escolhida."
                  : "Clique em “Novo item” para cadastrar o primeiro produto."}
              </p>
            </section>
          ) : (
            <ul className={`registros ${itens.carregando ? "registros--carregando" : ""}`}>
              {listaItens.map((item) => (
                <li key={item.id} className="registro">
                  <div className="registro__principal">
                    <strong>{item.nome}</strong>
                    <span>
                      {item.categoria ?? "Sem categoria"} · unidade: {item.unidade}
                    </span>
                    <div className="registro__selos">
                      <span className="selo selo--neutro">
                        {item.controla_validade ? "Controla validade" : "Sem validade"}
                      </span>
                      <span
                        className={`selo ${
                          item.estoque_total > 0 ? "selo--ok" : "selo--esgotado"
                        }`}
                      >
                        {item.estoque_total > 0
                          ? `${formatarQuantidade(item.estoque_total, item.unidade)} em estoque`
                          : "Sem estoque"}
                      </span>
                    </div>
                  </div>

                  <div className="registro__acoes">
                    <Link className="btn btn--pequeno" to={`/doacao?item=${item.id}`}>
                      Registrar doação
                    </Link>
                    <button
                      type="button"
                      className="btn btn--pequeno"
                      onClick={() => setDialogo({ tipo: "form", item })}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn--pequeno btn--perigo"
                      onClick={() => setDialogo({ tipo: "desativar", item })}
                    >
                      Desativar
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
          <FormularioItem
            item={dialogo.item}
            categorias={categorias.dados ?? []}
            aoSalvar={aoSalvarItem}
            aoCancelar={() => setDialogo(null)}
          />
        )}
        {dialogo?.tipo === "desativar" && (
          <ConfirmarDesativacao
            item={dialogo.item}
            aoConcluir={aoDesativarItem}
            aoCancelar={() => setDialogo(null)}
          />
        )}
      </Dialogo>
    </div>
  );
}