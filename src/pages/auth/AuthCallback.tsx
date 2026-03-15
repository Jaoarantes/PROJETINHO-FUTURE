import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { supabase } from '../../supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // O Supabase detecta os tokens no hash da URL automaticamente
    // So precisamos esperar a sessao ser criada
    const checkSession = async () => {
      // Pequeno delay para o Supabase processar o hash
      await new Promise(r => setTimeout(r, 500));

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/treino', { replace: true });
        return;
      }

      // Se nao tem sessao ainda, escuta mudancas
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          subscription.unsubscribe();
          navigate('/treino', { replace: true });
        }
      });

      // Timeout de seguranca
      setTimeout(() => {
        subscription.unsubscribe();
        navigate('/login', { replace: true });
      }, 6000);
    };

    checkSession();
  }, [navigate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: 2 }}>
      <CircularProgress size={28} />
      <Typography variant="body2" color="text.secondary">
        Autenticando...
      </Typography>
    </Box>
  );
}
