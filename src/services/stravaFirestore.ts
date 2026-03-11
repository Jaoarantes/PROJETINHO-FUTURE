import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { StravaAuthData } from '../types/strava';

function stravaDoc(uid: string) {
    return doc(db, 'users', uid, 'integracoes', 'strava');
}

export async function carregarStravaAuth(uid: string): Promise<StravaAuthData | null> {
    const snap = await getDoc(stravaDoc(uid));
    if (snap.exists()) {
        return snap.data() as StravaAuthData;
    }
    return null;
}

export async function salvarStravaAuth(uid: string, authData: StravaAuthData): Promise<void> {
    await setDoc(stravaDoc(uid), authData);
}

export async function desconectarStrava(uid: string): Promise<void> {
    await deleteDoc(stravaDoc(uid));
}
