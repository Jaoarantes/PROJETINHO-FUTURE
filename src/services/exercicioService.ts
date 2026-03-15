import { supabase } from '../supabase';
import type { Exercicio } from '../types/treino';

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

    return (data || []).map((row: any) => ({
      id: row.id,
      nome: row.nome,
      grupoMuscular: row.grupo_muscular,
      musculosSecundarios: row.musculos_secundarios,
      descricao: row.descricao,
      equipamento: row.equipamento,
      gifUrl: row.gif_url,
      isCustom: row.is_custom,
    }));
  } catch (err: any) {
    console.error('[exercicioService] Exceção no carregarExerciciosCustom:', err.message);
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
