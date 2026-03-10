import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { DiarioDieta, MetasDieta, PerfilCorporal } from '../types/dieta';

function limpar<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function colDiarios(uid: string) {
  return collection(db, 'users', uid, 'dieta-diarios');
}

export async function carregarDiarios(uid: string): Promise<DiarioDieta[]> {
  const snap = await getDocs(colDiarios(uid));
  return snap.docs.map((d) => d.data() as DiarioDieta);
}

export async function salvarDiario(uid: string, diario: DiarioDieta): Promise<void> {
  await setDoc(doc(colDiarios(uid), diario.id), limpar(diario));
}

export async function deletarDiario(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(colDiarios(uid), id));
}

// Metas do usuário
export async function carregarMetas(uid: string): Promise<MetasDieta | null> {
  const snap = await getDocs(collection(db, 'users', uid, 'dieta-config'));
  const metasDoc = snap.docs.find((d) => d.id === 'metas');
  return metasDoc ? (metasDoc.data() as MetasDieta) : null;
}

export async function salvarMetas(uid: string, metas: MetasDieta): Promise<void> {
  await setDoc(doc(collection(db, 'users', uid, 'dieta-config'), 'metas'), limpar(metas));
}

// Perfil corporal do usuário
export async function carregarPerfil(uid: string): Promise<PerfilCorporal | null> {
  const snap = await getDocs(collection(db, 'users', uid, 'dieta-config'));
  const perfilDoc = snap.docs.find((d) => d.id === 'perfil');
  return perfilDoc ? (perfilDoc.data() as PerfilCorporal) : null;
}

export async function salvarPerfil(uid: string, perfil: PerfilCorporal): Promise<void> {
  await setDoc(doc(collection(db, 'users', uid, 'dieta-config'), 'perfil'), limpar(perfil));
}
