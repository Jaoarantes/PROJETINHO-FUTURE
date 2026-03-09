import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  FitnessCenterRounded,
  VisibilityRounded,
  VisibilityOffRounded,
  Google,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthContext } from '../../contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle } = useAuthContext();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError('');
    setLoading(true);
    try {
      await signIn(data.email, data.password);
      navigate('/treino', { replace: true });
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      switch (firebaseError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Email ou senha incorretos');
          break;
        case 'auth/too-many-requests':
          setError('Muitas tentativas. Tente novamente mais tarde.');
          break;
        default:
          setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate('/treino', { replace: true });
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code !== 'auth/popup-closed-by-user') {
        setError('Erro ao entrar com Google. Tente novamente.');
      }
    } finally {
      setGoogleLoading(false);
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
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 1.5,
          }}
        >
          <FitnessCenterRounded sx={{ fontSize: 28, color: '#fff' }} />
        </Box>
        <Typography variant="h5" gutterBottom>
          Projetinho Future
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Entre na sua conta para continuar
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
          {error}
        </Alert>
      )}

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
          error={!!errors.email}
          helperText={errors.email?.message}
          {...register('email')}
        />

        <TextField
          size="small"
          label="Senha"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          autoComplete="current-password"
          error={!!errors.password}
          helperText={errors.password?.message}
          {...register('password')}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOffRounded /> : <VisibilityRounded />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Typography
            component={RouterLink}
            to="/esqueceu-senha"
            variant="body2"
            color="primary.main"
            sx={{ textDecoration: 'none', fontWeight: 500 }}
          >
            Esqueceu a senha?
          </Typography>
        </Box>

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={loading || googleLoading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Entrar'}
        </Button>
      </Box>

      <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', my: 2 }}>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
        <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
          ou
        </Typography>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
      </Box>

      <Button
        variant="outlined"
        size="large"
        fullWidth
        startIcon={googleLoading ? <CircularProgress size={20} /> : <Google />}
        disabled={loading || googleLoading}
        onClick={handleGoogleSignIn}
        sx={{
          borderColor: 'divider',
          color: 'text.primary',
          '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
        }}
      >
        Entrar com Google
      </Button>

      <Typography sx={{ mt: 2 }} variant="body2" color="text.secondary">
        Não tem conta?{' '}
        <Typography
          component={RouterLink}
          to="/registro"
          color="primary.main"
          sx={{ textDecoration: 'none', fontWeight: 600 }}
        >
          Criar conta
        </Typography>
      </Typography>
    </Box>
  );
}
