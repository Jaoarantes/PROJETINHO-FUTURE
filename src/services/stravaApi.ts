import type { StravaTokenResponse, StravaActivity } from '../types/strava';
import { supabase } from '../supabase';

const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID || '';
const REDIRECT_URI = `${window.location.origin}/strava/callback`;

export const STRAVA_AUTH_URL = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&approval_prompt=force&scope=activity:read_all,activity:write`;

export async function authenticateStrava(code: string): Promise<StravaTokenResponse> {
    const { data, error } = await supabase.functions.invoke('strava-token', {
        body: { code, grant_type: 'authorization_code' },
    });

    if (error) throw new Error('Falha na autenticação do Strava');
    if (data?.error) throw new Error(data.error);
    return data as StravaTokenResponse;
}

export async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse> {
    const { data, error } = await supabase.functions.invoke('strava-token', {
        body: { refresh_token: refreshToken, grant_type: 'refresh_token' },
    });

    if (error) throw new Error('Falha ao atualizar o token do Strava');
    if (data?.error) throw new Error(data.error);
    return data as StravaTokenResponse;
}

export async function getStravaActivities(accessToken: string, perPage = 30, page = 1): Promise<StravaActivity[]> {
    const response = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!response.ok) throw new Error('Falha ao buscar atividades no Strava');
    return response.json();
}

export async function getAllStravaActivities(accessToken: string): Promise<StravaActivity[]> {
    const todas: StravaActivity[] = [];
    let page = 1;
    while (true) {
        const pagina = await getStravaActivities(accessToken, 100, page);
        if (pagina.length === 0) break;
        todas.push(...pagina);
        if (pagina.length < 100) break;
        page++;
    }
    return todas;
}

export async function getStravaActivityDetail(accessToken: string, activityId: number): Promise<StravaActivity> {
    const response = await fetch(`https://www.strava.com/api/v3/activities/${activityId}?include_all_efforts=true`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) throw new Error('Falha ao buscar detalhes da atividade no Strava');
    return response.json();
}

export async function createStravaActivity(
    accessToken: string,
    nome: string,
    tipo: string,
    dataInicio: string,
    duracaoSegundos: number,
    distanciaMetros?: number,
    descricao?: string
) {
    const body: Record<string, string | number> = {
        name: nome,
        sport_type: tipo,
        start_date_local: dataInicio,
        elapsed_time: duracaoSegundos,
    };

    if (distanciaMetros) body.distance = distanciaMetros;
    if (descricao) body.description = descricao;

    const response = await fetch('https://www.strava.com/api/v3/activities', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error('Falha ao exportar o treino para o Strava');
    return response.json();
}
