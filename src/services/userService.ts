import { supabase } from '../supabase';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  username: string | null;
  photoURL: string | null;
  email: string | null;
  isPrivate: boolean;
  updatedAt: string;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (error) {
    console.error('[userService] Erro ao buscar perfil:', error.message);
    return null;
  }
  if (!data) return null;

  return {
    uid: data.id,
    displayName: data.display_name,
    username: data.username || null,
    photoURL: data.photo_url,
    email: data.email,
    isPrivate: data.is_private || false,
    updatedAt: data.updated_at,
  };
}

export async function saveUserProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: uid,
      display_name: profile.displayName,
      photo_url: profile.photoURL,
      email: profile.email,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) {
    console.error('[userService] Erro ao salvar perfil:', error.message);
    throw error;
  }
}

export async function uploadProfilePicture(userId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const filePath = `${userId}/avatar.${fileExt}`;

  // Remove avatar antigo (ignora erro se nao existe)
  await supabase.storage.from('avatars').remove([filePath]).catch(() => {});

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  // Adiciona timestamp para evitar cache do navegador
  const urlWithCache = `${publicUrl}?t=${Date.now()}`;

  // Salva no auth metadata E no profile
  await supabase.auth.updateUser({ data: { avatar_url: urlWithCache } });
  await saveUserProfile(userId, { photoURL: urlWithCache });

  return urlWithCache;
}

export async function removeProfilePicture(userId: string): Promise<void> {
  await supabase.auth.updateUser({ data: { avatar_url: null } });
  await saveUserProfile(userId, { photoURL: null });
}

export interface SearchUserResult {
  id: string;
  displayName: string | null;
  username: string | null;
  photoURL: string | null;
  isPrivate: boolean;
}

export async function searchUsers(query: string, currentUserId: string): Promise<SearchUserResult[]> {
  if (!query.trim()) return [];
  const q = query.trim();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, username, photo_url, is_private')
    .not('username', 'is', null)
    .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
    .neq('id', currentUserId)
    .limit(20);
  if (error || !data) return [];
  return data.map((p: any) => ({
    id: p.id,
    displayName: p.display_name,
    username: p.username || null,
    photoURL: p.photo_url,
    isPrivate: p.is_private || false,
  }));
}

export async function checkUsernameAvailable(username: string, currentUserId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .neq('id', currentUserId)
    .maybeSingle();
  if (error) return false;
  return !data;
}

export async function saveUsername(userId: string, username: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ username, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

export async function togglePrivateProfile(userId: string, isPrivate: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_private: isPrivate, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}
