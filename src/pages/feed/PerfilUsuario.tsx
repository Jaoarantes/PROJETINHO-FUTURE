import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, IconButton, CircularProgress, Avatar, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemAvatar, ListItemText,
  Tabs, Tab, Card, CardActionArea, CardContent, Collapse, Divider, Chip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowLeft, Rss, X, Lock, Dumbbell, Footprints, Waves, CircleEllipsis, Copy, ChevronDown } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import * as feedService from '../../services/feedService';
import {
  carregarMeusPosts, countFollowers, countFollowing,
  listFollowers, listFollowing, checkFollowStatus, toggleFollow, carregarSocialStats,
} from '../../services/feedService';
import type { FollowUser, FollowStatus } from '../../services/feedService';
import { getUserProfile } from '../../services/userService';
import { carregarHistorico, carregarSessoes, salvarSessao } from '../../services/treinoService';
import { calcularXPTotal, calcularLevelInfo } from '../../utils/xpCalculator';
import FeedPostCard from '../../components/feed/FeedPostCard';
import type { FeedPost } from '../../types/feed';
import type { SessaoTreino, TipoSessao, TipoSerie } from '../../types/treino';
import { TIPO_SESSAO_LABELS, TIPO_SERIE_CORES, calcularDistanciaCorrida, calcularDistanciaNatacao } from '../../types/treino';
import { useTreinoStore } from '../../store/treinoStore';

// ─── Helpers ───
const TIPO_ICONS: Record<TipoSessao, typeof Dumbbell> = {
  musculacao: Dumbbell, corrida: Footprints, natacao: Waves, outro: CircleEllipsis,
};
const TIPO_CORES: Record<TipoSessao, string> = {
  musculacao: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
  corrida: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
  natacao: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  outro: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
};

