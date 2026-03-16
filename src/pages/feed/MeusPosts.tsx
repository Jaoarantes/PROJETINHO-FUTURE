import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, CircularProgress } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowLeft, Rss } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useFeedStore } from '../../store/feedStore';
import { carregarMeusPosts } from '../../services/feedService';
import FeedPostCard from '../../components/feed/FeedPostCard';
import type { FeedPost } from '../../types/feed';

export default function MeusPosts() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { toggleLike, deletarPost, editarPost } = useFeedStore();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const uid = user?.id;

  useEffect(() => {
    if (uid) {
      carregarMeusPosts(uid)
        .then(setPosts)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [uid]);

  if (!uid) return null;

  const handleDelete = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    await deletarPost(uid, postId);
  };

  const handleEdit = async (postId: string, texto: string) => {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, texto } : p));
    await editarPost(uid, postId, texto);
  };

  const handleLike = async (postId: string) => {
    setPosts((prev) => prev.map((p) =>
      p.id === postId
        ? { ...p, likedByMe: !p.likedByMe, likesCount: p.likedByMe ? p.likesCount - 1 : p.likesCount + 1 }
        : p
    ));
    await toggleLike(postId, uid);
  };

  return (
    <Box sx={{ pt: 1, pb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
        <IconButton onClick={() => navigate('/feed')} sx={{ mr: 1, ml: -1 }}>
          <ArrowLeft size={22} />
        </IconButton>
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: '1.2rem' }}>
          Minhas Publicações
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress size={28} />
        </Box>
      ) : posts.length === 0 ? (
        <Box sx={{
          textAlign: 'center', py: 8,
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
            Você ainda não publicou nada.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              currentUserId={uid}
              onLike={handleLike}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
