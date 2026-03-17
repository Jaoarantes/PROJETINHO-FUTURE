import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Avatar, TextField, IconButton, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Send, Trash2, Pencil, CornerDownRight } from 'lucide-react';
import type { FeedComment } from '../../types/feed';
import { carregarComentarios, adicionarComentario, deletarComentario, editarComentario } from '../../services/feedService';
import ConfirmDeleteDialog from '../ConfirmDeleteDialog';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';

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
  const navigate = useNavigate();
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);

  // Reply
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  // Editar
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTexto, setEditTexto] = useState('');

  // Confirmar exclusão
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const deleteComment = useConfirmDelete();

  // Expandir respostas
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  useEffect(() => {
    carregarComentarios(postId)
      .then(setComments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [postId]);

  // Separar comentários raiz e respostas
  const rootComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  const handleSend = async () => {
    const msg = texto.trim();
    if (!msg || sending) return;
    setSending(true);
    try {
      const parentId = replyTo?.id || null;
      const newId = await adicionarComentario(currentUserId, postId, msg, parentId);
      setComments((prev) => [...prev, {
        id: newId,
        postId,
        userId: currentUserId,
        texto: msg,
        createdAt: new Date().toISOString(),
        authorName: currentUserName,
        authorPhoto: currentUserPhoto,
        parentId,
      }]);
      setTexto('');
      setReplyTo(null);
      onCountChange(1);
      // Auto-expand replies when replying
      if (parentId) {
        setExpandedReplies((prev) => new Set(prev).add(parentId));
      }
    } catch (err) {
      console.error('Erro ao comentar:', err);
    } finally {
      setSending(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    deleteComment.confirmDelete(async () => {
      const replies = comments.filter((c) => c.parentId === id);
      const totalDeleted = 1 + replies.length;
      setComments((prev) => prev.filter((c) => c.id !== id && c.parentId !== id));
      onCountChange(-totalDeleted);
      setDeleteConfirmId(null);
      try {
        await deletarComentario(currentUserId, id, postId);
      } catch (err) {
        console.error('Erro ao deletar comentário:', err);
      }
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTexto.trim()) return;
    const id = editingId;
    const novoTexto = editTexto.trim();
    setEditingId(null);
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, texto: novoTexto } : c));
    try {
      await editarComentario(currentUserId, id, novoTexto);
    } catch (err) {
      console.error('Erro ao editar comentário:', err);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const goToProfile = (userId: string) => {
    if (userId === currentUserId) navigate('/feed/meus-posts');
    else navigate(`/feed/perfil/${userId}`);
  };

  const renderComment = (c: FeedComment, isReply = false) => (
    <Box key={c.id} sx={{ display: 'flex', gap: 1.5, ml: isReply ? 5 : 0 }}>
      <Avatar
        src={c.authorPhoto || undefined}
        sx={{ width: isReply ? 28 : 32, height: isReply ? 28 : 32, mt: 0.3, cursor: 'pointer' }}
        onClick={() => goToProfile(c.userId)}
      >
        {c.authorName?.charAt(0).toUpperCase() || 'U'}
      </Avatar>
      <Box sx={{
        flex: 1, p: 1.5, borderRadius: '12px',
        bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha('#fff', 0.03) : alpha('#000', 0.02),
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{ fontSize: '0.8rem', cursor: 'pointer', '&:active': { opacity: 0.6 } }}
            onClick={() => goToProfile(c.userId)}
          >
            {c.authorName || 'Usuário'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            {tempoRelativo(c.createdAt)}
          </Typography>
          {c.userId === currentUserId && (
            <Box sx={{ ml: 'auto', display: 'flex', gap: 0.2 }}>
              <IconButton
                size="small"
                onClick={() => { setEditingId(c.id); setEditTexto(c.texto); }}
                sx={{ color: 'text.secondary', opacity: 0.4, p: 0.3 }}
              >
                <Pencil size={13} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => { setDeleteConfirmId(c.id); deleteComment.requestDelete(c.id); }}
                sx={{ color: 'text.secondary', opacity: 0.4, p: 0.3 }}
              >
                <Trash2 size={13} />
              </IconButton>
            </Box>
          )}
        </Box>
        <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
          {c.texto}
        </Typography>
        {/* Responder button */}
        {!isReply && (
          <Typography
            variant="caption"
            color="text.secondary"
            onClick={() => { setReplyTo({ id: c.id, name: c.authorName || 'Usuário' }); }}
            sx={{
              fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', mt: 0.5,
              display: 'inline-block',
              '&:active': { color: '#FF6B2C' },
            }}
          >
            Responder
          </Typography>
        )}
      </Box>
    </Box>
  );

  return (
    <Box>
      {/* Input */}
      <Box sx={{ mb: 2 }}>
        {replyTo && (
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.5,
            px: 1.5, py: 0.5, mb: 0.5, borderRadius: '8px',
            bgcolor: (theme) => alpha(theme.palette.mode === 'dark' ? '#FF6B2C' : '#FF6B2C', 0.08),
          }}>
            <CornerDownRight size={14} color="#FF6B2C" />
            <Typography variant="caption" sx={{ fontSize: '0.75rem', flex: 1 }}>
              Respondendo a <Typography component="span" variant="caption" fontWeight={700} sx={{ fontSize: '0.75rem' }}>{replyTo.name}</Typography>
            </Typography>
            <Typography
              variant="caption"
              onClick={() => setReplyTo(null)}
              sx={{ fontSize: '0.7rem', cursor: 'pointer', color: 'text.secondary', fontWeight: 600 }}
            >
              Cancelar
            </Typography>
          </Box>
        )}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          p: 1.5, borderRadius: '14px',
          bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha('#fff', 0.03) : alpha('#000', 0.02),
          border: '1px solid', borderColor: replyTo ? alpha('#FF6B2C', 0.3) : 'divider',
          transition: 'border-color 0.2s',
        }}>
          <Avatar src={currentUserPhoto || undefined} sx={{ width: 32, height: 32 }}>
            {currentUserName?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <TextField
            placeholder={replyTo ? `Responder a ${replyTo.name}...` : 'Escreva um comentário...'}
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
            sx={{ color: texto.trim() ? '#FF6B2C' : 'text.secondary', transition: 'all 0.2s' }}
          >
            {sending ? <CircularProgress size={20} /> : <Send size={20} />}
          </IconButton>
        </Box>
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
          {rootComments.map((c) => {
            const replies = getReplies(c.id);
            const isExpanded = expandedReplies.has(c.id);
            return (
              <Box key={c.id}>
                {renderComment(c)}
                {/* Replies */}
                {replies.length > 0 && (
                  <>
                    {!isExpanded ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        onClick={() => toggleReplies(c.id)}
                        sx={{
                          fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                          ml: 7, mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5,
                          '&:active': { color: '#FF6B2C' },
                        }}
                      >
                        <Box sx={{ width: 24, height: '1px', bgcolor: 'text.secondary', opacity: 0.3 }} />
                        Ver {replies.length} {replies.length === 1 ? 'resposta' : 'respostas'}
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                        {replies.map((r) => renderComment(r, true))}
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          onClick={() => toggleReplies(c.id)}
                          sx={{
                            fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                            ml: 7, display: 'flex', alignItems: 'center', gap: 0.5,
                          }}
                        >
                          <Box sx={{ width: 24, height: '1px', bgcolor: 'text.secondary', opacity: 0.3 }} />
                          Ocultar respostas
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Dialog confirmar exclusão de comentário */}
      <ConfirmDeleteDialog
        open={deleteComment.open}
        loading={deleteComment.loading}
        title="Excluir comentário?"
        message="Tem certeza que deseja excluir este comentário?"
        onClose={() => { deleteComment.cancel(); setDeleteConfirmId(null); }}
        onConfirm={handleConfirmDelete}
      />

      {/* Dialog editar comentário */}
      <Dialog open={!!editingId} onClose={() => setEditingId(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontSize: '1.1rem', fontWeight: 700 }}>Editar comentário</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            minRows={2}
            maxRows={5}
            fullWidth
            value={editTexto}
            onChange={(e) => setEditTexto(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingId(null)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleSaveEdit} variant="contained" sx={{ textTransform: 'none' }}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
