import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { FeedPost } from '../types/feed';
import * as feedService from '../services/feedService';
import { supabase } from '../supabase';

// Lock para evitar cliques rápidos duplicados no like
const likeLocks = new Set<string>();

interface FeedState {
  posts: FeedPost[];
  loading: boolean;
  hasMore: boolean;
  page: number;
  _realtimeChannel: RealtimeChannel | null;

  carregarFeed: (uid: string, reset?: boolean) => Promise<void>;
  carregarMais: (uid: string) => Promise<void>;
  criarPost: (uid: string, dados: {
    id: string;
    registroId?: string | null;
    tipoTreino?: string | null;
    nomeTreino?: string | null;
    duracaoSegundos?: number | null;
    resumo?: any;
    texto?: string | null;
    fotoUrls?: string[];
  }) => Promise<void>;
  deletarPost: (uid: string, postId: string) => Promise<void>;
  toggleLike: (postId: string, uid: string) => Promise<void>;
  editarPost: (uid: string, postId: string, texto: string) => Promise<void>;
  atualizarContadorComentarios: (postId: string, delta: number) => void;
  atualizarPerfilAutor: (userId: string, nome: string | null, foto: string | null) => void;
  iniciarRealtime: (uid: string) => void;
  pararRealtime: () => void;
  limpar: () => void;
}

export const useFeedStore = create<FeedState>()((set, get) => ({
  posts: [],
  loading: false,
  hasMore: true,
  page: 0,
  _realtimeChannel: null,

  carregarFeed: async (uid, reset = false) => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const page = reset ? 0 : get().page;
      const posts = await feedService.carregarFeed(uid, page);
      set({
        posts: reset ? posts : [...get().posts, ...posts],
        hasMore: posts.length >= 20,
        page: page + 1,
        loading: false,
      });
    } catch (err) {
      console.error('[feedStore] Erro ao carregar feed:', err);
      set({ loading: false });
    }
  },

  carregarMais: async (uid) => {
    const { hasMore, loading } = get();
    if (!hasMore || loading) return;
    await get().carregarFeed(uid);
  },

  criarPost: async (uid, dados) => {
    await feedService.criarPost(uid, dados);
    // Recarrega o feed para pegar o post com dados do autor
    await get().carregarFeed(uid, true);
  },

  deletarPost: async (uid, postId) => {
    // Otimista: remove do estado local
    set((state) => ({ posts: state.posts.filter((p) => p.id !== postId) }));
    try {
      await feedService.deletarPost(uid, postId);
    } catch (err) {
      console.error('[feedStore] Erro ao deletar post:', err);
      // Recarrega em caso de erro
      await get().carregarFeed(uid, true);
    }
  },

  toggleLike: async (postId, uid) => {
    // Evitar cliques rápidos duplicados
    if (likeLocks.has(postId)) return;
    likeLocks.add(postId);

    // Otimista: flip imediato
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, likedByMe: !p.likedByMe, likesCount: p.likedByMe ? p.likesCount - 1 : p.likesCount + 1 }
          : p
      ),
    }));
    try {
      await feedService.toggleLike(postId, uid);
    } catch (err) {
      console.error('[feedStore] Erro ao curtir:', err);
      // Reverte
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? { ...p, likedByMe: !p.likedByMe, likesCount: p.likedByMe ? p.likesCount - 1 : p.likesCount + 1 }
            : p
        ),
      }));
    } finally {
      likeLocks.delete(postId);
    }
  },

  editarPost: async (uid, postId, texto) => {
    set((state) => ({
      posts: state.posts.map((p) => p.id === postId ? { ...p, texto } : p),
    }));
    try {
      await feedService.editarPost(uid, postId, texto);
    } catch (err) {
      console.error('[feedStore] Erro ao editar post:', err);
      await get().carregarFeed(uid, true);
    }
  },

  atualizarContadorComentarios: (postId, delta) => {
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, commentsCount: Math.max(0, p.commentsCount + delta) }
          : p
      ),
    }));
  },

  atualizarPerfilAutor: (userId, nome, foto) => {
    set((state) => ({
      posts: state.posts.map((p) =>
        p.userId === userId
          ? { ...p, authorName: nome ?? p.authorName, authorPhoto: foto ?? p.authorPhoto }
          : p
      ),
    }));
  },

  iniciarRealtime: (uid: string) => {
    // Se já tiver canal ativo, não duplicar
    if (get()._realtimeChannel) return;

    const channel = supabase
      .channel('feed-realtime')
      // Atualização de posts existentes (likes_count, comments_count, texto)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'feed_posts' },
        (payload) => {
          const row = payload.new as any;
          set((state) => ({
            posts: state.posts.map((p) =>
              p.id === row.id
                ? {
                    ...p,
                    likesCount: row.likes_count ?? p.likesCount,
                    commentsCount: row.comments_count ?? p.commentsCount,
                    texto: row.texto ?? p.texto,
                  }
                : p,
            ),
          }));
        },
      )
      // Novos posts de outros usuários
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_posts' },
        async (payload) => {
          const row = payload.new as any;
          // Ignorar posts do próprio usuário (já adicionados via criarPost)
          if (row.user_id === uid) return;

          // Buscar perfil do autor
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, photo_url')
            .eq('id', row.user_id)
            .limit(1);
          const author = profiles?.[0];

          const newPost: FeedPost = {
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
            likedByMe: false,
          };

          set((state) => ({
            posts: [newPost, ...state.posts],
          }));
        },
      )
      // Posts deletados
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'feed_posts' },
        (payload) => {
          const oldRow = payload.old as any;
          set((state) => ({
            posts: state.posts.filter((p) => p.id !== oldRow.id),
          }));
        },
      )
      // Atualização de perfil (foto, nome) — atualiza todos os posts do usuário
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const row = payload.new as any;
          get().atualizarPerfilAutor(row.id, row.display_name, row.photo_url);
        },
      )
      .subscribe();

    set({ _realtimeChannel: channel });
  },

  pararRealtime: () => {
    const channel = get()._realtimeChannel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ _realtimeChannel: null });
    }
  },

  limpar: () => {
    get().pararRealtime();
    set({ posts: [], loading: false, hasMore: true, page: 0, _realtimeChannel: null });
  },
}));
