import { supabase } from '../supabase';
import type { Alimento, DiarioDieta, MetasDieta, PerfilCorporal, Refeicao } from '../types/dieta';

interface DiarioDietaRow {
  id: string;
  data: string;
  refeicoes: Refeicao[] | null;
  agua_ml: number | null;
  meta_calorias: number | null;
  meta_proteinas: number | null;
  meta_carboidratos: number | null;
  meta_gorduras: number | null;
}

interface DietaMetasRow {
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  agua: number;
}

interface PerfilCorporalRow {
  sexo: PerfilCorporal['sexo'];
  idade: number;
  peso: number;
  altura: number;
  gordura_corporal: number | undefined;
  nivel_atividade: PerfilCorporal['nivelAtividade'];
  faz_musculacao: boolean;
  musculacao_dias: number;
  musculacao_duracao: number;
  musculacao_intensidade: PerfilCorporal['musculacaoIntensidade'];
  faz_cardio: boolean;
  cardio_dias: number;
  cardio_duracao: number;
  cardio_intensidade: PerfilCorporal['cardioIntensidade'];
  objetivo: PerfilCorporal['objetivo'];
  meta_semanal: number;
  proteina_g_kg: number;
  gordura_g_kg: number;
}

interface AlimentoCustomRow {
  id: string;
  nome: string;
  marca: string | undefined;
  porcao: number;
  unidade: string;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  is_custom: boolean;
}

interface RegistroPesoRow {
  id: string;
  data: string;
  peso: number;
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

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


    return ((data || []) as DiarioDietaRow[]).map((row) => ({
      id: row.id,
      data: row.data,
      refeicoes: row.refeicoes || [],
      aguaML: row.agua_ml ?? 0,
      metaCalorias: row.meta_calorias ?? 0,
      metaProteinas: row.meta_proteinas ?? 0,
      metaCarboidratos: row.meta_carboidratos ?? 0,
      metaGorduras: row.meta_gorduras ?? 0,
    }));
  } catch (err: unknown) {
    console.error('[dietaService] Exceção no carregarDiarios:', errorMessage(err));
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
    const row = data as DietaMetasRow;

    return {
      calorias: row.calorias,
      proteinas: row.proteinas,
      carboidratos: row.carboidratos,
      gorduras: row.gorduras,
      agua: row.agua,
    };
  } catch (err: unknown) {
    console.error('[dietaService] Exceção no carregarMetas:', errorMessage(err));
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
    const row = data as PerfilCorporalRow;

    return {
      sexo: row.sexo,
      idade: row.idade,
      peso: row.peso,
      altura: row.altura,
      gorduraCorporal: row.gordura_corporal,
      nivelAtividade: row.nivel_atividade,
      fazMusculacao: row.faz_musculacao,
      musculacaoDias: row.musculacao_dias,
      musculacaoDuracao: row.musculacao_duracao,
      musculacaoIntensidade: row.musculacao_intensidade,
      fazCardio: row.faz_cardio,
      cardioDias: row.cardio_dias,
      cardioDuracao: row.cardio_duracao,
      cardioIntensidade: row.cardio_intensidade,
      objetivo: row.objetivo,
      metaSemanal: row.meta_semanal,
      proteinaGKg: row.proteina_g_kg,
      gorduraGKg: row.gordura_g_kg,
    };
  } catch (err: unknown) {
    console.error('[dietaService] Exceção no carregarPerfil:', errorMessage(err));
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

  return ((data || []) as AlimentoCustomRow[]).map((row) => ({
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

  return ((data || []) as RegistroPesoRow[]).map((row) => ({
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
