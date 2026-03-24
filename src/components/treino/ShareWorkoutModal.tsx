import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, List, ListItem, ListItemAvatar,
  ListItemText, Avatar, CircularProgress, Box, Typography, IconButton,
} from '@mui/material';
import { X, Send, Check } from 'lucide-react';
import { listFollowers } from '../../services/feedService';
import type { FollowUser } from '../../services/feedService';
import { compartilharTreino } from '../../services/shareWorkoutService';
import type { SessaoTreino } from '../../types/treino';

interface Props {
  open: boolean;
  onClose: () => void;
  sessao: SessaoTreino | null;
  userId: string;
}

export default function ShareWorkoutModal({ open, onClose, sessao, userId }: Props) {
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && userId) {
      setLoading(true);
      setSent(new Set());
      listFollowers(userId)
        .then(setFollowers)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open, userId]);

  const handleShare = async (targetUserId: string) => {
    if (!sessao || sending || sent.has(targetUserId)) return;
    setSending(targetUserId);
    try {
      await compartilharTreino(userId, targetUserId, sessao);
      setSent((prev) => new Set(prev).add(targetUserId));
    } catch (err) {
      console.error('Erro ao compartilhar:', err);
    } finally {
      setSending(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: '16px', maxHeight: '70vh' } }}
    >
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: '1.05rem', fontWeight: 700, pb: 1,
      }}>
        Compartilhar treino
        <IconButton size="small" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 1, pb: 2 }}>
        {sessao && (
          <Box sx={{
            mx: 1.5, mb: 2, p: 1.5, borderRadius: '12px',
            bgcolor: 'action.hover',
          }}>
            <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.9rem' }}>
              {sessao.nome}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {sessao.exercicios.length} exercícios
            </Typography>
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : followers.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Você ainda não tem seguidores.
          </Typography>
        ) : (
          <List disablePadding>
            {followers.map((f) => (
              <ListItem
                key={f.id}
                sx={{ px: 1.5, py: 0.8, borderRadius: '12px' }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => handleShare(f.id)}
                    disabled={!!sending || sent.has(f.id)}
                    sx={{
                      color: sent.has(f.id) ? '#4CAF50' : '#FF6B2C',
                      '&:disabled': { color: sent.has(f.id) ? '#4CAF50' : undefined },
                    }}
                  >
                    {sending === f.id ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : sent.has(f.id) ? (
                      <Check size={18} />
                    ) : (
                      <Send size={18} />
                    )}
                  </IconButton>
                }
              >
                <ListItemAvatar sx={{ minWidth: 48 }}>
                  <Avatar src={f.photoURL || undefined} sx={{ width: 40, height: 40 }}>
                    {f.displayName?.charAt(0).toUpperCase() || 'U'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={f.displayName || 'Usuário'}
                  primaryTypographyProps={{ fontWeight: 600, fontSize: '0.95rem' }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
