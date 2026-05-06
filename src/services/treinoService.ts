import { supabase } from '../supabase';
import type { ExercicioTreino, RegistroTreino, SessaoTreino, TipoSessao, TreinoCorrida, TreinoNatacao } from '../types/treino';

interface GPSCoordinate {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface TreinoAtivoData {
  sessaoId: string;
  iniciadoEm: number;
  pausadoEm: number | null;
  tempoPausadoTotal: number;
  distanceKm?: number;
  coordinates?: GPSCoordinate[];
}

interface TreinoAtivoRow {
  sessao_id: string;
  iniciado_em: number;
  pausado_em: number | null;
  tempo_pausado_total: number | null;
  distance_km: number | null;
  coordinates: GPSCoordinate[] | null;
}

interface SessaoRow {
  id: string;
  nome: string;
  tipo: TipoSessao;
  dia_semana: string | null;
  exercicios: ExercicioTreino[] | null;
  corrida: TreinoCorrida | null;
  natacao: TreinoNatacao | null;
  criado_em: string;
  posicao: number | null;
}

interface HistoricoRow extends SessaoRow {
  sessao_id: string;
  concluido_em: string;
  duracao_total_segundos: number | null;
  calorias: number | null;
  aplicado_na_dieta: boolean | null;
  xp_earned: number | null;
  strava_data: RegistroTreino['stravaData'] | null;
}

export async function carregarTreinoAtivo(uid: string): Promise<TreinoAtivoData | null> {
  try {
    const { data, error } = await supabase
      .from('treino_ativo')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as TreinoAtivoRow;

    return {
      sessaoId: row.sessao_id,
      iniciadoEm: row.iniciado_em,
      pausadoEm: row.pausado_em,
      tempoPausadoTotal: row.tempo_pausado_total ?? 0,
      distanceKm: row.distance_km ?? 0,
      coordinates: row.coordinates ?? [],
    };
  } catch {
    return null;
  }
}

export async function salvarTreinoAtivo(uid: string, dados: TreinoAtivoData | null): Promise<void> {
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

    return ((data || []) as SessaoRow[]).map((row) => ({
      id: row.id,
      nome: row.nome,
      tipo: row.tipo,
      diaSemana: row.dia_semana || undefined,
      exercicios: row.exercicios || [],
      corrida: row.corrida || undefined,
      natacao: row.natacao || undefined,
      criadoEm: row.criado_em,
      posicao: row.posicao ?? undefined,
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

    return ((data || []) as HistoricoRow[]).map((row) => ({
      id: row.id,
      sessaoId: row.sessao_id,
      nome: row.nome,
      tipo: row.tipo,
      exercicios: row.exercicios || [],
      corrida: row.corrida || undefined,
      natacao: row.natacao || undefined,
      concluidoEm: row.concluido_em,
      duracaoTotalSegundos: row.duracao_total_segundos ?? undefined,
      calorias: row.calorias ?? undefined,
      aplicadoNaDieta: row.aplicado_na_dieta ?? undefined,
      xpEarned: row.xp_earned ?? undefined,
      stravaData: row.strava_data || undefined,
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
      calorias: registro.calorias || null,
      aplicado_na_dieta: registro.aplicadoNaDieta || false,
      xp_earned: registro.xpEarned || 0,
      strava_data: registro.stravaData || null,
    }, { onConflict: 'id' });
  if (error) throw error;
}

export async function deletarRegistro(uid: string, id: string): Promise<void> {
  const { error } = await supabase.from('historico').delete().eq('id', id).eq('user_id', uid);
  if (error) throw error;
}
