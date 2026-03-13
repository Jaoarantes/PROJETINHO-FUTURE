import type { StravaTokenResponse, StravaActivity } from '../types/strava';

// Substitua no Firebase enviroment ou vite env
const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID || '';
const CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET || '';
// Ex: http://localhost:5173/strava/callback
const REDIRECT_URI = `${window.location.origin}/strava/callback`;

export const STRAVA_AUTH_URL = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&approval_prompt=force&scope=activity:read_all,activity:write`;

/**
 * Troca o código de autorização pelo Access Token
 */
export async function authenticateStrava(code: string): Promise<StravaTokenResponse> {
    const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
        }),
    });

    if (!response.ok) {
        throw new Error('Falha na autenticação do Strava');
    }

    return response.json();
}

/**
 * Atualiza o Access Token usando o Refresh Token
 */
export async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse> {
    const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    });

    if (!response.ok) {
        throw new Error('Falha ao atualizar o token do Strava');
    }

    return response.json();
}

/**
 * Busca os treinos recentes do Strava
 */
export async function getStravaActivities(accessToken: string, perPage = 30): Promise<StravaActivity[]> {
    const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        throw new Error('Falha ao buscar atividades no Strava');
    }

    return response.json();
}

/**
 * Cria uma nova atividade manual no Strava (ex: Exportar Musculação pro Strava)
 */
export async function createStravaActivity(
    accessToken: string,
    nome: string,
    tipo: string, // 'WeightTraining', 'Run', 'Swim'
    dataInicio: string,
    duracaoSegundos: number,
    distanciaMetros?: number,
    descricao?: string
) {
    const body: any = {
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

    if (!response.ok) {
        throw new Error('Falha ao exportar o treino para o Strava');
    }

    return response.json();
}
