import { useEffect, useId, useRef } from "react";
import "./Dialogo.css";

// Janela por cima da tela (usa o <dialog> do navegador: já fecha com Esc e
// prende o foco lá dentro).
//
//   <Dialogo aberto={dialogo !== null} titulo="Novo item" aoFechar={() => setDialogo(null)}>
//     <MeuFormulario />
//   </Dialogo>
//
// - O conteúdo só existe enquanto a janela está aberta (formulário sempre começa limpo).
// - Coloque data-autofocus no campo que deve receber o foco ao abrir.
export default function Dialogo({ aberto, titulo, aoFechar, children }) {
  const ref = useRef(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;

    if (aberto && !dialogo.open) {
      dialogo.showModal();
      dialogo.querySelector("[data-autofocus]")?.focus();
    } else if (!aberto && dialogo.open) {
      dialogo.close();
    }
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      className="dialogo"
      aria-labelledby={idTitulo}
      onClose={aoFechar}
      onClick={(evento) => {
        // Clique no fundo escuro (fora da caixa) fecha a janela.
        if (evento.target === evento.currentTarget) aoFechar();
      }}
    >
      <div className="dialogo__corpo">
        <div className="dialogo__topo">
          <h2 id={idTitulo}>{titulo}</h2>
          <button
            type="button"
            className="dialogo__fechar"
            aria-label="Fechar"
            onClick={aoFechar}
          >
            ×
          </button>
        </div>
        {aberto && children}
      </div>
    </dialog>
  );
}