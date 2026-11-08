import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Envolve as telas que exigem login.
//   <Route element={<RotaProtegida />}>                        -> qualquer usuário logado
//   <Route element={<RotaProtegida apenasAdmin />}>            -> só administrador
//   <Route element={<RotaProtegida permissao="dar_saida" />}>  -> admin ou quem recebeu a permissão
//
// Quem entrou com senha temporária só consegue abrir a tela "/conta" (trocar a senha).

const estilos = {
  cartao: {
    maxWidth: 520,
    margin: "40px auto",
    padding: 28,
    borderRadius: 16,
    background: "rgba(255, 255, 255, 0.92)",
    boxShadow: "0 10px 28px -16px rgba(29, 53, 87, 0.35)",
    textAlign: "center",
  },
  titulo: { margin: "0 0 8px", fontFamily: "var(--font-titulo)", fontSize: "1.4rem" },
  texto: { margin: "0 0 16px", color: "var(--color-navy-soft)" },
  link: { color: "var(--color-link)", fontWeight: 600 },
};

function SemAcesso() {
  return (
    <section style={estilos.cartao}>
      <h2 style={estilos.titulo}>Você não tem acesso a esta tela</h2>
      <p style={estilos.texto}>Se precisar dela, peça a um administrador do sistema.</p>
      <Link to="/" style={estilos.link}>
        Voltar ao Painel
      </Link>
    </section>
  );
}

export default function RotaProtegida({ apenasAdmin = false, permissao = null }) {
  const { usuario, carregando, podeFazer } = useAuth();
  const { pathname } = useLocation();

  if (carregando) {
    return <p style={{ padding: 24 }}>Carregando...</p>;
  }
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }
  if (usuario.deve_trocar_senha && pathname !== "/conta") {
    return <Navigate to="/conta" replace />;
  }
  if (apenasAdmin && usuario.perfil !== "admin") {
    return <SemAcesso />;
  }
  if (permissao && !podeFazer(permissao)) {
    return <SemAcesso />;
  }
  return <Outlet />;
}