import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, IconButton, CircularProgress, Avatar,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowLeft, Heart, MessageCircle, Bell, Trash2, X } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import {
  carregarNotificacoes, marcarNotificacoesLidas,
  deletarNotificacao, deletarTodasNotificacoes,
} from '../../services/feedService';
import type { FeedNotification } from '../../types/feed';
import ConfirmDeleteDialog from '../../components/ConfirmDeleteDialog';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';

function tempoRelativo(data: string): string {
  const diff = (Date.now() - new Date(data).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function Notificacoes() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [notifs, setNotifs] = useState<FeedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const deleteOne = useConfirmDelete();
  const clearAll = useConfirmDelete();

  const uid = user?.id;

  useEffect(() => {
    if (uid) {
      carregarNotificacoes(uid)
        .then((data) => {
          setNotifs(data);
          marcarNotificacoesLidas(uid).catch(() => {});
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [uid]);

  if (!uid) return null;

  const handleDeleteOne = (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    deleteOne.requestDelete(notifId);
  };

  const handleClearAll = () => {
    clearAll.confirmDelete(async () => {
      setNotifs([]);
      await deletarTodasNotificacoes(uid);
    });
  };

  return (
    <Box sx={{ pt: 1, pb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
        <IconButton onClick={() => navigate('/feed')} sx={{ mr: 1, ml: -1 }}>
          <ArrowLeft size={22} />
        </IconButton>
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: '1.2rem', flex: 1 }}>
          Notificações
        </Typography>
        {notifs.length > 0 && (
          <IconButton
            onClick={() => clearAll.requestDelete()}
            sx={{ color: 'text.secondary', opacity: 0.6 }}
          >
            <Trash2 size={20} />
          </IconButton>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress size={28} />
        </Box>
      ) : notifs.length === 0 ? (
        <Box sx={{
          textAlign: 'center', py: 8,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <Box sx={{
            width: 80, height: 80, borderRadius: '24px',
            background: `linear-gradient(135deg, ${alpha('#FF6B2C', 0.12)} 0%, ${alpha('#FF6B2C', 0.04)} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bell size={36} color="#FF6B2C" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Nenhuma notificação ainda.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {notifs.map((n) => (
            <Box
              key={n.id}
              onClick={() => navigate(`/feed/${n.postId}`)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                p: 1.5, borderRadius: '14px', cursor: 'pointer',
                bgcolor: n.lida ? 'transparent' : (theme) =>
                  theme.palette.mode === 'dark' ? alpha('#FF6B2C', 0.04) : alpha('#FF6B2C', 0.03),
                transition: 'all 0.2s',
                '&:active': { bgcolor: alpha('#FF6B2C', 0.08) },
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <Avatar src={n.actorPhoto || undefined} sx={{ width: 40, height: 40 }}>
                  {n.actorName?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <Box sx={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 20, height: 20, borderRadius: '50%',
                  bgcolor: n.tipo === 'like' ? '#EF4444' : '#FF6B2C',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid',
                  borderColor: 'background.paper',
                }}>
                  {n.tipo === 'like' ? <Heart size={10} fill="#fff" color="#fff" /> : <MessageCircle size={10} color="#fff" />}
                </Box>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.3 }}>
                  <Typography component="span" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
                    {n.actorName || 'Alguém'}
                  </Typography>
                  {' '}
                  {n.tipo === 'like' ? 'curtiu seu post' : 'comentou no seu post'}
                </Typography>
                {n.texto && (
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.75rem', display: 'block' }}>
                    "{n.texto}"
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  {tempoRelativo(n.createdAt)}
                </Typography>
              </Box>
              {!n.lida && (
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#FF6B2C', flexShrink: 0 }} />
              )}
              <IconButton
                size="small"
                onClick={(e) => handleDeleteOne(e, n.id)}
                sx={{
                  color: 'text.secondary', opacity: 0.4, flexShrink: 0,
                  '&:hover': { opacity: 0.8, color: '#EF4444' },
                }}
              >
                <X size={16} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* Dialog: Confirmar excluir uma notificação */}
      <ConfirmDeleteDialog
        open={deleteOne.open}
        loading={deleteOne.loading}
        title="Excluir notificação?"
        message="Tem certeza que deseja excluir esta notificação?"
        onClose={deleteOne.cancel}
        onConfirm={() => {
          const notifId = deleteOne.payload;
          deleteOne.confirmDelete(async () => {
            setNotifs((prev) => prev.filter((n) => n.id !== notifId));
            await deletarNotificacao(uid, notifId);
          });
        }}
      />

      {/* Dialog: Confirmar limpar tudo */}
      <ConfirmDeleteDialog
        open={clearAll.open}
        loading={clearAll.loading}
        title="Limpar notificações?"
        message="Todas as notificações serão removidas. Esta ação não pode ser desfeita."
        confirmLabel="Limpar tudo"
        onClose={clearAll.cancel}
        onConfirm={handleClearAll}
      />
    </Box>
  );
}
