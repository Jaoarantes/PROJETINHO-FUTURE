import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { getUserProfile, saveUserProfile, type UserProfile } from '../services/userService';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileLoaded = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadProfile(u);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);

      if (u && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        loadProfile(u);
      } else if (!u) {
        setProfile(null);
        profileLoaded.current = null;
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(u: User) {
    if (profileLoaded.current === u.id) return;
    profileLoaded.current = u.id;

    const cached = localStorage.getItem(`valere_profile_${u.id}`);
    if (cached) {
      setProfile(JSON.parse(cached));
      setLoading(false);
    }

    try {
      let p = await getUserProfile(u.id);

      if (!p) {
        try {
          await saveUserProfile(u.id, {
            displayName: u.user_metadata?.display_name || u.user_metadata?.full_name || null,
            photoURL: u.user_metadata?.avatar_url || null,
            email: u.email || null,
          });
          p = await getUserProfile(u.id);
        } catch { /* trigger pode ter criado */ }
      }

      if (!p) {
        p = {
          uid: u.id,
          displayName: u.user_metadata?.display_name || u.user_metadata?.full_name || null,
          username: null,
          photoURL: u.user_metadata?.avatar_url || null,
          email: u.email || null,
          isPrivate: false,
          updatedAt: new Date().toISOString(),
        };
      }

      setProfile(p);
      localStorage.setItem(`valere_profile_${u.id}`, JSON.stringify(p));
    } catch (err) {
      console.error('[useAuth] Erro ao carregar perfil:', err);
      if (!cached) {
        const fallback: UserProfile = {
          uid: u.id,
          displayName: u.user_metadata?.display_name || u.user_metadata?.full_name || null,
          username: null,
          photoURL: u.user_metadata?.avatar_url || null,
          email: u.email || null,
          isPrivate: false,
          updatedAt: new Date().toISOString(),
        };
        setProfile(fallback);
      }
    }
    setLoading(false);
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: nome } },
    });
    if (error) throw error;

    if (data.user && data.session) {
      try {
        await saveUserProfile(data.user.id, { displayName: nome, email, photoURL: null });
      } catch { /* trigger */ }
      return data;
    }

    if (data.user && !data.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInError && signInData.session) {
        try {
          await saveUserProfile(signInData.user.id, { displayName: nome, email, photoURL: null });
        } catch { /* trigger */ }
        return signInData;
      }
      throw new Error('email_not_confirmed');
    }

    return data;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    // Limpar dados locais do perfil
    if (user?.id) {
      localStorage.removeItem(`valere_profile_${user.id}`);
    }
    profileLoaded.current = null;
    setProfile(null);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshUser = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      setUser(currentUser);
      profileLoaded.current = null;
      await loadProfile(currentUser);
    }
  };

  return { user, profile, loading, signIn, signInWithGoogle, signUp, signOut, resetPassword, refreshUser };
}
