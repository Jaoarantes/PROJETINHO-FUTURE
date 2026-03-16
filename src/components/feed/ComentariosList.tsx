import { useState, useEffect } from 'react';
import { Box, Typography, Avatar, TextField, IconButton, CircularProgress } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Send, Trash2 } from 'lucide-react';
import type { FeedComment } from '../../types/feed';
import { carregarComentarios, adicionarComentario, deletarComentario } from '../../services/feedService';

function tempoRelativo(data: string): string {
  const diff = (Date.now() - new Date(data).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

interface Props {
  postId: string;
  currentUserId: string;
  currentUserName: string | null;
  currentUserPhoto: string | null;
  onCountChange: (delta: number) => void;
}

export default function ComentariosList({ postId, currentUserId, currentUserName, currentUserPhoto, onCountChange }: Props) {
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    carregarComentarios(postId)
      .then(setComments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [postId]);

  const handleSend = async () => {
    const msg = texto.trim();
    if (!msg || sending) return;
    setSending(true);
    try {
      const newId = await adicionarComentario(currentUserId, postId, msg);
      setComments((prev) => [...prev, {
        id: newId,
        postId,
        userId: currentUserId,
        texto: msg,
        createdAt: new Date().toISOString(),
        authorName: currentUserName,
        authorPhoto: currentUserPhoto,
      }]);
      setTexto('');
      onCountChange(1);
    } catch (err) {
      console.error('Erro ao comentar:', err);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    onCountChange(-1);
    try {
      await deletarComentario(currentUserId, commentId);
    } catch (err) {
      console.error('Erro ao deletar comentário:', err);
    }
  };

  return (
    <Box>
      {/* Input */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        p: 1.5, mb: 2,
        borderRadius: '14px',
        bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha('#fff', 0.03) : alpha('#000', 0.02),
        border: '1px solid',
        borderColor: 'divider',
      }}>
        <Avatar src={currentUserPhoto || undefined} sx={{ width: 32, height: 32 }}>
          {currentUserName?.charAt(0).toUpperCase() || 'U'}
        </Avatar>
        <TextField
          placeholder="Escreva um comentário..."
          variant="standard"
          fullWidth
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          slotProps={{ input: { disableUnderline: true, sx: { fontSize: '0.88rem' } } }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!texto.trim() || sending}
          sx={{
            color: texto.trim() ? '#FF6B2C' : 'text.secondary',
            transition: 'all 0.2s',
          }}
        >
          {sending ? <CircularProgress size={20} /> : <Send size={20} />}
        </IconButton>
      </Box>

      {/* Comments list */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : comments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3, opacity: 0.6 }}>
          Nenhum comentário ainda. Seja o primeiro!
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {comments.map((c) => (
            <Box key={c.id} sx={{ display: 'flex', gap: 1.5 }}>
              <Avatar src={c.authorPhoto || undefined} sx={{ width: 32, height: 32, mt: 0.3 }}>
                {c.authorName?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{
                flex: 1,
                p: 1.5,
                borderRadius: '12px',
                bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha('#fff', 0.03) : alpha('#000', 0.02),
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.8rem' }}>
                    {c.authorName || 'Usuário'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    {tempoRelativo(c.createdAt)}
                  </Typography>
                  {c.userId === currentUserId && (
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(c.id)}
                      sx={{ ml: 'auto', color: 'text.secondary', opacity: 0.4, p: 0.3 }}
                    >
                      <Trash2 size={13} />
                    </IconButton>
                  )}
                </Box>
                <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                  {c.texto}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
