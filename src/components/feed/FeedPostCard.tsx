import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Avatar, IconButton, Button, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Heart, MessageCircle, MoreVertical, Pencil, Trash2,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import type { FeedPost, FeedComment } from '../../types/feed';
import { TIPO_SESSAO_LABELS, TIPO_SERIE_CORES } from '../../types/treino';
import type { TipoSessao, TipoSerie } from '../../types/treino';
import { toggleFollow, checkFollowing, carregarComentarios } from '../../services/feedService';
import { getExerciseImageUrl } from '../../constants/exercise-images';

function tempoRelativo(data: string): string {
  const diff = (Date.now() - new Date(data).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatDuracao(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? `${m.toString().padStart(2, '0')}min` : ''}`;
  return `${m}min`;
}

function formatVolume(v: number): string {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' kg';
}

const MAX_INLINE_COMMENTS = 4;

interface Props {
  post: FeedPost;
  currentUserId: string;
  onLike: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onEdit?: (postId: string, novoTexto: string) => void;
}

export default function FeedPostCard({ post, currentUserId, onLike, onDelete, onEdit }: Props) {
  const navigate = useNavigate();
  const [slideIdx, setSlideIdx] = useState(0);
  const [showAllExercicios, setShowAllExercicios] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editTexto, setEditTexto] = useState(post.texto || '');
  const [inlineComments, setInlineComments] = useState<FeedComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const lastTapRef = useRef(0);

  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const isSwiping = useRef(false);

  const isOwner = post.userId === currentUserId;
  const hasPhotos = post.fotoUrls.length > 0;
  const exercicios = post.resumo?.exercicios || [];
  const VISIBLE_EXERCICIOS = 3;
  const hiddenCount = exercicios.length - VISIBLE_EXERCICIOS;

  // When post has photos + workout, slides = [photos..., workout detail]
  const hasWorkoutSlide = hasPhotos && (exercicios.length > 0 || post.tipoTreino);
  const totalSlides = hasPhotos ? post.fotoUrls.length + (hasWorkoutSlide ? 1 : 0) : 0;
  const isOnWorkoutSlide = hasWorkoutSlide && slideIdx === totalSlides - 1;

  useEffect(() => {
    if (!isOwner && currentUserId) {
      checkFollowing(currentUserId, post.userId).then(setIsFollowing).catch(() => {});
    }
  }, [currentUserId, post.userId, isOwner]);

  useEffect(() => {
    if (post.commentsCount > 0 && !commentsLoaded) {
      carregarComentarios(post.id)
        .then((c) => { setInlineComments(c.filter((cm) => !cm.parentId)); setCommentsLoaded(true); })
        .catch(() => setCommentsLoaded(true));
    }
  }, [post.id, post.commentsCount, commentsLoaded]);

  const handleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      const nowFollowing = await toggleFollow(currentUserId, post.userId);
      setIsFollowing(nowFollowing);
    } catch (err) {
      console.error('Erro ao seguir:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleConfirmDelete = () => {
    setConfirmDelete(false);
    setMenuAnchor(null);
    onDelete?.(post.id);
  };

  const handleSaveEdit = () => {
    setEditDialog(false);
    setMenuAnchor(null);
    onEdit?.(post.id, editTexto.trim());
  };

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!post.likedByMe) onLike(post.id);
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 800);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [post.likedByMe, post.id, onLike]);

  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    isSwiping.current = false;
    isHorizontalSwipe.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    touchDeltaX.current = dx;

    // Detect if this is a horizontal swipe (once determined, lock it)
    if (!isHorizontalSwipe.current && !isSwiping.current) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        isHorizontalSwipe.current = true;
        isSwiping.current = true;
      } else if (Math.abs(dy) > 10) {
        // Vertical scroll — don't interfere
        return;
      }
    }

    if (isHorizontalSwipe.current) {
      e.preventDefault(); // prevent vertical scroll while swiping horizontally
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping.current || !isHorizontalSwipe.current) return;
    const threshold = 40;
    if (touchDeltaX.current < -threshold && slideIdx < totalSlides - 1) {
      setSlideIdx((i) => i + 1);
    } else if (touchDeltaX.current > threshold && slideIdx > 0) {
      setSlideIdx((i) => i - 1);
    }
    touchDeltaX.current = 0;
    isSwiping.current = false;
    isHorizontalSwipe.current = false;
  };

  const visibleComments = inlineComments.slice(0, MAX_INLINE_COMMENTS);
  const hasMoreComments = inlineComments.length > MAX_INLINE_COMMENTS;

  // Render exercise list with reps/weights badges
  const renderExerciseList = (compact?: boolean) => {
    const visible = showAllExercicios ? exercicios : exercicios.slice(0, VISIBLE_EXERCICIOS);
    return (
      <Box sx={{ px: 2, py: compact ? 1 : 1.5 }}>
        {visible.map((ex, idx) => {
          const gifUrl = ex.exercicioId ? getExerciseImageUrl(ex.exercicioId) : undefined;
          return (
            <Box key={idx} sx={{
              py: compact ? 0.6 : 0.8,
              borderBottom: idx < visible.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{
                  width: compact ? 36 : 44, height: compact ? 36 : 44, borderRadius: compact ? '10px' : '12px',
                  background: (theme) => theme.palette.mode === 'dark' ? alpha('#fff', 0.06) : alpha('#000', 0.04),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  overflow: 'hidden',
                }}>
                  {gifUrl ? (
                    <Box component="img" src={gifUrl} alt={ex.nome} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  ) : (
                    <Typography sx={{ fontSize: compact ? '0.75rem' : '0.85rem', fontWeight: 700, color: 'text.secondary', opacity: 0.5 }}>✕</Typography>
                  )}
                </Box>
                <Typography variant="body2" sx={{ fontSize: compact ? '0.82rem' : '0.88rem', fontWeight: 600, flex: 1, minWidth: 0 }} noWrap>
                  {ex.nome}
                </Typography>
              </Box>
              {/* Series badges */}
              {ex.series?.length ? (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', ml: compact ? '48px' : '56px', mt: 0.5 }}>
                  {ex.series.map((s, sIdx) => {
                    const cor = TIPO_SERIE_CORES[(s.tipo as TipoSerie) || 'normal'] || TIPO_SERIE_CORES.normal;
                    return (
                      <Box key={sIdx} sx={{
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
                          {sIdx + 1}
                        </Box>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                          {s.peso ? `${s.peso}kg` : '—'}x{s.reps}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', ml: compact ? '48px' : '56px' }}>
                  {ex.sets} sets
                </Typography>
              )}
            </Box>
          );
        })}
        {hiddenCount > 0 && (
          <Button
            onClick={() => setShowAllExercicios(!showAllExercicios)}
            size="small"
            endIcon={showAllExercicios ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            sx={{
              mt: 0.5, fontSize: '0.75rem', color: 'text.secondary',
              textTransform: 'none', fontWeight: 600, px: 0,
              '&:hover': { bgcolor: 'transparent', color: '#FF6B2C' },
            }}
          >
            {showAllExercicios ? 'Mostrar menos' : `Veja ${hiddenCount} mais exercícios`}
          </Button>
        )}
      </Box>
    );
  };

  // Render workout stats row
  const renderStatsRow = () => {
    if (!post.tipoTreino) return null;
    return (
      <Box sx={{
        display: 'flex', alignItems: 'center',
        mx: 2, py: 1.2,
        borderTop: '1px solid', borderBottom: exercicios.length > 0 ? '1px solid' : 'none',
        borderColor: 'divider',
      }}>
        {post.duracaoSegundos && (
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', letterSpacing: '0.03em' }}>
              Tempo
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.9rem', lineHeight: 1.2 }}>
              {formatDuracao(post.duracaoSegundos)}
            </Typography>
          </Box>
        )}
        {post.resumo?.volumeTotal != null && post.resumo.volumeTotal > 0 && (
          <Box sx={{
            flex: 1, textAlign: 'center',
            borderLeft: post.duracaoSegundos ? '1px solid' : 'none',
            borderColor: 'divider',
          }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', letterSpacing: '0.03em' }}>
              Volume
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.9rem', lineHeight: 1.2 }}>
              {formatVolume(post.resumo.volumeTotal)}
            </Typography>
          </Box>
        )}
        <Box sx={{
          flex: 1, textAlign: 'center',
          borderLeft: '1px solid', borderColor: 'divider',
        }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', letterSpacing: '0.03em' }}>
            Treino
          </Typography>
          <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.9rem', lineHeight: 1.2 }}>
            {post.nomeTreino || TIPO_SESSAO_LABELS[post.tipoTreino as TipoSessao] || 'Treino'}
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{
      bgcolor: 'background.paper',
      borderBottom: '1px solid',
      borderColor: 'divider',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pt: 2, pb: 1.5 }}>
        <Avatar src={post.authorPhoto || undefined} sx={{ width: 44, height: 44, mr: 1.5 }}>
          {post.authorName?.charAt(0).toUpperCase() || 'U'}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.95rem', lineHeight: 1.2 }}>
            {post.authorName || 'Usuário'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {tempoRelativo(post.createdAt)}
          </Typography>
        </Box>
        {!isOwner && (
          <Button
            size="small"
            onClick={handleFollow}
            disabled={followLoading}
            sx={{
              fontSize: '0.75rem', fontWeight: 700,
              color: isFollowing ? 'text.secondary' : '#FF6B2C',
              textTransform: 'none', minWidth: 'auto', px: 1.5, py: 0.3,
              borderRadius: '8px', '&:active': { opacity: 0.7 },
            }}
          >
            {isFollowing ? 'Seguindo' : 'Seguir'}
          </Button>
        )}
        <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ color: 'text.secondary', opacity: 0.5 }}>
          <MoreVertical size={16} />
        </IconButton>
        <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
          {isOwner && onEdit && (
            <MenuItem onClick={() => { setMenuAnchor(null); setEditTexto(post.texto || ''); setEditDialog(true); }}>
              <Pencil size={15} style={{ marginRight: 10 }} /> Editar post
            </MenuItem>
          )}
          {isOwner && onDelete && (
            <MenuItem onClick={() => { setMenuAnchor(null); setConfirmDelete(true); }} sx={{ color: '#EF4444' }}>
              <Trash2 size={15} style={{ marginRight: 10 }} /> Excluir post
            </MenuItem>
          )}
          {!isOwner && (
            <MenuItem onClick={() => setMenuAnchor(null)}>Denunciar</MenuItem>
          )}
        </Menu>
      </Box>

      {/* Caption */}
      {post.texto && (
        <Box sx={{ px: 2, pb: 1.5 }}>
          <Typography variant="body2" sx={{ fontSize: '0.92rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
            {post.texto}
          </Typography>
        </Box>
      )}

      {/* CASE 1: Has photos — carousel with photos + workout slide */}
      {hasPhotos && (
        <Box
          sx={{ position: 'relative', userSelect: 'none', touchAction: 'pan-y' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={!isOnWorkoutSlide ? handleDoubleTap : undefined}
        >
          {/* Photo slides */}
          {!isOnWorkoutSlide && (
            <Box sx={{ position: 'relative', bgcolor: '#0a0a0a' }}>
              <Box
                component="img"
                src={post.fotoUrls[slideIdx]}
                alt=""
                draggable={false}
                sx={{ width: '100%', height: 380, objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
              />
              {showHeartAnim && (
                <Box sx={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  animation: 'heartPop 0.8s ease-out forwards',
                  '@keyframes heartPop': {
                    '0%': { opacity: 0, transform: 'translate(-50%, -50%) scale(0.3)' },
                    '15%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1.2)' },
                    '30%': { transform: 'translate(-50%, -50%) scale(1)' },
                    '70%': { opacity: 1 },
                    '100%': { opacity: 0, transform: 'translate(-50%, -50%) scale(1.4)' },
                  },
                }}>
                  <Heart size={80} fill="#fff" color="#fff" strokeWidth={1} />
                </Box>
              )}
            </Box>
          )}

          {/* Workout detail slide */}
          {isOnWorkoutSlide && (
            <Box sx={{ minHeight: 380, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {renderStatsRow()}
              {exercicios.length > 0 && renderExerciseList(true)}
            </Box>
          )}

          {/* Dots indicator */}
          {totalSlides > 1 && (
            <Box sx={{
              display: 'flex', justifyContent: 'center', gap: 0.5,
              py: 1,
            }}>
              {Array.from({ length: totalSlides }).map((_, i) => (
                <Box key={i} sx={{
                  width: i === slideIdx ? 18 : 6, height: 6, borderRadius: 3,
                  bgcolor: i === slideIdx ? '#FF6B2C' : (theme) => alpha(theme.palette.text.primary, 0.2),
                  transition: 'all 0.3s',
                }} />
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* CASE 2: No photos — show stats + exercises inline */}
      {!hasPhotos && (
        <>
          {renderStatsRow()}
          {exercicios.length > 0 && renderExerciseList()}
        </>
      )}

      {/* Actions: Like + Comment */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, pt: 1 }}>
        <IconButton
          onClick={() => onLike(post.id)}
          sx={{
            color: post.likedByMe ? '#EF4444' : 'text.secondary',
            transition: 'all 0.2s',
            '&:active': { transform: 'scale(1.3)' },
          }}
        >
          <Heart size={22} fill={post.likedByMe ? '#EF4444' : 'none'} />
        </IconButton>
        <Typography variant="caption" fontWeight={700} sx={{ mr: 1.5, minWidth: 16, color: post.likedByMe ? '#EF4444' : 'text.secondary' }}>
          {post.likesCount > 0 ? post.likesCount : ''}
        </Typography>
        <IconButton onClick={() => navigate(`/feed/${post.id}`)} sx={{ color: 'text.secondary' }}>
          <MessageCircle size={22} />
        </IconButton>
        <Typography variant="caption" fontWeight={700} sx={{ color: 'text.secondary' }}>
          {post.commentsCount > 0 ? post.commentsCount : ''}
        </Typography>
      </Box>

      {/* Liked by */}
      {post.likesCount > 0 && (
        <Box sx={{ px: 2, pb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            Gostado por{' '}
            <Typography component="span" variant="caption" fontWeight={700} color="text.primary" sx={{ fontSize: '0.75rem' }}>
              {post.likesCount} {post.likesCount === 1 ? 'pessoa' : 'pessoas'}
            </Typography>
          </Typography>
        </Box>
      )}

      {/* Inline Comments */}
      {visibleComments.length > 0 && (
        <Box sx={{ px: 2, pt: 0.5, pb: 1 }}>
          {visibleComments.map((c) => (
            <Box key={c.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.5 }}>
              <Avatar src={c.authorPhoto || undefined} sx={{ width: 24, height: 24, mt: 0.2 }}>
                {c.authorName?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" sx={{ fontSize: '0.78rem' }}>
                  <Typography component="span" variant="caption" fontWeight={700} sx={{ fontSize: '0.78rem', mr: 0.5 }}>
                    {c.authorName || 'Usuário'}
                  </Typography>
                  {c.texto}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block' }}>
                  {tempoRelativo(c.createdAt)}
                </Typography>
              </Box>
            </Box>
          ))}
          {hasMoreComments && (
            <Typography
              variant="caption" color="text.secondary"
              onClick={() => navigate(`/feed/${post.id}`)}
              sx={{ fontSize: '0.75rem', cursor: 'pointer', mt: 0.5, display: 'block', '&:active': { color: '#FF6B2C' } }}
            >
              Ver todos os {inlineComments.length} comentários
            </Typography>
          )}
        </Box>
      )}

      {/* Adicionar comentário */}
      <Box onClick={() => navigate(`/feed/${post.id}`)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, pb: 2, cursor: 'pointer' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.78rem', opacity: 0.5 }}>
          Adicionar um comentário...
        </Typography>
      </Box>

      {/* Dialog: Confirmar exclusão */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle sx={{ fontSize: '1.1rem', fontWeight: 700 }}>Excluir post?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ textTransform: 'none' }}>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Editar post */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontSize: '1.1rem', fontWeight: 700 }}>Editar post</DialogTitle>
        <DialogContent>
          <TextField
            multiline minRows={3} maxRows={6} fullWidth
            value={editTexto} onChange={(e) => setEditTexto(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleSaveEdit} variant="contained" sx={{ textTransform: 'none' }}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
