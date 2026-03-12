import { collection, doc, getDocs, setDoc, deleteDoc, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { Alimento, DiarioDieta, MetasDieta, PerfilCorporal } from '../types/dieta';

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

// Alimentos personalizados do usuário
function colAlimentosCustom(uid: string) {
  return collection(db, 'users', uid, 'alimentos-custom');
}

export async function carregarAlimentosCustom(uid: string): Promise<Alimento[]> {
  const q = query(colAlimentosCustom(uid), orderBy('nome'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Alimento);
}

export async function salvarAlimentoCustom(uid: string, alimento: Alimento): Promise<void> {
  await setDoc(doc(colAlimentosCustom(uid), alimento.id), limpar({ ...alimento, isCustom: true }));
}

export async function deletarAlimentoCustom(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(colAlimentosCustom(uid), id));
}

// Histórico de peso corporal
export interface RegistroPeso {
  id: string;
  data: string; // YYYY-MM-DD
  peso: number; // kg
}

function colPeso(uid: string) {
  return collection(db, 'users', uid, 'peso-historico');
}

export async function carregarPesoHistorico(uid: string): Promise<RegistroPeso[]> {
  const q = query(colPeso(uid), orderBy('data', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as RegistroPeso);
}

export async function salvarRegistroPeso(uid: string, registro: RegistroPeso): Promise<void> {
  await setDoc(doc(colPeso(uid), registro.id), limpar(registro));
}

export async function deletarRegistroPeso(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(colPeso(uid), id));
}
