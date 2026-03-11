export interface StravaTokenResponse {
    token_type: string;
    expires_at: number;
    expires_in: number;
    refresh_token: string;
    access_token: string;
    athlete?: {
        id: number;
        username: string;
        firstname: string;
        lastname: string;
        profile: string;
    };
}

export interface StravaAuthData {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    athleteId?: number;
}

export interface StravaActivity {
    id: number;
    name: string;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    total_elevation_gain: number;
    type: string; // 'Run', 'Ride', 'Swim', 'WeightTraining', 'Workout'
    start_date: string;
    start_date_local: string;
    timezone: string;
    average_speed: number;
    max_speed: number;
    description?: string;
    has_heartrate?: boolean;
    average_heartrate?: number;
    max_heartrate?: number;
    calories?: number;
    kilojoules?: number;
}
