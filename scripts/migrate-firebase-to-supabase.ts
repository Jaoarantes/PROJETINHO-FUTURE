/**
 * Script de Migração DIRETA: Firebase Firestore → Supabase
 *
 * Conecta ao Firebase usando service account e migra tudo automaticamente.
 * Mapeia usuários Firebase → Supabase pelo EMAIL.
 *
 * COMO USAR:
 *   npx tsx scripts/migrate-firebase-to-supabase.ts
 *
 * Pré-requisitos:
 *   - firebase-service-account.json na raiz do projeto
 *   - .env com VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY
 *   - Usuários já criados no Supabase (pelo menos logados 1x)
 */

import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega .env da raiz do projeto
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ── Supabase ──
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Faltam VITE_SUPABASE_URL ou SUPABASE_SERVICE_KEY no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Firebase ──
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('firebase-service-account.json não encontrado na raiz do projeto');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();

// ── Helpers ──
async function getCollection(collectionPath: string): Promise<admin.firestore.DocumentData[]> {
  const snapshot = await firestore.collection(collectionPath).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getDoc(docPath: string): Promise<admin.firestore.DocumentData | null> {
  const doc = await firestore.doc(docPath).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

// Busca o UID do Supabase pelo email (usando a service key que tem acesso admin)
async function getSupabaseUidByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Erro ao listar usuarios Supabase:', error.message);
    return null;
  }
  const user = data.users.find((u) => u.email === email);
  return user?.id || null;
}

