export interface SerieResumo {
  reps: number;
  peso?: number;
  tipo?: string;
}

export interface ExercicioResumo {
  nome: string;
  sets: number;
  exercicioId?: number;
  series?: SerieResumo[];
}

export interface WorkoutSummary {
  exerciciosCount?: number;
  volumeTotal?: number;
  distanciaKm?: number;
  duracaoMin?: number;
  gruposMusculares?: string[];
  exercicios?: ExercicioResumo[];
}

export interface FeedPost {
  id: string;
  userId: string;
  registroId: string | null;
  tipoTreino: string | null;
  nomeTreino: string | null;
  duracaoSegundos: number | null;
  resumo: WorkoutSummary | null;
  texto: string | null;
  fotoUrls: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  // Dados do autor (joined)
  authorName: string | null;
  authorPhoto: string | null;
  // Estado local
  likedByMe: boolean;
}

export interface FeedComment {
  id: string;
  postId: string;
  userId: string;
  texto: string;
  createdAt: string;
  authorName: string | null;
  authorPhoto: string | null;
  parentId?: string | null;
}

export interface FeedNotification {
  id: string;
  userId: string; // dono da notificação (quem recebe)
  actorId: string;
  actorName: string | null;
  actorPhoto: string | null;
  tipo: 'like' | 'comment';
  postId: string;
  texto: string | null; // texto do comentário (se tipo=comment)
  lida: boolean;
  createdAt: string;
}
