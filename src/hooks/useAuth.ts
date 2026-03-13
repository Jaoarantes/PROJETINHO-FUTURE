import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase';
import { getUserProfile, saveUserProfile, type UserProfile } from '../services/userService';

const googleProvider = new GoogleAuthProvider();

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load account-specific cache as soon as UID is known
  useEffect(() => {
    if (user?.uid) {
      const cached = localStorage.getItem(`valere_profile_${user.uid}`);
      if (cached) {
        setProfile(JSON.parse(cached));
      }
    }
  }, [user?.uid]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        setLoading(true);
        try {
          // Carregar perfil do Firestore
          let p = await getUserProfile(user.uid);

          // Se não existir, criar um inicial baseado no Auth
          if (!p) {
            await saveUserProfile(user.uid, {
              displayName: user.displayName,
              photoURL: user.photoURL,
              email: user.email
            });
            p = await getUserProfile(user.uid);
          }

          if (p) {
            setProfile(p);
            // Persistent per-account local memory
            localStorage.setItem(`valere_profile_${user.uid}`, JSON.stringify(p));
          }
        } catch (err) {
          console.error('[useAuth] Erro ao carregar perfil:', err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // Instant cache hydration on login
    const cached = localStorage.getItem(`valere_profile_${cred.user.uid}`);
    if (cached) setProfile(JSON.parse(cached));
    return cred;
  };

  const signInWithGoogle = async () => {
    return signInWithPopup(auth, googleProvider);
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: nome });

    // Salvar no Firestore imediatamente
    const initialProfile = {
      displayName: nome,
      email: email,
      photoURL: null
    };
    await saveUserProfile(credential.user.uid, initialProfile);

    return credential;
  };

  const resetPassword = async (email: string) => {
    return sendPasswordResetEmail(auth, email);
  };

  const signOut = async () => {
    return firebaseSignOut(auth);
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser });
      const p = await getUserProfile(auth.currentUser.uid);
      if (p) {
        setProfile(p);
        localStorage.setItem(`valere_profile_${auth.currentUser.uid}`, JSON.stringify(p));
      }
    }
  };

  return { user, profile, loading, signIn, signInWithGoogle, signUp, signOut, resetPassword, refreshUser };
}
