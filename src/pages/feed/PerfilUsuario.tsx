import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, IconButton, CircularProgress, Avatar, Button,
  Dialog, DialogTitle, DialogContent, List, ListItem, ListItemAvatar, ListItemText,
  Tabs, Tab, Card, CardActionArea, CardContent, Chip, Collapse, Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowLeft, Rss, X, Lock, Dumbbell, Footprints, Waves, Clock, Calendar, Flame, CircleEllipsis, Gauge } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import * as feedService from '../../services/feedService';
import {
  carregarMeusPosts, countFollowers, countFollowing,
  listFollowers, listFollowing, checkFollowStatus, toggleFollow, carregarSocialStats,
} from '../../services/feedService';
import type { FollowUser, FollowStatus } from '../../services/feedService';
import { getUserProfile } from '../../services/userService';
import { carregarHistorico } from '../../services/treinoService';
import { calcularXPTotal, calcularLevelInfo } from '../../utils/xpCalculator';
import { calcularCaloriasTreino } from '../../utils/calorieCalculator';
import FeedPostCard from '../../components/feed/FeedPostCard';
import type { FeedPost } from '../../types/feed';
import type { RegistroTreino, TipoSessao, TipoSerie } from '../../types/treino';
import { TIPO_SESSAO_LABELS, TIPO_SERIE_CORES, calcularDistanciaCorrida, calcularDistanciaNatacao } from '../../types/treino';
import { lazy, Suspense } from 'react';
const StravaRouteMap = lazy(() => import('../../components/treino/StravaRouteMap'));

// ─── Helpers (same as TreinoTab) ───
const TIPO_ICONS: Record<TipoSessao, typeof Dumbbell> = {
  musculacao: Dumbbell, corrida: Footprints, natacao: Waves, outro: CircleEllipsis,
};
const TIPO_CORES: Record<TipoSessao, string> = {
  musculacao: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
  corrida: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
  natacao: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  outro: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
};

function formatarSegundos(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = Math.round(seg % 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ''}`;
  if (m > 0) return `${m}min${s > 0 ? ` ${s}s` : ''}`;
  return `${s}s`;
}

function formatarPace(mps: number): string {
  if (!mps || mps <= 0) return '--:--';
  const minKm = 1000 / (mps * 60);
  const mins = Math.floor(minKm);
  const secs = Math.round((minKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /km`;
}

function formatarDataGrupo(isoString: string): string {
  const data = new Date(isoString);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const mesmodia = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (mesmodia(data, hoje)) return 'Hoje';
  if (mesmodia(data, ontem)) return 'Ontem';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(data);
}

function agruparHistoricoPorData(registros: RegistroTreino[]) {
  const mapa = new Map<string, RegistroTreino[]>();
  const ordemChaves: string[] = [];
  for (const reg of registros) {
    const d = new Date(reg.concluidoEm);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!mapa.has(chave)) { mapa.set(chave, []); ordemChaves.push(chave); }
    mapa.get(chave)!.push(reg);
  }
  return ordemChaves.map((chave) => {
    const regs = mapa.get(chave)!;
    return { chave, label: formatarDataGrupo(regs[0].concluidoEm), registros: regs };
  });
}

