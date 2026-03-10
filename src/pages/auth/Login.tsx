import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert,
  IconButton, InputAdornment, CircularProgress,
} from '@mui/material';
import { EyeOff, Eye, User, Dumbbell } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthContext } from '../../contexts/AuthContext';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type Form = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle } = useAuthContext();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setError('');
    setLoading(true);
    try {
      await signIn(data.email, data.password);
      navigate('/treino', { replace: true });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'auth/too-many-requests')
        setError('Muitas tentativas. Tente mais tarde.');
      else
        setError('Email ou senha incorretos.');
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate('/treino', { replace: true });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code !== 'auth/popup-closed-by-user')
        setError('Erro ao entrar com Google.');
    } finally { setGoogleLoading(false); }
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
      <Box sx={{ textAlign: 'center', mb: 4 }}>
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
          Future Fit
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Entre na sua conta para continuar
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <TextField
          label="Email"
          type="email"
          fullWidth
          autoComplete="email"
          error={!!errors.email}
          helperText={errors.email?.message}
          {...register('email')}
        />

        <TextField
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
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -0.5 }}>
          <Typography
            component={RouterLink}
            to="/esqueceu-senha"
            variant="body2"
            color="primary.main"
            sx={{ textDecoration: 'none', fontWeight: 500, opacity: 0.85, '&:hover': { opacity: 1 } }}
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
          sx={{ py: 1.5 }}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : 'Entrar'}
        </Button>
      </Box>

      {/* Divider */}
      <Box sx={{ display: 'flex', alignItems: 'center', my: 2.5 }}>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, fontSize: '0.75rem' }}>
          ou continue com
        </Typography>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
      </Box>

      <Button
        variant="outlined"
        size="large"
        fullWidth
        startIcon={googleLoading ? <CircularProgress size={18} color="inherit" /> : <User />}
        disabled={loading || googleLoading}
        onClick={handleGoogle}
        sx={{ py: 1.5 }}
      >
        Google
      </Button>

      <Typography sx={{ mt: 3, textAlign: 'center' }} variant="body2" color="text.secondary">
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
