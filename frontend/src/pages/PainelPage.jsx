import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

// TELA DE EXEMPLO: mostra o resumo de validade dos lotes e serve de modelo
// de como chamar a API com o token. O painel de verdade será feito aqui.

const CARDS = [
  { chave: "vencidos", rotulo: "Vencidos", cor: "var(--color-status-vencido)" },
  { chave: "vencendo", rotulo: "Vencendo", cor: "var(--color-status-vencendo)" },
  { chave: "ok", rotulo: "Em dia", cor: "var(--color-status-ok)" },
  {
    chave: "sem_validade",
    rotulo: "Sem validade",
    cor: "var(--color-status-sem-validade)",
  },
];

const estilos = {
  pagina: { maxWidth: 960, margin: "0 auto", padding: 24 },
  topo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  titulo: {
    fontFamily: "var(--font-titulo)",
    fontSize: "1.8rem",
    margin: 0,
  },
  subtitulo: { margin: "4px 0 0", color: "var(--color-navy-soft)" },
  botaoSair: {
    padding: "8px 16px",
    border: "1.5px solid var(--color-navy)",
    borderRadius: 10,
    background: "transparent",
    color: "var(--color-navy)",
    fontWeight: 600,
    cursor: "pointer",
  },
  aviso: { color: "var(--color-navy-soft)", fontSize: "0.9rem" },
  erro: { color: "var(--color-error)" },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 16,
    marginTop: 16,
  },
  card: {
    background: "var(--color-white)",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 6px 18px -10px rgba(29, 53, 87, 0.35)",
  },
  numero: {
    fontFamily: "var(--font-titulo)",
    fontSize: "2.2rem",
    margin: 0,
    lineHeight: 1.1,
  },
  rotulo: { margin: "4px 0 0", color: "var(--color-navy-soft)" },
};

export default function PainelPage() {
  const { usuario, sair } = useAuth();
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    api("/api/lotes/resumo")
      .then((dados) => {
        if (ativo) setResumo(dados);
      })
      .catch((e) => {
        if (ativo) setErro(e.message);
      });
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <main style={estilos.pagina}>
      <header style={estilos.topo}>
        <div>
          <h1 style={estilos.titulo}>Painel</h1>
          <p style={estilos.subtitulo}>
            Olá, {usuario.nome} ({usuario.perfil})
          </p>
        </div>
        <button type="button" onClick={sair} style={estilos.botaoSair}>
          Sair
        </button>
      </header>

      <p style={estilos.aviso}>
        Tela de exemplo: o painel de verdade será construído aqui.
      </p>

      {erro && (
        <p style={estilos.erro} role="alert">
          {erro}
        </p>
      )}
      {!erro && !resumo && <p>Carregando...</p>}

      {resumo && (
        <section style={estilos.cards}>
          {CARDS.map((card) => (
            <div
              key={card.chave}
              style={{ ...estilos.card, borderLeft: `6px solid ${card.cor}` }}
            >
              <p style={estilos.numero}>{resumo[card.chave]}</p>
              <p style={estilos.rotulo}>{card.rotulo}</p>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}