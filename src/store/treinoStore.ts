import { create } from 'zustand';
import type { SessaoTreino, RegistroTreino, Exercicio, SerieConfig, TecnicaTreino, TipoSessao, EtapaCorrida, EtapaNatacao } from '../types/treino';
import { carregarSessoes, salvarSessao, deletarSessao, carregarHistorico as loadHistorico, salvarRegistro, deletarRegistro } from '../services/treinoFirestore';

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

function updateSessao(state: { sessoes: SessaoTreino[] }, id: string, updater: (s: SessaoTreino) => SessaoTreino) {
  return { sessoes: state.sessoes.map((s) => (s.id === id ? updater(s) : s)) };
}

interface TreinoState {
  uid: string | null;
  sessoes: SessaoTreino[];
  historico: RegistroTreino[];
  carregando: boolean;
  treinoAtivo: { sessaoId: string; iniciadoEm: number } | null;

  setUid: (uid: string | null) => void;
  carregar: (uid: string) => Promise<void>;
  limpar: () => void;

  criarSessao: (nome: string, tipo: TipoSessao, diaSemana?: string) => string;
  removerSessao: (id: string) => void;
  renomearSessao: (id: string, nome: string, diaSemana?: string) => void;
  reordenarSessoes: (novasSessoes: SessaoTreino[]) => void;
  iniciarTreino: (sessaoId: string) => void;
  cancelarTreino: () => void;

  adicionarExercicio: (sessaoId: string, exercicio: Exercicio, seriesCount: number, repsCount: number) => void;
  removerExercicio: (sessaoId: string, exercicioTreinoId: string) => void;
  atualizarSerie: (sessaoId: string, exercicioTreinoId: string, serieId: string, dados: Partial<SerieConfig>) => void;
  adicionarSerie: (sessaoId: string, exercicioTreinoId: string) => void;
  removerSerie: (sessaoId: string, exercicioTreinoId: string, serieId: string) => void;
  atualizarNotas: (sessaoId: string, exercicioTreinoId: string, notas: string) => void;
  atualizarTecnica: (sessaoId: string, exercicioTreinoId: string, tecnica: TecnicaTreino) => void;

  adicionarEtapaCorrida: (sessaoId: string) => void;
  removerEtapaCorrida: (sessaoId: string, etapaId: string) => void;
  atualizarEtapaCorrida: (sessaoId: string, etapaId: string, dados: Partial<EtapaCorrida>) => void;

  adicionarEtapaNatacao: (sessaoId: string) => void;
  removerEtapaNatacao: (sessaoId: string, etapaId: string) => void;
  atualizarEtapaNatacao: (sessaoId: string, etapaId: string, dados: Partial<EtapaNatacao>) => void;

  carregarHistorico: (uid: string) => Promise<void>;
  concluirTreino: (sessaoId: string) => void;
  removerRegistro: (id: string) => void;
  adicionarRegistro: (registro: RegistroTreino) => void;
}

