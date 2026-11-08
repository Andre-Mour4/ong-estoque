import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { GRUPOS_MENU, TELAS_EXTRAS, tituloDaTela } from "../config/menu";
import "./AppLayout.css";

function iniciais(nome) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
}

// Moldura de todas as telas internas: barra do topo + menu ☰ + fundo.
// As telas aparecem dentro dela, no lugar do <Outlet />.
export default function AppLayout() {
  const { usuario, sair, podeFazer } = useAuth();
  const { pathname } = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const botaoMenuRef = useRef(null);
  const botaoFecharRef = useRef(null);
  const menuRef = useRef(null);

  const ehAdmin = usuario.perfil === "admin";

  // Menu só com as telas que a pessoa pode usar (grupos vazios somem).
  const gruposVisiveis = GRUPOS_MENU.filter((grupo) => !grupo.apenasAdmin || ehAdmin)
    .map((grupo) => ({
      ...grupo,
      itens: grupo.itens.filter((item) => !item.permissao || podeFazer(item.permissao)),
    }))
    .filter((grupo) => grupo.itens.length > 0);

  // O título da aba do navegador acompanha a tela (ajuda quem usa leitor de tela).
  useEffect(() => {
    const titulo = tituloDaTela(pathname);
    document.title = titulo ? `${titulo} · Sonho de um Menino` : "Sonho de um Menino";
  }, [pathname]);

  // Com o menu aberto: Esc fecha, a página de trás não rola e o foco vai pro menu.
  useEffect(() => {
    if (!menuAberto) return undefined;

    function aoApertarTecla(evento) {
      if (evento.key === "Escape") {
        setMenuAberto(false);
        botaoMenuRef.current?.focus();
        return;
      }
      if (evento.key !== "Tab") return;

      // Mantém o Tab dentro do menu enquanto ele está aberto.
      const focaveis = menuRef.current?.querySelectorAll("a[href], button:not([disabled])");
      if (!focaveis || focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoApertarTecla);
    document.body.style.overflow = "hidden";
    botaoFecharRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", aoApertarTecla);
      document.body.style.overflow = "";
    };
  }, [menuAberto]);

  function fecharMenuDevolvendoFoco() {
    setMenuAberto(false);
    botaoMenuRef.current?.focus();
  }

  return (
    <div className="app-shell">
      <a className="pular-conteudo" href="#conteudo">
        Pular para o conteúdo
      </a>

      <header className="topbar">
        <button
          ref={botaoMenuRef}
          type="button"
          className="topbar__menu"
          aria-label="Abrir menu"
          aria-expanded={menuAberto}
          aria-controls="menu-lateral"
          onClick={() => setMenuAberto(true)}
        >
          <span className="icone-menu" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>

        <h1 className="topbar__titulo">{tituloDaTela(pathname)}</h1>

        <div className="topbar__usuario">
          <div className="topbar__nome">
            <strong>{usuario.nome}</strong>
            <span>{ehAdmin ? "Administrador" : "Voluntário"}</span>
          </div>
          <span className="topbar__avatar" aria-hidden="true">
            {iniciais(usuario.nome)}
          </span>
        </div>
      </header>

      <div
        className={`menu-fundo ${menuAberto ? "menu-fundo--aberto" : ""}`}
        onClick={fecharMenuDevolvendoFoco}
        aria-hidden="true"
      />

      <nav
        id="menu-lateral"
        ref={menuRef}
        className={`menu ${menuAberto ? "menu--aberto" : ""}`}
        aria-label="Menu principal"
      >
        <div className="menu__topo">
          <span className="menu__marca">Sonho de um Menino</span>
          <button
            ref={botaoFecharRef}
            type="button"
            className="menu__fechar"
            aria-label="Fechar menu"
            onClick={fecharMenuDevolvendoFoco}
          >
            ×
          </button>
        </div>

        <div className="menu__lista">
          {gruposVisiveis.map(
            (grupo) => (
              <div className="menu__grupo" key={grupo.titulo ?? "principal"}>
                {grupo.titulo && (
                  <p className="menu__grupo-titulo">{grupo.titulo}</p>
                )}
                {grupo.itens.map((item) => (
                  <NavLink
                    key={item.caminho}
                    to={item.caminho}
                    end={item.caminho === "/"}
                    className={({ isActive }) =>
                      `menu__link ${isActive ? "menu__link--ativo" : ""}`
                    }
                    onClick={() => setMenuAberto(false)}
                  >
                    {item.rotulo}
                  </NavLink>
                ))}
              </div>
            )
          )}
        </div>

        <div className="menu__rodape">
          <p className="menu__grupo-titulo">Minha conta</p>
          {TELAS_EXTRAS.map((item) => (
            <NavLink
              key={item.caminho}
              to={item.caminho}
              className={({ isActive }) =>
                `menu__link ${isActive ? "menu__link--ativo" : ""}`
              }
              onClick={() => setMenuAberto(false)}
            >
              {item.rotulo}
            </NavLink>
          ))}
          <NavLink to="/privacidade" className="menu__link" onClick={() => setMenuAberto(false)}>
            Política de Privacidade
          </NavLink>
          <NavLink to="/termos" className="menu__link" onClick={() => setMenuAberto(false)}>
            Termos de Uso
          </NavLink>
          <button type="button" className="menu__link menu__sair" onClick={sair}>
            Sair
          </button>
        </div>
      </nav>

      <main id="conteudo" tabIndex={-1} className="app-conteudo">
        <Outlet />
      </main>
    </div>
  );
}