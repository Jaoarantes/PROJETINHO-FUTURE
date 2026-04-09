import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Avatar, Divider,
  Card, CardContent, CircularProgress, Snackbar, Alert,
  Dialog, TextField, IconButton, Tabs, Tab,
  List, ListItem, Checkbox, Switch
} from '@mui/material';
import { LogOut, Moon, Sun, Settings2, Dumbbell, Utensils, Flame, Activity, RefreshCw, Scale, Plus, Trash2, X, Trophy, Zap, Target, Crown, Star, TrendingUp, BarChart3, ChevronRight, ChevronDown, ChevronUp, Check, Rss, Users, MessageCircle, Camera, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useThemeStore } from '../store/themeStore';
import { useTreinoStore } from '../store/treinoStore';
import { useDietaStore } from '../store/dietaStore';
import { carregarStravaAuth, desconectarStrava, salvarStravaAuth } from '../services/stravaService';
import { carregarPesoHistorico, salvarRegistroPeso, deletarRegistroPeso } from '../services/dietaService';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import { useConfirmDelete } from '../hooks/useConfirmDelete';
import type { RegistroPeso } from '../services/dietaService';
import { STRAVA_AUTH_URL, getAllStravaActivities, getStravaActivityDetail, refreshStravaToken } from '../services/stravaApi';
import type { StravaAuthData, StravaActivity } from '../types/strava';
import { calcularVolumeSessao } from '../types/treino';
import { supabase } from '../supabase';

import { uploadProfilePicture, removeProfilePicture } from '../services/userService';
import { carregarSocialStats } from '../services/feedService';
import { useFeedStore } from '../store/feedStore';
import type { SocialStats } from '../services/feedService';

