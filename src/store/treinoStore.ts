import { create } from 'zustand';
import type { SessaoTreino, Exercicio, SerieConfig, TecnicaTreino } from '../types/treino';
import { carregarSessoes, salvarSessao, deletarSessao } from '../services/treinoFirestore';

// Debounce por sessão para não chamar Firestore em cada tecla digitada
const syncTimers = new Map<string, ReturnType<typeof setTimeout>>();
function syncDebounced(uid: string, sessao: SessaoTreino) {
  const existing = syncTimers.get(sessao.id);
  if (existing) clearTimeout(existing);
  syncTimers.set(
    sessao.id,
    setTimeout(() => {
      salvarSessao(uid, sessao).catch(console.error);
      syncTimers.delete(sessao.id);
    }, 800),
  );
}

const gerarId = () => crypto.randomUUID();

interface TreinoState {
  uid: string | null;
  sessoes: SessaoTreino[];
  carregando: boolean;

  setUid: (uid: string | null) => void;
  carregar: (uid: string) => Promise<void>;
  limpar: () => void;

  criarSessao: (nome: string, diaSemana?: string) => void;
  removerSessao: (id: string) => void;
  renomearSessao: (id: string, nome: string) => void;
  adicionarExercicio: (sessaoId: string, exercicio: Exercicio, seriesCount: number, repsCount: number) => void;
  removerExercicio: (sessaoId: string, exercicioTreinoId: string) => void;
  atualizarSerie: (sessaoId: string, exercicioTreinoId: string, serieId: string, dados: Partial<SerieConfig>) => void;
  adicionarSerie: (sessaoId: string, exercicioTreinoId: string) => void;
  removerSerie: (sessaoId: string, exercicioTreinoId: string, serieId: string) => void;
  atualizarNotas: (sessaoId: string, exercicioTreinoId: string, notas: string) => void;
  atualizarTecnica: (sessaoId: string, exercicioTreinoId: string, tecnica: TecnicaTreino) => void;
}

export const useTreinoStore = create<TreinoState>()((set, get) => ({
  uid: null,
  sessoes: [],
  carregando: false,

  setUid: (uid) => set({ uid }),

  carregar: async (uid) => {
    set({ carregando: true });
    try {
      const sessoes = await carregarSessoes(uid);
      set({ sessoes, uid });
    } finally {
      set({ carregando: false });
    }
  },

  limpar: () => set({ sessoes: [], uid: null }),

  criarSessao: (nome, diaSemana) => {
    const nova: SessaoTreino = {
      id: gerarId(),
      nome,
      diaSemana,
      exercicios: [],
      criadoEm: new Date().toISOString(),
    };
    set((state) => ({ sessoes: [...state.sessoes, nova] }));
    const { uid } = get();
    if (uid) salvarSessao(uid, nova).catch(console.error);
  },

  removerSessao: (id) => {
    set((state) => ({ sessoes: state.sessoes.filter((s) => s.id !== id) }));
    const { uid } = get();
    if (uid) deletarSessao(uid, id).catch(console.error);
  },

  renomearSessao: (id, nome) => {
    set((state) => ({
      sessoes: state.sessoes.map((s) => (s.id === id ? { ...s, nome } : s)),
    }));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === id);
    if (uid && sessao) salvarSessao(uid, sessao).catch(console.error);
  },

  adicionarExercicio: (sessaoId, exercicio, seriesCount, repsCount) => {
    set((state) => ({
      sessoes: state.sessoes.map((s) => {
        if (s.id !== sessaoId) return s;
        const series: SerieConfig[] = Array.from({ length: seriesCount }, () => ({
          id: gerarId(),
          repeticoes: repsCount,
          concluida: false,
        }));
        return { ...s, exercicios: [...s.exercicios, { id: gerarId(), exercicio, series }] };
      }),
    }));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) salvarSessao(uid, sessao).catch(console.error);
  },

  removerExercicio: (sessaoId, exercicioTreinoId) => {
    set((state) => ({
      sessoes: state.sessoes.map((s) => {
        if (s.id !== sessaoId) return s;
        return { ...s, exercicios: s.exercicios.filter((e) => e.id !== exercicioTreinoId) };
      }),
    }));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) salvarSessao(uid, sessao).catch(console.error);
  },

  atualizarSerie: (sessaoId, exercicioTreinoId, serieId, dados) => {
    set((state) => ({
      sessoes: state.sessoes.map((s) => {
        if (s.id !== sessaoId) return s;
        return {
          ...s,
          exercicios: s.exercicios.map((e) => {
            if (e.id !== exercicioTreinoId) return e;
            return {
              ...e,
              series: e.series.map((sr) => (sr.id === serieId ? { ...sr, ...dados } : sr)),
            };
          }),
        };
      }),
    }));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) syncDebounced(uid, sessao);
  },

  adicionarSerie: (sessaoId, exercicioTreinoId) => {
    set((state) => ({
      sessoes: state.sessoes.map((s) => {
        if (s.id !== sessaoId) return s;
        return {
          ...s,
          exercicios: s.exercicios.map((e) => {
            if (e.id !== exercicioTreinoId) return e;
            const lastSerie = e.series[e.series.length - 1];
            return {
              ...e,
              series: [
                ...e.series,
                {
                  id: gerarId(),
                  repeticoes: lastSerie?.repeticoes ?? 12,
                  peso: lastSerie?.peso,
                  concluida: false,
                },
              ],
            };
          }),
        };
      }),
    }));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) salvarSessao(uid, sessao).catch(console.error);
  },

  removerSerie: (sessaoId, exercicioTreinoId, serieId) => {
    set((state) => ({
      sessoes: state.sessoes.map((s) => {
        if (s.id !== sessaoId) return s;
        return {
          ...s,
          exercicios: s.exercicios.map((e) => {
            if (e.id !== exercicioTreinoId) return e;
            return { ...e, series: e.series.filter((sr) => sr.id !== serieId) };
          }),
        };
      }),
    }));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) salvarSessao(uid, sessao).catch(console.error);
  },

  atualizarNotas: (sessaoId, exercicioTreinoId, notas) => {
    set((state) => ({
      sessoes: state.sessoes.map((s) => {
        if (s.id !== sessaoId) return s;
        return {
          ...s,
          exercicios: s.exercicios.map((e) =>
            e.id === exercicioTreinoId ? { ...e, notas } : e
          ),
        };
      }),
    }));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) syncDebounced(uid, sessao);
  },

  atualizarTecnica: (sessaoId, exercicioTreinoId, tecnica) => {
    set((state) => ({
      sessoes: state.sessoes.map((s) => {
        if (s.id !== sessaoId) return s;
        return {
          ...s,
          exercicios: s.exercicios.map((e) =>
            e.id === exercicioTreinoId ? { ...e, tecnica } : e
          ),
        };
      }),
    }));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) salvarSessao(uid, sessao).catch(console.error);
  },
}));
