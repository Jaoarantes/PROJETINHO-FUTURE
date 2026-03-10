import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EsqueceuSenhaForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: EsqueceuSenhaForm) => {
    setError('');
    setLoading(true);
    try {
      await resetPassword(data.email);
      setSuccess(true);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      switch (firebaseError.code) {
        case 'auth/user-not-found':
          setError('Nenhuma conta encontrada com este email');
          break;
        case 'auth/too-many-requests':
          setError('Muitas tentativas. Tente novamente mais tarde.');
          break;
        default:
          setError('Erro ao enviar email. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
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
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            bgcolor: 'secondary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 1.5,
          }}
        >
          <KeyRound size={28} color="#fff" />
        </Box>
        <Typography variant="h5" gutterBottom>
          Recuperar Senha
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Digite seu email e enviaremos um link para redefinir sua senha
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
          {error}
        </Alert>
      )}

      {success ? (
        <Box sx={{ width: '100%', textAlign: 'center' }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            Email enviado! Verifique sua caixa de entrada e spam.
          </Alert>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            size="large"
            fullWidth
            startIcon={<ArrowLeft />}
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
            size="small"
            label="Email"
            type="email"
            fullWidth
            autoComplete="email"
            autoFocus
            error={!!errors.email}
            helperText={errors.email?.message}
            {...register('email')}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Enviar link de recuperação'}
          </Button>
        </Box>
      )}

      <Typography sx={{ mt: 2 }} variant="body2" color="text.secondary">
        Lembrou a senha?{' '}
        <Typography
          component={RouterLink}
          to="/login"
          color="primary.main"
          sx={{ textDecoration: 'none', fontWeight: 600 }}
        >
          Fazer login
        </Typography>
      </Typography>
    </Box>
  );
}
