import { supabase } from '../supabase';
import type { Alimento, DiarioDieta, MetasDieta, PerfilCorporal } from '../types/dieta';

export async function carregarDiarios(uid: string): Promise<DiarioDieta[]> {
  try {
    const { data, error } = await supabase
      .from('dieta_diarios')
      .select('*')
      .eq('user_id', uid);

    if (error) {
      console.error('[dietaService] Erro ao carregar diários:', error.message);
      throw error;
    }


    return (data || []).map((row: any) => ({
      id: row.id,
      data: row.data,
      refeicoes: row.refeicoes || [],
      aguaML: row.agua_ml,
      metaCalorias: row.meta_calorias,
      metaProteinas: row.meta_proteinas,
      metaCarboidratos: row.meta_carboidratos,
      metaGorduras: row.meta_gorduras,
    }));
  } catch (err: any) {
    console.error('[dietaService] Exceção no carregarDiarios:', err.message);
    return [];
  }
}

export async function salvarDiario(uid: string, diario: DiarioDieta): Promise<void> {
  const { error } = await supabase
    .from('dieta_diarios')
    .upsert({
      id: diario.id,
      user_id: uid,
      data: diario.data,
      refeicoes: diario.refeicoes,
      agua_ml: diario.aguaML,
      meta_calorias: diario.metaCalorias,
      meta_proteinas: diario.metaProteinas,
      meta_carboidratos: diario.metaCarboidratos,
      meta_gorduras: diario.metaGorduras,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id,user_id' });

  if (error) throw error;
}

export async function deletarDiario(uid: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('dieta_diarios')
    .delete()
    .eq('id', id)
    .eq('user_id', uid);

  if (error) throw error;
}

// Metas do usuário
export async function carregarMetas(uid: string): Promise<MetasDieta | null> {
  try {
    const { data, error } = await supabase
      .from('dieta_metas')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();

    if (error) {
      console.error('[dietaService] Erro ao carregar metas:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      calorias: data.calorias,
      proteinas: data.proteinas,
      carboidratos: data.carboidratos,
      gorduras: data.gorduras,
      agua: data.agua,
    };
  } catch (err: any) {
    console.error('[dietaService] Exceção no carregarMetas:', err.message);
    return null;
  }
}

export async function salvarMetas(uid: string, metas: MetasDieta): Promise<void> {
  const { error } = await supabase
    .from('dieta_metas')
    .upsert({
      user_id: uid,
      calorias: metas.calorias,
      proteinas: metas.proteinas,
      carboidratos: metas.carboidratos,
      gorduras: metas.gorduras,
      agua: metas.agua,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) throw error;
}

// Perfil corporal do usuário
export async function carregarPerfil(uid: string): Promise<PerfilCorporal | null> {
  try {
    const { data, error } = await supabase
      .from('perfil_corporal')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();

    if (error) {
      console.error('[dietaService] Erro ao carregar perfil corporal:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      sexo: data.sexo,
      idade: data.idade,
      peso: data.peso,
      altura: data.altura,
      gorduraCorporal: data.gordura_corporal,
      nivelAtividade: data.nivel_atividade,
      fazMusculacao: data.faz_musculacao,
      musculacaoDias: data.musculacao_dias,
      musculacaoDuracao: data.musculacao_duracao,
      musculacaoIntensidade: data.musculacao_intensidade,
      fazCardio: data.faz_cardio,
      cardioDias: data.cardio_dias,
      cardioDuracao: data.cardio_duracao,
      cardioIntensidade: data.cardio_intensidade,
      objetivo: data.objetivo,
      metaSemanal: data.meta_semanal,
      proteinaGKg: data.proteina_g_kg,
      gorduraGKg: data.gordura_g_kg,
    };
  } catch (err: any) {
    console.error('[dietaService] Exceção no carregarPerfil:', err.message);
    return null;
  }
}

export async function salvarPerfil(uid: string, perfil: PerfilCorporal): Promise<void> {
  const { error } = await supabase
    .from('perfil_corporal')
    .upsert({
      user_id: uid,
      sexo: perfil.sexo,
      idade: perfil.idade,
      peso: perfil.peso,
      altura: perfil.altura,
      gordura_corporal: perfil.gorduraCorporal,
      nivel_atividade: perfil.nivelAtividade,
      faz_musculacao: perfil.fazMusculacao,
      musculacao_dias: perfil.musculacaoDias,
      musculacao_duracao: perfil.musculacaoDuracao,
      musculacao_intensidade: perfil.musculacaoIntensidade,
      faz_cardio: perfil.fazCardio,
      cardio_dias: perfil.cardioDias,
      cardio_duracao: perfil.cardioDuracao,
      cardio_intensidade: perfil.cardioIntensidade,
      objetivo: perfil.objetivo,
      meta_semanal: perfil.metaSemanal,
      proteina_g_kg: perfil.proteinaGKg,
      gordura_g_kg: perfil.gorduraGKg,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) throw error;
}

// Alimentos personalizados do usuário
export async function carregarAlimentosCustom(uid: string): Promise<Alimento[]> {
  const { data, error } = await supabase
    .from('alimentos_custom')
    .select('*')
    .eq('user_id', uid)
    .order('nome');

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    nome: row.nome,
    marca: row.marca,
    porcao: row.porcao,
    unidade: row.unidade,
    calorias: row.calorias,
    proteinas: row.proteinas,
    carboidratos: row.carboidratos,
    gorduras: row.gorduras,
    isCustom: row.is_custom,
  }));
}

export async function salvarAlimentoCustom(uid: string, alimento: Alimento): Promise<void> {
  const { error } = await supabase
    .from('alimentos_custom')
    .upsert({
      id: alimento.id,
      user_id: uid,
      nome: alimento.nome,
      marca: alimento.marca || null,
      porcao: alimento.porcao,
      unidade: alimento.unidade,
      calorias: alimento.calorias,
      proteinas: alimento.proteinas,
      carboidratos: alimento.carboidratos,
      gorduras: alimento.gorduras,
      is_custom: true,
    }, { onConflict: 'id,user_id' });

  if (error) throw error;
}

export async function deletarAlimentoCustom(uid: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('alimentos_custom')
    .delete()
    .eq('id', id)
    .eq('user_id', uid);

  if (error) throw error;
}

// Histórico de peso corporal
export interface RegistroPeso {
  id: string;
  data: string; // YYYY-MM-DD
  peso: number; // kg
}

export async function carregarPesoHistorico(uid: string): Promise<RegistroPeso[]> {
  const { data, error } = await supabase
    .from('peso_historico')
    .select('*')
    .eq('user_id', uid)
    .order('data', { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    data: row.data,
    peso: row.peso,
  }));
}

export async function salvarRegistroPeso(uid: string, registro: RegistroPeso): Promise<void> {
  const { error } = await supabase
    .from('peso_historico')
    .upsert({
      id: registro.id,
      user_id: uid,
      data: registro.data,
      peso: registro.peso,
    }, { onConflict: 'id,user_id' });

  if (error) throw error;
}

export async function deletarRegistroPeso(uid: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('peso_historico')
    .delete()
    .eq('id', id)
    .eq('user_id', uid);

  if (error) throw error;
}
