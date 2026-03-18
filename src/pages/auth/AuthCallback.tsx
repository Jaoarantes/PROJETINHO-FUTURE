import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { supabase } from '../../supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // PKCE flow: troca o code da URL por sessão
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          navigate('/treino', { replace: true });
          return;
        }
      }

      // Fallback: tenta pegar sessão existente (hash tokens)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/treino', { replace: true });
        return;
      }

      // Escuta mudanças de auth como último recurso
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          subscription.unsubscribe();
          navigate('/treino', { replace: true });
        }
      });

      // Timeout de segurança
      setTimeout(() => {
        subscription.unsubscribe();
        navigate('/login', { replace: true });
      }, 6000);
    };

    handleCallback();
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
