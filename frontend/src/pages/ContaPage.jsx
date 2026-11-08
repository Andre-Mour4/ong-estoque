import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import ErroCampo from "../components/ErroCampo";
import "../styles/formularios.css";

// Tela "Minha conta": trocar a própria senha (POST /api/auth/trocar-senha).
// Também é a única tela liberada no primeiro acesso, quando a senha ainda é temporária.

const VAZIO = { atual: "", nova: "", confirmacao: "" };
const ORDEM_CAMPOS = ["atual", "nova", "confirmacao"];

export default function ContaPage() {
  const { usuario, recarregarUsuario } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(VAZIO);
  const [mostrar, setMostrar] = useState(false);
  const [erros, setErros] = useState({});
  const [erroServidor, setErroServidor] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const primeiroAcesso = usuario.deve_trocar_senha;
  const tipoCampo = mostrar ? "text" : "password";

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  function validar() {
    const problemas = {};
    if (!form.atual) problemas.atual = "Digite a senha atual.";
    if (form.nova.length < 8) {
      problemas.nova = "A nova senha deve ter pelo menos 8 caracteres.";
    } else if (form.nova.length > 72) {
      problemas.nova = "A nova senha pode ter no máximo 72 caracteres.";
    } else if (form.nova === form.atual) {
      problemas.nova = "A nova senha precisa ser diferente da atual.";
    }
    if (form.confirmacao !== form.nova) {
      problemas.confirmacao = "A confirmação não é igual à nova senha.";
    }
    return problemas;
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErroServidor("");
    setSucesso(false);

    const problemas = validar();
    const primeiroComErro = ORDEM_CAMPOS.find((campo) => problemas[campo]);
    if (primeiroComErro) {
      setErros(problemas);
      document.getElementById(`conta-${primeiroComErro}`)?.focus();
      return;
    }

    const eraPrimeiroAcesso = primeiroAcesso;
    setEnviando(true);
    try {
      await api("/api/auth/trocar-senha", {
        metodo: "POST",
        corpo: { senha_atual: form.atual, senha_nova: form.nova },
      });
      await recarregarUsuario(); // tira a marca de "senha temporária"
      if (eraPrimeiroAcesso) {
        navigate("/", { replace: true });
        return;
      }
      setForm(VAZIO);
      setSucesso(true);
    } catch (e) {
      setErroServidor(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina-form">
      {primeiroAcesso && (
        <div className="aviso" role="note" style={{ background: "#fdf0cc", color: "#5c3f00" }}>
          <strong>Primeiro acesso</strong>
          Você entrou com uma senha temporária. Escolha uma senha só sua para continuar
          usando o sistema.
        </div>
      )}

      <p className="pagina-form__intro">
        Conta de <strong>{usuario.nome}</strong> ({usuario.email}). Use uma senha que
        ninguém adivinhe e que você não use em outros lugares.
      </p>

      <section className="form-cartao">
        {sucesso && (
          <div className="aviso aviso--sucesso" role="status" style={{ marginBottom: 18 }}>
            <strong>Senha alterada!</strong>
            Na próxima vez, entre com a senha nova.
          </div>
        )}

        {erroServidor && (
          <div className="aviso aviso--erro" role="alert" style={{ marginBottom: 18 }}>
            <strong>Não foi possível trocar a senha</strong>
            {erroServidor}
          </div>
        )}

        <form className="form" onSubmit={enviar} noValidate>
          <div className="campo">
            <label className="campo__rotulo" htmlFor="conta-atual">
              {primeiroAcesso ? "Senha temporária (a que você recebeu) *" : "Senha atual *"}
            </label>
            <input
              id="conta-atual"
              type={tipoCampo}
              className="entrada"
              value={form.atual}
              onChange={(e) => atualizar("atual", e.target.value)}
              disabled={enviando}
              autoComplete="current-password"
              aria-invalid={Boolean(erros.atual)}
              aria-describedby={erros.atual ? "erro-conta-atual" : undefined}
            />
            <ErroCampo id="erro-conta-atual" texto={erros.atual} />
          </div>

          <div className="campo">
            <label className="campo__rotulo" htmlFor="conta-nova">
              Nova senha *
            </label>
            <input
              id="conta-nova"
              type={tipoCampo}
              className="entrada"
              value={form.nova}
              onChange={(e) => atualizar("nova", e.target.value)}
              disabled={enviando}
              autoComplete="new-password"
              aria-invalid={Boolean(erros.nova)}
              aria-describedby={erros.nova ? "erro-conta-nova" : "ajuda-conta-nova"}
            />
            <ErroCampo id="erro-conta-nova" texto={erros.nova} />
            <p className="campo__ajuda" id="ajuda-conta-nova">
              De 8 a 72 caracteres, diferente da senha atual.
            </p>
          </div>

          <div className="campo">
            <label className="campo__rotulo" htmlFor="conta-confirmacao">
              Repita a nova senha *
            </label>
            <input
              id="conta-confirmacao"
              type={tipoCampo}
              className="entrada"
              value={form.confirmacao}
              onChange={(e) => atualizar("confirmacao", e.target.value)}
              disabled={enviando}
              autoComplete="new-password"
              aria-invalid={Boolean(erros.confirmacao)}
              aria-describedby={erros.confirmacao ? "erro-conta-confirmacao" : undefined}
            />
            <ErroCampo id="erro-conta-confirmacao" texto={erros.confirmacao} />
          </div>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={mostrar}
              onChange={(e) => setMostrar(e.target.checked)}
            />
            Mostrar as senhas enquanto digito
          </label>

          <div className="form__acoes">
            <button
              type="submit"
              className="btn btn--primario"
              disabled={enviando}
              aria-busy={enviando}
            >
              {enviando ? "Salvando..." : "Trocar senha"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}