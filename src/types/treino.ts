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

export type TipoSessao = 'musculacao' | 'corrida' | 'natacao';

export const TIPO_SESSAO_LABELS: Record<TipoSessao, string> = {
  musculacao: 'Musculação',
  corrida: 'Corrida',
  natacao: 'Natação',
};

export type TecnicaTreino = 'normal' | 'superset' | 'dropset' | 'restpause';

export const TECNICA_LABELS: Record<TecnicaTreino, string> = {
  normal: 'Normal',
  superset: 'Superset',
  dropset: 'Drop Set',
  restpause: 'Rest-Pause',
};

export type TipoSerie = 'normal' | 'aquecimento' | 'superset' | 'dropset' | 'restpause';

export const TIPO_SERIE_LABELS: Record<TipoSerie, string> = {
  normal: 'Normal',
  aquecimento: 'Aquecimento',
  superset: 'Superset',
  dropset: 'Drop Set',
  restpause: 'Rest-Pause',
};

export const TIPO_SERIE_CORES: Record<TipoSerie, string> = {
  normal: '#9E9E9E',
  aquecimento: '#FF9800',
  superset: '#AB47BC',
  dropset: '#EF5350',
  restpause: '#42A5F5',
};

export type TipoCorridaTreino = 'leve' | 'moderado' | 'intenso' | 'intervalado' | 'longo';

export const TIPO_CORRIDA_LABELS: Record<TipoCorridaTreino, string> = {
  leve: 'Leve',
  moderado: 'Moderado',
  intenso: 'Intenso',
  intervalado: 'Intervalado',
  longo: 'Longo',
};

export type EstiloNatacao = 'crawl' | 'costas' | 'peito' | 'borboleta' | 'medley' | 'livre';

export const ESTILO_NATACAO_LABELS: Record<EstiloNatacao, string> = {
  crawl: 'Crawl',
  costas: 'Costas',
  peito: 'Peito',
  borboleta: 'Borboleta',
  medley: 'Medley',
  livre: 'Livre',
};

export interface SerieConfig {
  id: string;
  peso?: number;
  repeticoes: number;
  concluida: boolean;
  tipo?: TipoSerie;
}

/** Configuração de uma etapa de corrida */
export interface EtapaCorrida {
  id: string;
  distanciaKm?: number;
  duracaoMin?: number;
  duracaoSegundos?: number; // Para exatidão de integração (ex: Strava)
  tipo?: TipoCorridaTreino;
}

/** Configuração de uma etapa de natação */
export interface EtapaNatacao {
  id: string;
  distanciaM?: number;
  duracaoMin?: number;
  duracaoSegundos?: number; // Para exatidão de integração
  estilo?: EstiloNatacao;
}

export interface ExercicioTreino {
  id: string;
  exercicio: Exercicio;
  series: SerieConfig[];
  notas?: string;
  tecnica?: TecnicaTreino;
}

/** Treino de corrida */
export interface TreinoCorrida {
  id: string;
  etapas: EtapaCorrida[];
  notas?: string;
}

/** Treino de natação */
export interface TreinoNatacao {
  id: string;
  etapas: EtapaNatacao[];
  notas?: string;
}

export interface SessaoTreino {
  id: string;
  nome: string;
  tipo: TipoSessao;
  diaSemana?: string;
  exercicios: ExercicioTreino[];
  corrida?: TreinoCorrida;
  natacao?: TreinoNatacao;
  criadoEm: string;
}

/** Registro de um treino concluído (histórico) */
export interface RegistroTreino {
  id: string;
  sessaoId: string;
  nome: string;
  tipo: TipoSessao;
  exercicios: ExercicioTreino[];
  corrida?: TreinoCorrida;
  natacao?: TreinoNatacao;
  concluidoEm: string;
  duracaoTotalSegundos?: number; // Tempo total do treino
  stravaData?: {
    id: number;
    averageSpeedMps: number;
    maxSpeedMps: number;
    elevationGainM: number;
    averageHeartrate?: number;
    calories?: number;
  };
}

/** Calcula volume total de um exercício (soma de peso × reps por série) */
export function calcularVolumeExercicio(series: SerieConfig[]): number {
  return series.reduce((total, s) => total + (s.peso ?? 0) * s.repeticoes, 0);
}

/** Calcula volume total de uma sessão inteira */
export function calcularVolumeSessao(exercicios: ExercicioTreino[]): number {
  return exercicios.reduce((total, ex) => total + calcularVolumeExercicio(ex.series), 0);
}

export function calcularDistanciaCorrida(etapas: EtapaCorrida[]): number {
  return etapas.reduce((total, e) => total + (e.distanciaKm ?? 0), 0);
}

export function calcularDuracaoCorrida(etapas: EtapaCorrida[]): number {
  return etapas.reduce((total, e) => total + (e.duracaoMin ?? 0), 0);
}

export function calcularDistanciaNatacao(etapas: EtapaNatacao[]): number {
  return etapas.reduce((total, e) => total + (e.distanciaM ?? 0), 0);
}

export function calcularDuracaoNatacao(etapas: EtapaNatacao[]): number {
  return etapas.reduce((total, e) => total + (e.duracaoMin ?? 0), 0);
}
