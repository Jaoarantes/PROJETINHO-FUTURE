import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert,
  IconButton, InputAdornment, CircularProgress,
} from '@mui/material';
import { EyeOff, Eye, Dumbbell } from 'lucide-react';
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
        position: 'relative',
        overflow: 'hidden',
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
          background: 'radial-gradient(ellipse at center, rgba(255,107,44,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Logo */}
      <Box sx={{ textAlign: 'center', mb: 5, position: 'relative' }}>
        <Box
          sx={{
            width: 80, height: 80, borderRadius: '22px',
            background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 2.5,
            boxShadow: '0 8px 32px rgba(255,107,44,0.25)',
          }}
        >
          <Dumbbell size={40} color="#000" strokeWidth={2.5} />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '0.08em', fontSize: '2rem' }}>
          FUTURE FIT
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, letterSpacing: '0.03em' }}>
          Treine. Evolua. Conquiste.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
          sx={{ py: 1.5, mt: 0.5 }}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : 'Entrar'}
        </Button>
      </Box>

      {/* Divider */}
      <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
        <Typography variant="caption" sx={{ px: 2, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          ou continue com
        </Typography>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
      </Box>

      <Button
        variant="outlined"
        size="large"
        fullWidth
        disabled={loading || googleLoading}
        onClick={handleGoogle}
        sx={{
          py: 1.5,
          gap: 1.5,
          borderColor: 'divider',
          '&:hover': { borderColor: 'text.secondary', background: 'action.hover' },
        }}
      >
        {googleLoading ? (
          <CircularProgress size={20} color="inherit" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        )}
        Google
      </Button>

      <Typography sx={{ mt: 3.5, textAlign: 'center' }} variant="body2" color="text.secondary">
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
