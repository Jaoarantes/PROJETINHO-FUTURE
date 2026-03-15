import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { App as CapApp } from '@capacitor/app';
import BottomNav from './BottomNav';
import ActiveWorkoutBar from '../treino/ActiveWorkoutBar';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTreinoStore } from '../../store/treinoStore';
import { useExercicioCustomStore } from '../../store/exercicioCustomStore';
import { useDietaStore } from '../../store/dietaStore';

const TAB_ROUTES = ['/treino', '/dieta', '/perfil'];

export default function AppShell() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const currentUid = useTreinoStore.getState().uid;
      if (currentUid === user.id) return; // Ja carregou para este usuario
      useTreinoStore.getState().carregar(user.id);
      useExercicioCustomStore.getState().carregar(user.id);
      useDietaStore.getState().carregar(user.id);
    } else {
      useTreinoStore.getState().limpar();
      useExercicioCustomStore.getState().limpar();
      useDietaStore.getState().limpar();
    }
  }, [user?.id]);

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
    </Box>
  );
}
