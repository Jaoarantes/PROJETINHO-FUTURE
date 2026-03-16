import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, CircularProgress } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useFeedStore } from '../../store/feedStore';
import FeedPostCard from '../../components/feed/FeedPostCard';
import ComentariosList from '../../components/feed/ComentariosList';

export default function PostDetalhe() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuthContext();
  const { posts, toggleLike, deletarPost, editarPost, atualizarContadorComentarios, carregarFeed } = useFeedStore();
  const [loading, setLoading] = useState(false);

  const uid = user?.id;
  const post = posts.find((p) => p.id === postId);

  useEffect(() => {
    if (!post && uid && !loading) {
      setLoading(true);
      carregarFeed(uid, true).finally(() => setLoading(false));
    }
  }, [post, uid]);

  if (loading || !post) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', pt: 10 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!uid) return null;

  return (
    <Box sx={{ pt: 1, pb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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

      <Box sx={{ mt: 2.5 }}>
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
