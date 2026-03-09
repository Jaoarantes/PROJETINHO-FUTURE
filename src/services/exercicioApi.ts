import type { Exercicio } from '../types/treino';

const BASE_URL = 'https://wger.de/api/v2';

// Mapeamento dos IDs de grupo muscular do wger para nomes em PT-BR
const gruposMusculares: Record<number, string> = {
  1: 'Bíceps',
  2: 'Ombros',
  3: 'Serrátil',
  4: 'Peito',
  5: 'Tríceps',
  6: 'Abdômen',
  7: 'Panturrilha',
  8: 'Glúteos',
  9: 'Trapézio',
  10: 'Quadríceps',
  11: 'Posterior de coxa',
  12: 'Dorsal',
  13: 'Lombar',
  14: 'Antebraço',
};

interface WgerExercise {
  id: number;
  name: string;
  muscles: { id: number; name_en: string }[];
  muscles_secondary: { id: number; name_en: string }[];
  images: { image: string }[];
}

interface WgerResponse {
  count: number;
  next: string | null;
  results: WgerExercise[];
}

export async function buscarExercicios(
  termo?: string,
  grupoMuscularId?: number,
): Promise<Exercicio[]> {
  const params = new URLSearchParams({
    format: 'json',
    language: '2', // 2 = English (mais completo que PT)
    limit: '100',
  });

  if (termo) {
    params.set('name', termo);
  }
  if (grupoMuscularId) {
    params.set('muscles', grupoMuscularId.toString());
  }

  const response = await fetch(
    `${BASE_URL}/exercise/search/?term=${termo ?? ''}&language=english&format=json`,
  );

  if (!response.ok) {
    // Fallback: buscar sem search endpoint
    return buscarExerciciosLista(termo, grupoMuscularId);
  }

  const data = await response.json();

  if (data.suggestions) {
    return data.suggestions
      .filter((s: { data: { id: number; name: string; category: string } }) => s.data?.name)
      .map((s: { data: { id: number; name: string; category: string } }) => ({
        id: s.data.id,
        nome: s.data.name,
        grupoMuscular: s.data.category || 'Geral',
      }));
  }

  return [];
}

async function buscarExerciciosLista(
  termo?: string,
  grupoMuscularId?: number,
): Promise<Exercicio[]> {
  const params = new URLSearchParams({
    format: 'json',
    language: '2',
    limit: '200',
    offset: '0',
  });

  if (grupoMuscularId) {
    params.set('muscles', grupoMuscularId.toString());
  }

  const response = await fetch(`${BASE_URL}/exercise/?${params}`);
  if (!response.ok) throw new Error('Erro ao buscar exercícios');

  const data: WgerResponse = await response.json();

  let exercicios: Exercicio[] = data.results.map((ex) => {
    const mainMuscle = ex.muscles?.[0]?.id;
    return {
      id: ex.id,
      nome: ex.name,
      grupoMuscular: mainMuscle ? (gruposMusculares[mainMuscle] || 'Geral') : 'Geral',
      imagemUrl: ex.images?.[0]?.image,
    };
  });

  if (termo) {
    const termoLower = termo.toLowerCase();
    exercicios = exercicios.filter((e) =>
      e.nome.toLowerCase().includes(termoLower)
    );
  }

  return exercicios;
}

export function getGruposMusculares() {
  return Object.entries(gruposMusculares).map(([id, nome]) => ({
    id: Number(id),
    nome,
  }));
}
