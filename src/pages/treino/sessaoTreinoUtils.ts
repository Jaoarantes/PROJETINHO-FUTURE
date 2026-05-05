import type { RegistroTreino } from '../../types/treino';
import { calcularVolumeSessao } from '../../types/treino';

export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function montarPostTreinoCompartilhado(
  registro: RegistroTreino,
  texto: string,
  fotoUrls: string[],
) {
  const gruposMusculares = [...new Set(registro.exercicios.map((e) => e.exercicio.grupoMuscular))];

  return {
    id: crypto.randomUUID(),
    registroId: registro.id,
    tipoTreino: registro.tipo,
    nomeTreino: registro.nome,
    duracaoSegundos: registro.duracaoTotalSegundos || null,
    resumo: {
      exerciciosCount: registro.exercicios.length,
      volumeTotal: calcularVolumeSessao(registro.exercicios),
      distanciaKm: registro.corrida?.etapas?.reduce((s, e) => s + (e.distanciaKm ?? 0), 0),
      duracaoMin: registro.duracaoTotalSegundos ? Math.round(registro.duracaoTotalSegundos / 60) : undefined,
      gruposMusculares,
      exercicios: registro.exercicios.map((e) => ({
        nome: e.exercicio.nome,
        sets: e.series.length,
        exercicioId: e.exercicio.id,
        series: e.series.map((s) => ({
          reps: s.repeticoes ?? 0,
          peso: s.peso,
          tipo: s.tipo || 'normal',
        })),
      })),
    },
    texto: texto.trim() || null,
    fotoUrls,
  };
}
