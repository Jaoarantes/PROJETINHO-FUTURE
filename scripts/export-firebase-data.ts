import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Você precisa baixar o arquivo de chave do Firebase:
// Firebase Console -> Configurações do Projeto -> Contas de Serviço -> Gerar nova chave privada
// Salve como 'firebase-service-account.json' na raiz do projeto.
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('\n[ERRO] Arquivo firebase-service-account.json não encontrado na raiz do projeto.');
  console.log('Por favor, baixe a chave do Firebase Console e salve-a como "firebase-service-account.json".\n');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const EXPORT_DIR = path.join(__dirname, 'firebase-export');

async function exportCollection(collectionPath: string, outputDir: string) {
  console.log(`Exportando coleção: ${collectionPath}`);
  const snapshot = await db.collection(collectionPath).get();
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const doc of snapshot.docs) {
    const data = doc.data();
    fs.writeFileSync(
      path.join(outputDir, `${doc.id}.json`),
      JSON.stringify({ id: doc.id, ...data }, null, 2)
    );
    
    // Exportar subcoleções conhecidas
    if (collectionPath === 'users') {
      const subCollections = [
        'sessoes', 'historico', 'exercicios-custom', 
        'dieta-diarios', 'alimentos-custom', 'peso-historico'
      ];
      
      for (const sub of subCollections) {
        await exportCollection(`users/${doc.id}/${sub}`, path.join(outputDir, doc.id, sub));
      }
      
      // Casos especiais (documentos únicos em pastas)
      const configDir = path.join(outputDir, doc.id, 'config');
      if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
      const treinoAtivo = await db.doc(`users/${doc.id}/config/treinoAtivo`).get();
      if (treinoAtivo.exists) {
        fs.writeFileSync(path.join(configDir, 'treinoAtivo.json'), JSON.stringify(treinoAtivo.data(), null, 2));
      }
      
      const dietaConfigDir = path.join(outputDir, doc.id, 'dieta-config');
      if (!fs.existsSync(dietaConfigDir)) fs.mkdirSync(dietaConfigDir, { recursive: true });
      const metas = await db.doc(`users/${doc.id}/dieta-config/metas`).get();
      if (metas.exists) {
        fs.writeFileSync(path.join(dietaConfigDir, 'metas.json'), JSON.stringify(metas.data(), null, 2));
      }
      const perfil = await db.doc(`users/${doc.id}/dieta-config/perfil`).get();
      if (perfil.exists) {
        fs.writeFileSync(path.join(dietaConfigDir, 'perfil.json'), JSON.stringify(perfil.data(), null, 2));
      }

      const integracoesDir = path.join(outputDir, doc.id, 'integracoes');
      if (!fs.existsSync(integracoesDir)) fs.mkdirSync(integracoesDir, { recursive: true });
      const strava = await db.doc(`users/${doc.id}/integracoes/strava`).get();
      if (strava.exists) {
        fs.writeFileSync(path.join(integracoesDir, 'strava.json'), JSON.stringify(strava.data(), null, 2));
      }
    }
  }
}

async function main() {
  console.log('=== Iniciando Exportação do Firebase Firestore ===\n');
  
  if (fs.existsSync(EXPORT_DIR)) {
    fs.rmSync(EXPORT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(EXPORT_DIR);

  try {
    // Exportar todos os usuários (raiz)
    await exportCollection('users', path.join(EXPORT_DIR, 'users'));
    
    console.log('\n=== Exportação concluída com sucesso! ===');
    console.log(`Os arquivos foram salvos em: ${EXPORT_DIR}`);
  } catch (error) {
    console.error('\n[ERRO] Falha na exportação:', error);
  }
}

main();
