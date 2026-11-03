import { Link } from "react-router-dom";
import { TEXTOS_PENDENTES } from "../config/organizacao";
import "./PaginaLegal.css";

// Moldura das páginas de texto legal (Política de Privacidade, Termos de Uso).
// Fica fora do AppLayout de propósito: abre mesmo sem login.
export default function PaginaLegal({ titulo, atualizadoEm, children }) {
  return (
    <div className="legal">
      <main className="legal__cartao">
        <Link className="legal__voltar" to="/">
          ← Voltar ao sistema
        </Link>

        <h1>{titulo}</h1>
        {atualizadoEm && <p className="legal__data">Última atualização: {atualizadoEm}</p>}

        {TEXTOS_PENDENTES && (
          <p className="legal__rascunho" role="note">
            <strong>Rascunho:</strong> este texto ainda tem campos para a ONG preencher
            (em <code>frontend/src/config/organizacao.js</code>) e deve ser revisado por
            assessoria jurídica antes do uso com dados reais.
          </p>
        )}

        {children}
      </main>
    </div>
  );
}