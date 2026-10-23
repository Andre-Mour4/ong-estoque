import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import RotaProtegida from "./components/RotaProtegida";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import PainelPage from "./pages/PainelPage";
import DoacaoPage from "./pages/DoacaoPage";
import EstoquePage from "./pages/EstoquePage";
import DarSaidaPage from "./pages/DarSaidaPage";
import EmConstrucaoPage from "./pages/EmConstrucaoPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Telas internas: só entra quem está logado, dentro do AppLayout
              (barra do topo + menu ☰). */}
          <Route element={<RotaProtegida />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<PainelPage />} />

              {/* Telas ainda não feitas: troque o EmConstrucaoPage pela tela real. */}
              <Route path="/estoque" element={<EstoquePage />} />
              <Route path="/doacao" element={<DoacaoPage />} />
              <Route path="/saida" element={<DarSaidaPage />} />
              <Route path="/itens" element={<EmConstrucaoPage />} />
              <Route path="/doadores" element={<EmConstrucaoPage />} />
              <Route path="/historico" element={<EmConstrucaoPage />} />
              <Route path="/conta" element={<EmConstrucaoPage />} />

              {/* Só administrador */}
              <Route element={<RotaProtegida apenasAdmin />}>
                <Route path="/usuarios" element={<EmConstrucaoPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}