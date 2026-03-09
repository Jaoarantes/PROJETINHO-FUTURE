export interface Exercicio {
  id: number;
  nome: string;
  grupoMuscular: string;
  imagemUrl?: string;
}

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
}

export interface SessaoTreino {
  id: string;
  nome: string;
  diaSemana?: string;
  exercicios: ExercicioTreino[];
  criadoEm: string;
}
