import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Skeleton, IconButton, Badge,
  TextField, Button,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Search, Plus, Bell, Rss, User, AtSign } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useFeedStore } from '../../store/feedStore';
import { contarNotificacoesNaoLidas } from '../../services/feedService';
import { checkUsernameAvailable, saveUsername } from '../../services/userService';
import FeedPostCard from '../../components/feed/FeedPostCard';

export default function FeedTab() {
  const { user, profile, refreshUser } = useAuthContext();
  const navigate = useNavigate();
  const posts = useFeedStore((s) => s.posts);
  const loading = useFeedStore((s) => s.loading);
  const hasMore = useFeedStore((s) => s.hasMore);
  const carregarFeed = useFeedStore((s) => s.carregarFeed);
  const carregarMais = useFeedStore((s) => s.carregarMais);
  const toggleLike = useFeedStore((s) => s.toggleLike);
  const deletarPost = useFeedStore((s) => s.deletarPost);
  const editarPost = useFeedStore((s) => s.editarPost);
  const iniciarRealtime = useFeedStore((s) => s.iniciarRealtime);
  const pararRealtime = useFeedStore((s) => s.pararRealtime);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const uid = user?.id;
  const [unreadCount, setUnreadCount] = useState(0);

  // Username gate
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSaving, setUsernameSaving] = useState(false);

  const hasUsername = !!profile?.username;

  // Carrega feed inicial + inicia realtime
  useEffect(() => {
    if (uid && hasUsername && posts.length === 0) {
      carregarFeed(uid, true);
    }
    if (uid && hasUsername) {
      iniciarRealtime(uid);
    }
    return () => pararRealtime();
  }, [uid, hasUsername]);

  // Contar notificações não lidas (poll a cada 15s)
  useEffect(() => {
    if (!uid || !hasUsername) return;
    const fetch = () => contarNotificacoesNaoLidas(uid).then(setUnreadCount).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, [uid, hasUsername]);

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

  // Memoize callbacks so FeedPostCard React.memo works properly
  const handleLike = useCallback((id: string) => toggleLike(id, uid!), [toggleLike, uid]);
  const handleDelete = useCallback((id: string) => deletarPost(uid!, id), [deletarPost, uid]);
  const handleEdit = useCallback((id: string, texto: string) => editarPost(uid!, id, texto), [editarPost, uid]);

  if (!uid) return null;

  const handleSaveUsername = async () => {
    if (usernameInput.length < 3) {
      setUsernameError('Mínimo de 3 caracteres.');
      return;
    }
    setUsernameSaving(true);
    try {
      const available = await checkUsernameAvailable(usernameInput, uid);
      if (!available) {
        setUsernameError('Este nome já está em uso. Escolha outro.');
        setUsernameSaving(false);
        return;
      }
      await saveUsername(uid, usernameInput);
      await refreshUser();
    } catch {
      setUsernameError('Erro ao salvar. Tente novamente.');
    } finally {
      setUsernameSaving(false);
    }
  };

  // Username gate screen
  if (!hasUsername) {
    return (
      <Box sx={{ pt: 6, pb: 4, px: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{
          width: 80, height: 80, borderRadius: '24px',
          background: `linear-gradient(135deg, ${alpha('#FF6B2C', 0.12)} 0%, ${alpha('#FF6B2C', 0.04)} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          mb: 3,
        }}>
          <AtSign size={36} color="#FF6B2C" />
        </Box>

        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5, textAlign: 'center' }}>
          Crie seu nome de usuário
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center', maxWidth: 300 }}>
          Para acessar o feed, você precisa de um nome de usuário único. Ele será usado para te encontrarem.
        </Typography>

        <Box sx={{ width: '100%', maxWidth: 320 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="ex: Joao.Silva"
            value={usernameInput}
            onChange={(e) => {
              const val = e.target.value.replace(/[^a-zA-Z0-9._]/g, '');
              setUsernameInput(val);
              setUsernameError('');
            }}
            error={!!usernameError}
            helperText={usernameError || 'Letras, números, pontos e underlines.'}
            slotProps={{ htmlInput: { maxLength: 30 } }}
            sx={{ mb: 2, '& input': { fontSize: '1rem', textAlign: 'center' } }}
          />

          <Button
            variant="contained"
            fullWidth
            disabled={usernameSaving || usernameInput.length < 3}
            onClick={handleSaveUsername}
            sx={{
              py: 1.2, borderRadius: '12px', textTransform: 'none',
              fontWeight: 700, fontSize: '0.95rem',
              bgcolor: '#FF6B2C', '&:hover': { bgcolor: '#e55a1b' },
            }}
          >
            {usernameSaving ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Continuar'}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 1, pb: 2, mx: -2.5 }}>
      {/* Top Bar - Search | + | Avatar(meus posts) | Bell(notificações) */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        mb: 2.5, px: 2.5,
      }}>
        <IconButton onClick={() => navigate('/feed/busca')} sx={{ color: 'text.secondary', width: 42, height: 42 }}>
          <Search size={22} />
        </IconButton>

        <IconButton onClick={() => navigate('/feed/novo')} sx={{ color: 'text.secondary', width: 42, height: 42 }}>
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
              onLike={handleLike}
              onDelete={handleDelete}
              onEdit={handleEdit}
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
