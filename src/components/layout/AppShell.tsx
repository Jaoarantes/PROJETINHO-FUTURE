import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import BottomNav from './BottomNav';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTreinoStore } from '../../store/treinoStore';
import { useExercicioCustomStore } from '../../store/exercicioCustomStore';
import { useDietaStore } from '../../store/dietaStore';

export default function AppShell() {
  const { user } = useAuthContext();
  const { carregar: carregarSessoes, limpar: limparSessoes } = useTreinoStore();
  const { carregar: carregarExercicios, limpar: limparExercicios } = useExercicioCustomStore();
  const { carregar: carregarDieta, limpar: limparDieta } = useDietaStore();

  useEffect(() => {
    if (user) {
      carregarSessoes(user.uid);
      carregarExercicios(user.uid);
      carregarDieta(user.uid);
    } else {
      limparSessoes();
      limparExercicios();
      limparDieta();
    }
  }, [user?.uid]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box
        component="main"
        sx={{
          flex: 1,
          pb: 'calc(72px + env(safe-area-inset-bottom, 0px))',
          px: 2.5,
          pt: 'calc(16px + env(safe-area-inset-top, 0px))',
          maxWidth: '500px',
          mx: 'auto',
          width: '100%',
        }}
      >
        <Outlet />
      </Box>
      <BottomNav />
    </Box>
  );
}
