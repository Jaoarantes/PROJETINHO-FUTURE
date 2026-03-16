import { supabase } from '../supabase';
import type { FeedPost, FeedComment } from '../types/feed';

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
  const { data, error } = await supabase.rpc('toggle_like', {
    p_post_id: postId,
    p_user_id: uid,
  });
  if (error) throw error;
  return data as boolean;
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
    };
  });
}

export async function adicionarComentario(uid: string, postId: string, texto: string): Promise<string> {
  const { data, error } = await supabase.rpc('add_comment', {
    p_post_id: postId,
    p_user_id: uid,
    p_texto: texto,
  });
  if (error) throw error;
  return data as string;
}

export async function deletarComentario(uid: string, commentId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_comment', {
    p_comment_id: commentId,
    p_user_id: uid,
  });
  if (error) throw error;
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
