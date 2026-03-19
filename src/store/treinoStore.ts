import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TipoSessao, SessaoTreino, RegistroTreino, Exercicio, SerieConfig, TecnicaTreino, EtapaCorrida, EtapaNatacao } from '../types/treino';
import { carregarSessoes, salvarSessao, deletarSessao, salvarRegistro, deletarRegistro, carregarHistorico as loadHistorico, salvarTreinoAtivo, carregarTreinoAtivo } from '../services/treinoService';
import { calcularVolumeSessao } from '../types/treino';
import { calcularCaloriasTreino } from '../utils/calorieCalculator';
import { useDietaStore } from './dietaStore';
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

let activeWorkoutTimer: ReturnType<typeof setTimeout> | null = null;
function syncTreinoAtivoDebounced(uid: string, dados: any | null) {
  if (activeWorkoutTimer) clearTimeout(activeWorkoutTimer);
  activeWorkoutTimer = setTimeout(() => {
    salvarTreinoAtivo(uid, dados).catch(console.error);
    activeWorkoutTimer = null;
  }, 1000);
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
  treinoAtivo: {
    sessaoId: string;
    iniciadoEm: number;
    pausadoEm: number | null;
    tempoPausadoTotal: number;
    distanceKm?: number;
    coordinates?: { latitude: number; longitude: number; timestamp: number }[];
  } | null;

  setUid: (uid: string | null) => void;
  carregar: (uid: string) => Promise<void>;
  limpar: () => void;

  criarSessao: (nome: string, tipo: TipoSessao, diaSemana?: string, tipoCustom?: string) => string;
  removerSessao: (id: string) => void;
  renomearSessao: (id: string, nome: string, diaSemana?: string) => void;
  reordenarSessoes: (novasSessoes: SessaoTreino[]) => void;
  iniciarTreino: (sessaoId: string) => void;
  pausarTreino: () => void;
  retomarTreino: () => void;
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
  concluirTreino: (sessaoId: string, dadosExtras?: { distanciaKm?: number; duracaoTotalSegundos?: number }) => Promise<RegistroTreino | undefined>;
  atualizarGPSAtivo: (distanciaKm: number, coordenadas: { latitude: number; longitude: number; timestamp: number }[]) => void;
  removerRegistro: (id: string) => void;
  adicionarRegistro: (registro: RegistroTreino) => Promise<void>;
  toggleDietaSync: (id: string, aplicado: boolean) => Promise<void>;
  autoSyncDiet: boolean;
  setAutoSyncDiet: (val: boolean) => void;
}