function getSessaoSubtitle(sessao: SessaoTreino) {
  const tipo = sessao.tipo || 'musculacao';
  if (tipo === 'corrida' && sessao.corrida?.etapas) {
    const dist = calcularDistanciaCorrida(sessao.corrida.etapas);
    const etapas = sessao.corrida.etapas.length;
    return `${dist > 0 ? dist.toFixed(1) + ' km · ' : ''}${etapas} etapa${etapas !== 1 ? 's' : ''}`;
  }
  if (tipo === 'natacao' && sessao.natacao?.etapas) {
    const dist = calcularDistanciaNatacao(sessao.natacao.etapas);
    const etapas = sessao.natacao.etapas.length;
    return `${dist > 0 ? dist + ' m · ' : ''}${etapas} etapa${etapas !== 1 ? 's' : ''}`;
  }
  const count = sessao.exercicios?.length ?? 0;
  const prefix = tipo === 'outro' && sessao.tipoCustom ? `${sessao.tipoCustom} · ` : '';
  return `${prefix}${count} exercício${count !== 1 ? 's' : ''}`;
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
  const [sessoes, setSessoes] = useState<SessaoTreino[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessoesLoading, setSessoesLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followStatus, setFollowStatus] = useState<FollowStatus>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [followStatusLoaded, setFollowStatusLoaded] = useState(false);

  const [showProfilePhoto, setShowProfilePhoto] = useState(false);
  const [totalXP, setTotalXP] = useState(0);
  const [tabIndex, setTabIndex] = useState(0); // 0 = Feed, 1 = Treinos
  const [expandedSessao, setExpandedSessao] = useState<string | null>(null);
  const [copyDialog, setCopyDialog] = useState<SessaoTreino | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);

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

    carregarSessoes(userId)
      .then(setSessoes)
      .catch(console.error)
      .finally(() => setSessoesLoading(false));

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

  // ─── Copiar Treino ───
  const handleCopiarTreino = async (sessao: SessaoTreino) => {
    if (!uid || copyLoading) return;
    setCopyLoading(true);
    try {
      const ownerName = profileData?.displayName || profileData?.username || 'Usuário';
      const newId = crypto.randomUUID();
      // Deep clone exercises with new IDs
      const newExercicios = sessao.exercicios.map((ex) => ({
        ...ex,
        id: crypto.randomUUID(),
        series: ex.series.map((s) => ({
          ...s,
          id: crypto.randomUUID(),
          concluida: false,
        })),
      }));
      const novaSessao: SessaoTreino = {
        ...sessao,
        id: newId,
        nome: `${sessao.nome} (${ownerName})`,
        exercicios: newExercicios,
        corrida: sessao.corrida ? {
          ...sessao.corrida,
          id: crypto.randomUUID(),
          etapas: sessao.corrida.etapas.map((e) => ({ ...e, id: crypto.randomUUID() })),
        } : undefined,
        natacao: sessao.natacao ? {
          ...sessao.natacao,
          id: crypto.randomUUID(),
          etapas: sessao.natacao.etapas.map((e) => ({ ...e, id: crypto.randomUUID() })),
        } : undefined,
        criadoEm: new Date().toISOString(),
      };
      await salvarSessao(uid, novaSessao);
      // Also add to local store
      useTreinoStore.setState((state) => ({ sessoes: [...state.sessoes, novaSessao] }));
      setCopyDialog(null);
      navigate('/treino');
    } catch (err) {
      console.error('Erro ao copiar treino:', err);
    } finally {
      setCopyLoading(false);
    }
  };

  // ─── Render Treinos Tab Content (sessões registradas) ───
  const renderTreinosContent = () => {
    if (sessoesLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress size={28} />
        </Box>
      );
    }
    if (sessoes.length === 0) {
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
            <Dumbbell size={36} color="#FF6B2C" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Nenhum treino cadastrado ainda.
          </Typography>
        </Box>
      );
    }

    // Agrupar por tipo
    const tipos: TipoSessao[] = ['musculacao', 'corrida', 'natacao', 'outro'];
    const grupos = tipos
      .map((t) => ({ tipo: t, items: sessoes.filter((s) => (s.tipo || 'musculacao') === t) }))
      .filter((g) => g.items.length > 0);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, px: 2.5, pt: 2 }}>
        {grupos.map((grupo) => (
          <Box key={grupo.tipo}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.82rem', mb: 1, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {TIPO_SESSAO_LABELS[grupo.tipo]}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {grupo.items.map((sessao) => {
                const tipo = sessao.tipo || 'musculacao';
                const Icon = TIPO_ICONS[tipo];
                const isExpanded = expandedSessao === sessao.id;
                return (
                  <Card key={sessao.id}>
                    <CardActionArea onClick={() => setExpandedSessao(isExpanded ? null : sessao.id)}>
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
                          <Typography variant="subtitle2" fontWeight={600} noWrap>{sessao.nome}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {getSessaoSubtitle(sessao)}
                          </Typography>
                        </Box>
                        <ChevronDown size={18} style={{ opacity: 0.4, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }} />
                      </CardContent>
                    </CardActionArea>

                    <Collapse in={isExpanded}>
                      <Divider />
                      <Box sx={{ px: 2, py: 1.5 }}>
                        {/* Exercícios de musculação */}
                        {tipo === 'musculacao' && sessao.exercicios.length > 0 && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {sessao.exercicios.map((ex) => (
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
                                        bgcolor: `${cor}18`, border: `1px solid ${cor}40`,
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

                        {tipo === 'musculacao' && sessao.exercicios.length === 0 && (
                          <Typography variant="caption" color="text.secondary">Nenhum exercício cadastrado</Typography>
                        )}

                        {/* Corrida etapas */}
                        {tipo === 'corrida' && sessao.corrida?.etapas && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {sessao.corrida.etapas.map((et, i) => (
                              <Box key={et.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Footprints size={14} style={{ opacity: 0.4 }} />
                                <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>
                                  Etapa {i + 1}
                                  {et.distanciaKm ? ` · ${et.distanciaKm} km` : ''}
                                  {et.tipo ? ` · ${et.tipo}` : ''}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}

                        {/* Natação etapas */}
                        {tipo === 'natacao' && sessao.natacao?.etapas && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {sessao.natacao.etapas.map((et, i) => (
                              <Box key={et.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Waves size={14} style={{ opacity: 0.4 }} />
                                <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>
                                  Etapa {i + 1}
                                  {et.distanciaM ? ` · ${et.distanciaM} m` : ''}
                                  {et.estilo ? ` · ${et.estilo}` : ''}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}

                        {/* Botão copiar treino */}
                        {!isOwner && (
                          <Button
                            variant="outlined"
                            fullWidth
                            startIcon={<Copy size={16} />}
                            onClick={(e) => { e.stopPropagation(); setCopyDialog(sessao); }}
                            sx={{
                              mt: 1.5, py: 0.8,
                              borderColor: 'rgba(255, 107, 44, 0.4)',
                              color: '#FF6B2C',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              borderRadius: 2,
                              textTransform: 'none',
                              '&:hover': { borderColor: '#FF6B2C', bgcolor: 'rgba(255, 107, 44, 0.08)' },
                            }}
                          >
                            Copiar treino
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

      {/* Dialog: Copiar Treino */}
      <Dialog
        open={!!copyDialog}
        onClose={() => setCopyDialog(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', pb: 0.5 }}>
          Copiar treino
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            O treino <strong>"{copyDialog?.nome}"</strong> será copiado para a sua aba de treinos com o nome:
          </Typography>
          <Typography variant="body2" fontWeight={600} sx={{ color: '#FF6B2C' }}>
            "{copyDialog?.nome} ({profileData?.displayName || profileData?.username || 'Usuário'})"
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
            Todos os exercícios e séries serão copiados. Você poderá editar livremente depois.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCopyDialog(null)} sx={{ textTransform: 'none', color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => copyDialog && handleCopiarTreino(copyDialog)}
            disabled={copyLoading}
            startIcon={copyLoading ? <CircularProgress size={16} color="inherit" /> : <Copy size={16} />}
            sx={{
              textTransform: 'none', fontWeight: 700, borderRadius: '10px',
              bgcolor: '#FF6B2C', '&:hover': { bgcolor: '#e55a1b' },
            }}
          >
            Copiar
          </Button>
        </DialogActions>
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
