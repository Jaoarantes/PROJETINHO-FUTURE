import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Skeleton, IconButton, Badge } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Search, Plus, Bell, Rss, User } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useFeedStore } from '../../store/feedStore';
import { contarNotificacoesNaoLidas } from '../../services/feedService';
import FeedPostCard from '../../components/feed/FeedPostCard';

export default function FeedTab() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { posts, loading, hasMore, carregarFeed, carregarMais, toggleLike, deletarPost, editarPost } = useFeedStore();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const uid = user?.id;
  const [unreadCount, setUnreadCount] = useState(0);

  // Carrega feed inicial
  useEffect(() => {
    if (uid && posts.length === 0) {
      carregarFeed(uid, true);
    }
  }, [uid]);

  // Contar notificações não lidas
  useEffect(() => {
    if (uid) {
      contarNotificacoesNaoLidas(uid).then(setUnreadCount).catch(() => {});
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

  if (!uid) return null;

  return (
    <Box sx={{ pt: 1, pb: 2, mx: -2.5 }}>
      {/* Top Bar - Search | + | Avatar(meus posts) | Bell(notificações) */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        mb: 2.5, px: 2.5,
      }}>
        <IconButton sx={{ color: 'text.secondary', width: 42, height: 42 }}>
          <Search size={22} />
        </IconButton>

        <IconButton
          onClick={() => navigate('/feed/novo')}
          sx={{
            width: 44, height: 44, color: '#fff',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha('#fff', 0.08) : alpha('#000', 0.06),
            borderRadius: '12px',
            '&:active': { bgcolor: alpha('#FF6B2C', 0.15) },
          }}
        >
          <Plus size={24} />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            onClick={() => navigate('/feed/meus-posts')}
            sx={{ color: 'text.secondary', width: 42, height: 42 }}
          >
            <User size={22} />
          </IconButton>
          <IconButton
            onClick={() => { navigate('/feed/notificacoes'); setUnreadCount(0); }}
            sx={{ color: 'text.secondary' }}
          >
            <Badge
              badgeContent={unreadCount}
              color="error"
              max={99}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.6rem', minWidth: 16, height: 16,
                  bgcolor: '#FF6B2C', color: '#fff',
                },
              }}
            >
              <Bell size={22} />
            </Badge>
          </IconButton>
        </Box>
      </Box>

      {/* Empty State */}
      {!loading && posts.length === 0 && (
        <Box sx={{
          textAlign: 'center', py: 8, px: 2.5,
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
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Feed vazio</Typography>
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
            <Box key={i} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Skeleton variant="circular" width={44} height={44} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="40%" height={20} />
                  <Skeleton width="20%" height={14} />
                </Box>
                <Skeleton width={50} height={24} />
              </Box>
              <Skeleton width="80%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" height={50} sx={{ borderRadius: '14px', mb: 1.5 }} />
            </Box>
          ))}
        </Box>
      )}

      {/* Posts */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {posts.map((post, idx) => (
          <Box key={post.id} ref={idx === posts.length - 1 ? lastPostRef : undefined}>
            <FeedPostCard
              post={post}
              currentUserId={uid}
              onLike={(id) => toggleLike(id, uid)}
              onDelete={(id) => deletarPost(uid, id)}
              onEdit={(id, texto) => editarPost(uid, id, texto)}
            />
          </Box>
        ))}
      </Box>

      {loading && posts.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      )}
    </Box>
  );
}
