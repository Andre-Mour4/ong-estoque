import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import RotaProtegida from "./components/RotaProtegida";
import LoginPage from "./pages/LoginPage";
import PainelPage from "./pages/PainelPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Telas internas: só entra quem está logado.
              Telas novas entram aqui dentro, por exemplo:
              <Route path="/itens" element={<ItensPage />} /> */}
          <Route element={<RotaProtegida />}>
            <Route path="/" element={<PainelPage />} />
          </Route>

          {/* Telas só de administrador (ex.: /usuarios) ficam dentro de:
              <Route element={<RotaProtegida apenasAdmin />}> ... </Route> */}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}