import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Envolve as telas que exigem login.
//   <Route element={<RotaProtegida />}>               -> qualquer usuário logado
//   <Route element={<RotaProtegida apenasAdmin />}>   -> só administrador
export default function RotaProtegida({ apenasAdmin = false }) {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return <p style={{ padding: 24 }}>Carregando...</p>;
  }
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }
  if (apenasAdmin && usuario.perfil !== "admin") {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}