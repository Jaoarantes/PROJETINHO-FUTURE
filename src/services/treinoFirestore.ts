import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { SessaoTreino, RegistroTreino } from '../types/treino';

// Firestore não aceita undefined — JSON.parse/stringify remove automaticamente
function limpar<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function colecao(uid: string) {
  return collection(db, 'users', uid, 'sessoes');
}

function colecaoHistorico(uid: string) {
  return collection(db, 'users', uid, 'historico');
}

function docTreinoAtivo(uid: string) {
  return doc(db, 'users', uid, 'config', 'treinoAtivo');
}

export async function carregarTreinoAtivo(uid: string): Promise<any | null> {
  const snap = await getDoc(docTreinoAtivo(uid));
  return snap.exists() ? snap.data() : null;
}

export async function salvarTreinoAtivo(uid: string, dados: any | null): Promise<void> {
  if (dados === null) {
    await deleteDoc(docTreinoAtivo(uid));
  } else {
    await setDoc(docTreinoAtivo(uid), limpar(dados));
  }
}

export async function carregarSessoes(uid: string): Promise<SessaoTreino[]> {
  const snap = await getDocs(colecao(uid));
  return snap.docs.map((d) => d.data() as SessaoTreino);
}

export async function salvarSessao(uid: string, sessao: SessaoTreino): Promise<void> {
  await setDoc(doc(colecao(uid), sessao.id), limpar(sessao));
}

export async function deletarSessao(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(colecao(uid), id));
}

export async function carregarHistorico(uid: string): Promise<RegistroTreino[]> {
  const q = query(colecaoHistorico(uid), orderBy('concluidoEm', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as RegistroTreino);
}

export async function salvarRegistro(uid: string, registro: RegistroTreino): Promise<void> {
  await setDoc(doc(colecaoHistorico(uid), registro.id), limpar(registro));
}

export async function deletarRegistro(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(colecaoHistorico(uid), id));
}
