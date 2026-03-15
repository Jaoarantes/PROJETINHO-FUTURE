import { create } from 'zustand';
import type { Exercicio } from '../types/treino';
import {
  carregarExerciciosCustom,
  salvarExercicioCustom,
  deletarExercicioCustom,
} from '../services/exercicioService';

interface ExercicioCustomStore {
  exerciciosCustom: Exercicio[];
  carregando: boolean;
  carregar: (uid: string) => Promise<void>;
  adicionarExercicio: (uid: string, dados: Omit<Exercicio, 'id' | 'isCustom'>) => Promise<void>;
  removerExercicio: (uid: string, id: number) => Promise<void>;
  limpar: () => void;
}

export const useExercicioCustomStore = create<ExercicioCustomStore>((set) => ({
  exerciciosCustom: [],
  carregando: false,

  carregar: async (uid) => {
    set({ carregando: true });
    try {
      const exercicios = await carregarExerciciosCustom(uid);
      set({ exerciciosCustom: exercicios });
    } finally {
      set({ carregando: false });
    }
  },

  adicionarExercicio: async (uid, dados) => {
    const novo: Exercicio = { ...dados, id: Date.now(), isCustom: true };
    await salvarExercicioCustom(uid, novo);
    set((state) => ({ exerciciosCustom: [...state.exerciciosCustom, novo] }));
  },

  removerExercicio: async (uid, id) => {
    await deletarExercicioCustom(uid, id);
    set((state) => ({
      exerciciosCustom: state.exerciciosCustom.filter((e) => e.id !== id),
    }));
  },

  limpar: () => set({ exerciciosCustom: [] }),
}));
