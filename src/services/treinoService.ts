import { supabase } from '../supabase';
import type { SessaoTreino, RegistroTreino } from '../types/treino';

export async function carregarTreinoAtivo(uid: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('treino_ativo')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();

    if (error || !data) return null;

    return {
      sessaoId: data.sessao_id,
      iniciadoEm: data.iniciado_em,
      pausadoEm: data.pausado_em,
      tempoPausadoTotal: data.tempo_pausado_total,
      distanceKm: data.distance_km,
      coordinates: data.coordinates,
    };
  } catch {
    return null;
  }
}

export async function salvarTreinoAtivo(uid: string, dados: any | null): Promise<void> {
  if (dados === null) {
    await supabase.from('treino_ativo').delete().eq('user_id', uid);
  } else {
    const { error } = await supabase
      .from('treino_ativo')
      .upsert({
        user_id: uid,
        sessao_id: dados.sessaoId,
        iniciado_em: dados.iniciadoEm,
        pausado_em: dados.pausadoEm,
        tempo_pausado_total: dados.tempoPausadoTotal,
        distance_km: dados.distanceKm,
        coordinates: dados.coordinates,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    if (error) throw error;
  }
}

export async function carregarSessoes(uid: string): Promise<SessaoTreino[]> {
  try {
    const { data, error } = await supabase
      .from('sessoes')
      .select('*')
      .eq('user_id', uid);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      nome: row.nome,
      tipo: row.tipo,
      diaSemana: row.dia_semana,
      exercicios: row.exercicios || [],
      corrida: row.corrida,
      natacao: row.natacao,
      criadoEm: row.criado_em,
      posicao: row.posicao,
    }));
  } catch (err) {
    console.error('[treinoService] Erro ao carregar sessões:', err);
    return [];
  }
}

export async function salvarSessao(uid: string, sessao: SessaoTreino): Promise<void> {
  const { error } = await supabase
    .from('sessoes')
    .upsert({
      id: sessao.id,
      user_id: uid,
      nome: sessao.nome,
      tipo: sessao.tipo,
      dia_semana: sessao.diaSemana || null,
      exercicios: sessao.exercicios,
      corrida: sessao.corrida || null,
      natacao: sessao.natacao || null,
      criado_em: sessao.criadoEm,
      posicao: sessao.posicao || null,
    }, { onConflict: 'id' });
  if (error) throw error;
}

export async function deletarSessao(uid: string, id: string): Promise<void> {
  const { error } = await supabase.from('sessoes').delete().eq('id', id).eq('user_id', uid);
  if (error) throw error;
}

export async function carregarHistorico(uid: string): Promise<RegistroTreino[]> {
  try {
    const { data, error } = await supabase
      .from('historico')
      .select('*')
      .eq('user_id', uid)
      .order('concluido_em', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      sessaoId: row.sessao_id,
      nome: row.nome,
      tipo: row.tipo,
      exercicios: row.exercicios || [],
      corrida: row.corrida,
      natacao: row.natacao,
      concluidoEm: row.concluido_em,
      duracaoTotalSegundos: row.duracao_total_segundos,
      xpEarned: row.xp_earned,
      stravaData: row.strava_data,
    }));
  } catch (err) {
    console.error('[treinoService] Erro ao carregar histórico:', err);
    return [];
  }
}

export async function salvarRegistro(uid: string, registro: RegistroTreino): Promise<void> {
  const { error } = await supabase
    .from('historico')
    .upsert({
      id: registro.id,
      user_id: uid,
      sessao_id: registro.sessaoId,
      nome: registro.nome,
      tipo: registro.tipo,
      exercicios: registro.exercicios,
      corrida: registro.corrida || null,
      natacao: registro.natacao || null,
      concluido_em: registro.concluidoEm,
      duracao_total_segundos: registro.duracaoTotalSegundos || null,
      xp_earned: registro.xpEarned || 0,
      strava_data: registro.stravaData || null,
    }, { onConflict: 'id' });
  if (error) throw error;
}

export async function deletarRegistro(uid: string, id: string): Promise<void> {
  const { error } = await supabase.from('historico').delete().eq('id', id).eq('user_id', uid);
  if (error) throw error;
}
