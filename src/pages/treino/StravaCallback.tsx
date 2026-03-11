import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { useAuthContext } from '../../contexts/AuthContext';
import { authenticateStrava } from '../../services/stravaApi';
import { salvarStravaAuth } from '../../services/stravaFirestore';
import { CheckCircle, XCircle } from 'lucide-react';

export default function StravaCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const code = searchParams.get('code');
        const erro = searchParams.get('error');

        if (erro) {
            setStatus('error');
            setErrorMsg('Acesso negado no Strava.');
            return;
        }

        if (!code || !user) {
            setStatus('error');
            setErrorMsg('Código de autorização inválido ou usuário não autenticado.');
            return;
        }

        // Processar autenticação
        authenticateStrava(code)
            .then(async (data) => {
                await salvarStravaAuth(user.uid, {
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    expiresAt: data.expires_at,
                    athleteId: data.athlete?.id,
                });
                setStatus('success');
                // Redireciona de volta após 2 segundos
                setTimeout(() => {
                    navigate('/perfil');
                }, 2000);
            })
            .catch((err) => {
                setStatus('error');
                setErrorMsg('Erro ao conectar com o Strava: Verifique as credenciais no .env');
                console.error(err);
            });
    }, [searchParams, user, navigate]);

    return (
        <Box sx={{ pt: 10, px: 3, textAlign: 'center' }}>
            {status === 'loading' && (
                <>
                    <CircularProgress size={48} sx={{ color: '#FC4C02', mb: 3 }} />
                    <Typography variant="h6">Conectando com o Strava...</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Processando autorização segura
                    </Typography>
                </>
            )}

            {status === 'success' && (
                <Box sx={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <CheckCircle size={64} color="#16A34A" style={{ marginBottom: 16 }} />
                    <Typography variant="h5" color="success.main" sx={{ mb: 1 }}>
                        Conectado com sucesso!
                    </Typography>
                    <Typography color="text.secondary">
                        Suas atividades serão sincronizadas magicamente 🤩
                    </Typography>
                </Box>
            )}

            {status === 'error' && (
                <Box sx={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <XCircle size={64} color="#EF4444" style={{ marginBottom: 16 }} />
                    <Typography variant="h5" color="error" sx={{ mb: 1 }}>
                        Falha na conexão
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 4 }}>
                        {errorMsg}
                    </Typography>
                    <Button variant="outlined" onClick={() => navigate('/perfil')}>
                        Voltar ao Perfil
                    </Button>
                </Box>
            )}
        </Box>
    );
}
