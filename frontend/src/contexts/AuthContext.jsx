import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  api,
  definirAoPerderSessao,
  lerToken,
  removerToken,
  salvarToken,
} from "../services/api";

// Guarda quem está logado e disponibiliza para o app inteiro.
// Em qualquer tela: const { usuario, sair } = useAuth();
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // Se já existe token guardado, espera conferir com o servidor antes de decidir.
  const [carregando, setCarregando] = useState(() => Boolean(lerToken()));

  const sair = useCallback(() => {
    removerToken();
    setUsuario(null);
  }, []);

  // Quando o backend responde 401 em qualquer chamada, desloga.
  useEffect(() => {
    definirAoPerderSessao(sair);
  }, [sair]);

  // Ao abrir o app, valida o token guardado (mantém o login após recarregar).
  useEffect(() => {
    if (!lerToken()) return undefined;

    let ativo = true;
    api("/api/auth/me")
      .then((dados) => {
        if (ativo) setUsuario(dados.usuario);
      })
      .catch(() => {
        // 401 já desloga dentro do api(). Outros erros (servidor fora do ar)
        // só deixam o usuário na tela de login, sem apagar o token.
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const entrar = useCallback(async (email, senha) => {
    const dados = await api("/api/auth/login", {
      metodo: "POST",
      corpo: { email, senha },
      autenticado: false,
    });
    salvarToken(dados.token);
    setUsuario(dados.usuario);
  }, []);

  // Busca de novo os dados de quem está logado (ex.: depois de trocar a senha temporária).
  const recarregarUsuario = useCallback(async () => {
    const dados = await api("/api/auth/me");
    setUsuario(dados.usuario);
  }, []);

  // Administrador pode tudo; os demais, só o que o admin liberou.
  const podeFazer = useCallback(
    (permissao) =>
      usuario?.perfil === "admin" || Boolean(usuario?.permissoes?.includes(permissao)),
    [usuario]
  );

  return (
    <AuthContext.Provider
      value={{ usuario, carregando, entrar, sair, recarregarUsuario, podeFazer }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth precisa ser usado dentro do AuthProvider.");
  }
  return contexto;
}