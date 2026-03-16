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

// ─── Follow System ──────────────────────────────────────────────────────────

export async function checkFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function toggleFollow(followerId: string, followingId: string): Promise<boolean> {
  const isFollowing = await checkFollowing(followerId, followingId);
  if (isFollowing) {
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    return false;
  } else {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId });
    if (error) throw error;
    return true;
  }
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