// ── Migração por usuário ──
async function migrateUser(firebaseUid: string, supabaseUid: string) {
  console.log(`\n--- Migrando dados do Firebase UID: ${firebaseUid} → Supabase UID: ${supabaseUid} ---`);

  let migrated = 0;
  let errors = 0;

  // 1. Sessões
  try {
    const sessoes = await getCollection(`users/${firebaseUid}/sessoes`);
    for (const s of sessoes) {
      const { error } = await supabase.from('sessoes').upsert({
        id: s.id,
        user_id: supabaseUid,
        nome: s.nome,
        tipo: s.tipo || 'musculacao',
        dia_semana: s.diaSemana || null,
        exercicios: s.exercicios || [],
        corrida: s.corrida || null,
        natacao: s.natacao || null,
        criado_em: s.criadoEm || new Date().toISOString(),
        posicao: s.posicao ?? null,
      }, { onConflict: 'id' });
      if (error) { console.error(`  Erro sessão ${s.id}:`, error.message); errors++; }
      else migrated++;
    }
    console.log(`  Sessões: ${sessoes.length} encontradas, ${migrated} migradas`);
  } catch (err: any) {
    console.error('  Erro ao carregar sessões:', err.message);
  }

  // 2. Histórico
  try {
    migrated = 0;
    const historico = await getCollection(`users/${firebaseUid}/historico`);
    for (const h of historico) {
      const { error } = await supabase.from('historico').upsert({
        id: h.id,
        user_id: supabaseUid,
        sessao_id: h.sessaoId,
        nome: h.nome,
        tipo: h.tipo || 'musculacao',
        exercicios: h.exercicios || [],
        corrida: h.corrida || null,
        natacao: h.natacao || null,
        concluido_em: h.concluidoEm,
        duracao_total_segundos: h.duracaoTotalSegundos || null,
        xp_earned: h.xpEarned || 0,
        strava_data: h.stravaData || null,
      }, { onConflict: 'id' });
      if (error) { console.error(`  Erro histórico ${h.id}:`, error.message); errors++; }
      else migrated++;
    }
    console.log(`  Histórico: ${historico.length} encontrados, ${migrated} migrados`);
  } catch (err: any) {
    console.error('  Erro ao carregar histórico:', err.message);
  }

  // 3. Treino Ativo
  try {
    const treinoAtivo = await getDoc(`users/${firebaseUid}/config/treinoAtivo`);
    if (treinoAtivo && treinoAtivo.sessaoId) {
      const { error } = await supabase.from('treino_ativo').upsert({
        user_id: supabaseUid,
        sessao_id: treinoAtivo.sessaoId,
        iniciado_em: treinoAtivo.iniciadoEm,
        pausado_em: treinoAtivo.pausadoEm || null,
        tempo_pausado_total: treinoAtivo.tempoPausadoTotal || 0,
        distance_km: treinoAtivo.distanceKm || 0,
        coordinates: treinoAtivo.coordinates || [],
      }, { onConflict: 'user_id' });
      if (error) console.error('  Erro treino ativo:', error.message);
      else console.log('  Treino ativo migrado');
    }
  } catch (err: any) {
    console.error('  Erro ao carregar treino ativo:', err.message);
  }

  // 4. Exercícios Custom
  try {
    migrated = 0;
    const exercicios = await getCollection(`users/${firebaseUid}/exercicios-custom`);
    for (const e of exercicios) {
      const { error } = await supabase.from('exercicios_custom').upsert({
        id: typeof e.id === 'string' ? parseInt(e.id) || Date.now() : e.id,
        user_id: supabaseUid,
        nome: e.nome,
        grupo_muscular: e.grupoMuscular,
        musculos_secundarios: e.musculosSecundarios || null,
        descricao: e.descricao || null,
        equipamento: e.equipamento || null,
        gif_url: e.gifUrl || null,
        is_custom: true,
      }, { onConflict: 'id' });
      if (error) { console.error(`  Erro exercício ${e.id}:`, error.message); errors++; }
      else migrated++;
    }
    console.log(`  Exercícios custom: ${exercicios.length} encontrados, ${migrated} migrados`);
  } catch (err: any) {
    console.error('  Erro ao carregar exercícios custom:', err.message);
  }

  // 5. Diários de Dieta
  try {
    migrated = 0;
    const diarios = await getCollection(`users/${firebaseUid}/dieta-diarios`);
    for (const d of diarios) {
      const { error } = await supabase.from('dieta_diarios').upsert({
        id: d.id,
        user_id: supabaseUid,
        data: d.data,
        refeicoes: d.refeicoes || [],
        agua_ml: d.aguaML || 0,
        meta_calorias: d.metaCalorias,
        meta_proteinas: d.metaProteinas,
        meta_carboidratos: d.metaCarboidratos,
        meta_gorduras: d.metaGorduras,
      }, { onConflict: 'id,user_id' });
      if (error) { console.error(`  Erro diário ${d.id}:`, error.message); errors++; }
      else migrated++;
    }
    console.log(`  Diários de dieta: ${diarios.length} encontrados, ${migrated} migrados`);
  } catch (err: any) {
    console.error('  Erro ao carregar diários:', err.message);
  }

  // 6. Metas de Dieta
  try {
    const metas = await getDoc(`users/${firebaseUid}/dieta-config/metas`);
    if (metas) {
      const { error } = await supabase.from('dieta_metas').upsert({
        user_id: supabaseUid,
        calorias: metas.calorias,
        proteinas: metas.proteinas,
        carboidratos: metas.carboidratos,
        gorduras: metas.gorduras,
        agua: metas.agua,
      }, { onConflict: 'user_id' });
      if (error) console.error('  Erro metas:', error.message);
      else console.log('  Metas de dieta migradas');
    }
  } catch (err: any) {
    console.error('  Erro ao carregar metas:', err.message);
  }

  // 7. Perfil Corporal
  try {
    const perfil = await getDoc(`users/${firebaseUid}/dieta-config/perfil`);
    if (perfil) {
      const { error } = await supabase.from('perfil_corporal').upsert({
        user_id: supabaseUid,
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
      }, { onConflict: 'user_id' });
      if (error) console.error('  Erro perfil corporal:', error.message);
      else console.log('  Perfil corporal migrado');
    }
  } catch (err: any) {
    console.error('  Erro ao carregar perfil corporal:', err.message);
  }

  // 8. Alimentos Custom
  try {
    migrated = 0;
    const alimentos = await getCollection(`users/${firebaseUid}/alimentos-custom`);
    for (const a of alimentos) {
      const { error } = await supabase.from('alimentos_custom').upsert({
        id: a.id,
        user_id: supabaseUid,
        nome: a.nome,
        marca: a.marca || null,
        porcao: a.porcao,
        unidade: a.unidade,
        calorias: a.calorias,
        proteinas: a.proteinas,
        carboidratos: a.carboidratos,
        gorduras: a.gorduras,
        is_custom: true,
      }, { onConflict: 'id,user_id' });
      if (error) { console.error(`  Erro alimento ${a.id}:`, error.message); errors++; }
      else migrated++;
    }
    console.log(`  Alimentos custom: ${alimentos.length} encontrados, ${migrated} migrados`);
  } catch (err: any) {
    console.error('  Erro ao carregar alimentos custom:', err.message);
  }

  // 9. Peso Histórico
  try {
    migrated = 0;
    const pesos = await getCollection(`users/${firebaseUid}/peso-historico`);
    for (const p of pesos) {
      const { error } = await supabase.from('peso_historico').upsert({
        id: p.id,
        user_id: supabaseUid,
        data: p.data,
        peso: p.peso,
      }, { onConflict: 'id,user_id' });
      if (error) { console.error(`  Erro peso ${p.id}:`, error.message); errors++; }
      else migrated++;
    }
    console.log(`  Peso histórico: ${pesos.length} encontrados, ${migrated} migrados`);
  } catch (err: any) {
    console.error('  Erro ao carregar peso histórico:', err.message);
  }

  // 10. Strava Auth
  try {
    const strava = await getDoc(`users/${firebaseUid}/integracoes/strava`);
    if (strava) {
      const { error } = await supabase.from('strava_auth').upsert({
        user_id: supabaseUid,
        access_token: strava.accessToken,
        refresh_token: strava.refreshToken,
        expires_at: strava.expiresAt,
        athlete_id: strava.athleteId || null,
      }, { onConflict: 'user_id' });
      if (error) console.error('  Erro strava:', error.message);
      else console.log('  Strava auth migrado');
    }
  } catch (err: any) {
    console.error('  Erro ao carregar strava:', err.message);
  }

  if (errors > 0) {
    console.log(`\n  AVISO: ${errors} erros durante a migração deste usuário`);
  }
}

