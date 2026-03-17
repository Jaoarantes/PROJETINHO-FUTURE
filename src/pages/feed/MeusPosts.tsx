import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, IconButton, CircularProgress, Avatar, Badge,
  Dialog, DialogTitle, DialogContent, List, ListItem, ListItemAvatar, ListItemText,
  Menu, MenuItem,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowLeft, Rss, Camera, X, ImagePlus, Trash2, Lock, Unlock } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useFeedStore } from '../../store/feedStore';
import {
  carregarMeusPosts, countFollowers, countFollowing,
  listFollowers, listFollowing,
} from '../../services/feedService';
import type { FollowUser } from '../../services/feedService';
import { uploadProfilePicture, removeProfilePicture, togglePrivateProfile } from '../../services/userService';
import FeedPostCard from '../../components/feed/FeedPostCard';
import type { FeedPost } from '../../types/feed';

export default function MeusPosts() {
  const navigate = useNavigate();
  const { user, profile, refreshUser } = useAuthContext();
  const { toggleLike, deletarPost, editarPost } = useFeedStore();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Menu da câmera
  const [cameraMenuAnchor, setCameraMenuAnchor] = useState<null | HTMLElement>(null);

  // Dialog ver foto grande
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);

  // Privacidade
  const [isPrivate, setIsPrivate] = useState(false);

  // Dialog seguidores/seguindo
  const [followDialog, setFollowDialog] = useState<'followers' | 'following' | null>(null);
  const [followList, setFollowList] = useState<FollowUser[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  const uid = user?.id;
  const userPhoto = user?.user_metadata?.avatar_url || profile?.photoURL || null;
  const displayName = profile?.displayName || user?.user_metadata?.full_name || 'Usuário';

  useEffect(() => {
    if (uid) {
      carregarMeusPosts(uid)
        .then(setPosts)
        .catch(console.error)
        .finally(() => setLoading(false));

      countFollowers(uid).then(setFollowers);
      countFollowing(uid).then(setFollowing);
    }
  }, [uid]);

  useEffect(() => {
    if (profile) {
      setIsPrivate(profile.isPrivate || false);
    }
  }, [profile]);

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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    setUploadingPhoto(true);
    try {
      await uploadProfilePicture(uid, file);
      await refreshUser();
    } catch (err) {
      console.error('Erro ao atualizar foto:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!uid) return;
    setUploadingPhoto(true);
    try {
      await removeProfilePicture(uid);
      await refreshUser();
    } catch (err) {
      console.error('Erro ao remover foto:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const openFollowDialog = async (type: 'followers' | 'following') => {
    setFollowDialog(type);
    setFollowListLoading(true);
    setFollowList([]);
    try {
      const list = type === 'followers' ? await listFollowers(uid) : await listFollowing(uid);
      setFollowList(list);
    } catch (err) {
      console.error('Erro ao carregar lista:', err);
    } finally {
      setFollowListLoading(false);
    }
  };

  return (
    <Box sx={{ pt: 1, pb: 4, mx: -2.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, px: 2.5 }}>
        <IconButton onClick={() => navigate('/feed')} sx={{ mr: 1 }}>
          <ArrowLeft size={22} />
        </IconButton>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem' }}>
          Meu Perfil
        </Typography>
      </Box>

      {/* Profile Header */}
      <Box sx={{ px: 2.5, pb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {/* Avatar com botão de câmera */}
          <Box sx={{ position: 'relative' }}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <IconButton
                  size="small"
                  onClick={(e) => setCameraMenuAnchor(e.currentTarget)}
                  disabled={uploadingPhoto}
                  sx={{
                    width: 28, height: 28,
                    bgcolor: '#FF6B2C', color: '#fff',
                    border: '2px solid',
                    borderColor: 'background.paper',
                    '&:hover': { bgcolor: '#e55a1b' },
                  }}
                >
                  {uploadingPhoto ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <Camera size={14} />}
                </IconButton>
              }
            >
              <Avatar
                src={userPhoto || undefined}
                sx={{ width: 80, height: 80, fontSize: '2rem', cursor: userPhoto ? 'pointer' : 'default' }}
                onClick={() => { if (userPhoto) setShowPhotoDialog(true); }}
              >
                {displayName.charAt(0).toUpperCase()}
              </Avatar>
            </Badge>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handlePhotoChange}
            />

            {/* Menu da câmera */}
            <Menu
              anchorEl={cameraMenuAnchor}
              open={!!cameraMenuAnchor}
              onClose={() => setCameraMenuAnchor(null)}
              transformOrigin={{ horizontal: 'left', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => {
                setCameraMenuAnchor(null);
                fileInputRef.current?.click();
              }}>
                <ImagePlus size={18} style={{ marginRight: 10 }} />
                Escolher foto
              </MenuItem>
              {userPhoto && (
                <MenuItem onClick={() => {
                  setCameraMenuAnchor(null);
                  handleRemovePhoto();
                }} sx={{ color: '#EF4444' }}>
                  <Trash2 size={18} style={{ marginRight: 10 }} />
                  Remover foto
                </MenuItem>
              )}
            </Menu>
          </Box>

          {/* Stats */}
          <Box sx={{ display: 'flex', gap: 3, flex: 1, justifyContent: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.2rem', lineHeight: 1.2 }}>
                {posts.length}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Posts
              </Typography>
            </Box>
            <Box
              sx={{ textAlign: 'center', cursor: 'pointer' }}
              onClick={() => openFollowDialog('followers')}
            >
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.2rem', lineHeight: 1.2 }}>
                {followers}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Seguidores
              </Typography>
            </Box>
            <Box
              sx={{ textAlign: 'center', cursor: 'pointer' }}
              onClick={() => openFollowDialog('following')}
            >
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.2rem', lineHeight: 1.2 }}>
                {following}
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

        {/* Botão Privado */}
        <Box
          onClick={async () => {
            const newVal = !isPrivate;
            setIsPrivate(newVal);
            try {
              await togglePrivateProfile(uid, newVal);
            } catch {
              setIsPrivate(!newVal);
            }
          }}
          sx={{
            mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
            py: 1, borderRadius: '10px', cursor: 'pointer', fontWeight: 700,
            border: '1px solid', borderColor: 'divider',
            bgcolor: (theme) => isPrivate
              ? (theme.palette.mode === 'dark' ? 'rgba(255,107,44,0.12)' : 'rgba(255,107,44,0.08)')
              : 'transparent',
            color: isPrivate ? '#FF6B2C' : 'text.secondary',
            transition: 'all 0.2s',
          }}
        >
          {isPrivate ? <Lock size={16} /> : <Unlock size={16} />}
          <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
            {isPrivate ? 'Perfil Privado' : 'Perfil Público'}
          </Typography>
        </Box>
      </Box>

      {/* Divider */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />

      {/* Posts */}
      {loading ? (
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
            Você ainda não publicou nada.
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
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </Box>
      )}

      {/* Dialog: Ver foto grande */}
      <Dialog
        open={showPhotoDialog}
        onClose={() => setShowPhotoDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'visible',
            backgroundImage: 'none',
            border: 'none',
            outline: 'none',
            '&::before, &::after': { display: 'none' },
          },
        }}
        slotProps={{
          backdrop: { sx: { bgcolor: 'rgba(0,0,0,0.9)' } },
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={() => setShowPhotoDialog(false)}
            sx={{
              position: 'absolute', top: -40, right: 0,
              color: '#fff', bgcolor: 'rgba(0,0,0,0.5)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
          >
            <X size={20} />
          </IconButton>
          <Box
            component="img"
            src={userPhoto || ''}
            alt={displayName}
            sx={{
              width: '280px',
              height: '280px',
              objectFit: 'cover',
              borderRadius: '50%',
              display: 'block',
              mx: 'auto',
              border: 'none',
              outline: 'none',
            }}
          />
        </Box>
      </Dialog>

      {/* Dialog: Seguidores / Seguindo */}
      <Dialog
        open={!!followDialog}
        onClose={() => setFollowDialog(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: '16px',
            maxHeight: '70vh',
          },
        }}
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
              {followDialog === 'followers' ? 'Nenhum seguidor ainda.' : 'Você não segue ninguém ainda.'}
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
                      // já está na própria página
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
