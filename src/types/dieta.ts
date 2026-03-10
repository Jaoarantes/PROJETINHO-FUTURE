export interface Alimento {
  id: string;
  nome: string;
  marca?: string;
  porcao: number;       // em gramas
  unidade: string;       // 'g', 'ml', 'unidade', 'fatia', 'colher', etc.
  calorias: number;      // por porção
  proteinas: number;     // g por porção
  carboidratos: number;  // g por porção
  gorduras: number;      // g por porção
  isCustom?: boolean;
}

export type TipoRefeicao = 'cafe' | 'almoco' | 'lanche' | 'jantar' | 'lanche_tarde' | 'pre_treino' | 'ceia';

export const REFEICAO_LABELS: Record<TipoRefeicao, string> = {
  cafe: 'Café da Manhã',
  almoco: 'Almoço',
  lanche: 'Lanche',
  jantar: 'Jantar',
  lanche_tarde: 'Lanche da Tarde',
  pre_treino: 'Pré-Treino',
  ceia: 'Ceia',
};

export type NivelAtividade = 'sedentario' | 'leve' | 'moderado' | 'bastante_ativo' | 'extremamente_ativo';
export type ObjetivoPeso = 'perder' | 'manter' | 'ganhar';
export type IntensidadeTreino = 'leve' | 'moderado' | 'intenso' | 'insano';
export type IntensidadeCardio = 'leve' | 'moderada' | 'intensa';

export const ATIVIDADE_LABELS: Record<NivelAtividade, string> = {
  sedentario: 'Sedentário — Maior parte do dia sentado',
  leve: 'Levemente ativo — Pequenas caminhadas e tarefas',
  moderado: 'Moderadamente ativo — Em pé boa parte do dia',
  bastante_ativo: 'Bastante ativo — Movimentação constante',
  extremamente_ativo: 'Extremamente ativo — Trabalho físico pesado',
};

export const OBJETIVO_LABELS: Record<ObjetivoPeso, string> = {
  perder: 'Perder Gordura (Cutting)',
  manter: 'Manter Peso',
  ganhar: 'Ganhar Massa (Bulking)',
};

export interface PerfilCorporal {
  sexo: 'masculino' | 'feminino';
  idade: number;
  peso: number;         // kg
  altura: number;       // cm
  gorduraCorporal?: number; // % opcional
  nivelAtividade: NivelAtividade;
  // Musculação
  fazMusculacao: boolean;
  musculacaoDias: number;     // dias/semana
  musculacaoDuracao: number;  // min/treino
  musculacaoIntensidade: IntensidadeTreino;
  // Cardio
  fazCardio: boolean;
  cardioDias: number;
  cardioDuracao: number;      // min
  cardioIntensidade: IntensidadeCardio;
  // Objetivo
  objetivo: ObjetivoPeso;
  metaSemanal: number;  // kg/semana (0.25, 0.5, 0.75)
  // Macros (g/kg)
  proteinaGKg: number;  // default 2.0
  gorduraGKg: number;   // default 0.8
}

export interface ItemRefeicao {
  id: string;
  alimento: Alimento;
  quantidade: number; // multiplicador da porção (ex: 1.5 = 1.5x porção)
}

export interface Refeicao {
  tipo: TipoRefeicao;
  itens: ItemRefeicao[];
}

export interface DiarioDieta {
  id: string;          // formato: YYYY-MM-DD
  data: string;        // ISO date string
  refeicoes: Refeicao[];
  aguaML: number;      // ml consumidos no dia
  metaCalorias: number;
  metaProteinas: number;
  metaCarboidratos: number;
  metaGorduras: number;
}

export interface MetasDieta {
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  agua: number;         // ml por dia
}

// Helper: calcula macros de um item
export function calcularMacrosItem(item: ItemRefeicao) {
  const q = item.quantidade;
  return {
    calorias: Math.round(item.alimento.calorias * q),
    proteinas: +(item.alimento.proteinas * q).toFixed(1),
    carboidratos: +(item.alimento.carboidratos * q).toFixed(1),
    gorduras: +(item.alimento.gorduras * q).toFixed(1),
  };
}

// Helper: calcula total de uma refeição
export function calcularMacrosRefeicao(refeicao: Refeicao) {
  return refeicao.itens.reduce(
    (acc, item) => {
      const m = calcularMacrosItem(item);
      acc.calorias += m.calorias;
      acc.proteinas += m.proteinas;
      acc.carboidratos += m.carboidratos;
      acc.gorduras += m.gorduras;
      return acc;
    },
    { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 },
  );
}

// Helper: calcula total do dia
export function calcularMacrosDia(refeicoes: Refeicao[]) {
  return refeicoes.reduce(
    (acc, ref) => {
      const m = calcularMacrosRefeicao(ref);
      acc.calorias += m.calorias;
      acc.proteinas += m.proteinas;
      acc.carboidratos += m.carboidratos;
      acc.gorduras += m.gorduras;
      return acc;
    },
    { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 },
  );
}
