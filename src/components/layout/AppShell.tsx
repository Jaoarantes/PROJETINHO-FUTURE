import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { App as CapApp } from '@capacitor/app';
import BottomNav from './BottomNav';
import ActiveWorkoutBar from '../treino/ActiveWorkoutBar';
import SuccessOverlay from '../SuccessOverlay';
import { useSuccessOverlayStore } from '../../store/successOverlayStore';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTreinoStore } from '../../store/treinoStore';
import { useExercicioCustomStore } from '../../store/exercicioCustomStore';
import { useDietaStore } from '../../store/dietaStore';
import { useAchievementDetector } from '../../hooks/useAchievementDetector';
import { carregarSocialStats, type SocialStats } from '../../services/feedService';
import { useNotificationStore } from '../../store/notificationStore';

const TAB_ROUTES = ['/treino', '/dieta', '/feed', '/perfil'];

const defaultSocialStats: SocialStats = {
  totalPosts: 0, postsComFoto: 0, totalChamasRecebidas: 0, totalSeguidores: 0, totalComentariosRecebidos: 0,
};

export default function AppShell() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [socialStats, setSocialStats] = useState<SocialStats>(defaultSocialStats);

  useEffect(() => {
    if (user) {
      const currentUid = useTreinoStore.getState().uid;
      if (currentUid === user.id) return;
      useTreinoStore.getState().carregar(user.id);
      useExercicioCustomStore.getState().carregar(user.id);
      useDietaStore.getState().carregar(user.id);
      carregarSocialStats(user.id).then(setSocialStats).catch(console.error);
      useNotificationStore.getState().carregar(user.id).then(() => {
        useNotificationStore.getState().aplicarNotificacoes();
      }).catch(console.error);
    } else {
      useTreinoStore.getState().limpar();
      useExercicioCustomStore.getState().limpar();
      useDietaStore.getState().limpar();
    }
  }, [user?.id]);

  useAchievementDetector(user?.id, socialStats);

  // Handle Android back button
  useEffect(() => {
    const listener = CapApp.addListener('backButton', ({ canGoBack }) => {
      const isOnTab = TAB_ROUTES.includes(location.pathname);

      if (isOnTab) {
        // On a main tab — minimize app instead of exiting
        CapApp.minimizeApp();
      } else if (canGoBack) {
        navigate(-1);
      } else {
        CapApp.minimizeApp();
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, [location.pathname, navigate]);

  const treinoAtivo = useTreinoStore((s) => s.treinoAtivo);
  const overlayOpen = useSuccessOverlayStore((s) => s.open);
  const overlayVariant = useSuccessOverlayStore((s) => s.variant);
  const hideOverlay = useSuccessOverlayStore((s) => s.hide);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box
        component="main"
        sx={{
          flex: 1,
          pb: `calc(${treinoAtivo ? '140px' : '72px'} + env(safe-area-inset-bottom, 0px))`,
          px: 2.5,
          pt: 'calc(16px + env(safe-area-inset-top, 0px))',
          width: '100%',
        }}
      >
        <Outlet />
      </Box>
      <ActiveWorkoutBar />
      <BottomNav />
      <SuccessOverlay open={overlayOpen} variant={overlayVariant} onComplete={hideOverlay} />
    </Box>
  );
}