// ── Main ──
async function main() {
  console.log('=== Migração Firebase → Supabase (Conexão Direta) ===\n');

  // 1. Listar todos os usuários do Firebase Firestore
  const usersSnapshot = await firestore.collection('users').get();
  const firebaseUsers: { uid: string; email?: string }[] = [];

  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    firebaseUsers.push({ uid: doc.id, email: data.email });
  }

  console.log(`Encontrados ${firebaseUsers.length} usuários no Firebase.\n`);

  // 2. Buscar usuários do Supabase para mapear por email
  const { data: supabaseUsersData, error: supabaseError } = await supabase.auth.admin.listUsers();
  if (supabaseError) {
    console.error('Erro ao listar usuarios Supabase:', supabaseError.message);
    process.exit(1);
  }

  const supabaseUsers = supabaseUsersData.users;
  console.log(`Encontrados ${supabaseUsers.length} usuários no Supabase.\n`);

  // 3. Mapear e migrar
  let migrated = 0;
  let skipped = 0;

  for (const fbUser of firebaseUsers) {
    if (!fbUser.email) {
      console.log(`Pulando ${fbUser.uid} - sem email`);
      skipped++;
      continue;
    }

    const supabaseUser = supabaseUsers.find(
      (su) => su.email?.toLowerCase() === fbUser.email?.toLowerCase()
    );

    if (!supabaseUser) {
      console.log(`Pulando ${fbUser.uid} (${fbUser.email}) - usuário não encontrado no Supabase`);
      console.log(`  → Este usuário precisa fazer login no Supabase primeiro (com o mesmo email)`);
      skipped++;
      continue;
    }

    await migrateUser(fbUser.uid, supabaseUser.id);
    migrated++;
  }

  console.log('\n=== Migração Concluída ===');
  console.log(`  Migrados: ${migrated}`);
  console.log(`  Pulados: ${skipped}`);

  if (skipped > 0) {
    console.log('\nPara migrar os usuários pulados:');
    console.log('  1. Peça para eles fazerem login no app (com o mesmo email do Firebase)');
    console.log('  2. Rode este script novamente');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
