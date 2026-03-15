import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert, CircularProgress,
} from '@mui/material';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthContext } from '../../contexts/AuthContext';

const schema = z.object({
  email: z.string().email('Email inválido'),
});
type EsqueceuSenhaForm = z.infer<typeof schema>;

export default function EsqueceuSenha() {
  const { resetPassword } = useAuthContext();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<EsqueceuSenhaForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: EsqueceuSenhaForm) => {
    setError('');
    setLoading(true);
    try {
      await resetPassword(data.email);
      setSuccess(true);
    } catch (err: unknown) {
      const supabaseError = err as { message?: string };
      const msg = supabaseError.message || '';
      if (msg.includes('rate limit') || msg.includes('too many')) {
        setError('Muitas tentativas. Tente novamente mais tarde.');
      } else {
        setError('Erro ao enviar email. Tente novamente.');
      }
    } finally { setLoading(false); }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        px: 3,
        maxWidth: '420px',
        mx: 'auto',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Ambient glow */}
      <Box
        sx={{
          position: 'absolute',
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '140%',
          height: '50%',
          background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box
          sx={{
            width: 60, height: 60, borderRadius: '18px',
            background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 2,
            boxShadow: '0 8px 24px rgba(124,58,237,0.25)',
          }}
        >
          <KeyRound size={28} color="#fff" />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '0.04em' }}>
          RECUPERAR SENHA
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Digite seu email e enviaremos um link para redefinir sua senha
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}

      {success ? (
        <Box sx={{ width: '100%', textAlign: 'center' }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            Email enviado! Verifique sua caixa de entrada e spam.
          </Alert>
          <Button
            component={RouterLink} to="/login"
            variant="contained" size="large" fullWidth
            startIcon={<ArrowLeft size={18} />}
          >
            Voltar ao Login
          </Button>
        </Box>
      ) : (
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}
        >
          <TextField
            size="small" label="Email" type="email" fullWidth
            autoComplete="email" autoFocus
            error={!!errors.email} helperText={errors.email?.message}
            {...register('email')}
          />
          <Button
            type="submit" variant="contained" size="large" fullWidth
            disabled={loading} sx={{ py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Enviar link de recuperação'}
          </Button>
        </Box>
      )}

      <Typography sx={{ mt: 2.5 }} variant="body2" color="text.secondary">
        Lembrou a senha?{' '}
        <Typography
          component={RouterLink} to="/login" color="primary.main"
          sx={{ textDecoration: 'none', fontWeight: 600 }}
        >
          Fazer login
        </Typography>
      </Typography>
    </Box>
  );
}