export default function Perfil() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshUser } = useAuthContext();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const sessoes = useTreinoStore((s) => s.sessoes);
  const historico = useTreinoStore((s) => s.historico);
  const atualizarPerfilAutor = useFeedStore((s) => s.atualizarPerfilAutor);
  const adicionarRegistro = useTreinoStore((s) => s.adicionarRegistro);
  const autoSyncDiet = useTreinoStore((s) => s.autoSyncDiet);
  const setAutoSyncDiet = useTreinoStore((s) => s.setAutoSyncDiet);
  const metas = useDietaStore((s) => s.metas);

  const [stravaAuth, setStravaAuth] = useState<StravaAuthData | null | undefined>(undefined);
  const [syncing, setSyncing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [tempPhotoURL, setTempPhotoURL] = useState<string | null>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  // Strava Selection
  const [stravaActivities, setStravaActivities] = useState<StravaActivity[]>([]);
  const [stravaInvalidas, setStravaInvalidas] = useState<StravaActivity[]>([]);
  const [stravaModalOpen, setStravaModalOpen] = useState(false);
  const [selectedStravaIds, setSelectedStravaIds] = useState<number[]>([]);
  const [stravaTab, setStravaTab] = useState(0);

  // Peso corporal
  const [pesoHistorico, setPesoHistorico] = useState<RegistroPeso[]>([]);
  const [pesoDialogOpen, setPesoDialogOpen] = useState(false);
  const [novoPeso, setNovoPeso] = useState('');
  const [novaDataPeso, setNovaDataPeso] = useState(new Date().toISOString().slice(0, 10));
  const deletePeso = useConfirmDelete();
  const deletePhoto = useConfirmDelete();

  useEffect(() => {
    if (user?.id) {
      carregarStravaAuth(user.id).then(setStravaAuth).catch(console.error);
      carregarPesoHistorico(user.id).then(setPesoHistorico).catch(console.error);
    }
  }, [user?.id]);

  const handleSalvarPeso = async () => {
    if (!user?.id || !novoPeso) return;
    const registro: RegistroPeso = {
      id: novaDataPeso,
      data: novaDataPeso,
      peso: parseFloat(novoPeso),
    };
    await salvarRegistroPeso(user.id, registro).catch(console.error);
    setPesoHistorico((prev) => {
      const sem = prev.filter((r) => r.id !== registro.id);
      return [...sem, registro].sort((a, b) => b.data.localeCompare(a.data));
    });
    setPesoDialogOpen(false);
    setNovoPeso('');
  };

  const handleDeletarPeso = async (id: string) => {
    if (!user?.id) return;
    await deletarRegistroPeso(user.id, id).catch(console.error);
    setPesoHistorico((prev) => prev.filter((r) => r.id !== id));
  };

  const totalExercicios = sessoes.reduce((acc, s) => acc + s.exercicios.length, 0);

  const handleStravaDisconnect = async () => {
    if (!user?.id) return;
    await desconectarStrava(user.id);
    setStravaAuth(null);
    setSnackMsg('Strava desconectado.');
  };

  const handleSyncStrava = async () => {
    if (!stravaAuth?.accessToken || !user?.id) return;
    setSyncing(true);
    try {
      // Refresh token if expired
      let token = stravaAuth.accessToken;
      const now = Math.floor(Date.now() / 1000);
      if (stravaAuth.expiresAt && stravaAuth.expiresAt < now) {
        const refreshed = await refreshStravaToken(stravaAuth.refreshToken);
        const newAuth: StravaAuthData = {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          expiresAt: refreshed.expires_at,
          athleteId: stravaAuth.athleteId,
        };
        await salvarStravaAuth(user.id, newAuth);
        setStravaAuth(newAuth);
        token = refreshed.access_token;
      }
      // Buscar TODAS as atividades do Strava (todas as páginas)
      const atividades = await getAllStravaActivities(token);
      const dataCadastro = user.created_at ? new Date(user.created_at) : null;
      const TIPOS_VALIDOS = ['Run', 'Ride', 'Swim', 'WeightTraining', 'Workout'];

      // Buscar IDs já importados diretamente do banco (em chunks para não estourar limite do Supabase)
      const stravaIds = atividades.map(a => `strava_${a.id}`);
      const idsJaImportados = new Set<string>();
      for (let i = 0; i < stravaIds.length; i += 500) {
        const { data: chunk } = await supabase
          .from('historico')
          .select('id')
          .eq('user_id', user.id)
          .in('id', stravaIds.slice(i, i + 500));
        (chunk || []).forEach((r: any) => idsJaImportados.add(r.id));
      }

      // Filtrar apenas não-importadas ainda
      const novas = atividades.filter(t => !idsJaImportados.has(`strava_${t.id}`));

      // Válidos: tipo suportado + 20min+ + após data de cadastro (contam XP)
      const validas = novas.filter(t =>
        TIPOS_VALIDOS.includes(t.type) &&
        t.moving_time >= 1200 &&
        (!dataCadastro || new Date(t.start_date) >= dataCadastro)
      );
      // Não válidos: tipo errado, muito curto, ou antes do cadastro (podem importar mas sem XP)
      const invalidas = novas.filter(t =>
        !TIPOS_VALIDOS.includes(t.type) ||
        t.moving_time < 1200 ||
        (dataCadastro && new Date(t.start_date) < dataCadastro)
      );

      if (novas.length === 0) {
        setSnackMsg('Nenhuma atividade nova encontrada no Strava.');
      } else {
        setStravaActivities(validas);
        setStravaInvalidas(invalidas);
        setSelectedStravaIds(validas.map(f => f.id));
        setStravaTab(0);
        setStravaModalOpen(true);
      }
    } catch (err: any) {
      console.error('Strava sync error:', err);
      if (err?.message?.includes('token') || err?.message?.includes('Token') || err?.message?.includes('atualizar')) {
        // Token refresh failed - need to re-authenticate
        setStravaAuth(null);
        setSnackMsg('Sessão do Strava expirada. Conecte novamente.');
      } else {
        setSnackMsg('Erro ao sincronizar com o Strava. Tente novamente.');
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleImportSelected = async () => {
    const todasAtividades = [...stravaActivities, ...stravaInvalidas];
    const selecionadas = todasAtividades.filter((t) => selectedStravaIds.includes(t.id));
    const TIPOS_VALIDOS = ['Run', 'Ride', 'Swim', 'WeightTraining', 'Workout'];
    let added = 0;

    // Pegar token atualizado
    let token = stravaAuth?.accessToken || '';
    const now = Math.floor(Date.now() / 1000);
    if (stravaAuth && stravaAuth.expiresAt && stravaAuth.expiresAt < now && user?.id) {
      const refreshed = await refreshStravaToken(stravaAuth.refreshToken);
      const newAuth: StravaAuthData = {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        expiresAt: refreshed.expires_at,
        athleteId: stravaAuth.athleteId,
      };
      await salvarStravaAuth(user.id, newAuth);
      setStravaAuth(newAuth);
      token = refreshed.access_token;
    }

    for (const t of selecionadas) {
      const isRun = t.type === 'Run' || t.type === 'Ride' || t.type === 'Walk' || t.type === 'Hike';
      const isSwim = t.type === 'Swim';
      const isMusculacao = t.type === 'WeightTraining' || t.type === 'Workout' || t.type === 'Crossfit' || t.type === 'Yoga' || t.type === 'Pilates';
      // Tipos não mapeados vão para corrida se tiver distância, senão musculação
      const tipoFallback = (t.distance && t.distance > 0) ? 'corrida' : 'musculacao';

      // Buscar detalhes completos da atividade (splits, laps, best efforts)
      let detail = t;
      try {
        if (token) detail = await getStravaActivityDetail(token, t.id);
      } catch { /* fallback to summary data */ }

      let calorias = detail.calories;
      if (!calorias) {
        if (detail.kilojoules) {
          calorias = Math.round(detail.kilojoules * 0.239006);
        } else {
          const minutos = detail.moving_time / 60;
          const pesoEstimado = 75;
          let mets = 7.0;
          if (isRun) mets = t.type === 'Ride' ? 8.0 : 9.8;
          if (isSwim) mets = 8.0;
          if (isMusculacao) mets = 5.0;
          calorias = Math.round(mets * pesoEstimado * (minutos / 60));
        }
      }

      // Calcular XP: apenas atividades válidas (tipo suportado + >= 20min)
      const ehValida = TIPOS_VALIDOS.includes(t.type) && detail.moving_time >= 1200;
      let xpParaGanhar = 0;
      if (ehValida) {
        xpParaGanhar = 100;
        if (detail.moving_time >= 3600) xpParaGanhar += 50;
        else if (detail.moving_time >= 1800) xpParaGanhar += 25;
      }

      const registro: any = {
        id: `strava_${t.id}`,
        sessaoId: `strava_source`,
        nome: detail.name,
        tipo: isRun ? 'corrida' : isSwim ? 'natacao' : isMusculacao ? 'musculacao' : tipoFallback,
        exercicios: [],
        concluidoEm: new Date(detail.start_date).toISOString(),
        duracaoTotalSegundos: detail.moving_time,
        xpEarned: xpParaGanhar,
        stravaData: {
          id: detail.id,
          averageSpeedMps: detail.average_speed || 0,
          maxSpeedMps: detail.max_speed || 0,
          elevationGainM: detail.total_elevation_gain || 0,
          averageHeartrate: (detail.has_heartrate || detail.average_heartrate) ? Math.round(detail.average_heartrate || 0) : undefined,
          maxHeartrate: detail.max_heartrate ? Math.round(detail.max_heartrate) : undefined,
          calories: calorias,
          summaryPolyline: detail.map?.summary_polyline || undefined,
          distance: detail.distance || 0,
          movingTime: detail.moving_time,
          elapsedTime: detail.elapsed_time,
          kilojoules: detail.kilojoules || undefined,
          averageCadence: detail.average_cadence || undefined,
          averageWatts: detail.average_watts || undefined,
          maxWatts: detail.max_watts || undefined,
          weightedAverageWatts: detail.weighted_average_watts || undefined,
          sufferScore: detail.suffer_score || undefined,
          averageTemp: detail.average_temp || undefined,
          deviceName: detail.device_name || undefined,
          gearName: detail.gear?.name || undefined,
          splits: detail.splits_metric?.map(s => ({
            distance: s.distance,
            elapsedTime: s.elapsed_time,
            elevationDifference: s.elevation_difference,
            movingTime: s.moving_time,
            averageHeartrate: s.average_heartrate,
            averageSpeed: s.average_speed,
            paceZone: s.pace_zone,
          })) || undefined,
          laps: detail.laps?.map(l => ({
            name: l.name,
            distance: l.distance,
            elapsedTime: l.elapsed_time,
            movingTime: l.moving_time,
            averageSpeed: l.average_speed,
            maxSpeed: l.max_speed,
            averageHeartrate: l.average_heartrate,
            maxHeartrate: l.max_heartrate,
            averageCadence: l.average_cadence,
            totalElevationGain: l.total_elevation_gain,
          })) || undefined,
          bestEfforts: detail.best_efforts?.map(b => ({
            name: b.name,
            elapsedTime: b.elapsed_time,
            movingTime: b.moving_time,
            distance: b.distance,
          })) || undefined,
        }
      };

      if (isRun || (!isSwim && !isMusculacao && tipoFallback === 'corrida')) {
        const etapaTipo = t.type === 'Ride' ? 'bicicleta' : t.type === 'Walk' || t.type === 'Hike' ? 'caminhada' : 'corrida';
        registro.corrida = {
          etapas: [{
            id: t.id.toString(),
            tipo: etapaTipo,
            distanciaKm: Number((detail.distance / 1000).toFixed(2)),
            duracaoMin: Math.round(detail.moving_time / 60),
            duracaoSegundos: detail.moving_time,
          }]
        };
      } else if (isSwim) {
        registro.natacao = {
          etapas: [{
            id: t.id.toString(),
            estilo: 'livre',
            distanciaM: Math.round(detail.distance),
            duracaoMin: Math.round(detail.moving_time / 60),
            duracaoSegundos: detail.moving_time,
          }]
        };
      }

      try {
        await adicionarRegistro(registro);
        added++;
      } catch (err) {
        console.error(`Erro ao salvar atividade ${detail.name}:`, err);
      }
    }

    setStravaModalOpen(false);
    if (added > 0) {
      setSnackMsg(`Sucesso! ${added} atividade(s) importada(s) com dados completos.`);
    } else {
      setSnackMsg('Erro ao salvar atividades. Verifique o banco de dados.');
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Preview local imediato para o usuário não ficar esperando
    const localURL = URL.createObjectURL(file);
    setTempPhotoURL(localURL);

    setUploadingPhoto(true);

    // Timeout de segurança para não travar o loader
    const timeout = setTimeout(() => {
      setUploadingPhoto(false);
    }, 15000);

    try {
      const newUrl = await uploadProfilePicture(user.id, file);
      await refreshUser();
      atualizarPerfilAutor(user.id, user.user_metadata?.full_name || null, newUrl);
      setSnackMsg('Foto de perfil atualizada!');
    } catch (err) {
      console.error(err);
      setSnackMsg('Erro ao atualizar foto.');
      // Opcional: reverter para a foto original em caso de erro
      setTempPhotoURL(user.user_metadata?.avatar_url || null);
    } finally {
      clearTimeout(timeout);
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user?.id) return;
    setPhotoMenuOpen(false);
    setUploadingPhoto(true);
    try {
      await removeProfilePicture(user.id);
      setTempPhotoURL(null);
      await refreshUser();
      atualizarPerfilAutor(user.id, user.user_metadata?.full_name || null, null);
      setSnackMsg('Foto de perfil removida.');
    } catch (err) {
      console.error(err);
      setSnackMsg('Erro ao remover foto.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <Box sx={{ pt: 2, pb: 4 }}>
      <Typography variant="h4" sx={{ fontSize: '1.8rem', mb: 3 }}>PERFIL</Typography>

      {/* User card */}
      <Card sx={{ mb: 3, borderRadius: '6px' }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5 }}>
          <Box sx={{ position: 'relative' }}>
            <input
              type="file"
              accept="image/*"
              id="photo-upload"
              style={{ display: 'none' }}
              onChange={(e) => {
                handlePhotoChange(e);
                setPhotoMenuOpen(false);
              }}
              disabled={uploadingPhoto}
            />
            <Box onClick={() => !uploadingPhoto && setPhotoMenuOpen(true)}>
              <Avatar
                src={tempPhotoURL || profile?.photoURL || user?.user_metadata?.avatar_url || undefined}
                sx={{
                  width: 65, height: 65,
                  background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',

                  fontSize: '1.5rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: 'background.paper',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  '&:hover': { opacity: 0.9 }
                }}
              >
                {user?.user_metadata?.display_name?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              {uploadingPhoto && (
                <Box sx={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  bgcolor: 'rgba(0,0,0,0.3)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CircularProgress size={24} color="inherit" />
                </Box>
              )}
            </Box>
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
              {user?.user_metadata?.display_name || profile?.displayName || 'Usuário'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email || profile?.email}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={photoMenuOpen}
        onClose={() => setPhotoMenuOpen(false)}
        PaperProps={{ sx: { borderRadius: 1.5, maxWidth: 280, width: '100%' } }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, textAlign: 'center' }}>
            Foto de Perfil
          </Typography>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => document.getElementById('photo-upload')?.click()}
            startIcon={<Plus size={18} />}
            sx={{ mb: 1, py: 1.2, borderRadius: 1 }}
          >
            Escolher uma foto
          </Button>
          <Button
            variant="text"
            fullWidth
            color="error"
            onClick={() => deletePhoto.requestDelete()}
            disabled={!tempPhotoURL && !profile?.photoURL && !user?.user_metadata?.avatar_url}
            sx={{ py: 1.2, borderRadius: 1 }}
          >
            Ficar sem foto
          </Button>
        </Box>
      </Dialog>

      {/* Quick stats */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <StatCard icon={<Dumbbell size={18} />} label="Treinos" value={sessoes.length} />
        <StatCard icon={<Flame size={18} />} label="Exercícios" value={totalExercicios} />
        <StatCard icon={<Utensils size={18} />} label="Meta kcal" value={metas.calorias} />
      </Box>

      {/* Dashboard */}
      <Card
        onClick={() => navigate('/dashboard')}
        sx={{
          mb: 3,
          cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(255,107,44,0.08) 0%, rgba(239,68,68,0.08) 100%)',
          border: 1,
          borderColor: 'rgba(255,107,44,0.2)',
          '&:hover': { borderColor: 'rgba(255,107,44,0.4)' },
          transition: 'border-color 0.2s',
        }}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'linear-gradient(135deg, #FF6B2C 0%, #EF4444 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <BarChart3 size={22} color="#fff" />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '0.95rem', lineHeight: 1.2 }}>
              Dashboard de Evolução
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Acompanhe seu progresso em todos os treinos
            </Typography>
          </Box>
          <ChevronRight size={20} style={{ opacity: 0.4 }} />
        </CardContent>
      </Card>

      <Divider sx={{ mb: 3 }} />

      {/* Conquistas */}
      <ConquistasSection historico={historico} uid={user?.id || ''} />

      <Divider sx={{ mb: 3 }} />

      {/* Peso Corporal */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}
        >
          Peso Corporal
        </Typography>
        <Button
          size="small"
          startIcon={<Plus size={14} />}
          onClick={() => {
            setNovaDataPeso(new Date().toISOString().slice(0, 10));
            setNovoPeso('');
            setPesoDialogOpen(true);
          }}
          sx={{ fontSize: '0.75rem', py: 0.3 }}
        >
          Registrar
        </Button>
      </Box>

      <Card sx={{ mb: 3, borderRadius: '6px' }}>
        <CardContent sx={{ py: 2 }}>
          {pesoHistorico.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Scale size={32} style={{ opacity: 0.15, marginBottom: 8 }} />
              <Typography variant="body2" color="text.secondary">Nenhum registro ainda</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
                Registre seu peso para acompanhar a evolução
              </Typography>
            </Box>
          ) : (
            <>
              {/* Peso atual + variação */}
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
                <Typography sx={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>
                  {pesoHistorico[0].peso.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">kg</Typography>
                {pesoHistorico.length >= 2 && (() => {
                  const diff = pesoHistorico[0].peso - pesoHistorico[1].peso;
                  const cor = diff < 0 ? 'success.main' : diff > 0 ? 'error.main' : 'text.secondary';
                  return (
                    <Typography variant="body2" color={cor} fontWeight={600} sx={{ ml: 'auto' }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                    </Typography>
                  );
                })()}
              </Box>

              {/* Gráfico SVG */}
              {pesoHistorico.length >= 2 && (
                <PesoChart dados={pesoHistorico} />
              )}

              {/* Lista íºltimos registros */}
              <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {pesoHistorico.slice(0, 5).map((r) => (
                  <Box key={r.id} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                      {new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>{r.peso.toFixed(1)} kg</Typography>
                    <IconButton size="small" onClick={() => deletePeso.requestDelete(r.id)} sx={{ ml: 0.5, opacity: 0.4 }}>
                      <Trash2 size={12} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog registrar peso */}
      <Dialog open={pesoDialogOpen} onClose={() => setPesoDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '2px', p: 1 } }}>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>Registrar Peso</Typography>
            <IconButton size="small" onClick={() => setPesoDialogOpen(false)}><X size={18} /></IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
            <TextField
              label="Peso (kg)" type="number" size="small" fullWidth
              value={novoPeso}
              onChange={(e) => setNovoPeso(e.target.value)}
              slotProps={{ htmlInput: { min: 30, max: 250, step: 0.1, inputMode: 'decimal' } }}
              autoFocus
            />
            <TextField
              label="Data" type="date" size="small" fullWidth
              value={novaDataPeso}
              onChange={(e) => setNovaDataPeso(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
          <Button variant="contained" fullWidth disabled={!novoPeso} onClick={handleSalvarPeso}>
            Salvar
          </Button>
        </Box>
      </Dialog>

      {/* Dialog Sincronizar Strava - fullscreen mobile */}
      <Dialog
        open={stravaModalOpen}
        onClose={() => setStravaModalOpen(false)}
        fullScreen
        PaperProps={{ sx: { bgcolor: 'background.default' } }}
      >
        <Box sx={{
          display: 'flex', flexDirection: 'column', height: '100%',
          pt: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          pb: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
        }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5 }}>
            <IconButton onClick={() => setStravaModalOpen(false)} sx={{ mr: 1 }}><X size={20} /></IconButton>
            <Typography variant="h6" fontWeight={700} sx={{ flex: 1, fontSize: '1.1rem' }}>Treinos no Strava</Typography>
            {(() => {
              const listaAtual = stravaTab === 0 ? stravaActivities : stravaInvalidas;
              const todosSelAtual = listaAtual.every(a => selectedStravaIds.includes(a.id));
              return listaAtual.length > 0 ? (
                <Button
                  size="small"
                  onClick={() => {
                    if (todosSelAtual) {
                      setSelectedStravaIds(prev => prev.filter(id => !listaAtual.some(a => a.id === id)));
                    } else {
                      setSelectedStravaIds(prev => [...new Set([...prev, ...listaAtual.map(a => a.id)])]);
                    }
                  }}
                  sx={{ fontSize: '0.8rem', textTransform: 'none', fontWeight: 600 }}
                >
                  {todosSelAtual ? 'Desmarcar todos' : 'Selecionar todos'}
                </Button>
              ) : null;
            })()}
          </Box>

          {/* Tabs */}
          <Tabs
            value={stravaTab}
            onChange={(_, v) => setStravaTab(v)}
            variant="fullWidth"
            sx={{
              mx: 2, minHeight: 40,
              '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' },
              '& .Mui-selected': { color: '#FC4C02' },
              '& .MuiTabs-indicator': { bgcolor: '#FC4C02' },
            }}
          >
            <Tab label={`Válidos (${stravaActivities.length})`} />
            <Tab label={`Não válidos (${stravaInvalidas.length})`} />
          </Tabs>

          {stravaTab === 1 && stravaInvalidas.length > 0 && (
            <Box sx={{ mx: 2, mt: 1, px: 1.5, py: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                Atividades com tipo não suportado ou menos de 20 minutos. Podem ser importadas mas <b>não contam XP</b>.
              </Typography>
            </Box>
          )}

          {/* Lista scrollável */}
          {(() => {
            const listaAtual = stravaTab === 0 ? stravaActivities : stravaInvalidas;
            if (listaAtual.length === 0) {
              return (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 3 }}>
                  <Typography color="text.secondary" textAlign="center">
                    {stravaTab === 0 ? 'Nenhuma atividade válida para XP encontrada.' : 'Nenhuma atividade nesta categoria.'}
                  </Typography>
                </Box>
              );
            }
            return (
              <List sx={{ flex: 1, overflow: 'auto', px: 1, mt: 0.5 }}>
                {listaAtual.map((t) => {
                  const checked = selectedStravaIds.includes(t.id);
                  const dataStr = new Date(t.start_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                  const distStr = t.distance > 0 ? `${(t.distance / 1000).toFixed(1)}km` : '';
                  const durMin = Math.round(t.moving_time / 60);

                  return (
                    <ListItem
                      key={t.id}
                      disablePadding
                      sx={{ mb: 0.5 }}
                      onClick={() => {
                        const idx = selectedStravaIds.indexOf(t.id);
                        const next = [...selectedStravaIds];
                        if (idx === -1) next.push(t.id); else next.splice(idx, 1);
                        setSelectedStravaIds(next);
                      }}
                    >
                      <Box sx={{
                        display: 'flex', alignItems: 'center', width: '100%',
                        px: 2, py: 1.5, borderRadius: 2,
                        bgcolor: checked ? 'action.selected' : 'action.hover',
                        transition: 'background 0.15s',
                      }}>
                        <Checkbox
                          edge="start"
                          checked={checked}
                          disableRipple
                          sx={{ mr: 1.5, p: 0 }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={600} fontSize="0.9rem" noWrap>{t.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dataStr} • {t.type} {distStr ? `• ${distStr}` : ''} • {durMin}min
                          </Typography>
                        </Box>
                        {stravaTab === 1 && (
                          <Typography variant="caption" sx={{ ml: 1, color: 'warning.main', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            0 XP
                          </Typography>
                        )}
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            );
          })()}

          {/* Botão fixo no rodapé */}
          <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
            <Button
              variant="contained"
              fullWidth
              disabled={selectedStravaIds.length === 0}
              onClick={handleImportSelected}
              startIcon={<Check size={18} />}
              sx={{
                bgcolor: '#FC4C02', color: '#fff',
                '&:hover': { bgcolor: '#E34402' },
                py: 1.5, borderRadius: 3, fontWeight: 700, fontSize: '0.95rem',
              }}
            >
              Importar {selectedStravaIds.length} {selectedStravaIds.length === 1 ? 'treino' : 'treinos'}
            </Button>
          </Box>
        </Box>
      </Dialog>

      <Divider sx={{ mb: 3 }} />

      {/* Settings Automations */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}
      >
        Automações
      </Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
          <Box sx={{ flex: 1, mr: 2 }}>
            <Typography variant="subtitle2" fontWeight={700}>Sincronizar calorias com dieta</Typography>
            <Typography variant="caption" color="text.secondary">Sincroniza as calorias gastas nos treinos, ajustando automaticamente a sua meta de consumo diário.</Typography>
          </Box>
          <Switch
            checked={autoSyncDiet}
            onChange={(e) => setAutoSyncDiet(e.target.checked)}
            color="primary"
          />
        </CardContent>
      </Card>

      <Card
        sx={{ mb: 3, cursor: 'pointer', '&:active': { transform: 'scale(0.98)' }, transition: 'transform 0.1s' }}
        onClick={() => navigate('/perfil/notificacoes')}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Bell size={18} />
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>Notificações</Typography>
              <Typography variant="caption" color="text.secondary">Lembretes de treino, refeição, água e mais</Typography>
            </Box>
          </Box>
          <ChevronRight size={18} />
        </CardContent>
      </Card>

      <Divider sx={{ mb: 3 }} />

      {/* Theme */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}
      >
        Aparência
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        {[
          { value: 'light' as const, label: 'Claro', icon: <Sun size={18} /> },
          { value: 'system' as const, label: 'Sistema', icon: <Settings2 size={18} /> },
          { value: 'dark' as const, label: 'Escuro', icon: <Moon size={18} /> },
        ].map((opt) => {
          const selected = mode === opt.value;
          return (
            <Box
              key={opt.value}
              onClick={() => setMode(opt.value)}
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                py: 1.2,
                borderRadius: '12px',
                border: '1px solid',
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: selected ? 'primary.main' : 'transparent',
                color: selected ? 'primary.contrastText' : 'text.secondary',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:active': { transform: 'scale(0.97)' },
              }}
            >
              {opt.icon}
              {opt.label}
            </Box>
          );
        })}
      </Box>

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
            <Box sx={{ p: 1, bgcolor: '#FC4C02', borderRadius: 1, display: 'flex', color: '#fff' }}>
              <Activity size={24} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>Strava</Typography>
              <Typography variant="caption" color="text.secondary">
                {stravaAuth === undefined ? 'Carregando status...' :
                  stravaAuth ? 'Conectado  Sincronizando atividades' : 'Conecte para importar treinos'}
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
      <ConfirmDeleteDialog
        open={deletePeso.open}
        loading={deletePeso.loading}
        title="Excluir registro de peso?"
        message="Tem certeza que deseja excluir este registro?"
        onClose={deletePeso.cancel}
        onConfirm={() => deletePeso.confirmDelete(async () => { await handleDeletarPeso(deletePeso.payload); })}
      />
      <ConfirmDeleteDialog
        open={deletePhoto.open}
        loading={deletePhoto.loading}
        title="Remover foto de perfil?"
        message="Tem certeza que deseja ficar sem foto de perfil?"
        confirmLabel="Remover"
        onClose={deletePhoto.cancel}
        onConfirm={() => deletePhoto.confirmDelete(async () => { await handleRemovePhoto(); })}
      />
    </Box>
  );
}

function PesoChart({ dados }: { dados: RegistroPeso[] }) {
  const sorted = [...dados].sort((a, b) => a.data.localeCompare(b.data)).slice(-10);
  if (sorted.length < 2) return null;

  const pesos = sorted.map((d) => d.peso);
  const minP = Math.min(...pesos);
  const maxP = Math.max(...pesos);
  const range = maxP - minP || 1;

  const W = 280, H = 60, PAD = 8;

  const pts = sorted.map((d, i) => {
    const x = PAD + (i / (sorted.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((d.peso - minP) / range) * (H - PAD * 2);
    return { x, y, peso: d.peso };
  });

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {/* Area fill */}
        <path
          d={`${path} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`}
          fill="rgba(255,107,44,0.08)"
        />
        {/* Line */}
        <path d={path} fill="none" stroke="#FF6B2C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#FF6B2C" />
        ))}
        {/* Min/Max labels */}
        <text x={PAD} y={H - 1} fontSize="9" fill="rgba(128,128,128,0.7)">{minP.toFixed(1)}</text>
        <text x={W - PAD} y={H - 1} fontSize="9" fill="rgba(128,128,128,0.7)" textAnchor="end">{maxP.toFixed(1)}</text>
      </svg>
    </Box>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card sx={{ flex: 1, borderRadius: '4px' }}>
      <CardContent sx={{ textAlign: 'center', py: 2, px: 1 }}>
        <Box sx={{ color: 'primary.main', mb: 0.5 }}>{icon}</Box>
        <Typography
          variant="h6"
          sx={{ fontSize: '1.3rem', lineHeight: 1 }}
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

// Ã¢â€â‚¬Ã¢â€â‚¬ Gamificação Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
interface Conquista {
  id: string;
  icon: React.ReactNode;
  titulo: string;
  desc: string;
  desbloqueada: boolean;
  cor: string;
  xp: number;
}

// Filtra apenas treinos válidos: 20min+ e 3+ exercícios para musculação
function filtrarTreinosValidos(historico: ReturnType<typeof useTreinoStore.getState>['historico']) {
  return historico.filter((r) => {
    const duracao = r.duracaoTotalSegundos || 0;
    if (duracao < 1200) return false; // Mínimo 20 minutos
    if (r.tipo === 'musculacao' && r.exercicios.length < 3) return false;
    return true;
  });
}

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sundayOf(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
}

function calcularStreak(historico: ReturnType<typeof useTreinoStore.getState>['historico']): number {
  const validos = filtrarTreinosValidos(historico);
  if (validos.length === 0) return 0;

  const semanas = new Set<string>();
  validos.forEach((r) => {
    semanas.add(toLocalDate(sundayOf(new Date(r.concluidoEm))));
  });

  const sorted = Array.from(semanas).sort().reverse();

  // Se a semana mais recente com treino é mais de 1 semana atrás, streak = 0
  const maisRecente = sorted[0];
  const diffMs = sundayOf(new Date()).getTime() - new Date(maisRecente + 'T00:00:00').getTime();
  const diffSemanas = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  if (diffSemanas > 1) return 0;

  // Contar semanas consecutivas a partir da mais recente
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const base = new Date(maisRecente + 'T00:00:00');
    base.setDate(base.getDate() - i * 7);
    if (sorted[i] === toLocalDate(base)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function ConquistasSection({ historico, uid }: {
  historico: ReturnType<typeof useTreinoStore.getState>['historico'];
  uid: string;
}) {
  const [socialStats, setSocialStats] = useState<SocialStats>({
    totalPosts: 0, postsComFoto: 0, totalChamasRecebidas: 0, totalSeguidores: 0, totalComentariosRecebidos: 0,
  });

  useEffect(() => {
    carregarSocialStats(uid).then(setSocialStats).catch(console.error);
  }, [uid]);

  const [showAllConquistas, setShowAllConquistas] = useState(false);
  const CONQUISTAS_PREVIEW = 6;

  // Base stats (sem XP de conquistas — usado para checar unlock)
  const baseStats = useMemo(() => {
    const validos = filtrarTreinosValidos(historico);
    const totalTreinos = validos.length;
    const treinoXP = validos.reduce((acc, r) => acc + (r.xpEarned || 0), 0);

    const volumeTotal = validos.reduce((acc, r) => {
      if (r.tipo !== 'musculacao') return acc;
      return acc + calcularVolumeSessao(r.exercicios);
    }, 0);

    const exerciciosUnicos = new Set<string>();
    validos.forEach((r) => {
      r.exercicios.forEach((ex) => exerciciosUnicos.add(ex.exercicio.nome));
    });

    const streak = calcularStreak(historico);
    const tempoTotal = validos.reduce((acc, r) => acc + (r.duracaoTotalSegundos || 0), 0);

    return { totalTreinos, treinoXP, volumeTotal, exerciciosUnicos: exerciciosUnicos.size, streak, tempoTotal };
  }, [historico]);

  // Conquistas com XP
  const conquistas: Conquista[] = useMemo(() => [
    // Treino
    { id: 'primeiro', icon: <Star size={18} />, titulo: 'Primeiro Passo', desc: 'Complete seu primeiro treino', desbloqueada: baseStats.totalTreinos >= 1, cor: '#FFD700', xp: 50 },
    { id: 'cinco', icon: <Zap size={18} />, titulo: 'Esquentando', desc: 'Complete 5 treinos', desbloqueada: baseStats.totalTreinos >= 5, cor: '#FF6B2C', xp: 100 },
    { id: 'dez', icon: <Target size={18} />, titulo: 'Consistente', desc: 'Complete 10 treinos', desbloqueada: baseStats.totalTreinos >= 10, cor: '#3B82F6', xp: 200 },
    { id: 'vinte5', icon: <Flame size={18} />, titulo: 'Dedicado', desc: 'Complete 25 treinos', desbloqueada: baseStats.totalTreinos >= 25, cor: '#EF4444', xp: 400 },
    { id: 'cinquenta', icon: <Crown size={18} />, titulo: 'Imparável', desc: 'Complete 50 treinos', desbloqueada: baseStats.totalTreinos >= 50, cor: '#F59E0B', xp: 750 },
    { id: 'cem', icon: <Trophy size={18} />, titulo: 'Lenda', desc: 'Complete 100 treinos', desbloqueada: baseStats.totalTreinos >= 100, cor: '#10B981', xp: 1500 },
    { id: 'streak3', icon: <TrendingUp size={18} />, titulo: 'Em Chamas', desc: '3 semanas seguidas treinando', desbloqueada: baseStats.streak >= 3, cor: '#F97316', xp: 300 },
    { id: '1ton', icon: <Dumbbell size={18} />, titulo: '1 Tonelada', desc: 'Levante 1.000 kg de volume total', desbloqueada: baseStats.volumeTotal >= 1000, cor: '#0EA5E9', xp: 200 },
    { id: '10ton', icon: <Dumbbell size={18} />, titulo: 'Monstro', desc: 'Levante 10.000 kg de volume total', desbloqueada: baseStats.volumeTotal >= 10000, cor: '#EF4444', xp: 500 },
    { id: 'variado', icon: <Star size={18} />, titulo: 'Versátil', desc: 'Treine 10 exercícios diferentes', desbloqueada: baseStats.exerciciosUnicos >= 10, cor: '#14B8A6', xp: 250 },
    // Social
    { id: 'social_primeiro', icon: <Rss size={18} />, titulo: 'Estreia', desc: 'Publique seu primeiro treino no feed', desbloqueada: socialStats.totalPosts >= 1, cor: '#8B5CF6', xp: 50 },
    { id: 'social_foto', icon: <Camera size={18} />, titulo: 'Fotogênico', desc: 'Publique um treino com foto', desbloqueada: socialStats.postsComFoto >= 1, cor: '#EC4899', xp: 75 },
    { id: 'social_5fotos', icon: <Camera size={18} />, titulo: 'Influencer', desc: 'Publique 5 treinos com foto', desbloqueada: socialStats.postsComFoto >= 5, cor: '#D946EF', xp: 300 },
    { id: 'social_10posts', icon: <Rss size={18} />, titulo: 'Criador', desc: 'Publique 10 treinos no feed', desbloqueada: socialStats.totalPosts >= 10, cor: '#6366F1', xp: 400 },
    { id: 'social_chamas10', icon: <Flame size={18} />, titulo: 'Aquecido', desc: 'Receba 10 chamas nos seus posts', desbloqueada: socialStats.totalChamasRecebidas >= 10, cor: '#F97316', xp: 150 },
    { id: 'social_chamas50', icon: <Flame size={18} />, titulo: 'Em Brasa', desc: 'Receba 50 chamas nos seus posts', desbloqueada: socialStats.totalChamasRecebidas >= 50, cor: '#EF4444', xp: 500 },
    { id: 'social_seguidores5', icon: <Users size={18} />, titulo: 'Popular', desc: 'Tenha 5 seguidores', desbloqueada: socialStats.totalSeguidores >= 5, cor: '#0EA5E9', xp: 200 },
    { id: 'social_seguidores25', icon: <Users size={18} />, titulo: 'Referência', desc: 'Tenha 25 seguidores', desbloqueada: socialStats.totalSeguidores >= 25, cor: '#0284C7', xp: 600 },
    { id: 'social_comentarios', icon: <MessageCircle size={18} />, titulo: 'Engajado', desc: 'Receba 10 comentários', desbloqueada: socialStats.totalComentariosRecebidos >= 10, cor: '#14B8A6', xp: 200 },
    { id: 'social_chamas100', icon: <Trophy size={18} />, titulo: 'Viral', desc: 'Receba 100 chamas nos seus posts', desbloqueada: socialStats.totalChamasRecebidas >= 100, cor: '#FFD700', xp: 1000 },
  ], [baseStats, socialStats]);

  // XP total = treino XP + conquistas XP
  const conquistaXP = conquistas.filter((c) => c.desbloqueada).reduce((acc, c) => acc + c.xp, 0);
  const totalXP = baseStats.treinoXP + conquistaXP;

  const stats = useMemo(() => {
    const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;
    const xpParaEsteLevel = (level - 1) * (level - 1) * 100;
    const xpParaProximoLevel = level * level * 100;
    const xpNoLevel = totalXP - xpParaEsteLevel;
    const xpNecessario = xpParaProximoLevel - xpParaEsteLevel;
    const progresso = xpNecessario > 0 ? xpNoLevel / xpNecessario : 0;

    return { ...baseStats, totalXP, level, progresso, xpNoLevel, xpParaEsteLevel, xpParaProximoLevel, xpNecessario };
  }, [baseStats, totalXP]);

  const desbloqueadas = conquistas.filter((c) => c.desbloqueada).length;
  const conquistasVisiveis = showAllConquistas ? conquistas : conquistas.slice(0, CONQUISTAS_PREVIEW);
  const temMaisConquistas = conquistas.length > CONQUISTAS_PREVIEW;

  return (
    <>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Trophy size={14} />
          Conquistas
        </Box>
      </Typography>

      {/* Level + XP */}
      <Card sx={{ mb: 1.5, overflow: 'visible' }}>
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: '6px',
              background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(255,107,44,0.3)',
            }}>
              <Typography sx={{

                fontSize: '1.4rem',
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1,
              }}>
                {stats.level}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '1rem' }}>
                  Nível {stats.level}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  {stats.totalXP} XP
                </Typography>
              </Box>
              {/* XP Bar */}
              <Box sx={{ width: '100%', height: 8, borderRadius: '2px', bgcolor: 'action.hover', overflow: 'hidden' }}>
                <Box sx={{
                  width: `${Math.min(stats.progresso * 100, 100)}%`,
                  height: '100%',
                  borderRadius: '2px',
                  background: 'linear-gradient(90deg, #FF6B2C, #E55A1B)',
                  transition: 'width 0.5s ease',
                }} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', mt: 0.3, display: 'block' }}>
                {stats.totalXP} / {stats.xpParaProximoLevel} XP para nível {stats.level + 1}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Stats row */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
        <Card sx={{ flex: 1, borderRadius: '4px' }}>
          <CardContent sx={{ textAlign: 'center', py: 1.5, px: 1 }}>
            <Typography sx={{ fontSize: '1.2rem', fontWeight: 700, color: '#F97316', lineHeight: 1 }}>
              {stats.streak}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Semanas Seguidas
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, borderRadius: '8px' }}>
          <CardContent sx={{ textAlign: 'center', py: 1.5, px: 1 }}>
            <Typography sx={{ fontSize: '1.2rem', fontWeight: 700, color: '#FF6B2C', lineHeight: 1 }}>
              {stats.volumeTotal > 1000 ? `${(stats.volumeTotal / 1000).toFixed(1)}t` : `${stats.volumeTotal}kg`}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Volume Total
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, borderRadius: '8px' }}>
          <CardContent sx={{ textAlign: 'center', py: 1.5, px: 1 }}>
            <Typography sx={{ fontSize: '1.2rem', fontWeight: 700, color: '#10B981', lineHeight: 1 }}>
              {desbloqueadas}/{conquistas.length}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Conquistas
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Conquistas */}
      <Card sx={{ mb: 3, borderRadius: '8px', overflow: 'visible' }}>
        <CardContent sx={{ py: 1.5, px: 1.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {conquistasVisiveis.map((c) => (
              <Box
                key={c.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.8,
                  px: 1.2,
                  py: 0.8,
                  borderRadius: 2,
                  border: 1,
                  cursor: c.desbloqueada ? 'pointer' : 'default',
                  borderColor: c.desbloqueada ? `${c.cor}60` : 'divider',
                  bgcolor: c.desbloqueada ? `${c.cor}10` : 'transparent',
                  opacity: c.desbloqueada ? 1 : 0.4,
                }}
              >
                <Box sx={{
                  width: 32, height: 32, borderRadius: '8px',
                  bgcolor: c.desbloqueada ? c.cor : 'action.hover',
                  color: c.desbloqueada ? '#fff' : 'text.disabled',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {c.icon}
                </Box>
                <Box sx={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ display: 'block', fontSize: '0.7rem', lineHeight: 1.2, wordBreak: 'break-word' }}>
                    {c.titulo}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', lineHeight: 1.2, wordBreak: 'break-word' }}>
                    {c.desc}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{
                  fontSize: '0.55rem', fontWeight: 700, flexShrink: 0,
                  color: c.desbloqueada ? c.cor : 'text.disabled',
                }}>
                  +{c.xp}
                </Typography>
              </Box>
            ))}
          </Box>
          {temMaisConquistas && (
            <Button
              onClick={() => setShowAllConquistas(!showAllConquistas)}
              size="small"
              fullWidth
              endIcon={showAllConquistas ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              sx={{
                mt: 1.5, fontSize: '0.75rem', color: 'text.secondary',
                textTransform: 'none', fontWeight: 600,
                '&:hover': { bgcolor: 'transparent', color: '#FF6B2C' },
              }}
            >
              {showAllConquistas ? 'Mostrar menos' : `Ver todas (${conquistas.length})`}
            </Button>
          )}
        </CardContent>
      </Card>

    </>
  );
}
