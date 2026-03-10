export interface Exercicio {
  id: number;
  nome: string;
  grupoMuscular: string;
  musculosSecundarios?: string;
  descricao?: string;       // execução passo a passo
  equipamento?: string;
  gifUrl?: string;          // URL de GIF/imagem animada da execução
  isCustom?: boolean;
}

export type TecnicaTreino = 'normal' | 'superset' | 'dropset' | 'restpause';

export const TECNICA_LABELS: Record<TecnicaTreino, string> = {
  normal: 'Normal',
  superset: 'Superset',
  dropset: 'Drop Set',
  restpause: 'Rest-Pause',
};

export interface SerieConfig {
  id: string;
  peso?: number;
  repeticoes: number;
  concluida: boolean;
}

export interface ExercicioTreino {
  id: string;
  exercicio: Exercicio;
  series: SerieConfig[];
  notas?: string;                   // anotações do usuário
  tecnica?: TecnicaTreino;          // técnica avançada
}

export interface SessaoTreino {
  id: string;
  nome: string;
  diaSemana?: string;
  exercicios: ExercicioTreino[];
  criadoEm: string;
}

/** Calcula volume total de um exercício (soma de peso × reps por série) */
export function calcularVolumeExercicio(series: SerieConfig[]): number {
  return series.reduce((total, s) => total + (s.peso ?? 0) * s.repeticoes, 0);
}

/** Calcula volume total de uma sessão inteira */
export function calcularVolumeSessao(exercicios: ExercicioTreino[]): number {
  return exercicios.reduce((total, ex) => total + calcularVolumeExercicio(ex.series), 0);
}
