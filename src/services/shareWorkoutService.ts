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

interface SharedWorkoutRow {
  id: string;
  from_user_id: string;
  to_user_id: string;
  sessao_data: SessaoTreino;
  status: SharedWorkout['status'];
  created_at: string;
}

interface ShareProfileRow {
  id: string;
  display_name: string | null;
  photo_url: string | null;
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
  const share = data as SharedWorkoutRow;

  // Buscar perfil do remetente
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, photo_url')
    .eq('id', share.from_user_id)
    .maybeSingle();
  const fromProfile = profile as Omit<ShareProfileRow, 'id'> | null;

  return {
    id: share.id,
    fromUserId: share.from_user_id,
    fromUserName: fromProfile?.display_name || null,
    fromUserPhoto: fromProfile?.photo_url || null,
    toUserId: share.to_user_id,
    sessaoData: share.sessao_data,
    status: share.status,
    createdAt: share.created_at,
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

  const shares = data as SharedWorkoutRow[];
  const fromIds = [...new Set(shares.map((d) => d.from_user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, photo_url')
    .in('id', fromIds);

  const profileMap = new Map(
    ((profiles || []) as ShareProfileRow[]).map((p) => [p.id, { name: p.display_name, photo: p.photo_url }])
  );

  return shares.map((row) => {
    const p = profileMap.get(row.from_user_id);
    return {
      id: row.id,
      fromUserId: row.from_user_id,
      fromUserName: p?.name || null,
      fromUserPhoto: p?.photo || null,
      toUserId: row.to_user_id,
      sessaoData: row.sessao_data,
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
