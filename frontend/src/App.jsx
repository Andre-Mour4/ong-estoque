import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import RotaProtegida from "./components/RotaProtegida";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import PainelPage from "./pages/PainelPage";
import EstoquePage from "./pages/EstoquePage";
import DoacaoPage from "./pages/DoacaoPage";
import DarSaidaPage from "./pages/DarSaidaPage";
import ItensPage from "./pages/ItensPage";
import DoadoresPage from "./pages/DoadoresPage";
import HistoricoPage from "./pages/HistoricoPage";
import UsuariosPage from "./pages/UsuariosPage";
import ContaPage from "./pages/ContaPage";
import PoliticaPrivacidadePage from "./pages/PoliticaPrivacidadePage";
import TermosUsoPage from "./pages/TermosUsoPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/privacidade" element={<PoliticaPrivacidadePage />} />
          <Route path="/termos" element={<TermosUsoPage />} />

          {/* Telas internas: só entra quem está logado, dentro do AppLayout
              (barra do topo + menu ☰). Quem está com senha temporária só vê /conta. */}
          <Route element={<RotaProtegida />}>
            <Route element={<AppLayout />}>
              {/* Qualquer usuário logado */}
              <Route path="/" element={<PainelPage />} />
              <Route path="/estoque" element={<EstoquePage />} />
              <Route path="/conta" element={<ContaPage />} />

              {/* Precisam de permissão (admin sempre pode). Os nomes das permissões
                  estão em backend/src/utils/permissoes.js */}
              <Route element={<RotaProtegida permissao="registrar_doacao" />}>
                <Route path="/doacao" element={<DoacaoPage />} />
              </Route>
              <Route element={<RotaProtegida permissao="dar_saida" />}>
                <Route path="/saida" element={<DarSaidaPage />} />
              </Route>
              <Route element={<RotaProtegida permissao="gerenciar_itens" />}>
                <Route path="/itens" element={<ItensPage />} />
              </Route>
              <Route element={<RotaProtegida permissao="gerenciar_doadores" />}>
                <Route path="/doadores" element={<DoadoresPage />} />
              </Route>
              <Route element={<RotaProtegida permissao="ver_historico" />}>
                <Route path="/historico" element={<HistoricoPage />} />
              </Route>

              {/* Só administrador */}
              <Route element={<RotaProtegida apenasAdmin />}>
                <Route path="/usuarios" element={<UsuariosPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}