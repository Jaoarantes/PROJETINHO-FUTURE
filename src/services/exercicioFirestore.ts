import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Exercicio } from '../types/treino';

function colecao(uid: string) {
  return collection(db, 'users', uid, 'exercicios-custom');
}

export async function carregarExerciciosCustom(uid: string): Promise<Exercicio[]> {
  const snap = await getDocs(colecao(uid));
  return snap.docs.map((d) => d.data() as Exercicio);
}

export async function salvarExercicioCustom(uid: string, exercicio: Exercicio): Promise<void> {
  await setDoc(doc(colecao(uid), String(exercicio.id)), JSON.parse(JSON.stringify(exercicio)));
}

export async function deletarExercicioCustom(uid: string, id: number): Promise<void> {
  await deleteDoc(doc(colecao(uid), String(id)));
}
