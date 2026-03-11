import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import PrivateRoute from './components/layout/PrivateRoute';
import Login from './pages/auth/Login';
import Registro from './pages/auth/Registro';
import EsqueceuSenha from './pages/auth/EsqueceuSenha';
import RedefinirSenha from './pages/auth/RedefinirSenha';
import TreinoTab from './pages/treino/TreinoTab';
import SessaoTreino from './pages/treino/SessaoTreino';
import DietaTab from './pages/dieta/DietaTab';
import Historico from './pages/Historico';
import Perfil from './pages/Perfil';
import StravaCallback from './pages/treino/StravaCallback';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/esqueceu-senha" element={<EsqueceuSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />

        {/* Rotas privadas (precisa estar logado) */}
        <Route
          element={
            <PrivateRoute>
              <AppShell />
            </PrivateRoute>
          }
        >
          <Route path="/treino" element={<TreinoTab />} />
          <Route path="/treino/:id" element={<SessaoTreino />} />
          <Route path="/dieta" element={<DietaTab />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/strava/callback" element={<StravaCallback />} />
        </Route>

        {/* Redirecionar raiz para treino */}
        <Route path="*" element={<Navigate to="/treino" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
