import { useState, useEffect } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert,
  CircularProgress, IconButton, InputAdornment,
} from '@mui/material';
import { EyeOff, Eye, CheckCircle2, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../../firebase';

const schema = z
  .object({
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });
type RedefinirForm = z.infer<typeof schema>;

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<RedefinirForm>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const verify = async () => {
      if (!oobCode) {
        setError('Link inválido ou expirado.');
        setVerifying(false);
        return;
      }
      try {
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
      } catch {
        setError('Link inválido ou expirado. Solicite um novo link de recuperação.');
      } finally { setVerifying(false); }
    };
    verify();
  }, [oobCode]);

  const onSubmit = async (data: RedefinirForm) => {
    if (!oobCode) return;
    setError('');
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, data.password);
      setSuccess(true);
    } catch {
      setError('Erro ao redefinir senha. O link pode ter expirado.');
    } finally { setLoading(false); }
  };

  if (verifying) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

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
          background: 'radial-gradient(ellipse at center, rgba(255,107,44,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {success ? (
        <Box sx={{ textAlign: 'center', width: '100%' }}>
          <CheckCircle2 size={64} style={{ color: '#00E676', marginBottom: 16 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '0.04em', mb: 1 }}>
            SENHA REDEFINIDA
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sua senha foi alterada com sucesso. Agora você pode fazer login com a nova senha.
          </Typography>
          <Button
            component={RouterLink} to="/login"
            variant="contained" size="large" fullWidth sx={{ py: 1.5 }}
          >
            Ir para o Login
          </Button>
        </Box>
      ) : (
        <>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 60, height: 60, borderRadius: '18px',
                background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', mb: 2,
                boxShadow: '0 8px 24px rgba(255,107,44,0.25)',
              }}
            >
              <Lock size={28} color="#000" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '0.04em' }}>
              NOVA SENHA
            </Typography>
            {email && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Criando nova senha para <strong>{email}</strong>
              </Typography>
            )}
          </Box>

          {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}

          {!error ? (
            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}
            >
              <TextField
                size="small" label="Nova senha"
                type={showPassword ? 'text' : 'password'}
                fullWidth autoComplete="new-password" autoFocus
                error={!!errors.password} helperText={errors.password?.message}
                {...register('password')}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                size="small" label="Confirmar nova senha"
                type={showPassword ? 'text' : 'password'}
                fullWidth autoComplete="new-password"
                error={!!errors.confirmPassword} helperText={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
              <Button
                type="submit" variant="contained" size="large" fullWidth
                disabled={loading} sx={{ py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Redefinir Senha'}
              </Button>
            </Box>
          ) : (
            <Button
              component={RouterLink} to="/esqueceu-senha"
              variant="contained" size="large" fullWidth sx={{ py: 1.5 }}
            >
              Solicitar novo link
            </Button>
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
        </>
      )}
    </Box>
  );
}
