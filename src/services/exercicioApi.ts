import type { Exercicio } from '../types/treino';
import { EXERCICIOS_PADRAO, GRUPOS_MUSCULARES } from '../constants/exercicios-padrao';

export function buscarExercicios(
  termo?: string,
  grupo?: string,
  customExercicios: Exercicio[] = [],
): Exercicio[] {
  let resultado = [...EXERCICIOS_PADRAO, ...customExercicios];

  if (grupo) {
    resultado = resultado.filter((e) => e.grupoMuscular === grupo);
  }

  if (termo && termo.trim()) {
    const termoLower = termo.trim().toLowerCase();
    resultado = resultado.filter((e) =>
      e.nome.toLowerCase().includes(termoLower),
    );
  }

  return resultado;
}

export function getGruposMusculares(customExercicios: Exercicio[] = []): string[] {
  const gruposCustom = customExercicios
    .map((e) => e.grupoMuscular)
    .filter((g) => !GRUPOS_MUSCULARES.includes(g));
  const extras = [...new Set(gruposCustom)];
  return [...GRUPOS_MUSCULARES, ...extras];
}
