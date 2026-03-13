import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { storage, auth, db } from '../firebase';

export interface UserProfile {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
    email: string | null;
    updatedAt: string;
}

/**
 * Fetches the user profile from Firestore.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
    }
    return null;
}

/**
 * Saves or updates the user profile in Firestore.
 */
export async function saveUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    await setDoc(doc(db, 'users', uid), {
        ...data,
        uid,
        updatedAt: new Date().toISOString()
    }, { merge: true });
}

/**
 * Uploads a profile picture to Firebase Storage and updates both Auth and Firestore profiles.
 */
export async function uploadProfilePicture(userId: string, file: File): Promise<string> {
    const user = auth.currentUser;
    if (!user || user.uid !== userId) {
        throw new Error('Usuário não autenticado ou ID incorreto.');
    }

    try {
        console.log('[UserService] Iniciando upload para:', userId);
        const fileExt = file.name.split('.').pop() || 'jpg';
        const filePath = `profiles/${userId}/avatar_${Date.now()}.${fileExt}`;
        const storageRef = ref(storage, filePath);

        // Upload
        await uploadBytes(storageRef, file);

        // Get URL
        const photoURL = await getDownloadURL(storageRef);
        console.log('[UserService] URL obtida:', photoURL);

        // Update Auth Profile
        await updateProfile(user, { photoURL });

        // Update Firestore Profile (Reliable source of truth)
        await saveUserProfile(userId, { photoURL });

        // Reload user to sync local Auth object
        await user.reload();

        return photoURL;
    } catch (error) {
        console.error('[UserService] Erro no uploadProfilePicture:', error);
        throw error;
    }
}
/**
 * Removes the profile picture from both Auth and Firestore.
 */
export async function removeProfilePicture(userId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user || user.uid !== userId) {
        throw new Error('Usuário não autenticado.');
    }

    try {
        // Update Auth
        await updateProfile(user, { photoURL: null });

        // Update Firestore
        await saveUserProfile(userId, { photoURL: null });

        // Reload user
        await user.reload();
    } catch (error) {
        console.error('[UserService] Erro ao remover foto:', error);
        throw error;
    }
}
