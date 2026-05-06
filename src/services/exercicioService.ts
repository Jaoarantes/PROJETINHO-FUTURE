import { supabase } from '../supabase';
import type { Exercicio } from '../types/treino';

interface ExercicioCustomRow {
  id: number;
  nome: string;
  grupo_muscular: string;
  musculos_secundarios: string | undefined;
  descricao: string | undefined;
  equipamento: string | undefined;
  gif_url: string | undefined;
  is_custom: boolean;
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

export async function carregarExerciciosCustom(uid: string): Promise<Exercicio[]> {
  try {
    const { data, error } = await supabase
      .from('exercicios_custom')
      .select('*')
      .eq('user_id', uid);

    if (error) {
      console.error('[exercicioService] Erro ao carregar exercícios custom:', error.message);
      throw error;
    }

    return ((data || []) as ExercicioCustomRow[]).map((row) => ({
      id: row.id,
      nome: row.nome,
      grupoMuscular: row.grupo_muscular,
      musculosSecundarios: row.musculos_secundarios,
      descricao: row.descricao,
      equipamento: row.equipamento,
      gifUrl: row.gif_url,
      isCustom: row.is_custom,
    }));
  } catch (err: unknown) {
    console.error('[exercicioService] Exceção no carregarExerciciosCustom:', errorMessage(err));
    return [];
  }
}

export async function salvarExercicioCustom(uid: string, exercicio: Exercicio): Promise<void> {
  const { error } = await supabase
    .from('exercicios_custom')
    .upsert({
      id: exercicio.id,
      user_id: uid,
      nome: exercicio.nome,
      grupo_muscular: exercicio.grupoMuscular,
      musculos_secundarios: exercicio.musculosSecundarios || null,
      descricao: exercicio.descricao || null,
      equipamento: exercicio.equipamento || null,
      gif_url: exercicio.gifUrl || null,
      is_custom: true,
    }, { onConflict: 'id' });

  if (error) throw error;
}

export async function deletarExercicioCustom(uid: string, id: number): Promise<void> {
  const { error } = await supabase
    .from('exercicios_custom')
    .delete()
    .eq('id', id)
    .eq('user_id', uid);

  if (error) throw error;
}
