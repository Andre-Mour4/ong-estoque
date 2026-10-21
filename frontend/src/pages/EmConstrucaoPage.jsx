import { Link, useLocation } from "react-router-dom";
import { tituloDaTela } from "../config/menu";

// Tela provisória das páginas do menu que ainda não foram feitas.
// Quando uma tela real ficar pronta, troque este componente pela página
// dela na rota correspondente do App.jsx.
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
  titulo: {
    margin: "0 0 8px",
    fontFamily: "var(--font-titulo)",
    fontSize: "1.5rem",
  },
  texto: { margin: "0 0 16px", color: "var(--color-navy-soft)" },
  link: { color: "var(--color-accent-blue)", fontWeight: 600 },
};

export default function EmConstrucaoPage() {
  const { pathname } = useLocation();
  const titulo = tituloDaTela(pathname) || "Esta tela";

  return (
    <section style={estilos.cartao}>
      <h2 style={estilos.titulo}>{titulo}</h2>
      <p style={estilos.texto}>
        Esta tela ainda está em construção. Em breve ela estará aqui.
      </p>
      <Link to="/" style={estilos.link}>
        Voltar ao Painel
      </Link>
    </section>
  );
}