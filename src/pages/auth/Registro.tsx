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
import { EyeOff, Eye, User, Dumbbell } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthContext } from '../../contexts/AuthContext';

const registroSchema = z
  .object({
    nome: z.string().min(2, 'Mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type RegistroForm = z.infer<typeof registroSchema>;

export default function Registro() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuthContext();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistroForm>({
    resolver: zodResolver(registroSchema),
  });

  const onSubmit = async (data: RegistroForm) => {
    setError('');
    setLoading(true);
    try {
      await signUp(data.email, data.password, data.nome);
      navigate('/treino', { replace: true });
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      switch (firebaseError.code) {
        case 'auth/email-already-in-use':
          setError('Este email já está em uso');
          break;
        case 'auth/weak-password':
          setError('Senha muito fraca. Use pelo menos 6 caracteres.');
          break;
        default:
          setError('Erro ao criar conta. Tente novamente.');
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
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        px: 3,
        py: 4,
      }}
    >
      {/* Logo */}
      <Box sx={{ textAlign: 'center', mb: 3.5 }}>
        <Box
          sx={{
            width: 72, height: 72, borderRadius: '18px',
            background: '#F97316',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 2,
          }}
        >
          <Dumbbell size={36} color="#000" />
        </Box>
        <Typography variant="h5" fontWeight={700}>
          Criar Conta
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Preencha os dados para começar
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}

      <Button
        variant="outlined"
        size="large"
        fullWidth
        startIcon={googleLoading ? <CircularProgress size={20} /> : <User />}
        disabled={loading || googleLoading}
        onClick={handleGoogleSignIn}
        sx={{ mb: 2 }}
      >
        Cadastrar com Google
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, fontSize: '0.75rem' }}>
          ou preencha o formulário
        </Typography>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
      >
        <TextField
          size="small"
          label="Nome"
          fullWidth
          autoComplete="name"
          error={!!errors.nome}
          helperText={errors.nome?.message}
          {...register('nome')}
        />

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
          autoComplete="new-password"
          error={!!errors.password}
          helperText={errors.password?.message}
          {...register('password')}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <TextField
          size="small"
          label="Confirmar Senha"
          type={showConfirmPassword ? 'text' : 'password'}
          fullWidth
          autoComplete="new-password"
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
          {...register('confirmPassword')}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" size="small">
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={loading || googleLoading}
          sx={{ mt: 0.5 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Criar Conta'}
        </Button>
      </Box>

      <Typography sx={{ mt: 2.5, textAlign: 'center' }} variant="body2" color="text.secondary">
        Já tem conta?{' '}
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
