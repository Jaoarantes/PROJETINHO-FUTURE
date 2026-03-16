export interface WorkoutSummary {
  exerciciosCount?: number;
  volumeTotal?: number;
  distanciaKm?: number;
  duracaoMin?: number;
  gruposMusculares?: string[];
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
}
