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
  const { usuario, sair } = useAuth();
  const { pathname } = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const botaoMenuRef = useRef(null);
  const botaoFecharRef = useRef(null);

  const ehAdmin = usuario.perfil === "admin";

  // Com o menu aberto: Esc fecha, a página de trás não rola e o foco vai pro menu.
  useEffect(() => {
    if (!menuAberto) return undefined;

    function aoApertarTecla(evento) {
      if (evento.key === "Escape") {
        setMenuAberto(false);
        botaoMenuRef.current?.focus();
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
          {GRUPOS_MENU.filter((grupo) => !grupo.apenasAdmin || ehAdmin).map(
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
          <button type="button" className="menu__link menu__sair" onClick={sair}>
            Sair
          </button>
        </div>
      </nav>

      <main className="app-conteudo">
        <Outlet />
      </main>
    </div>
  );
}