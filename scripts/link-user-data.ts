import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vzhakvrtaomskuhbthom.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_KEY não encontrada no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const OLD_UID = 'plqWhERkrcPO3kGq0MUgts0DQa33';
const NEW_UUID = '018a6dcb-fc4a-4d30-89f2-0c08d15c736f';

async function linkData() {
  console.log(`Vinculando dados de ${OLD_UID} para ${NEW_UUID}...`);

  // 1. Deletar o perfil vazio criado pelo trigger do Supabase no signup
  const { error: delError } = await supabase.from('profiles').delete().eq('id', NEW_UUID);
  if (delError) console.error('Erro ao deletar perfil novo:', delError.message);

  // 2. Atualizar o ID do Perfil migrado
  const { error: profError } = await supabase.from('profiles').update({ id: NEW_UUID }).eq('id', OLD_UID);
  if (profError) console.error('Erro ao atualizar ID do perfil:', profError.message);
  else console.log('✓ Perfil vinculado');

  // 3. Tabelas com a coluna user_id
  const tables = [
    'sessoes', 'historico', 'treino_ativo', 'exercicios_custom',
    'dieta_diarios', 'dieta_metas', 'perfil_corporal',
    'alimentos_custom', 'peso_historico', 'strava_auth'
  ];

  for (const table of tables) {
    const { error, count } = await supabase.from(table).update({ user_id: NEW_UUID }).eq('user_id', OLD_UID);
    if (error) console.error(`Erro na tabela ${table}:`, error.message);
    else console.log(`✓ Tabela ${table} atualizada`);
  }

  console.log('\n=== Vinculação de dados completada! ===');
}

linkData();