export default function PerfilUsuario() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [profileData, setProfileData] = useState<{
    displayName: string | null;
    username: string | null;
    photoURL: string | null;
    isPrivate: boolean;
  } | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [historico, setHistorico] = useState<RegistroTreino[]>([]);
  const [loading, setLoading] = useState(true);
  const [historicoLoading, setHistoricoLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followStatus, setFollowStatus] = useState<FollowStatus>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [followStatusLoaded, setFollowStatusLoaded] = useState(false);

  const [showProfilePhoto, setShowProfilePhoto] = useState(false);
  const [totalXP, setTotalXP] = useState(0);
  const [tabIndex, setTabIndex] = useState(0); // 0 = Feed, 1 = Treinos
  const [expandedReg, setExpandedReg] = useState<string | null>(null);

  // Dialog seguidores/seguindo
  const [followDialog, setFollowDialog] = useState<'followers' | 'following' | null>(null);
  const [followList, setFollowList] = useState<FollowUser[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  const uid = user?.id;

  useEffect(() => {
    if (!userId) return;

    getUserProfile(userId).then((p) => {
      if (p) setProfileData({ displayName: p.displayName, username: p.username, photoURL: p.photoURL, isPrivate: p.isPrivate });
    });

    carregarMeusPosts(userId)
      .then(setPosts)
      .catch(console.error)
      .finally(() => setLoading(false));

    carregarHistorico(userId)
      .then(setHistorico)
      .catch(console.error)
      .finally(() => setHistoricoLoading(false));

    countFollowers(userId).then(setFollowersCount);
    countFollowing(userId).then(setFollowingCount);

    Promise.all([
      carregarHistorico(userId),
      carregarSocialStats(userId),
    ]).then(([hist, socialStats]) => {
      setTotalXP(calcularXPTotal(hist, socialStats));
    }).catch(() => {});

    if (uid && uid !== userId) {
      checkFollowStatus(uid, userId).then(setFollowStatus).finally(() => setFollowStatusLoaded(true));
    } else {
      setFollowStatusLoaded(true);
    }
  }, [userId, uid]);

  if (!userId || !uid) return null;

  const isOwner = uid === userId;

  const levelInfo = useMemo(() => calcularLevelInfo(totalXP), [totalXP]);
  const displayName = profileData?.displayName || 'Usuário';
  const isPrivate = profileData?.isPrivate || false;
  const isFollowing = followStatus === 'accepted';
  const isPending = followStatus === 'pending';
  const canSeeContent = isOwner || !isPrivate || isFollowing;

  const handleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      const result = await toggleFollow(uid, userId, isPrivate);
      if (result === 'unfollowed') {
        setFollowStatus(null);
        if (isFollowing) setFollowersCount((c) => c - 1);
      } else {
        setFollowStatus(result);
        if (result === 'accepted') setFollowersCount((c) => c + 1);
      }
    } catch (err) {
      console.error('Erro ao seguir:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasLiked = post.likedByMe;
    setPosts((prev) => prev.map((p) =>
      p.id === postId
        ? { ...p, likedByMe: !p.likedByMe, likesCount: p.likedByMe ? p.likesCount - 1 : p.likesCount + 1 }
        : p
    ));
    try {
      await feedService.toggleLike(postId, uid);
    } catch {
      setPosts((prev) => prev.map((p) =>
        p.id === postId
          ? { ...p, likedByMe: wasLiked, likesCount: wasLiked ? p.likesCount + 1 : p.likesCount - 1 }
          : p
      ));
    }
  };

  const openFollowDialog = async (type: 'followers' | 'following') => {
    if (!canSeeContent) return;
    setFollowDialog(type);
    setFollowListLoading(true);
    setFollowList([]);
    try {
      const list = type === 'followers' ? await listFollowers(userId) : await listFollowing(userId);
      setFollowList(list);
    } catch (err) {
      console.error('Erro ao carregar lista:', err);
    } finally {
      setFollowListLoading(false);
    }
  };

  const getFollowButtonLabel = () => {
    if (isFollowing) return 'Seguindo';
    if (isPending) return 'Solicitado';
    return 'Seguir';
  };

  const getFollowButtonStyle = () => {
    if (isFollowing) return { borderColor: 'divider', color: 'text.primary' };
    if (isPending) return { borderColor: 'divider', color: 'text.secondary' };
    return { bgcolor: '#FF6B2C', '&:hover': { bgcolor: '#e55a1b' } };
  };

  // ─── Render Treinos Tab Content ───
  const renderTreinosContent = () => {
    if (historicoLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress size={28} />
        </Box>
      );
    }
    if (historico.length === 0) {
      return (
        <Box sx={{
          textAlign: 'center', py: 8, px: 2.5,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <Box sx={{
            width: 80, height: 80, borderRadius: '24px',
            background: `linear-gradient(135deg, ${alpha('#FF6B2C', 0.12)} 0%, ${alpha('#FF6B2C', 0.04)} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Clock size={36} color="#FF6B2C" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Nenhum treino registrado ainda.
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, px: 2.5, pt: 2 }}>
        {agruparHistoricoPorData(historico).map((grupo) => (
          <Box key={grupo.chave}>
            {/* Date header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Calendar size={15} style={{ opacity: 0.5 }} />
              <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.82rem', letterSpacing: '0.03em' }}>
                {grupo.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.6 }}>
                {grupo.registros.length} {grupo.registros.length === 1 ? 'treino' : 'treinos'}
              </Typography>
              <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider', ml: 1 }} />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {grupo.registros.map((reg) => {
                const tipo = reg.tipo || 'musculacao';
                const Icon = TIPO_ICONS[tipo];
                const data = new Date(reg.concluidoEm);
                const horaStr = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const isExpanded = expandedReg === reg.id;

                return (
                  <Card key={reg.id}>
                    <CardActionArea onClick={() => setExpandedReg(isExpanded ? null : reg.id)}>
                      <CardContent sx={{ display: 'flex', alignItems: 'center', py: 1.5, px: 2 }}>
                        <Box sx={{
                          width: 40, height: 40, borderRadius: '10px',
                          background: TIPO_CORES[tipo],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          mr: 1.5, flexShrink: 0,
                        }}>
                          <Icon size={20} color="#fff" />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" fontWeight={600} noWrap>{reg.nome}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                            <Chip label={tipo === 'outro' && reg.tipoCustom ? reg.tipoCustom : TIPO_SESSAO_LABELS[tipo]} size="small" sx={{ height: 16, fontSize: '0.55rem' }} />
                            {reg.duracaoTotalSegundos && (
                              <>
                                <Typography variant="caption" color="text.secondary">·</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  {formatarSegundos(reg.duracaoTotalSegundos)}
                                </Typography>
                              </>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </CardActionArea>

                    {/* Detalhes expandidos */}
                    <Collapse in={isExpanded}>
                      <Divider />
                      <Box sx={{ px: 2, py: 1.5 }}>
                        {/* Data e Hora + Calorias */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Calendar size={14} style={{ opacity: 0.5 }} />
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                              {horaStr}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Flame size={14} color="#FF6B2C" />
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#FF6B2C', fontSize: '0.82rem' }}>
                              {Math.round(Number(reg.calorias) || calcularCaloriasTreino(reg))} kcal
                            </Typography>
                          </Box>
                        </Box>

                        {/* Exercícios de musculação */}
                        {tipo === 'musculacao' && reg.exercicios.length > 0 && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {reg.exercicios.map((ex) => (
                              <Box key={ex.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                  <Dumbbell size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
                                  <Typography variant="body2" fontWeight={500} noWrap sx={{ fontSize: '0.82rem', flex: 1 }}>
                                    {ex.exercicio.nome}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', ml: 3 }}>
                                  {ex.series.map((s, idx) => {
                                    const tipoSerie: TipoSerie = (s as { tipo?: TipoSerie }).tipo || 'normal';
                                    const cor = TIPO_SERIE_CORES[tipoSerie];
                                    return (
                                      <Box key={s.id} sx={{
                                        display: 'flex', alignItems: 'center', gap: 0.4,
                                        px: 0.8, py: 0.3, borderRadius: 1,
                                        bgcolor: `${cor}18`,
                                        border: `1px solid ${cor}40`,
                                      }}>
                                        <Box sx={{
                                          width: 16, height: 16, borderRadius: '4px',
                                          bgcolor: cor, color: '#fff',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          fontSize: '0.6rem', fontWeight: 700,
                                        }}>
                                          {idx + 1}
                                        </Box>
                                        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                                          {s.peso ? `${s.peso}kg` : '—'}×{s.repeticoes}
                                        </Typography>
                                      </Box>
                                    );
                                  })}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        )}

                        {tipo === 'musculacao' && reg.exercicios.length === 0 && (
                          <Typography variant="caption" color="text.secondary">Nenhum exercício registrado</Typography>
                        )}

                        {/* Corrida stats */}
                        {tipo === 'corrida' && (
                          <Box sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', gap: 3, mb: 1 }}>
                              {(() => {
                                const distTotal = (reg.corrida?.etapas || []).reduce((acc: number, et: any) => acc + (et.distanciaKm || 0), 0);
                                const paceMedio = (distTotal > 0 && reg.duracaoTotalSegundos)
                                  ? (reg.duracaoTotalSegundos / 60) / distTotal
                                  : 0;
                                return (
                                  <>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Distância</Typography>
                                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                        <Typography variant="h6" fontWeight={800} color="primary.main">{distTotal.toFixed(2)}</Typography>
                                        <Typography variant="caption" fontWeight={700} color="primary.main">km</Typography>
                                      </Box>
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ritmo Médio</Typography>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Gauge size={14} color="#FF6B2C" />
                                        <Typography variant="body2" fontWeight={800}>{formatarPace(1000 / (paceMedio * 60))}</Typography>
                                      </Box>
                                    </Box>
                                    {reg.stravaData && (
                                      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.2, bgcolor: 'rgba(252, 76, 2, 0.1)', borderRadius: 1 }}>
                                        <Typography variant="caption" sx={{ color: '#FC4C02', fontWeight: 900, fontSize: '0.6rem' }}>STRAVA</Typography>
                                      </Box>
                                    )}
                                  </>
                                );
                              })()}
                            </Box>
                          </Box>
                        )}

                        {/* Natação */}
                        {tipo === 'natacao' && reg.natacao?.etapas && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {reg.natacao.etapas.map((et, i) => (
                              <Typography key={et.id} variant="body2" sx={{ fontSize: '0.82rem' }}>
                                <Waves size={14} style={{ verticalAlign: 'middle', opacity: 0.4, marginRight: 6 }} />
                                Etapa {i + 1}
                                {et.distanciaM ? ` · ${et.distanciaM} m` : ''}
                                {et.duracaoSegundos ? ` · ${formatarSegundos(et.duracaoSegundos)}` : et.duracaoMin ? ` · ${et.duracaoMin} min` : ''}
                                {et.estilo ? ` · ${et.estilo}` : ''}
                              </Typography>
                            ))}
                          </Box>
                        )}

                        {/* Mapa Strava */}
                        {reg.stravaData?.summaryPolyline && (
                          <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={20} /></Box>}>
                            <StravaRouteMap polyline={reg.stravaData.summaryPolyline} />
                          </Suspense>
                        )}

                        {/* Botão ver detalhes Strava */}
                        {reg.stravaData && (
                          <Button
                            variant="outlined"
                            fullWidth
                            onClick={(e) => { e.stopPropagation(); navigate(`/atividade/${reg.id}`); }}
                            sx={{
                              mt: 1.5, py: 1,
                              borderColor: 'rgba(252, 76, 2, 0.4)',
                              color: '#FC4C02',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              borderRadius: 2,
                              textTransform: 'none',
                              '&:hover': { borderColor: '#FC4C02', bgcolor: 'rgba(252, 76, 2, 0.08)' },
                            }}
                          >
                            Ver mais detalhes
                          </Button>
                        )}
                      </Box>
                    </Collapse>
                  </Card>
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ pt: 1, pb: 4, mx: -2.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, px: 2.5 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowLeft size={22} />
        </IconButton>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem' }}>
          {displayName}
        </Typography>
        {isPrivate && !isOwner && (
          <Lock size={16} style={{ marginLeft: 6, opacity: 0.5 }} />
        )}
      </Box>

      {/* Profile Header */}
      <Box sx={{ px: 2.5, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Avatar
            src={profileData?.photoURL || undefined}
            sx={{ width: 80, height: 80, fontSize: '2rem', cursor: profileData?.photoURL ? 'pointer' : 'default' }}
            onClick={() => { if (profileData?.photoURL) setShowProfilePhoto(true); }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>

          {/* Stats */}
          <Box sx={{ display: 'flex', gap: 3, flex: 1, justifyContent: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.2rem', lineHeight: 1.2 }}>
                {canSeeContent ? posts.length : '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Posts
              </Typography>
            </Box>
            <Box
              sx={{ textAlign: 'center', cursor: canSeeContent ? 'pointer' : 'default' }}
              onClick={() => openFollowDialog('followers')}
            >
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.2rem', lineHeight: 1.2 }}>
                {canSeeContent ? followersCount : '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Seguidores
              </Typography>
            </Box>
            <Box
              sx={{ textAlign: 'center', cursor: canSeeContent ? 'pointer' : 'default' }}
              onClick={() => openFollowDialog('following')}
            >
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.2rem', lineHeight: 1.2 }}>
                {canSeeContent ? followingCount : '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Seguindo
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Nome */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1.5, fontSize: '1rem' }}>
          {displayName}
        </Typography>
        {profileData?.username && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
            @{profileData.username}
          </Typography>
        )}

        {/* Level + XP Badge */}
        <Box sx={{
          mt: 1.5, display: 'flex', alignItems: 'center', gap: 1.5,
          p: 1.2, borderRadius: '12px',
          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
        }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '8px',
            background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(255,107,44,0.3)',
          }}>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
              {levelInfo.level}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.3 }}>
              <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
                Nível {levelInfo.level}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                {levelInfo.totalXP} XP
              </Typography>
            </Box>
            <Box sx={{ width: '100%', height: 6, borderRadius: '3px', bgcolor: 'action.hover', overflow: 'hidden' }}>
              <Box sx={{
                width: `${Math.min(levelInfo.progresso * 100, 100)}%`,
                height: '100%',
                borderRadius: '3px',
                background: 'linear-gradient(90deg, #FF6B2C, #E55A1B)',
                transition: 'width 0.5s ease',
              }} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', mt: 0.2, display: 'block' }}>
              {levelInfo.totalXP} / {levelInfo.xpParaProximoLevel} XP para nível {levelInfo.level + 1}
            </Typography>
          </Box>
        </Box>

        {/* Botão Seguir */}
        {!isOwner && followStatusLoaded && (
          <Button
            variant={isFollowing || isPending ? 'outlined' : 'contained'}
            fullWidth
            size="small"
            onClick={handleFollow}
            disabled={followLoading}
            sx={{
              mt: 2, textTransform: 'none', fontWeight: 700, borderRadius: '10px',
              fontSize: '0.9rem', py: 0.8,
              ...getFollowButtonStyle(),
            }}
          >
            {getFollowButtonLabel()}
          </Button>
        )}
      </Box>

      {/* ─── Tabs Feed / Treinos ─── */}
      {canSeeContent && (
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          variant="fullWidth"
          sx={{
            minHeight: 40,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 40,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
            },
            '& .Mui-selected': {
              color: '#FF6B2C',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#FF6B2C',
            },
          }}
        >
          <Tab label="Feed" />
          <Tab label="Treinos" />
        </Tabs>
      )}

      {/* Divider for private/no-content */}
      {!canSeeContent && <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}

      {/* Conteúdo - privado ou público */}
      {!canSeeContent ? (
        <Box sx={{
          textAlign: 'center', py: 8, px: 2.5,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <Box sx={{
            width: 80, height: 80, borderRadius: '24px',
            background: `linear-gradient(135deg, ${alpha('#FF6B2C', 0.12)} 0%, ${alpha('#FF6B2C', 0.04)} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lock size={36} color="#FF6B2C" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
              Conta Privada
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isPending
                ? 'Solicitação enviada. Aguarde a aprovação.'
                : 'Siga esta conta para ver as publicações.'}
            </Typography>
          </Box>
        </Box>
      ) : (
        <>
          {/* ─── Tab Feed ─── */}
          {tabIndex === 0 && (
            loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
                <CircularProgress size={28} />
              </Box>
            ) : posts.length === 0 ? (
              <Box sx={{
                textAlign: 'center', py: 8, px: 2.5,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                <Box sx={{
                  width: 80, height: 80, borderRadius: '24px',
                  background: `linear-gradient(135deg, ${alpha('#FF6B2C', 0.12)} 0%, ${alpha('#FF6B2C', 0.04)} 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Rss size={36} color="#FF6B2C" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Nenhuma publicação ainda.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {posts.map((post) => (
                  <FeedPostCard
                    key={post.id}
                    post={{
                      ...post,
                      authorPhoto: profileData?.photoURL || post.authorPhoto,
                      authorName: profileData?.displayName || post.authorName,
                    }}
                    currentUserId={uid}
                    onLike={handleLike}
                  />
                ))}
              </Box>
            )
          )}

          {/* ─── Tab Treinos ─── */}
          {tabIndex === 1 && renderTreinosContent()}
        </>
      )}

      {/* Profile photo fullscreen */}
      <Dialog
        open={showProfilePhoto}
        onClose={() => setShowProfilePhoto(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'visible',
            backgroundImage: 'none',
            border: 'none',
            outline: 'none',
            '&::before, &::after': { display: 'none' },
          },
        }}
        slotProps={{
          backdrop: { sx: { bgcolor: 'rgba(0,0,0,0.9)' } },
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={() => setShowProfilePhoto(false)}
            sx={{
              position: 'absolute', top: -40, right: 0,
              color: '#fff', bgcolor: 'rgba(0,0,0,0.5)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
          >
            <X size={20} />
          </IconButton>
          {profileData?.photoURL && (
            <Box
              component="img"
              src={profileData.photoURL}
              alt={displayName}
              sx={{
                width: '280px',
                height: '280px',
                objectFit: 'cover',
                borderRadius: '50%',
                display: 'block',
                mx: 'auto',
                border: 'none',
                outline: 'none',
              }}
            />
          )}
        </Box>
      </Dialog>

      {/* Dialog: Seguidores / Seguindo */}
      <Dialog
        open={!!followDialog}
        onClose={() => setFollowDialog(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: '16px', maxHeight: '70vh' } }}
      >
        <DialogTitle sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '1.05rem', fontWeight: 700, pb: 1,
        }}>
          {followDialog === 'followers' ? 'Seguidores' : 'Seguindo'}
          <IconButton size="small" onClick={() => setFollowDialog(null)}>
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 1, pb: 2 }}>
          {followListLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : followList.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              {followDialog === 'followers' ? 'Nenhum seguidor ainda.' : 'Não segue ninguém ainda.'}
            </Typography>
          ) : (
            <List disablePadding>
              {followList.map((u) => (
                <ListItem
                  key={u.id}
                  sx={{ px: 1.5, py: 0.8, borderRadius: '12px', cursor: 'pointer' }}
                  onClick={() => {
                    setFollowDialog(null);
                    if (u.id === uid) {
                      navigate('/feed/meus-posts');
                    } else {
                      navigate(`/feed/perfil/${u.id}`);
                    }
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 48 }}>
                    <Avatar src={u.photoURL || undefined} sx={{ width: 40, height: 40 }}>
                      {u.displayName?.charAt(0).toUpperCase() || 'U'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={u.displayName || 'Usuário'}
                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.95rem' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
