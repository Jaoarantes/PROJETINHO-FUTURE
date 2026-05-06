import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import UpdatePrompt from './components/UpdatePrompt';
import { supabase } from './supabase';

// Lazy load das páginas pesadas
const PrivateAppShell = lazy(() => import('./components/layout/PrivateAppShell'));
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback'));
const Login = lazy(() => import('./pages/auth/Login'));
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
const AtividadeDetalhe = lazy(() => import('./pages/treino/AtividadeDetalhe'));
const FeedTab = lazy(() => import('./pages/feed/FeedTab'));
const PostDetalhe = lazy(() => import('./pages/feed/PostDetalhe'));
const CriarPost = lazy(() => import('./pages/feed/CriarPost'));
const MeusPosts = lazy(() => import('./pages/feed/MeusPosts'));
const Notificacoes = lazy(() => import('./pages/feed/Notificacoes'));
const PerfilUsuario = lazy(() => import('./pages/feed/PerfilUsuario'));
const BuscaUsuarios = lazy(() => import('./pages/feed/BuscaUsuarios'));
const TreinoCompartilhado = lazy(() => import('./pages/feed/TreinoCompartilhado'));
const NotificacoesConfig = lazy(() => import('./pages/NotificacoesConfig'));

function Loading() {
  return (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <style>
        {'@keyframes valere-spin { to { transform: rotate(360deg); } }'}
      </style>
      <div
        aria-label="Carregando"
        style={{
          animation: 'valere-spin 0.8s linear infinite',
          border: '3px solid rgba(255, 107, 44, 0.2)',
          borderRadius: '50%',
          borderTopColor: '#FF6B2C',
          height: 28,
          width: 28,
        }}
      />
    </div>
  );
}

function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = CapApp.addListener('appUrlOpen', async ({ url }) => {
      // Handle OAuth callback deep link: com.valere.app://auth/callback?code=xxx
      try {
        const parsed = new URL(url);
        if (parsed.pathname === '/auth/callback' || parsed.pathname === '//auth/callback') {
          const code = parsed.searchParams.get('code');
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) {
              navigate('/treino', { replace: true });
              return;
            }
          }
        }
        // Generic deep link: navigate to the path
        const path = parsed.pathname.replace(/^\/\//, '/');
        if (path && path !== '/') {
          navigate(path, { replace: true });
        }
      } catch {
        // Invalid URL, ignore
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, [navigate]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <DeepLinkHandler />
      <UpdatePrompt />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/esqueceu-senha" element={<EsqueceuSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />

          <Route element={<PrivateAppShell />}>
            <Route path="/treino" element={<TreinoTab />} />
            <Route path="/treino/:id" element={<SessaoTreino />} />
            <Route path="/dieta" element={<DietaTab />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/perfil/notificacoes" element={<NotificacoesConfig />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/strava/callback" element={<StravaCallback />} />
            <Route path="/atividade/:registroId" element={<AtividadeDetalhe />} />
            <Route path="/feed" element={<FeedTab />} />
            <Route path="/feed/novo" element={<CriarPost />} />
            <Route path="/feed/meus-posts" element={<MeusPosts />} />
            <Route path="/feed/notificacoes" element={<Notificacoes />} />
            <Route path="/feed/busca" element={<BuscaUsuarios />} />
            <Route path="/feed/perfil/:userId" element={<PerfilUsuario />} />
            <Route path="/feed/treino-compartilhado/:shareId" element={<TreinoCompartilhado />} />
            <Route path="/feed/:postId" element={<PostDetalhe />} />
          </Route>

          <Route path="*" element={<Navigate to="/treino" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
