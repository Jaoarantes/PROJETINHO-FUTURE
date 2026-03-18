import { supabase } from '../supabase';
import type { FeedPost, FeedComment, FeedNotification } from '../types/feed';

const PAGE_SIZE = 20;

export async function carregarFeed(uid: string, page: number): Promise<FeedPost[]> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: posts, error } = await supabase
    .from('feed_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  if (!posts || posts.length === 0) return [];

  // Buscar perfis dos autores
  const userIds = [...new Set(posts.map((p: any) => p.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, photo_url')
    .in('id', userIds);

  const profileMap = new Map(
    (profiles || []).map((p: any) => [p.id, { name: p.display_name, photo: p.photo_url }])
  );

  // Verificar quais o usuário curtiu
  const postIds = posts.map((p: any) => p.id);
  const { data: myLikes } = await supabase
    .from('feed_likes')
    .select('post_id')
    .eq('user_id', uid)
    .in('post_id', postIds);

  const likedSet = new Set((myLikes || []).map((l: any) => l.post_id));

  return posts.map((row: any) => {
    const author = profileMap.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      registroId: row.registro_id,
      tipoTreino: row.tipo_treino,
      nomeTreino: row.nome_treino,
      duracaoSegundos: row.duracao_segundos,
      resumo: row.resumo,
      texto: row.texto,
      fotoUrls: row.foto_urls || [],
      likesCount: row.likes_count || 0,
      commentsCount: row.comments_count || 0,
      createdAt: row.created_at,
      authorName: author?.name || null,
      authorPhoto: author?.photo || null,
      likedByMe: likedSet.has(row.id),
    };
  });
}

export async function criarPost(uid: string, post: {
  id: string;
  registroId?: string | null;
  tipoTreino?: string | null;
  nomeTreino?: string | null;
  duracaoSegundos?: number | null;
  resumo?: any;
  texto?: string | null;
  fotoUrls?: string[];
}): Promise<void> {
  const { error } = await supabase.from('feed_posts').insert({
    id: post.id,
    user_id: uid,
    registro_id: post.registroId || null,
    tipo_treino: post.tipoTreino || null,
    nome_treino: post.nomeTreino || null,
    duracao_segundos: post.duracaoSegundos || null,
    resumo: post.resumo || null,
    texto: post.texto || null,
    foto_urls: post.fotoUrls || [],
  });
  if (error) throw error;
}

export async function deletarPost(uid: string, postId: string): Promise<void> {
  // Buscar fotos para deletar do storage
  const { data: post } = await supabase
    .from('feed_posts')
    .select('foto_urls')
    .eq('id', postId)
    .eq('user_id', uid)
    .maybeSingle();

  if (post?.foto_urls?.length) {
    const paths = post.foto_urls.map((url: string) => {
      const parts = url.split('/feed-photos/');
      return parts[1]?.split('?')[0];
    }).filter(Boolean);
    if (paths.length) {
      await supabase.storage.from('feed-photos').remove(paths);
    }
  }

  const { error } = await supabase
    .from('feed_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', uid);
  if (error) throw error;
}

export async function toggleLike(postId: string, uid: string): Promise<boolean> {
  const { data: existing, error: selectErr } = await supabase
    .from('feed_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', uid)
    .maybeSingle();

  if (selectErr) console.error('[toggleLike] select error:', selectErr);

  if (existing) {
    const { error: delErr } = await supabase.from('feed_likes').delete().eq('post_id', postId).eq('user_id', uid);
    if (delErr) console.error('[toggleLike] delete error:', delErr);
    const { count } = await supabase
      .from('feed_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    const { error: updErr } = await supabase.from('feed_posts').update({ likes_count: count || 0 }).eq('id', postId);
    if (updErr) console.error('[toggleLike] update count error:', updErr);
    return false;
  } else {
    const { error: insErr } = await supabase.from('feed_likes').insert({ post_id: postId, user_id: uid });
    if (insErr) console.error('[toggleLike] insert error:', insErr);
    if (insErr) throw insErr;
    const { count } = await supabase
      .from('feed_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    const { error: updErr } = await supabase.from('feed_posts').update({ likes_count: count || 0 }).eq('id', postId);
    if (updErr) console.error('[toggleLike] update count error:', updErr);

    // Notificar dono do post (se não for o próprio usuário)
    const { data: post } = await supabase
      .from('feed_posts')
      .select('user_id')
      .eq('id', postId)
      .maybeSingle();
    if (post && post.user_id !== uid) {
      await supabase.from('feed_notifications').insert({
        user_id: post.user_id,
        actor_id: uid,
        tipo: 'like',
        post_id: postId,
        texto: null,
      }).then(({ error: nErr }) => { if (nErr) console.error('[toggleLike] notif error:', nErr); });
    }

    return true;
  }
}

export async function carregarComentarios(postId: string): Promise<FeedComment[]> {
  const { data: comments, error } = await supabase
    .from('feed_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!comments || comments.length === 0) return [];

  const userIds = [...new Set(comments.map((c: any) => c.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, photo_url')
    .in('id', userIds);

  const profileMap = new Map(
    (profiles || []).map((p: any) => [p.id, { name: p.display_name, photo: p.photo_url }])
  );

  return comments.map((row: any) => {
    const author = profileMap.get(row.user_id);
    return {
      id: row.id,
      postId: row.post_id,
      userId: row.user_id,
      texto: row.texto,
      createdAt: row.created_at,
      authorName: author?.name || null,
      authorPhoto: author?.photo || null,
      parentId: row.parent_id || null,
    };
  });
}

export async function adicionarComentario(uid: string, postId: string, texto: string, parentId?: string | null): Promise<string> {
  const { data, error } = await supabase
    .from('feed_comments')
    .insert({ post_id: postId, user_id: uid, texto, parent_id: parentId || null })
    .select('id')
    .single();
  if (error) { console.error('[adicionarComentario] insert error:', error); throw error; }
  const commentId = data.id;

  // Atualizar contador de comentários
  const { count } = await supabase
    .from('feed_comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);
  await supabase.from('feed_posts').update({ comments_count: count || 0 }).eq('id', postId);

  // Notificar dono do post (se não for o próprio usuário)
  const { data: post } = await supabase
    .from('feed_posts')
    .select('user_id')
    .eq('id', postId)
    .maybeSingle();
  if (post && post.user_id !== uid) {
    await supabase.from('feed_notifications').insert({
      user_id: post.user_id,
      actor_id: uid,
      tipo: 'comment',
      post_id: postId,
      texto,
    }).then(({ error: nErr }) => { if (nErr) console.error('[adicionarComentario] notif error:', nErr); });
  }

  return commentId;
}

export async function deletarComentario(uid: string, commentId: string, postId: string): Promise<void> {
  // Deletar respostas primeiro (se houver)
  await supabase.from('feed_comments').delete().eq('parent_id', commentId);

  const { error } = await supabase
    .from('feed_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', uid);
  if (error) throw error;

  // Atualizar contador
  const { count } = await supabase
    .from('feed_comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);
  await supabase.from('feed_posts').update({ comments_count: count || 0 }).eq('id', postId);
}

export async function editarComentario(uid: string, commentId: string, texto: string): Promise<void> {
  const { error } = await supabase
    .from('feed_comments')
    .update({ texto })
    .eq('id', commentId)
    .eq('user_id', uid);
  if (error) throw error;
}

export async function editarPost(uid: string, postId: string, texto: string): Promise<void> {
  const { error } = await supabase
    .from('feed_posts')
    .update({ texto })
    .eq('id', postId)
    .eq('user_id', uid);
  if (error) throw error;
}

// ─── Notificações ────────────────────────────────────────────────────────────

export async function carregarNotificacoes(uid: string): Promise<FeedNotification[]> {
  const { data, error } = await supabase
    .from('feed_notifications')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const actorIds = [...new Set(data.map((n: any) => n.actor_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, photo_url')
    .in('id', actorIds);

  const profileMap = new Map(
    (profiles || []).map((p: any) => [p.id, { name: p.display_name, photo: p.photo_url }])
  );

  return data.map((row: any) => {
    const actor = profileMap.get(row.actor_id);
    return {
      id: row.id,
      userId: row.user_id,
      actorId: row.actor_id,
      actorName: actor?.name || null,
      actorPhoto: actor?.photo || null,
      tipo: row.tipo,
      postId: row.post_id,
      texto: row.texto || null,
      lida: row.lida || false,
      createdAt: row.created_at,
    };
  });
}

export async function marcarNotificacoesLidas(uid: string): Promise<void> {
  await supabase
    .from('feed_notifications')
    .update({ lida: true })
    .eq('user_id', uid)
    .eq('lida', false);
}

export async function deletarNotificacao(uid: string, notifId: string): Promise<void> {
  await supabase
    .from('feed_notifications')
    .delete()
    .eq('id', notifId)
    .eq('user_id', uid);
}

export async function deletarTodasNotificacoes(uid: string): Promise<void> {
  await supabase
    .from('feed_notifications')
    .delete()
    .eq('user_id', uid);
}

export async function contarNotificacoesNaoLidas(uid: string): Promise<number> {
  const { count, error } = await supabase
    .from('feed_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', uid)
    .eq('lida', false);
  if (error) return 0;
  return count || 0;
}

// ─── Meus Posts ──────────────────────────────────────────────────────────────

export async function carregarMeusPosts(uid: string): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from('feed_posts')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!posts || posts.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, photo_url')
    .eq('id', uid);

  const author = profiles?.[0];

  const postIds = posts.map((p: any) => p.id);
  const { data: myLikes } = await supabase
    .from('feed_likes')
    .select('post_id')
    .eq('user_id', uid)
    .in('post_id', postIds);

  const likedSet = new Set((myLikes || []).map((l: any) => l.post_id));

  return posts.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    registroId: row.registro_id,
    tipoTreino: row.tipo_treino,
    nomeTreino: row.nome_treino,
    duracaoSegundos: row.duracao_segundos,
    resumo: row.resumo,
    texto: row.texto,
    fotoUrls: row.foto_urls || [],
    likesCount: row.likes_count || 0,
    commentsCount: row.comments_count || 0,
    createdAt: row.created_at,
    authorName: author?.display_name || null,
    authorPhoto: author?.photo_url || null,
    likedByMe: likedSet.has(row.id),
  }));
}

export async function uploadFeedPhoto(uid: string, file: File): Promise<string> {
  const timestamp = Date.now();
  const filePath = `${uid}/${timestamp}.jpg`;

  const { error } = await supabase.storage
    .from('feed-photos')
    .upload(filePath, file, { upsert: true, contentType: 'image/jpeg' });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('feed-photos')
    .getPublicUrl(filePath);

  return `${publicUrl}?t=${timestamp}`;
}

// ─── Social Stats (para conquistas) ─────────────────────────────────────────

export interface SocialStats {
  totalPosts: number;
  postsComFoto: number;
  totalChamasRecebidas: number;
  totalSeguidores: number;
  totalComentariosRecebidos: number;
}

export async function carregarSocialStats(uid: string): Promise<SocialStats> {
  // Primeiro busca posts do usuário (necessário para queries dependentes)
  const [postsRes, followersRes] = await Promise.all([
    supabase.from('feed_posts').select('id, foto_urls').eq('user_id', uid),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', uid).eq('status', 'accepted'),
  ]);

  const posts = postsRes.data || [];
  const postIds = posts.map((p: any) => p.id);
  const totalPosts = posts.length;
  const postsComFoto = posts.filter((p: any) => p.foto_urls && p.foto_urls.length > 0).length;

  let totalChamasRecebidas = 0;
  let totalComentariosRecebidos = 0;

  if (postIds.length > 0) {
    const [likesRes, commentsRes] = await Promise.all([
      supabase.from('feed_likes').select('id', { count: 'exact', head: true }).in('post_id', postIds),
      supabase.from('feed_comments').select('id', { count: 'exact', head: true }).in('post_id', postIds).neq('user_id', uid),
    ]);
    totalChamasRecebidas = likesRes.count || 0;
    totalComentariosRecebidos = commentsRes.count || 0;
  }

  return {
    totalPosts,
    postsComFoto,
    totalChamasRecebidas,
    totalSeguidores: followersRes.count || 0,
    totalComentariosRecebidos,
  };
}

// ─── Follow System ──────────────────────────────────────────────────────────

// Follow status: 'accepted' (public profiles or accepted request) | 'pending' (waiting approval)
export type FollowStatus = 'accepted' | 'pending' | null;

// Cache de follow status para evitar chamadas repetidas por sessão
const followStatusCache = new Map<string, { status: FollowStatus; ts: number }>();
const FOLLOW_CACHE_TTL = 30_000; // 30 segundos

export function invalidateFollowCache(followerId: string, followingId: string) {
  followStatusCache.delete(`${followerId}:${followingId}`);
}

export async function checkFollowStatus(followerId: string, followingId: string): Promise<FollowStatus> {
  const key = `${followerId}:${followingId}`;
  const cached = followStatusCache.get(key);
  if (cached && Date.now() - cached.ts < FOLLOW_CACHE_TTL) {
    return cached.status;
  }

  const { data, error } = await supabase
    .from('follows')
    .select('status')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  const status: FollowStatus = (error || !data) ? null : ((data.status as FollowStatus) || 'accepted');
  followStatusCache.set(key, { status, ts: Date.now() });
  return status;
}

export async function checkFollowing(followerId: string, followingId: string): Promise<boolean> {
  const status = await checkFollowStatus(followerId, followingId);
  return status === 'accepted';
}

export async function toggleFollow(followerId: string, followingId: string, isPrivate = false): Promise<'accepted' | 'pending' | 'unfollowed'> {
  invalidateFollowCache(followerId, followingId);
  const status = await checkFollowStatus(followerId, followingId);
  if (status) {
    // Already following or pending → unfollow / cancel request
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    invalidateFollowCache(followerId, followingId);
    return 'unfollowed';
  } else {
    // New follow
    const newStatus = isPrivate ? 'pending' : 'accepted';
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId, status: newStatus });
    if (error) throw error;

    // Notificar o usuário que recebeu o follow
    const tipo = isPrivate ? 'follow_request' : 'follow';
    await supabase.from('feed_notifications').insert({
      user_id: followingId,
      actor_id: followerId,
      tipo,
      post_id: null,
      texto: null,
    }).then(({ error: nErr }) => { if (nErr) console.error('[toggleFollow] notif error:', nErr); });

    return newStatus;
  }
}

export async function acceptFollowRequest(followerId: string, followingId: string): Promise<void> {
  await supabase
    .from('follows')
    .update({ status: 'accepted' })
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  // Notificar quem pediu que foi aceito
  await supabase.from('feed_notifications').insert({
    user_id: followerId,
    actor_id: followingId,
    tipo: 'follow',
    post_id: null,
    texto: null,
  }).then(({ error: nErr }) => { if (nErr) console.error('[acceptFollow] notif error:', nErr); });
}

export async function rejectFollowRequest(followerId: string, followingId: string): Promise<void> {
  await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
}

export async function listPendingRequests(userId: string): Promise<FollowUser[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId)
    .eq('status', 'pending');
  if (error || !data || data.length === 0) return [];

  const ids = data.map((row: any) => row.follower_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, photo_url')
    .in('id', ids);
  if (!profiles) return [];

  return profiles.map((p: any) => ({
    id: p.id,
    displayName: p.display_name,
    photoURL: p.photo_url,
  }));
}

export async function countFollowers(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId)
    .eq('status', 'accepted');
  if (error) return 0;
  return count || 0;
}

export async function countFollowing(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId)
    .eq('status', 'accepted');
  if (error) return 0;
  return count || 0;
}

export interface FollowUser {
  id: string;
  displayName: string | null;
  photoURL: string | null;
}

export async function listFollowers(userId: string): Promise<FollowUser[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId)
    .eq('status', 'accepted');
  if (error || !data || data.length === 0) return [];

  const ids = data.map((row: any) => row.follower_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, photo_url')
    .in('id', ids);
  if (!profiles) return [];

  return profiles.map((p: any) => ({
    id: p.id,
    displayName: p.display_name,
    photoURL: p.photo_url,
  }));
}

export async function listFollowing(userId: string): Promise<FollowUser[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('status', 'accepted');
  if (error || !data || data.length === 0) return [];

  const ids = data.map((row: any) => row.following_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, photo_url')
    .in('id', ids);
  if (!profiles) return [];

  return profiles.map((p: any) => ({
    id: p.id,
    displayName: p.display_name,
    photoURL: p.photo_url,
  }));
}

/** Comprime imagem antes do upload (max 1200px, JPEG 0.8) */
export function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = (height / width) * MAX;
            width = MAX;
          } else {
            width = (width / height) * MAX;
            height = MAX;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.8,
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
