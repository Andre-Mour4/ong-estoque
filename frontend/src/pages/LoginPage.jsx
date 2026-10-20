import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./LoginPage.css";
import backgroundImage from "../assets/login-background.png";

export default function LoginPage() {
  const { usuario, entrar } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Quem já está logado não precisa ver a tela de login.
  if (usuario) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim() || !senha) {
      setErro("Preencha e-mail e senha para continuar.");
      return;
    }

    setErro("");
    setEnviando(true);

    try {
      await entrar(email.trim(), senha);
      navigate("/", { replace: true });
    } catch (e) {
      // A mensagem já vem em português do backend (ex.: "E-mail ou senha incorretos.")
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <div
      className="login-page"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <main className="login-card">
        <h1 className="login-brand">Sonho de um Menino</h1>
        <p className="login-subtitle">Controle de estoque de doações</p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="login-label" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="login-input"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            disabled={enviando}
          />

          <label className="login-label" htmlFor="senha">
            Senha
          </label>
          <input
            id="senha"
            name="senha"
            type="password"
            className="login-input"
            placeholder="Sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            disabled={enviando}
          />

          {erro && (
            <p className="login-error" role="alert">
              {erro}
            </p>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={enviando}
            aria-busy={enviando}
          >
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </main>
    </div>
  );
}