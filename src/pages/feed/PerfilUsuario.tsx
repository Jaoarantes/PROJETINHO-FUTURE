import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, IconButton, CircularProgress, Avatar, Button,
  Dialog, DialogTitle, DialogContent, List, ListItem, ListItemAvatar, ListItemText,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowLeft, Rss, X, Lock } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useFeedStore } from '../../store/feedStore';
import {
  carregarMeusPosts, countFollowers, countFollowing,
  listFollowers, listFollowing, checkFollowStatus, toggleFollow,
} from '../../services/feedService';
import type { FollowUser, FollowStatus } from '../../services/feedService';
import { getUserProfile } from '../../services/userService';
import FeedPostCard from '../../components/feed/FeedPostCard';
import type { FeedPost } from '../../types/feed';

export default function PerfilUsuario() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { toggleLike } = useFeedStore();

  const [profileData, setProfileData] = useState<{
    displayName: string | null;
    photoURL: string | null;
    isPrivate: boolean;
  } | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followStatus, setFollowStatus] = useState<FollowStatus>(null);
  const [followLoading, setFollowLoading] = useState(false);

  // Dialog seguidores/seguindo
  const [followDialog, setFollowDialog] = useState<'followers' | 'following' | null>(null);
  const [followList, setFollowList] = useState<FollowUser[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  const uid = user?.id;

  useEffect(() => {
    if (!userId) return;

    getUserProfile(userId).then((p) => {
      if (p) setProfileData({ displayName: p.displayName, photoURL: p.photoURL, isPrivate: p.isPrivate });
    });

    carregarMeusPosts(userId)
      .then(setPosts)
      .catch(console.error)
      .finally(() => setLoading(false));

    countFollowers(userId).then(setFollowersCount);
    countFollowing(userId).then(setFollowingCount);

    if (uid && uid !== userId) {
      checkFollowStatus(uid, userId).then(setFollowStatus);
    }
  }, [userId, uid]);

  if (!userId || !uid) return null;

  const isOwner = uid === userId;
  const displayName = profileData?.displayName || 'Usuário';
  const isPrivate = profileData?.isPrivate || false;
  const isFollowing = followStatus === 'accepted';
  const isPending = followStatus === 'pending';
  const canSeeContent = isOwner || !isPrivate || isFollowing;

  const handleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      const result = await toggleFollow(uid, userId, isPrivate);
      if (result === 'unfollowed') {
        setFollowStatus(null);
        if (isFollowing) setFollowersCount((c) => c - 1);
      } else {
        setFollowStatus(result);
        if (result === 'accepted') setFollowersCount((c) => c + 1);
      }
    } catch (err) {
      console.error('Erro ao seguir:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    setPosts((prev) => prev.map((p) =>
      p.id === postId
        ? { ...p, likedByMe: !p.likedByMe, likesCount: p.likedByMe ? p.likesCount - 1 : p.likesCount + 1 }
        : p
    ));
    await toggleLike(postId, uid);
  };

  const openFollowDialog = async (type: 'followers' | 'following') => {
    if (!canSeeContent) return;
    setFollowDialog(type);
    setFollowListLoading(true);
    setFollowList([]);
    try {
      const list = type === 'followers' ? await listFollowers(userId) : await listFollowing(userId);
      setFollowList(list);
    } catch (err) {
      console.error('Erro ao carregar lista:', err);
    } finally {
      setFollowListLoading(false);
    }
  };

  const getFollowButtonLabel = () => {
    if (isFollowing) return 'Seguindo';
    if (isPending) return 'Solicitado';
    return 'Seguir';
  };

  const getFollowButtonStyle = () => {
    if (isFollowing) return { borderColor: 'divider', color: 'text.primary' };
    if (isPending) return { borderColor: 'divider', color: 'text.secondary' };
    return { bgcolor: '#FF6B2C', '&:hover': { bgcolor: '#e55a1b' } };
  };

  return (
    <Box sx={{ pt: 1, pb: 4, mx: -2.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, px: 2.5 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowLeft size={22} />
        </IconButton>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem' }}>
          {displayName}
        </Typography>
        {isPrivate && !isOwner && (
          <Lock size={16} style={{ marginLeft: 6, opacity: 0.5 }} />
        )}
      </Box>

      {/* Profile Header */}
      <Box sx={{ px: 2.5, pb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Avatar
            src={profileData?.photoURL || undefined}
            sx={{ width: 80, height: 80, fontSize: '2rem' }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>

          {/* Stats */}
          <Box sx={{ display: 'flex', gap: 3, flex: 1, justifyContent: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.2rem', lineHeight: 1.2 }}>
                {canSeeContent ? posts.length : '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Posts
              </Typography>
            </Box>
            <Box
              sx={{ textAlign: 'center', cursor: canSeeContent ? 'pointer' : 'default' }}
              onClick={() => openFollowDialog('followers')}
            >
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.2rem', lineHeight: 1.2 }}>
                {canSeeContent ? followersCount : '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Seguidores
              </Typography>
            </Box>
            <Box
              sx={{ textAlign: 'center', cursor: canSeeContent ? 'pointer' : 'default' }}
              onClick={() => openFollowDialog('following')}
            >
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.2rem', lineHeight: 1.2 }}>
                {canSeeContent ? followingCount : '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Seguindo
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Nome */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1.5, fontSize: '1rem' }}>
          {displayName}
        </Typography>

        {/* Botão Seguir */}
        {!isOwner && (
          <Button
            variant={isFollowing || isPending ? 'outlined' : 'contained'}
            fullWidth
            size="small"
            onClick={handleFollow}
            disabled={followLoading}
            sx={{
              mt: 2, textTransform: 'none', fontWeight: 700, borderRadius: '10px',
              fontSize: '0.9rem', py: 0.8,
              ...getFollowButtonStyle(),
            }}
          >
            {getFollowButtonLabel()}
          </Button>
        )}
      </Box>

      {/* Divider */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />

      {/* Conteúdo - privado ou público */}
      {!canSeeContent ? (
        <Box sx={{
          textAlign: 'center', py: 8, px: 2.5,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <Box sx={{
            width: 80, height: 80, borderRadius: '24px',
            background: `linear-gradient(135deg, ${alpha('#FF6B2C', 0.12)} 0%, ${alpha('#FF6B2C', 0.04)} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lock size={36} color="#FF6B2C" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
              Conta Privada
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isPending
                ? 'Solicitação enviada. Aguarde a aprovação.'
                : 'Siga esta conta para ver as publicações.'}
            </Typography>
          </Box>
        </Box>
      ) : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress size={28} />
        </Box>
      ) : posts.length === 0 ? (
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
          <Typography variant="body2" color="text.secondary">
            Nenhuma publicação ainda.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              currentUserId={uid}
              onLike={handleLike}
            />
          ))}
        </Box>
      )}

      {/* Dialog: Seguidores / Seguindo */}
      <Dialog
        open={!!followDialog}
        onClose={() => setFollowDialog(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: '16px', maxHeight: '70vh' } }}
      >
        <DialogTitle sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '1.05rem', fontWeight: 700, pb: 1,
        }}>
          {followDialog === 'followers' ? 'Seguidores' : 'Seguindo'}
          <IconButton size="small" onClick={() => setFollowDialog(null)}>
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 1, pb: 2 }}>
          {followListLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : followList.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              {followDialog === 'followers' ? 'Nenhum seguidor ainda.' : 'Não segue ninguém ainda.'}
            </Typography>
          ) : (
            <List disablePadding>
              {followList.map((u) => (
                <ListItem
                  key={u.id}
                  sx={{ px: 1.5, py: 0.8, borderRadius: '12px', cursor: 'pointer' }}
                  onClick={() => {
                    setFollowDialog(null);
                    if (u.id === uid) {
                      navigate('/feed/meus-posts');
                    } else {
                      navigate(`/feed/perfil/${u.id}`);
                    }
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 48 }}>
                    <Avatar src={u.photoURL || undefined} sx={{ width: 40, height: 40 }}>
                      {u.displayName?.charAt(0).toUpperCase() || 'U'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={u.displayName || 'Usuário'}
                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.95rem' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
