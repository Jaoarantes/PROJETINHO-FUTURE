import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SessaoTreino, Exercicio, SerieConfig } from '../types/treino';

interface TreinoState {
  sessoes: SessaoTreino[];
  criarSessao: (nome: string, diaSemana?: string) => void;
  removerSessao: (id: string) => void;
  renomearSessao: (id: string, nome: string) => void;
  adicionarExercicio: (sessaoId: string, exercicio: Exercicio, seriesCount: number, repsCount: number) => void;
  removerExercicio: (sessaoId: string, exercicioTreinoId: string) => void;
  atualizarSerie: (sessaoId: string, exercicioTreinoId: string, serieId: string, dados: Partial<SerieConfig>) => void;
  adicionarSerie: (sessaoId: string, exercicioTreinoId: string) => void;
  removerSerie: (sessaoId: string, exercicioTreinoId: string, serieId: string) => void;
}

const gerarId = () => crypto.randomUUID();

export const useTreinoStore = create<TreinoState>()(
  persist(
    (set) => ({
      sessoes: [],

      criarSessao: (nome, diaSemana) =>
        set((state) => ({
          sessoes: [
            ...state.sessoes,
            {
              id: gerarId(),
              nome,
              diaSemana,
              exercicios: [],
              criadoEm: new Date().toISOString(),
            },
          ],
        })),

      removerSessao: (id) =>
        set((state) => ({
          sessoes: state.sessoes.filter((s) => s.id !== id),
        })),

      renomearSessao: (id, nome) =>
        set((state) => ({
          sessoes: state.sessoes.map((s) =>
            s.id === id ? { ...s, nome } : s
          ),
        })),

      adicionarExercicio: (sessaoId, exercicio, seriesCount, repsCount) =>
        set((state) => ({
          sessoes: state.sessoes.map((s) => {
            if (s.id !== sessaoId) return s;
            const series: SerieConfig[] = Array.from({ length: seriesCount }, () => ({
              id: gerarId(),
              repeticoes: repsCount,
              concluida: false,
            }));
            return {
              ...s,
              exercicios: [
                ...s.exercicios,
                { id: gerarId(), exercicio, series },
              ],
            };
          }),
        })),

      removerExercicio: (sessaoId, exercicioTreinoId) =>
        set((state) => ({
          sessoes: state.sessoes.map((s) => {
            if (s.id !== sessaoId) return s;
            return {
              ...s,
              exercicios: s.exercicios.filter((e) => e.id !== exercicioTreinoId),
            };
          }),
        })),

      atualizarSerie: (sessaoId, exercicioTreinoId, serieId, dados) =>
        set((state) => ({
          sessoes: state.sessoes.map((s) => {
            if (s.id !== sessaoId) return s;
            return {
              ...s,
              exercicios: s.exercicios.map((e) => {
                if (e.id !== exercicioTreinoId) return e;
                return {
                  ...e,
                  series: e.series.map((sr) =>
                    sr.id === serieId ? { ...sr, ...dados } : sr
                  ),
                };
              }),
            };
          }),
        })),

      adicionarSerie: (sessaoId, exercicioTreinoId) =>
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
        })),

      removerSerie: (sessaoId, exercicioTreinoId, serieId) =>
        set((state) => ({
          sessoes: state.sessoes.map((s) => {
            if (s.id !== sessaoId) return s;
            return {
              ...s,
              exercicios: s.exercicios.map((e) => {
                if (e.id !== exercicioTreinoId) return e;
                return {
                  ...e,
                  series: e.series.filter((sr) => sr.id !== serieId),
                };
              }),
            };
          }),
        })),
    }),
    { name: 'treino-data' },
  ),
);
