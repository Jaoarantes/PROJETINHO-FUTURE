import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import AppShell from './components/layout/AppShell';
import PrivateRoute from './components/layout/PrivateRoute';
import AuthCallback from './pages/auth/AuthCallback';
import Login from './pages/auth/Login';
import UpdatePrompt from './components/UpdatePrompt';

// Lazy load das páginas pesadas
const Registro = lazy(() => import('./pages/auth/Registro'));
const EsqueceuSenha = lazy(() => import('./pages/auth/EsqueceuSenha'));
const RedefinirSenha = lazy(() => import('./pages/auth/RedefinirSenha'));
const TreinoTab = lazy(() => import('./pages/treino/TreinoTab'));
const SessaoTreino = lazy(() => import('./pages/treino/SessaoTreino'));
const DietaTab = lazy(() => import('./pages/dieta/DietaTab'));
const Historico = lazy(() => import('./pages/Historico'));
const Perfil = lazy(() => import('./pages/Perfil'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StravaCallback = lazy(() => import('./pages/treino/StravaCallback'));
const FeedTab = lazy(() => import('./pages/feed/FeedTab'));
const PostDetalhe = lazy(() => import('./pages/feed/PostDetalhe'));
const CriarPost = lazy(() => import('./pages/feed/CriarPost'));
const MeusPosts = lazy(() => import('./pages/feed/MeusPosts'));
const Notificacoes = lazy(() => import('./pages/feed/Notificacoes'));
const PerfilUsuario = lazy(() => import('./pages/feed/PerfilUsuario'));
const BuscaUsuarios = lazy(() => import('./pages/feed/BuscaUsuarios'));
const NotificacoesConfig = lazy(() => import('./pages/NotificacoesConfig'));

function Loading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress size={28} />
    </Box>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <UpdatePrompt />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/esqueceu-senha" element={<EsqueceuSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />

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
            <Route path="/perfil/notificacoes" element={<NotificacoesConfig />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/strava/callback" element={<StravaCallback />} />
            <Route path="/feed" element={<FeedTab />} />
            <Route path="/feed/novo" element={<CriarPost />} />
            <Route path="/feed/meus-posts" element={<MeusPosts />} />
            <Route path="/feed/notificacoes" element={<Notificacoes />} />
            <Route path="/feed/busca" element={<BuscaUsuarios />} />
            <Route path="/feed/perfil/:userId" element={<PerfilUsuario />} />
            <Route path="/feed/:postId" element={<PostDetalhe />} />
          </Route>

          <Route path="*" element={<Navigate to="/treino" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
