import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, CircularProgress, Button } from '@mui/material';
import { ArrowLeft, Rss } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useFeedStore } from '../../store/feedStore';
import FeedPostCard from '../../components/feed/FeedPostCard';
import ComentariosList from '../../components/feed/ComentariosList';

export default function PostDetalhe() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuthContext();
  const posts = useFeedStore((s) => s.posts);
  const loading = useFeedStore((s) => s.loading);
  const toggleLike = useFeedStore((s) => s.toggleLike);
  const deletarPost = useFeedStore((s) => s.deletarPost);
  const editarPost = useFeedStore((s) => s.editarPost);
  const atualizarContadorComentarios = useFeedStore((s) => s.atualizarContadorComentarios);
  const carregarFeed = useFeedStore((s) => s.carregarFeed);
  const [loadRequestedFor, setLoadRequestedFor] = useState<string | null>(null);

  const uid = user?.id;
  const post = posts.find((p) => p.id === postId);

  useEffect(() => {
    if (!post && uid && loadRequestedFor !== uid) {
      carregarFeed(uid, true)
        .catch(console.error)
        .finally(() => setLoadRequestedFor(uid));
    }
  }, [carregarFeed, loadRequestedFor, post, uid]);

  if (!uid) return null;

  if (!post && (loading || loadRequestedFor !== uid)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', pt: 10 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!post) {
    return (
      <Box sx={{ pt: 1, pb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, px: 0.5 }}>
          <IconButton onClick={() => navigate('/feed')} sx={{ mr: 1, ml: -1 }}>
            <ArrowLeft size={22} />
          </IconButton>
          <Typography variant="h5" fontWeight={700} sx={{ fontSize: '1.2rem' }}>
            Post
          </Typography>
        </Box>

        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="h6" fontWeight={800}>
            Post não encontrado
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
            Ele pode ter sido removido ou ainda não apareceu no seu feed.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Rss size={16} />}
            onClick={() => navigate('/feed')}
            sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
          >
            Voltar ao feed
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 1, pb: 4, mx: -2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, px: 2.5 }}>
        <IconButton onClick={() => navigate('/feed')} sx={{ mr: 1, ml: -1 }}>
          <ArrowLeft size={22} />
        </IconButton>
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: '1.2rem' }}>
          Post
        </Typography>
      </Box>

      <FeedPostCard
        post={post}
        currentUserId={uid}
        onLike={(id) => toggleLike(id, uid)}
        onDelete={(id) => { deletarPost(uid, id); navigate('/feed'); }}
        onEdit={(id, texto) => editarPost(uid, id, texto)}
      />

      <Box sx={{ mt: 2.5, px: 2.5 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, fontSize: '0.95rem' }}>
          Comentários {post.commentsCount > 0 && `(${post.commentsCount})`}
        </Typography>
        <ComentariosList
          postId={post.id}
          currentUserId={uid}
          currentUserName={user.user_metadata?.display_name || profile?.displayName || null}
          currentUserPhoto={user.user_metadata?.avatar_url || profile?.photoURL || null}
          onCountChange={(delta) => atualizarContadorComentarios(post.id, delta)}
        />
      </Box>
    </Box>
  );
}
