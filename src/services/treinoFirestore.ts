import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { SessaoTreino } from '../types/treino';

// Firestore não aceita undefined — JSON.parse/stringify remove automaticamente
function limpar<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function colecao(uid: string) {
  return collection(db, 'users', uid, 'sessoes');
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
