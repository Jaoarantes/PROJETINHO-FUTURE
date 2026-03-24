import { supabase } from '../supabase';
import type { SessaoTreino } from '../types/treino';

export interface SharedWorkout {
  id: string;
  fromUserId: string;
  fromUserName: string | null;
  fromUserPhoto: string | null;
  toUserId: string;
  sessaoData: SessaoTreino;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

/** Compartilhar treino com um seguidor */
export async function compartilharTreino(
  fromUserId: string,
  toUserId: string,
  sessao: SessaoTreino,
): Promise<void> {
  // Inserir na tabela shared_workouts
  const { error } = await supabase.from('shared_workouts').insert({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    sessao_data: sessao,
    status: 'pending',
  });
  if (error) throw error;

  // Enviar notificação
  await supabase.from('feed_notifications').insert({
    user_id: toUserId,
    actor_id: fromUserId,
    tipo: 'share_workout',
    post_id: null,
    texto: sessao.nome,
  });
}

/** Carregar treino compartilhado pelo ID */
export async function carregarTreinoCompartilhado(shareId: string): Promise<SharedWorkout | null> {
  const { data, error } = await supabase
    .from('shared_workouts')
    .select('*')
    .eq('id', shareId)
    .maybeSingle();

  if (error || !data) return null;

  // Buscar perfil do remetente
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, photo_url')
    .eq('id', data.from_user_id)
    .maybeSingle();

  return {
    id: data.id,
    fromUserId: data.from_user_id,
    fromUserName: profile?.display_name || null,
    fromUserPhoto: profile?.photo_url || null,
    toUserId: data.to_user_id,
    sessaoData: data.sessao_data as SessaoTreino,
    status: data.status,
    createdAt: data.created_at,
  };
}

/** Listar treinos compartilhados pendentes para o usuário */
export async function listarTreinosPendentes(userId: string): Promise<SharedWorkout[]> {
  const { data, error } = await supabase
    .from('shared_workouts')
    .select('*')
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const fromIds = [...new Set(data.map((d: any) => d.from_user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, photo_url')
    .in('id', fromIds);

  const profileMap = new Map(
    (profiles || []).map((p: any) => [p.id, { name: p.display_name, photo: p.photo_url }])
  );

  return data.map((row: any) => {
    const p = profileMap.get(row.from_user_id);
    return {
      id: row.id,
      fromUserId: row.from_user_id,
      fromUserName: p?.name || null,
      fromUserPhoto: p?.photo || null,
      toUserId: row.to_user_id,
      sessaoData: row.sessao_data as SessaoTreino,
      status: row.status,
      createdAt: row.created_at,
    };
  });
}

/** Atualizar status do treino compartilhado */
export async function atualizarStatusShare(shareId: string, status: 'accepted' | 'rejected'): Promise<void> {
  const { error } = await supabase
    .from('shared_workouts')
    .update({ status })
    .eq('id', shareId);
  if (error) throw error;
}