export const useTreinoStore = create<TreinoState>()((set, get) => ({
  uid: null,
  sessoes: [],
  historico: [],
  carregando: true,
  treinoAtivo: null,

  setUid: (uid) => set({ uid }),

  carregar: async (uid) => {
    set({ carregando: true, uid });
    try {
      const sessoes = await carregarSessoes(uid);
      console.log('[treinoStore] Sessões carregadas do Firestore:', sessoes.length, sessoes.map((s) => ({ id: s.id, nome: s.nome, tipo: s.tipo })));
      const migrated = sessoes.map((s) => ({
        ...s,
        tipo: s.tipo || ('musculacao' as TipoSessao),
        exercicios: s.exercicios || [],
      }));
      set({ sessoes: migrated });
    } catch (err) {
      console.error('[treinoStore] Erro ao carregar sessões:', err);
    } finally {
      set({ carregando: false });
    }
  },

  limpar: () => set({ sessoes: [], historico: [], uid: null, carregando: false, treinoAtivo: null }),

  iniciarTreino: (sessaoId) => set({ treinoAtivo: { sessaoId, iniciadoEm: Date.now() } }),
  cancelarTreino: () => set({ treinoAtivo: null }),

  criarSessao: (nome, tipo, diaSemana) => {
    const nova: SessaoTreino = {
      id: gerarId(),
      nome,
      tipo,
      diaSemana,
      exercicios: [],
      corrida: tipo === 'corrida' ? { id: gerarId(), etapas: [{ id: gerarId(), tipo: 'moderado' }] } : undefined,
      natacao: tipo === 'natacao' ? { id: gerarId(), etapas: [{ id: gerarId(), estilo: 'crawl' }] } : undefined,
      criadoEm: new Date().toISOString(),
    };
    set((state) => ({ sessoes: [...state.sessoes, nova] }));
    const { uid } = get();
    if (uid) {
      console.log('[treinoStore] Salvando nova sessão no Firestore:', { id: nova.id, nome: nova.nome, tipo: nova.tipo });
      salvarSessao(uid, nova)
        .then(() => console.log('[treinoStore] Sessão salva com sucesso:', nova.id))
        .catch((err) => console.error('[treinoStore] Erro ao salvar sessão:', err));
    } else {
      console.warn('[treinoStore] UID não disponível! Sessão NÃO foi salva no Firestore:', nova.id);
    }
    return nova.id;
  },

  removerSessao: (id) => {
    set((state) => ({ sessoes: state.sessoes.filter((s) => s.id !== id) }));
    const { uid } = get();
    if (uid) deletarSessao(uid, id).catch(console.error);
  },

  renomearSessao: (id: string, nome: string, diaSemana?: string) => {
    set((state) => updateSessao(state, id, (s) => ({ ...s, nome, diaSemana })));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === id);
    if (uid && sessao) salvarSessao(uid, sessao).catch(console.error);
  },

  reordenarSessoes: (novasSessoes: SessaoTreino[]) => {
    set({ sessoes: novasSessoes });
    const { uid } = get();
    if (uid) {
      // Salva a nova ordem no Firestore (pode ser otimizado salvando apenas as sessões alteradas)
      Promise.all(novasSessoes.map(s => salvarSessao(uid, s))).catch(console.error);
    }
  },

  adicionarExercicio: (sessaoId, exercicio, seriesCount, repsCount) => {
    set((state) => updateSessao(state, sessaoId, (s) => {
      const series: SerieConfig[] = Array.from({ length: seriesCount }, () => ({
        id: gerarId(), repeticoes: repsCount, concluida: false,
      }));
      return { ...s, exercicios: [...s.exercicios, { id: gerarId(), exercicio, series }] };
    }));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) salvarSessao(uid, sessao).catch(console.error);
  },

  removerExercicio: (sessaoId, exercicioTreinoId) => {
    set((state) => updateSessao(state, sessaoId, (s) => ({
      ...s, exercicios: s.exercicios.filter((e) => e.id !== exercicioTreinoId),
    })));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) salvarSessao(uid, sessao).catch(console.error);
  },

  atualizarSerie: (sessaoId, exercicioTreinoId, serieId, dados) => {
    set((state) => updateSessao(state, sessaoId, (s) => ({
      ...s,
      exercicios: s.exercicios.map((e) => {
        if (e.id !== exercicioTreinoId) return e;
        return { ...e, series: e.series.map((sr) => (sr.id === serieId ? { ...sr, ...dados } : sr)) };
      }),
    })));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) syncDebounced(uid, sessao);
  },

  adicionarSerie: (sessaoId, exercicioTreinoId) => {
    set((state) => updateSessao(state, sessaoId, (s) => ({
      ...s,
      exercicios: s.exercicios.map((e) => {
        if (e.id !== exercicioTreinoId) return e;
        const last = e.series[e.series.length - 1];
        return { ...e, series: [...e.series, { id: gerarId(), repeticoes: last?.repeticoes ?? 12, peso: last?.peso, concluida: false }] };
      }),
    })));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) salvarSessao(uid, sessao).catch(console.error);
  },

  removerSerie: (sessaoId, exercicioTreinoId, serieId) => {
    set((state) => updateSessao(state, sessaoId, (s) => ({
      ...s,
      exercicios: s.exercicios.map((e) => {
        if (e.id !== exercicioTreinoId) return e;
        return { ...e, series: e.series.filter((sr) => sr.id !== serieId) };
      }),
    })));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) salvarSessao(uid, sessao).catch(console.error);
  },

  atualizarNotas: (sessaoId, exercicioTreinoId, notas) => {
    set((state) => updateSessao(state, sessaoId, (s) => ({
      ...s, exercicios: s.exercicios.map((e) => (e.id === exercicioTreinoId ? { ...e, notas } : e)),
    })));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) syncDebounced(uid, sessao);
  },

  atualizarTecnica: (sessaoId, exercicioTreinoId, tecnica) => {
    set((state) => updateSessao(state, sessaoId, (s) => ({
      ...s, exercicios: s.exercicios.map((e) => (e.id === exercicioTreinoId ? { ...e, tecnica } : e)),
    })));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) salvarSessao(uid, sessao).catch(console.error);
  },

  // ── Corrida ──
  adicionarEtapaCorrida: (sessaoId) => {
    set((state) => updateSessao(state, sessaoId, (s) => ({
      ...s,
      corrida: s.corrida
        ? { ...s.corrida, etapas: [...s.corrida.etapas, { id: gerarId(), tipo: 'moderado' }] }
        : { id: gerarId(), etapas: [{ id: gerarId(), tipo: 'moderado' }] },
    })));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) salvarSessao(uid, sessao).catch(console.error);
  },

  removerEtapaCorrida: (sessaoId, etapaId) => {
    set((state) => updateSessao(state, sessaoId, (s) => ({
      ...s,
      corrida: s.corrida ? { ...s.corrida, etapas: s.corrida.etapas.filter((e) => e.id !== etapaId) } : s.corrida,
    })));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) salvarSessao(uid, sessao).catch(console.error);
  },

  atualizarEtapaCorrida: (sessaoId, etapaId, dados) => {
    set((state) => updateSessao(state, sessaoId, (s) => ({
      ...s,
      corrida: s.corrida ? { ...s.corrida, etapas: s.corrida.etapas.map((e) => (e.id === etapaId ? { ...e, ...dados } : e)) } : s.corrida,
    })));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) syncDebounced(uid, sessao);
  },

  // ── Natação ──
  adicionarEtapaNatacao: (sessaoId) => {
    set((state) => updateSessao(state, sessaoId, (s) => ({
      ...s,
      natacao: s.natacao
        ? { ...s.natacao, etapas: [...s.natacao.etapas, { id: gerarId(), estilo: 'crawl' }] }
        : { id: gerarId(), etapas: [{ id: gerarId(), estilo: 'crawl' }] },
    })));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) salvarSessao(uid, sessao).catch(console.error);
  },

  removerEtapaNatacao: (sessaoId, etapaId) => {
    set((state) => updateSessao(state, sessaoId, (s) => ({
      ...s,
      natacao: s.natacao ? { ...s.natacao, etapas: s.natacao.etapas.filter((e) => e.id !== etapaId) } : s.natacao,
    })));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) salvarSessao(uid, sessao).catch(console.error);
  },

  atualizarEtapaNatacao: (sessaoId, etapaId, dados) => {
    set((state) => updateSessao(state, sessaoId, (s) => ({
      ...s,
      natacao: s.natacao ? { ...s.natacao, etapas: s.natacao.etapas.map((e) => (e.id === etapaId ? { ...e, ...dados } : e)) } : s.natacao,
    })));
    const { uid, sessoes } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (uid && sessao) syncDebounced(uid, sessao);
  },

  // ── Histórico ──
  carregarHistorico: async (uid) => {
    try {
      const historico = await loadHistorico(uid);
      set({ historico });
    } catch (err) {
      console.error('[treinoStore] Erro ao carregar histórico:', err);
    }
  },

  concluirTreino: (sessaoId) => {
    const { uid, sessoes, treinoAtivo } = get();
    const sessao = sessoes.find((s) => s.id === sessaoId);
    if (!uid || !sessao) return;

    const duracaoTotalSegundos = treinoAtivo && treinoAtivo.sessaoId === sessaoId
      ? Math.round((Date.now() - treinoAtivo.iniciadoEm) / 1000)
      : undefined;

    const registro: RegistroTreino = {
      id: gerarId(),
      sessaoId: sessao.id,
      nome: sessao.nome,
      tipo: sessao.tipo || 'musculacao',
      exercicios: sessao.exercicios,
      corrida: sessao.corrida,
      natacao: sessao.natacao,
      concluidoEm: new Date().toISOString(),
      duracaoTotalSegundos,
    };

    set((state) => ({ historico: [registro, ...state.historico], treinoAtivo: null }));
    salvarRegistro(uid, registro).catch(console.error);
  },

  removerRegistro: (id) => {
    set((state) => ({ historico: state.historico.filter((r) => r.id !== id) }));
    const { uid } = get();
    if (uid) deletarRegistro(uid, id).catch(console.error);
  },

  adicionarRegistro: (registro) => {
    const { uid, historico } = get();
    if (!uid) return;

    // Evitar duplicatas
    if (historico.some((r) => r.id === registro.id)) return;

    set((state) => ({ historico: [registro, ...state.historico].sort((a, b) => new Date(b.concluidoEm).getTime() - new Date(a.concluidoEm).getTime()) }));
    salvarRegistro(uid, registro).catch(console.error);
  },
}));