export const useTreinoStore = create<TreinoState>()(
  persist(
    (set, get) => ({
      uid: null,
      sessoes: [],
      historico: [],
      carregando: false,
      treinoAtivo: null,
      autoSyncDiet: false,

      setAutoSyncDiet: (val) => {
        const { historico, uid } = get();
        const { adicionarGastoCalorico } = useDietaStore.getState();

        if (val) {
          // ATIVANDO: aplicar calorias de todos os treinos ainda não sincronizados
          const naoSincronizados = historico.filter((r) => !r.aplicadoNaDieta);
          for (const reg of naoSincronizados) {
            const cal = Math.round(Number(reg.calorias) || Number(reg.stravaData?.calories) || calcularCaloriasTreino(reg));
            if (cal > 0) {
              reg.aplicadoNaDieta = true;
              reg.calorias = cal;
              adicionarGastoCalorico(reg.concluidoEm.split('T')[0], cal);
              if (uid) salvarRegistro(uid, reg).catch(console.error);
            }
          }
        } else {
          // DESATIVANDO: reverter calorias de todos os treinos sincronizados
          const sincronizados = historico.filter((r) => r.aplicadoNaDieta);
          for (const reg of sincronizados) {
            const cal = Math.round(Number(reg.calorias) || Number(reg.stravaData?.calories) || calcularCaloriasTreino(reg));
            if (cal > 0) {
              reg.aplicadoNaDieta = false;
              adicionarGastoCalorico(reg.concluidoEm.split('T')[0], -cal);
              if (uid) salvarRegistro(uid, reg).catch(console.error);
            }
          }
        }

        set({ autoSyncDiet: val, historico: [...historico] });
      },

      setUid: (uid) => set({ uid }),

      carregar: async (uid) => {
        set({ carregando: true, uid });
        try {
          const [sessoes, treinoAtivoSupabase, historico] = await Promise.all([
            carregarSessoes(uid),
            carregarTreinoAtivo(uid),
            loadHistorico(uid),
          ]);
          set({
            sessoes: sessoes.map((s) => ({
              ...s,
              tipo: s.tipo || ('musculacao' as TipoSessao),
              exercicios: s.exercicios || [],
            })),
            historico,
            treinoAtivo: treinoAtivoSupabase || get().treinoAtivo,
            carregando: false,
          });
        } catch (err) {
          console.error('[treinoStore] Erro ao carregar:', err);
          set({ carregando: false });
        }
      },

      limpar: () => set({ sessoes: [], historico: [], uid: null, carregando: false, treinoAtivo: null }),

      iniciarTreino: (sessaoId) => {
        const dados = { sessaoId, iniciadoEm: Date.now(), pausadoEm: null, tempoPausadoTotal: 0, distanceKm: 0, coordinates: [] };
        set({ treinoAtivo: dados });
        const { uid } = get();
        if (uid) syncTreinoAtivoDebounced(uid, dados);
      },

      pausarTreino: () => {
        const { treinoAtivo, uid } = get();
        if (!treinoAtivo || treinoAtivo.pausadoEm) return;
        const novo = { ...treinoAtivo, pausadoEm: Date.now() };
        set({ treinoAtivo: novo });
        if (uid) syncTreinoAtivoDebounced(uid, novo);
      },

      retomarTreino: () => {
        const { treinoAtivo, uid } = get();
        if (!treinoAtivo || !treinoAtivo.pausadoEm) return;
        const pauseDuration = Date.now() - treinoAtivo.pausadoEm;
        const novo = {
          ...treinoAtivo,
          pausadoEm: null,
          tempoPausadoTotal: treinoAtivo.tempoPausadoTotal + pauseDuration,
        };
        set({ treinoAtivo: novo });
        if (uid) syncTreinoAtivoDebounced(uid, novo);
      },

      cancelarTreino: () => {
        set({ treinoAtivo: null });
        const { uid } = get();
        if (uid) syncTreinoAtivoDebounced(uid, null);
      },

      atualizarGPSAtivo: (distanciaKm, coordenadas) => {
        const { treinoAtivo, uid } = get();
        if (!treinoAtivo) return;
        const novo = { ...treinoAtivo, distanceKm: distanciaKm, coordinates: coordenadas };
        set({ treinoAtivo: novo });
        if (uid) syncTreinoAtivoDebounced(uid, novo);
      },

      criarSessao: (nome, tipo, diaSemana, tipoCustom) => {
        const nova: SessaoTreino = {
          id: gerarId(),
          nome,
          tipo,
          tipoCustom: tipo === 'outro' ? tipoCustom : undefined,
          diaSemana,
          exercicios: [],
          corrida: tipo === 'corrida' ? { id: gerarId(), etapas: [{ id: gerarId(), tipo: 'moderado' }] } : undefined,
          natacao: tipo === 'natacao' ? { id: gerarId(), etapas: [{ id: gerarId(), estilo: 'crawl' }] } : undefined,
          criadoEm: new Date().toISOString(),
        };
        set((state) => ({ sessoes: [...state.sessoes, nova] }));
        const { uid } = get();
        if (uid) {
          console.log('[treinoStore] Salvando nova sessão no Supabase:', { id: nova.id, nome: nova.nome, tipo: nova.tipo });
          salvarSessao(uid, nova)
            .then(() => console.log('[treinoStore] Sessão salva com sucesso:', nova.id))
            .catch((err) => console.error('[treinoStore] Erro ao salvar sessão:', err));
        } else {
          console.warn('[treinoStore] UID não disponível! Sessão NÃO foi salva no Supabase:', nova.id);
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
          // Salva a nova ordem no Supabase (pode ser otimizado salvando apenas as sessões alteradas)
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

      concluirTreino: async (sessaoId, dadosExtras) => {
        const { uid, sessoes, treinoAtivo, historico } = get();
        const sessao = sessoes.find((s) => s.id === sessaoId);
        if (!uid || !sessao) return;

        let duracaoTotalSegundos = dadosExtras?.duracaoTotalSegundos;
        if (duracaoTotalSegundos === undefined && treinoAtivo && treinoAtivo.sessaoId === sessaoId) {
          const agora = treinoAtivo.pausadoEm || Date.now();
          const msBruto = agora - treinoAtivo.iniciadoEm;
          duracaoTotalSegundos = Math.round((msBruto - treinoAtivo.tempoPausadoTotal) / 1000);
        }

        // --- Lógica Anti-Farm de XP ---
        const TEMPO_MINIMO_SEGUNDOS = 1200; // 20 minutos
        const MINIMO_EXERCICIOS = 3;
        const LIMITE_XP_DIARIO = 500;

        let xpParaGanhar = 0;

        // Musculação: precisa de 20min + 3 exercícios
        // Corrida/Natação: precisa de 20min (não tem exercícios)
        const isExerciciosBased = sessao.tipo === 'musculacao' || sessao.tipo === 'outro';
        const temTempoMinimo = (duracaoTotalSegundos || 0) >= TEMPO_MINIMO_SEGUNDOS;
        const temExerciciosMinimos = isExerciciosBased ? sessao.exercicios.length >= MINIMO_EXERCICIOS : true;

        if (temTempoMinimo && temExerciciosMinimos) {
          xpParaGanhar = 100; // Base

          // Bônus por volume alto em musculação/outro
          if (isExerciciosBased) {
            const volume = calcularVolumeSessao(sessao.exercicios);
            if (volume > 5000) xpParaGanhar += 20;
          }

          // Bônus por duração longa (>30min = +25 XP, >60min = +50 XP)
          if (duracaoTotalSegundos) {
            if (duracaoTotalSegundos >= 3600) xpParaGanhar += 50;
            else if (duracaoTotalSegundos >= 1800) xpParaGanhar += 25;
          }
        }

        // Limite diário de 500 XP
        const hoje = new Date().toISOString().slice(0, 10);
        const xpGanhoHoje = historico
          .filter(r => r.concluidoEm.startsWith(hoje))
          .reduce((sum, r) => sum + (r.xpEarned || 0), 0);

        xpParaGanhar = Math.min(xpParaGanhar, Math.max(0, LIMITE_XP_DIARIO - xpGanhoHoje));
        // ------------------------------

        let corridaClone = sessao.corrida;
        if (dadosExtras?.distanciaKm !== undefined && corridaClone) {
          corridaClone = {
            ...corridaClone,
            etapas: [{
              id: gerarId(),
              distanciaKm: Number(dadosExtras.distanciaKm.toFixed(2)),
              duracaoSegundos: duracaoTotalSegundos || 0,
              duracaoMin: Math.round((duracaoTotalSegundos || 0) / 60),
              tipo: 'moderado'
            }]
          };
        }

        const registro: RegistroTreino = {
          id: gerarId(),
          sessaoId: sessao.id,
          nome: sessao.nome,
          tipo: sessao.tipo || 'musculacao',
          tipoCustom: sessao.tipoCustom,
          exercicios: sessao.exercicios,
          corrida: corridaClone,
          natacao: sessao.natacao,
          concluidoEm: new Date().toISOString(),
          duracaoTotalSegundos,
          xpEarned: xpParaGanhar,
        };
        registro.calorias = Math.round(calcularCaloriasTreino(registro));

        if (get().autoSyncDiet) {
          registro.aplicadoNaDieta = true;
          const { adicionarGastoCalorico } = useDietaStore.getState();
          adicionarGastoCalorico(registro.concluidoEm.split('T')[0], registro.calorias);
        }

        try {
          await salvarRegistro(uid, registro);
          await salvarTreinoAtivo(uid, null);
          set((state) => ({ historico: [registro, ...state.historico], treinoAtivo: null }));
          return registro;
        } catch (err) {
          console.error('[treinoStore] Erro ao salvar registro no Supabase:', err);
          throw err;
        }
      },

      removerRegistro: (id) => {
        set((state) => ({ historico: state.historico.filter((r) => r.id !== id) }));
        const { uid } = get();
        if (uid) deletarRegistro(uid, id).catch(console.error);
      },

      adicionarRegistro: async (registro) => {
        const { uid, historico } = get();
        if (!uid) return;

        // Evitar duplicatas
        if (historico.some((r) => r.id === registro.id)) return;

        // Auto-sync diet para importações (Strava etc.)
        if (get().autoSyncDiet) {
          const calorias = Math.round(Number(registro.calorias) || Number(registro.stravaData?.calories) || 0);
          if (calorias > 0) {
            registro.aplicadoNaDieta = true;
            const { adicionarGastoCalorico } = useDietaStore.getState();
            adicionarGastoCalorico(registro.concluidoEm.split('T')[0], calorias);
          }
        }

        // Salvar no Supabase PRIMEIRO, depois atualizar estado local
        try {
          await salvarRegistro(uid, registro);
          set((state) => ({ historico: [registro, ...state.historico].sort((a, b) => new Date(b.concluidoEm).getTime() - new Date(a.concluidoEm).getTime()) }));
        } catch (err) {
          console.error('[treinoStore] Erro ao salvar registro:', err);
          throw err;
        }
      },

      toggleDietaSync: async (id, aplicado) => {
        const { historico, uid } = get();
        if (!uid) return;
        const registro = historico.find(r => r.id === id);
        if (!registro) return;

        const atualizado = { ...registro, aplicadoNaDieta: aplicado };
        try {
          await salvarRegistro(uid, atualizado);
          set({ historico: historico.map(r => r.id === id ? atualizado : r) });
        } catch (err) {
          console.error('[treinoStore] Erro ao salvar status da dieta:', err);
          throw err;
        }
      },
    }),
    {
      name: 'treino-storage',
      partialize: (state) => ({ treinoAtivo: state.treinoAtivo, autoSyncDiet: state.autoSyncDiet }),
    },
  ),
);
