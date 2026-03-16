import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar, IconButton, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Heart, MessageCircle, Trash2, Dumbbell, Footprints, Waves, Clock, Flame, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import type { FeedPost } from '../../types/feed';
import { TIPO_SESSAO_LABELS } from '../../types/treino';
import type { TipoSessao } from '../../types/treino';

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
  if (h > 0) return `${h}h${m > 0 ? `${m}min` : ''}`;
  return `${m}min`;
}

const tipoIcons: Record<string, React.ReactNode> = {
  musculacao: <Dumbbell size={14} />,
  corrida: <Footprints size={14} />,
  natacao: <Waves size={14} />,
};

interface Props {
  post: FeedPost;
  currentUserId: string;
  onLike: (postId: string) => void;
  onDelete?: (postId: string) => void;
}

export default function FeedPostCard({ post, currentUserId, onLike, onDelete }: Props) {
  const navigate = useNavigate();
  const [photoIdx, setPhotoIdx] = useState(0);
  const isOwner = post.userId === currentUserId;
  const hasPhotos = post.fotoUrls.length > 0;

  return (
    <Box sx={{
      bgcolor: 'background.paper',
      borderRadius: '20px',
      border: '1px solid',
      borderColor: 'divider',
      overflow: 'hidden',
      transition: 'all 0.2s ease',
    }}>
      {/* Header: Avatar + Name + Time */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pt: 2, pb: 1.5 }}>
        <Avatar
          src={post.authorPhoto || undefined}
          sx={{
            width: 40, height: 40, mr: 1.5,
            border: '2px solid',
            borderColor: alpha('#FF6B2C', 0.3),
          }}
        >
          {post.authorName?.charAt(0).toUpperCase() || 'U'}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.9rem' }}>
            {post.authorName || 'Usuário'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            {tempoRelativo(post.createdAt)}
          </Typography>
        </Box>
        {isOwner && onDelete && (
          <IconButton size="small" onClick={() => onDelete(post.id)} sx={{ color: 'text.secondary', opacity: 0.5 }}>
            <Trash2 size={16} />
          </IconButton>
        )}
      </Box>

      {/* Workout Summary Badge */}
      {post.tipoTreino && (
        <Box sx={{ px: 2, pb: 1.5 }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            p: 1.5, borderRadius: '14px',
            background: (theme) => theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(255,107,44,0.08) 0%, rgba(255,107,44,0.03) 100%)'
              : 'linear-gradient(135deg, rgba(255,107,44,0.06) 0%, rgba(255,107,44,0.02) 100%)',
            border: '1px solid',
            borderColor: alpha('#FF6B2C', 0.12),
          }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#000', flexShrink: 0,
            }}>
              {tipoIcons[post.tipoTreino] || <Zap size={16} />}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.85rem' }}>
                {post.nomeTreino || TIPO_SESSAO_LABELS[post.tipoTreino as TipoSessao] || 'Treino'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.3, flexWrap: 'wrap' }}>
                {post.duracaoSegundos && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                    <Clock size={11} color="#94A3B8" />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      {formatDuracao(post.duracaoSegundos)}
                    </Typography>
                  </Box>
                )}
                {post.resumo?.exerciciosCount && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                    <Dumbbell size={11} color="#94A3B8" />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      {post.resumo.exerciciosCount} exerc.
                    </Typography>
                  </Box>
                )}
                {post.resumo?.volumeTotal && post.resumo.volumeTotal > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                    <Flame size={11} color="#94A3B8" />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      {(post.resumo.volumeTotal / 1000).toFixed(1)}t
                    </Typography>
                  </Box>
                )}
                {post.resumo?.distanciaKm && post.resumo.distanciaKm > 0 && (
                  <Chip
                    label={`${post.resumo.distanciaKm.toFixed(1)} km`}
                    size="small"
                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                    color="primary"
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* Grupos musculares */}
          {post.resumo?.gruposMusculares && post.resumo.gruposMusculares.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
              {post.resumo.gruposMusculares.map((g) => (
                <Chip
                  key={g}
                  label={g}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22, fontSize: '0.65rem', borderRadius: '8px' }}
                />
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Caption Text */}
      {post.texto && (
        <Box sx={{ px: 2, pb: 1.5 }}>
          <Typography variant="body2" sx={{ fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
            {post.texto}
          </Typography>
        </Box>
      )}

      {/* Photos */}
      {hasPhotos && (
        <Box sx={{ position: 'relative', bgcolor: '#0a0a0a' }}>
          <Box
            component="img"
            src={post.fotoUrls[photoIdx]}
            alt=""
            sx={{
              width: '100%',
              height: 320,
              objectFit: 'cover',
              display: 'block',
            }}
          />
          {post.fotoUrls.length > 1 && (
            <>
              {photoIdx > 0 && (
                <IconButton
                  onClick={() => setPhotoIdx((i) => i - 1)}
                  sx={{
                    position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', width: 32, height: 32,
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                  }}
                >
                  <ChevronLeft size={18} />
                </IconButton>
              )}
              {photoIdx < post.fotoUrls.length - 1 && (
                <IconButton
                  onClick={() => setPhotoIdx((i) => i + 1)}
                  sx={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', width: 32, height: 32,
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                  }}
                >
                  <ChevronRight size={18} />
                </IconButton>
              )}
              {/* Dots */}
              <Box sx={{
                position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 0.5,
              }}>
                {post.fotoUrls.map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: i === photoIdx ? 18 : 6, height: 6, borderRadius: 3,
                      bgcolor: i === photoIdx ? '#FF6B2C' : 'rgba(255,255,255,0.5)',
                      transition: 'all 0.3s',
                    }}
                  />
                ))}
              </Box>
            </>
          )}
        </Box>
      )}

      {/* Actions: Like + Comment */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, py: 1 }}>
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
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{ mr: 2, minWidth: 20, color: post.likedByMe ? '#EF4444' : 'text.secondary' }}
        >
          {post.likesCount > 0 ? post.likesCount : ''}
        </Typography>

        <IconButton
          onClick={() => navigate(`/feed/${post.id}`)}
          sx={{ color: 'text.secondary' }}
        >
          <MessageCircle size={22} />
        </IconButton>
        <Typography variant="caption" fontWeight={700} sx={{ color: 'text.secondary' }}>
          {post.commentsCount > 0 ? post.commentsCount : ''}
        </Typography>
      </Box>
    </Box>
  );
}
