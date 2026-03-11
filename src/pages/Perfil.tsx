import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Avatar, Divider,
  ToggleButtonGroup, ToggleButton, Card, CardContent, CircularProgress, Snackbar, Alert
} from '@mui/material';
import { LogOut, Moon, Sun, Settings2, Dumbbell, Utensils, Flame, Activity, RefreshCw } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { useThemeStore } from '../store/themeStore';
import { useTreinoStore } from '../store/treinoStore';
import { useDietaStore } from '../store/dietaStore';
import { carregarStravaAuth, desconectarStrava } from '../services/stravaFirestore';
import { STRAVA_AUTH_URL, getStravaActivities } from '../services/stravaApi';
import type { StravaAuthData } from '../types/strava';

export default function Perfil() {
  const { user, signOut } = useAuthContext();
  const { mode, setMode } = useThemeStore();
  const { sessoes, adicionarRegistro } = useTreinoStore();
  const { metas } = useDietaStore();

  const [stravaAuth, setStravaAuth] = useState<StravaAuthData | null | undefined>(undefined);
  const [syncing, setSyncing] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  useEffect(() => {
    if (user?.uid) {
      carregarStravaAuth(user.uid).then(setStravaAuth).catch(console.error);
    }
  }, [user?.uid]);

  const totalExercicios = sessoes.reduce((acc, s) => acc + s.exercicios.length, 0);

  const handleStravaDisconnect = async () => {
    if (!user?.uid) return;
    await desconectarStrava(user.uid);
    setStravaAuth(null);
    setSnackMsg('Strava desconectado.');
  };

  const handleSyncStrava = async () => {
    if (!stravaAuth?.accessToken) return;
    setSyncing(true);
    try {
      const atividades = await getStravaActivities(stravaAuth.accessToken, 15);
      let added = 0;

      for (const t of atividades) {
        if (t.type !== 'Run' && t.type !== 'Ride' && t.type !== 'Swim' && t.type !== 'WeightTraining' && t.type !== 'Workout') continue;

        const isRun = t.type === 'Run' || t.type === 'Ride';
        const isSwim = t.type === 'Swim';
        const isMusculacao = t.type === 'WeightTraining' || t.type === 'Workout';

        // Cálculo estimado de calorias usando METs (Equivalente Metabólico de Tarefa) caso a API do Strava não retorne `calories`
        // Peso médio estimado de 75kg caso não tenhamos o peso do usário no momento.
        // Fórmula: Calorias = MET * Peso * (Tempo_em_minutos / 60)
        let calorias = t.calories;
        if (!calorias) {
          if (t.kilojoules) {
            calorias = Math.round(t.kilojoules * 0.239006); // Ciclismo fornece kJ
          } else {
            const minutos = t.moving_time / 60;
            const pesoEstimado = 75; // kg
            let mets = 7.0; // Padrão

            if (isRun) mets = t.type === 'Ride' ? 8.0 : 9.8;
            if (isSwim) mets = 8.0;
            if (isMusculacao) mets = 5.0;

            calorias = Math.round(mets * pesoEstimado * (minutos / 60));
          }
        }

        const registro: any = {
          id: `strava_${t.id}`,
          sessaoId: `strava_source`,
          nome: t.name,
          tipo: isRun ? 'corrida' : isSwim ? 'natacao' : 'musculacao',
          exercicios: [],
          concluidoEm: new Date(t.start_date).toISOString(),
          duracaoTotalSegundos: t.moving_time,
          stravaData: {
            id: t.id,
            averageSpeedMps: t.average_speed || 0,
            maxSpeedMps: t.max_speed || 0,
            elevationGainM: t.total_elevation_gain || 0,
            averageHeartrate: (t.has_heartrate || t.average_heartrate) ? Math.round(t.average_heartrate || 0) : undefined,
            calories: calorias,
          }
        };

        if (isRun) {
          registro.corrida = {
            etapas: [{
              id: t.id.toString(),
              tipo: t.type === 'Ride' ? 'bicicleta' : 'corrida',
              distanciaKm: Number((t.distance / 1000).toFixed(2)),
              duracaoMin: Math.round(t.moving_time / 60),
              duracaoSegundos: t.moving_time,
            }]
          };
        } else if (isSwim) {
          registro.natacao = {
            etapas: [{
              id: t.id.toString(),
              estilo: 'livre',
              distanciaM: Math.round(t.distance),
              duracaoMin: Math.round(t.moving_time / 60),
              duracaoSegundos: t.moving_time,
            }]
          };
        }

        adicionarRegistro(registro);
        added++;
      }

      setSnackMsg(`Sincronizado! ${added} novas rotas processadas.`);
    } catch (err) {
      console.error(err);
      setSnackMsg('Erro ao sincronizar. O token pode ter expirado.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box sx={{ pt: 2, pb: 4 }}>
      <Typography variant="h4" sx={{ fontSize: '1.8rem', mb: 3 }}>PERFIL</Typography>

      {/* User card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5 }}>
          <Avatar
            sx={{
              width: 60, height: 60,
              background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
              fontFamily: '"Oswald", sans-serif',
              fontSize: '1.5rem',
              fontWeight: 700,
            }}
          >
            {user?.displayName?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
              {user?.displayName || 'Usuário'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <StatCard icon={<Dumbbell size={18} />} label="Treinos" value={sessoes.length} />
        <StatCard icon={<Flame size={18} />} label="Exercícios" value={totalExercicios} />
        <StatCard icon={<Utensils size={18} />} label="Meta kcal" value={metas.calorias} />
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Theme */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}
      >
        Aparência
      </Typography>
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(_, value) => { if (value) setMode(value); }}
        fullWidth
        sx={{ mb: 3 }}
      >
        <ToggleButton value="light">
          <Sun size={18} style={{ marginRight: 8 }} />
          Claro
        </ToggleButton>
        <ToggleButton value="system">
          <Settings2 size={18} style={{ marginRight: 8 }} />
          Sistema
        </ToggleButton>
        <ToggleButton value="dark">
          <Moon size={18} style={{ marginRight: 8 }} />
          Escuro
        </ToggleButton>
      </ToggleButtonGroup>

      <Divider sx={{ mb: 3 }} />

      {/* Integrações */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}
      >
        Integrações
      </Typography>
      <Card sx={{ mb: 3, bgcolor: stravaAuth ? 'rgba(252, 76, 2, 0.05)' : undefined, borderColor: stravaAuth ? 'rgba(252, 76, 2, 0.3)' : undefined }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, bgcolor: '#FC4C02', borderRadius: 2, display: 'flex', color: '#fff' }}>
              <Activity size={24} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>Strava</Typography>
              <Typography variant="caption" color="text.secondary">
                {stravaAuth === undefined ? 'Carregando status...' :
                  stravaAuth ? 'Conectado — Sincronizando atividades' : 'Conecte para importar treinos'}
              </Typography>
            </Box>
          </Box>

          {stravaAuth === undefined ? (
            <CircularProgress size={24} sx={{ alignSelf: 'center' }} />
          ) : !stravaAuth ? (
            <Button
              variant="contained"
              fullWidth
              href={STRAVA_AUTH_URL}
              sx={{ bgcolor: '#FC4C02', color: '#fff', '&:hover': { bgcolor: '#E34402' } }}
            >
              Conectar com Strava
            </Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                fullWidth
                color="error"
                onClick={handleStravaDisconnect}
              >
                Desconectar
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={handleSyncStrava}
                disabled={syncing}
                startIcon={syncing ? <CircularProgress size={16} /> : <RefreshCw size={18} />}
                sx={{ bgcolor: '#FC4C02', color: '#fff', '&:hover': { bgcolor: '#E34402' } }}
              >
                Sincronizar
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      <Divider sx={{ mb: 3 }} />

      <Button
        variant="outlined"
        color="error"
        startIcon={<LogOut size={18} />}
        onClick={signOut}
        fullWidth
        sx={{ py: 1.3 }}
      >
        Sair da conta
      </Button>

      <Snackbar open={!!snackMsg} autoHideDuration={4000} onClose={() => setSnackMsg('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackMsg('')} severity="info" variant="filled" sx={{ width: '100%' }}>
          {snackMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card sx={{ flex: 1 }}>
      <CardContent sx={{ textAlign: 'center', py: 2, px: 1 }}>
        <Box sx={{ color: 'primary.main', mb: 0.5 }}>{icon}</Box>
        <Typography
          variant="h6"
          sx={{ fontFamily: '"Oswald", sans-serif', fontSize: '1.3rem', lineHeight: 1 }}
        >
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}
