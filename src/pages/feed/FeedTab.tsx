import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Fab, Skeleton } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Plus, Rss } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useFeedStore } from '../../store/feedStore';
import FeedPostCard from '../../components/feed/FeedPostCard';

export default function FeedTab() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { posts, loading, hasMore, carregarFeed, carregarMais, toggleLike, deletarPost } = useFeedStore();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const uid = user?.id;

  // Carrega feed inicial
  useEffect(() => {
    if (uid && posts.length === 0) {
      carregarFeed(uid, true);
    }
  }, [uid]);

  // Infinite scroll
  const lastPostRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && uid) {
          carregarMais(uid);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, uid, carregarMais],
  );

  // Pull to refresh
  const handleRefresh = () => {
    if (uid) carregarFeed(uid, true);
  };

  if (!uid) return null;

  return (
    <Box sx={{ pt: 1, pb: 2 }}>
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        mb: 2.5,
      }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{
            fontFamily: '"Oswald", sans-serif',
            letterSpacing: '0.02em',
            background: 'linear-gradient(135deg, #FF6B2C 0%, #FF8A50 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            FEED
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            Veja o que a comunidade está treinando
          </Typography>
        </Box>
        <Box
          onClick={handleRefresh}
          sx={{
            width: 40, height: 40, borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid', borderColor: 'divider',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:active': { bgcolor: alpha('#FF6B2C', 0.1) },
          }}
        >
          <Rss size={18} color="#94A3B8" />
        </Box>
      </Box>

      {/* Empty State */}
      {!loading && posts.length === 0 && (
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
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
              Feed vazio
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Conclua um treino e compartilhe com a comunidade!
            </Typography>
          </Box>
        </Box>
      )}

      {/* Skeleton Loading */}
      {loading && posts.length === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ bgcolor: 'background.paper', borderRadius: '20px', border: '1px solid', borderColor: 'divider', p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="40%" height={20} />
                  <Skeleton width="20%" height={14} />
                </Box>
              </Box>
              <Skeleton variant="rounded" height={60} sx={{ borderRadius: '14px', mb: 1.5 }} />
              <Skeleton width="60%" height={18} />
            </Box>
          ))}
        </Box>
      )}

      {/* Posts */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {posts.map((post, idx) => (
          <Box key={post.id} ref={idx === posts.length - 1 ? lastPostRef : undefined}>
            <FeedPostCard
              post={post}
              currentUserId={uid}
              onLike={(id) => toggleLike(id, uid)}
              onDelete={(id) => deletarPost(uid, id)}
            />
          </Box>
        ))}
      </Box>

      {/* Loading more */}
      {loading && posts.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      <div ref={sentinelRef} />

      {/* FAB - Criar Post */}
      <Fab
        color="primary"
        onClick={() => navigate('/feed/novo')}
        sx={{
          position: 'fixed',
          bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
          right: 20,
          zIndex: 999,
        }}
      >
        <Plus size={26} />
      </Fab>
    </Box>
  );
}
