import { create } from 'zustand';
import type { FeedPost } from '../types/feed';
import * as feedService from '../services/feedService';

interface FeedState {
  posts: FeedPost[];
  loading: boolean;
  hasMore: boolean;
  page: number;

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
  limpar: () => void;
}

export const useFeedStore = create<FeedState>()((set, get) => ({
  posts: [],
  loading: false,
  hasMore: true,
  page: 0,

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

  limpar: () => set({ posts: [], loading: false, hasMore: true, page: 0 }),
}));
