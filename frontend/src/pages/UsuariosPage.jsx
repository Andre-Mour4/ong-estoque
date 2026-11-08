import { useState } from "react";
import { api } from "../services/api";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../contexts/AuthContext";
import Dialogo from "../components/Dialogo";
import ErroCampo from "../components/ErroCampo";
import "../styles/formularios.css";
import "../styles/selos.css";
import "../styles/listas.css";
import "./UsuariosPage.css";

// Tela "Usuários" (só administrador): /api/usuarios.
// O admin cria usuários com senha temporária e escolhe o que cada um pode fazer.

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROTULO_PERFIL = { admin: "Administrador", voluntario: "Voluntário" };
const CAMPOS_COM_ERRO = ["nome", "email", "senha"];

function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resumoPermissoes(usuario, catalogo) {
  if (usuario.perfil === "admin") return "Acesso total";
  if (usuario.permissoes.length === 0) return "Somente consulta";
  const rotulos = Object.fromEntries(
    (catalogo?.permissoes ?? []).map((permissao) => [permissao.chave, permissao.rotulo])
  );
  return usuario.permissoes.map((chave) => rotulos[chave] ?? chave).join(", ");
}

// ---------------------------------------------------------------------------
// Mostra a senha temporária uma única vez, com botão de copiar.
// ---------------------------------------------------------------------------
function SenhaTemporaria({ texto, senha, aoFechar }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(senha);
      setCopiado(true);
    } catch {
      setCopiado(false); // sem permissão para copiar: a senha está selecionável na tela
    }
  }

  return (
    <div className="confirmacao">
      <p>{texto}</p>
      <div className="senha-temporaria">
        <code>{senha}</code>
        <button type="button" className="btn btn--pequeno" onClick={copiar}>
          {copiado ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <p className="campo__aviso">
        Esta senha aparece só agora e não poderá ser vista de novo. Passe para a pessoa por
        um canal seguro (pessoalmente, por exemplo). No primeiro acesso, ela será obrigada a
        trocar a senha.
      </p>
      <div className="form__acoes">
        <button type="button" className="btn btn--primario" onClick={aoFechar}>
          Já anotei
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Criar e editar usuário.
// ---------------------------------------------------------------------------
function FormularioUsuario({ usuario, catalogo, souEu, aoSalvar, aoCancelar }) {
  const editando = Boolean(usuario);
  const permissoesDisponiveis = catalogo.permissoes;
  const modelos = catalogo.modelos;

  const [form, setForm] = useState({
    nome: usuario?.nome ?? "",
    email: usuario?.email ?? "",
    perfil: usuario?.perfil ?? "voluntario",
    permissoes: usuario ? usuario.permissoes : modelos.voluntario,
    gerarSenha: true,
    senha: "",
  });
  const [erros, setErros] = useState({});
  const [erroServidor, setErroServidor] = useState("");
  const [enviando, setEnviando] = useState(false);

  const ehAdmin = form.perfil === "admin";

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  function alternarPermissao(chave, marcada) {
    setForm((atual) => ({
      ...atual,
      permissoes: marcada
        ? [...atual.permissoes, chave]
        : atual.permissoes.filter((existente) => existente !== chave),
    }));
  }

  function validar() {
    const problemas = {};
    const nome = form.nome.trim();
    if (!nome) problemas.nome = "Informe o nome.";
    else if (nome.length > 120) problemas.nome = "O nome pode ter no máximo 120 caracteres.";

    if (!editando) {
      const email = form.email.trim();
      if (!EMAIL_VALIDO.test(email) || email.length > 160) {
        problemas.email = "Informe um e-mail válido.";
      }
      if (!form.gerarSenha && (form.senha.length < 8 || form.senha.length > 72)) {
        problemas.senha = "A senha temporária deve ter de 8 a 72 caracteres.";
      }
    }
    return problemas;
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErroServidor("");

    const problemas = validar();
    const primeiroComErro = CAMPOS_COM_ERRO.find((campo) => problemas[campo]);
    if (primeiroComErro) {
      setErros(problemas);
      document.getElementById(`usuario-${primeiroComErro}`)?.focus();
      return;
    }

    setEnviando(true);
    try {
      const comPermissoes = ehAdmin ? {} : { permissoes: form.permissoes };
      let resposta;
      if (editando) {
        // Importante: enviar o "ativo" atual, senão a API entende que é para reativar.
        resposta = await api(`/api/usuarios/${usuario.id}`, {
          metodo: "PUT",
          corpo: {
            nome: form.nome.trim(),
            perfil: form.perfil,
            ativo: usuario.ativo,
            ...comPermissoes,
          },
        });
      } else {
        resposta = await api("/api/usuarios", {
          metodo: "POST",
          corpo: {
            nome: form.nome.trim(),
            email: form.email.trim(),
            perfil: form.perfil,
            ...comPermissoes,
            ...(form.gerarSenha ? {} : { senha: form.senha }),
          },
        });
      }
      aoSalvar(resposta, { editando });
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
        <label className="campo__rotulo" htmlFor="usuario-nome">
          Nome *
        </label>
        <input
          id="usuario-nome"
          type="text"
          className="entrada"
          maxLength={120}
          value={form.nome}
          onChange={(e) => atualizar("nome", e.target.value)}
          disabled={enviando}
          aria-invalid={Boolean(erros.nome)}
          aria-describedby={erros.nome ? "erro-usuario-nome" : undefined}
          autoComplete="off"
          data-autofocus
        />
        <ErroCampo id="erro-usuario-nome" texto={erros.nome} />
      </div>

      {editando ? (
        <div className="campo">
          <span className="campo__rotulo">E-mail</span>
          <p className="campo-fixo">{usuario.email}</p>
          <p className="campo__ajuda">O e-mail não pode ser alterado.</p>
        </div>
      ) : (
        <div className="campo">
          <label className="campo__rotulo" htmlFor="usuario-email">
            E-mail *
          </label>
          <input
            id="usuario-email"
            type="email"
            className="entrada"
            maxLength={160}
            placeholder="pessoa@exemplo.com"
            value={form.email}
            onChange={(e) => atualizar("email", e.target.value)}
            disabled={enviando}
            aria-invalid={Boolean(erros.email)}
            aria-describedby={erros.email ? "erro-usuario-email" : undefined}
            autoComplete="off"
          />
          <ErroCampo id="erro-usuario-email" texto={erros.email} />
        </div>
      )}

      <div className="campo">
        <label className="campo__rotulo" htmlFor="usuario-perfil">
          Perfil
        </label>
        <select
          id="usuario-perfil"
          className="entrada"
          value={form.perfil}
          onChange={(e) => atualizar("perfil", e.target.value)}
          disabled={enviando || souEu}
        >
          <option value="voluntario">Voluntário (você escolhe o que pode fazer)</option>
          <option value="admin">Administrador (acesso a tudo)</option>
        </select>
        {souEu && (
          <p className="campo__ajuda">Você não pode alterar o seu próprio perfil.</p>
        )}
      </div>

      <fieldset className="permissoes">
        <legend className="campo__rotulo">O que esta pessoa pode fazer</legend>

        {ehAdmin ? (
          <p className="campo__ajuda">
            Administradores têm acesso a tudo, inclusive a esta tela de Usuários.
          </p>
        ) : (
          <>
            <p className="campo__ajuda">
              Todo usuário vê o Painel e o Estoque. Marque o que mais a pessoa pode fazer:
            </p>
            <div className="modelos">
              <span>Modelos:</span>
              <button
                type="button"
                className="btn btn--pequeno"
                onClick={() => atualizar("permissoes", modelos.voluntario)}
                disabled={enviando}
              >
                Voluntário
              </button>
              <button
                type="button"
                className="btn btn--pequeno"
                onClick={() => atualizar("permissoes", modelos.consulta)}
                disabled={enviando}
              >
                Somente consulta
              </button>
              <button
                type="button"
                className="btn btn--pequeno"
                onClick={() => atualizar("permissoes", modelos.administrador)}
                disabled={enviando}
              >
                Marcar tudo
              </button>
            </div>
          </>
        )}

        <div className="permissoes__grade">
          {permissoesDisponiveis.map((permissao) => (
            <label key={permissao.chave} className="checkbox">
              <input
                type="checkbox"
                checked={ehAdmin || form.permissoes.includes(permissao.chave)}
                onChange={(e) => alternarPermissao(permissao.chave, e.target.checked)}
                disabled={enviando || ehAdmin}
              />
              {permissao.rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      {!editando && (
        <div className="campo">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.gerarSenha}
              onChange={(e) => atualizar("gerarSenha", e.target.checked)}
              disabled={enviando}
            />
            Gerar uma senha temporária automaticamente (recomendado)
          </label>

          {!form.gerarSenha && (
            <>
              <label className="campo__rotulo" htmlFor="usuario-senha">
                Senha temporária *
              </label>
              <input
                id="usuario-senha"
                type="text"
                className="entrada"
                value={form.senha}
                onChange={(e) => atualizar("senha", e.target.value)}
                disabled={enviando}
                aria-invalid={Boolean(erros.senha)}
                aria-describedby={erros.senha ? "erro-usuario-senha" : "ajuda-usuario-senha"}
                autoComplete="off"
              />
              <ErroCampo id="erro-usuario-senha" texto={erros.senha} />
              <p className="campo__ajuda" id="ajuda-usuario-senha">
                De 8 a 72 caracteres. A pessoa será obrigada a trocá-la no primeiro acesso.
              </p>
            </>
          )}
        </div>
      )}

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
          {enviando ? "Salvando..." : editando ? "Salvar alterações" : "Criar usuário"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Confirmações (cada uma faz a sua chamada e mostra o erro da API, se houver).
// ---------------------------------------------------------------------------
function Confirmacao({ children, rotuloConfirmar, rotuloEnviando, perigo, liberado = true, acao, aoConcluir, aoCancelar }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function confirmar() {
    setEnviando(true);
    setErro("");
    try {
      aoConcluir(await acao());
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <div className="confirmacao">
      {children}
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
          className={`btn ${perigo ? "btn--perigo-cheio" : "btn--primario"}`}
          onClick={confirmar}
          disabled={enviando || !liberado}
          aria-busy={enviando}
        >
          {enviando ? rotuloEnviando : rotuloConfirmar}
        </button>
      </div>
    </div>
  );
}

function ConfirmarAnonimizacao({ usuario, aoConcluir, aoCancelar }) {
  const [entendi, setEntendi] = useState(false);

  return (
    <Confirmacao
      rotuloConfirmar="Anonimizar usuário"
      rotuloEnviando="Anonimizando..."
      perigo
      liberado={entendi}
      acao={() => api(`/api/usuarios/${usuario.id}/anonimizar`, { metodo: "POST" })}
      aoConcluir={aoConcluir}
      aoCancelar={aoCancelar}
    >
      <p>
        Anonimizar <strong>{usuario.nome}</strong>? O nome e o e-mail são apagados, a conta
        é desativada e as permissões saem. Use para pedidos de eliminação de dados (LGPD).
      </p>
      <p className="campo__ajuda">
        O histórico do estoque continua, mas &quot;quem fez&quot; passa a aparecer como
        &quot;Usuário anonimizado&quot;.
      </p>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={entendi}
          onChange={(e) => setEntendi(e.target.checked)}
        />
        Entendi que isso não pode ser desfeito
      </label>
    </Confirmacao>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export default function UsuariosPage() {
  const { usuario: eu } = useAuth();
  const usuarios = useApi("/api/usuarios");
  const catalogo = useApi("/api/usuarios/permissoes");

  const [busca, setBusca] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [dialogo, setDialogo] = useState(null);
  const [aviso, setAviso] = useState("");

  const todos = usuarios.dados;
  const textoBusca = normalizar(busca.trim());
  const visiveis = todos
    ? todos.filter(
        (u) =>
          (mostrarInativos || u.ativo) &&
          (!textoBusca || normalizar(`${u.nome} ${u.email}`).includes(textoBusca))
      )
    : null;
  const ocultos = todos ? todos.filter((u) => !u.ativo).length : 0;
  const pronto = Boolean(catalogo.dados);

  function concluir(mensagem) {
    setDialogo(null);
    setAviso(mensagem);
    usuarios.recarregar();
  }

  function aoSalvar(resposta, { editando }) {
    usuarios.recarregar();
    if (!editando && resposta.senha_temporaria) {
      setAviso("");
      setDialogo({
        tipo: "senhaGerada",
        texto: `Usuário “${resposta.nome}” criado. Esta é a senha temporária dele:`,
        senha: resposta.senha_temporaria,
      });
      return;
    }
    setDialogo(null);
    setAviso(
      editando
        ? `Usuário “${resposta.nome}” atualizado.`
        : `Usuário “${resposta.nome}” criado com a senha que você definiu. Ele precisará trocá-la no primeiro acesso.`
    );
  }

  function aoRedefinir(resposta) {
    usuarios.recarregar();
    setAviso("");
    setDialogo({
      tipo: "senhaGerada",
      texto: `Nova senha temporária de “${dialogo.usuario.nome}”:`,
      senha: resposta.senha_temporaria,
    });
  }

  let titulo = "";
  if (dialogo?.tipo === "form") titulo = dialogo.usuario ? "Editar usuário" : "Novo usuário";
  if (dialogo?.tipo === "senhaGerada") titulo = "Senha temporária";
  if (dialogo?.tipo === "redefinir") titulo = "Redefinir senha";
  if (dialogo?.tipo === "ativacao") titulo = dialogo.ativar ? "Reativar usuário" : "Desativar usuário";
  if (dialogo?.tipo === "anonimizar") titulo = "Anonimizar usuário";

  return (
    <div className="pagina-lista">
      <p className="pagina-lista__intro">
        Crie o acesso das pessoas que vão usar o sistema e escolha o que cada uma pode
        fazer. Quem recebe uma senha temporária precisa trocá-la no primeiro acesso.
      </p>

      <section className="barra-filtros" aria-label="Busca e filtros">
        <div className="campo">
          <label className="campo__rotulo" htmlFor="busca-usuario">
            Buscar usuário
          </label>
          <input
            id="busca-usuario"
            type="search"
            className="entrada"
            placeholder="Nome ou e-mail"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoComplete="off"
          />
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={mostrarInativos}
            onChange={(e) => setMostrarInativos(e.target.checked)}
          />
          Mostrar inativos
          {!mostrarInativos && ocultos > 0 ? ` (${ocultos})` : ""}
        </label>

        <button
          type="button"
          className="btn btn--primario"
          onClick={() => setDialogo({ tipo: "form", usuario: null })}
          disabled={!pronto}
        >
          Novo usuário
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

      {(usuarios.erro || catalogo.erro) && (
        <div className="aviso aviso--erro" role="alert">
          <strong>Não foi possível carregar os usuários</strong>
          {usuarios.erro || catalogo.erro}
          <div className="aviso__links">
            <button
              type="button"
              className="btn btn--pequeno"
              onClick={() => {
                usuarios.recarregar();
                catalogo.recarregar();
              }}
            >
              Tentar de novo
            </button>
          </div>
        </div>
      )}

      {!usuarios.erro && !todos && <p className="pagina-lista__intro">Carregando...</p>}

      {!usuarios.erro && visiveis && (
        <>
          <div className="registros-resumo">
            <span aria-live="polite">
              {usuarios.carregando
                ? "Atualizando..."
                : `${visiveis.length} ${visiveis.length === 1 ? "usuário" : "usuários"}`}
            </span>
          </div>

          {visiveis.length === 0 ? (
            <section className="vazio-cartao">
              <h2>Nenhum usuário encontrado</h2>
              <p>Nada combina com a busca. Tente outro nome ou marque “Mostrar inativos”.</p>
            </section>
          ) : (
            <ul className={`registros ${usuarios.carregando ? "registros--carregando" : ""}`}>
              {visiveis.map((u) => {
                const souEu = u.id === eu.id;
                const anonimizado = Boolean(u.anonimizado_em);
                return (
                  <li key={u.id} className="registro">
                    <div className="registro__principal">
                      <strong>{u.nome}</strong>
                      <span>{anonimizado ? "E-mail removido (LGPD)" : u.email}</span>
                      {!anonimizado && <span>{resumoPermissoes(u, catalogo.dados)}</span>}
                      <div className="registro__selos">
                        {souEu && <span className="selo selo--entrada">Você</span>}
                        {!anonimizado && (
                          <span className="selo selo--neutro">{ROTULO_PERFIL[u.perfil]}</span>
                        )}
                        {anonimizado ? (
                          <span className="selo selo--esgotado">Anonimizado</span>
                        ) : u.ativo ? (
                          <span className="selo selo--ok">Ativo</span>
                        ) : (
                          <span className="selo selo--esgotado">Inativo</span>
                        )}
                        {!anonimizado && u.deve_trocar_senha && (
                          <span className="selo selo--vencendo">Senha temporária pendente</span>
                        )}
                      </div>
                    </div>

                    {!anonimizado && (
                      <div className="registro__acoes">
                        <button
                          type="button"
                          className="btn btn--pequeno"
                          onClick={() => setDialogo({ tipo: "form", usuario: u })}
                          disabled={!pronto}
                        >
                          Editar
                        </button>
                        {!souEu && (
                          <>
                            <button
                              type="button"
                              className="btn btn--pequeno"
                              onClick={() => setDialogo({ tipo: "redefinir", usuario: u })}
                            >
                              Redefinir senha
                            </button>
                            <button
                              type="button"
                              className="btn btn--pequeno"
                              onClick={() =>
                                setDialogo({ tipo: "ativacao", usuario: u, ativar: !u.ativo })
                              }
                            >
                              {u.ativo ? "Desativar" : "Reativar"}
                            </button>
                            <button
                              type="button"
                              className="btn btn--pequeno btn--perigo"
                              onClick={() => setDialogo({ tipo: "anonimizar", usuario: u })}
                            >
                              Anonimizar
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <Dialogo aberto={dialogo !== null} titulo={titulo} aoFechar={() => setDialogo(null)}>
        {dialogo?.tipo === "form" && pronto && (
          <FormularioUsuario
            usuario={dialogo.usuario}
            catalogo={catalogo.dados}
            souEu={dialogo.usuario?.id === eu.id}
            aoSalvar={aoSalvar}
            aoCancelar={() => setDialogo(null)}
          />
        )}

        {dialogo?.tipo === "senhaGerada" && (
          <SenhaTemporaria
            texto={dialogo.texto}
            senha={dialogo.senha}
            aoFechar={() => setDialogo(null)}
          />
        )}

        {dialogo?.tipo === "redefinir" && (
          <Confirmacao
            rotuloConfirmar="Gerar nova senha"
            rotuloEnviando="Gerando..."
            acao={() =>
              api(`/api/usuarios/${dialogo.usuario.id}/redefinir-senha`, {
                metodo: "POST",
                corpo: {},
              })
            }
            aoConcluir={aoRedefinir}
            aoCancelar={() => setDialogo(null)}
          >
            <p>
              Gerar uma senha temporária nova para <strong>{dialogo.usuario.nome}</strong>? A
              senha atual deixa de funcionar e a pessoa precisará trocar a senha no próximo
              acesso.
            </p>
          </Confirmacao>
        )}

        {dialogo?.tipo === "ativacao" && (
          <Confirmacao
            rotuloConfirmar={dialogo.ativar ? "Reativar" : "Desativar"}
            rotuloEnviando="Salvando..."
            perigo={!dialogo.ativar}
            acao={() =>
              api(`/api/usuarios/${dialogo.usuario.id}`, {
                metodo: "PUT",
                corpo: {
                  nome: dialogo.usuario.nome,
                  perfil: dialogo.usuario.perfil,
                  ativo: dialogo.ativar,
                },
              })
            }
            aoConcluir={() =>
              concluir(
                dialogo.ativar
                  ? `Usuário “${dialogo.usuario.nome}” reativado.`
                  : `Usuário “${dialogo.usuario.nome}” desativado.`
              )
            }
            aoCancelar={() => setDialogo(null)}
          >
            <p>
              {dialogo.ativar ? (
                <>
                  Reativar <strong>{dialogo.usuario.nome}</strong>? A pessoa volta a poder
                  entrar com a senha que já tinha.
                </>
              ) : (
                <>
                  Desativar <strong>{dialogo.usuario.nome}</strong>? A pessoa perde o acesso
                  na hora, mesmo que esteja com o sistema aberto. O histórico dela continua.
                </>
              )}
            </p>
          </Confirmacao>
        )}

        {dialogo?.tipo === "anonimizar" && (
          <ConfirmarAnonimizacao
            usuario={dialogo.usuario}
            aoConcluir={() => concluir(`Usuário “${dialogo.usuario.nome}” anonimizado.`)}
            aoCancelar={() => setDialogo(null)}
          />
        )}
      </Dialogo>
    </div>
  );
}