import { supabase } from '../supabase';
import type { StravaAuthData } from '../types/strava';

export async function carregarStravaAuth(uid: string): Promise<StravaAuthData | null> {
  const { data, error } = await supabase
    .from('strava_auth')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle();

  if (error || !data) return null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athleteId: data.athlete_id,
  };
}

export async function salvarStravaAuth(uid: string, authData: StravaAuthData): Promise<void> {
  const { error } = await supabase
    .from('strava_auth')
    .upsert({
      user_id: uid,
      access_token: authData.accessToken,
      refresh_token: authData.refreshToken,
      expires_at: authData.expiresAt,
      athlete_id: authData.athleteId || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) throw error;
}

export async function desconectarStrava(uid: string): Promise<void> {
  const { error } = await supabase
    .from('strava_auth')
    .delete()
    .eq('user_id', uid);

  if (error) throw error;
}
