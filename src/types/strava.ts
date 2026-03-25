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
    type: string;
    sport_type?: string;
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
    average_cadence?: number;
    average_watts?: number;
    max_watts?: number;
    weighted_average_watts?: number;
    suffer_score?: number;
    average_temp?: number;
    device_name?: string;
    gear?: { id: string; name: string } | null;
    map?: {
        id: string;
        summary_polyline: string | null;
        polyline?: string | null;
        resource_state: number;
    };
    splits_metric?: Array<{
        distance: number;
        elapsed_time: number;
        elevation_difference: number;
        moving_time: number;
        average_heartrate?: number;
        average_speed: number;
        pace_zone?: number;
        split: number;
    }>;
    laps?: Array<{
        name: string;
        distance: number;
        elapsed_time: number;
        moving_time: number;
        average_speed: number;
        max_speed: number;
        average_heartrate?: number;
        max_heartrate?: number;
        average_cadence?: number;
        total_elevation_gain: number;
    }>;
    best_efforts?: Array<{
        name: string;
        elapsed_time: number;
        moving_time: number;
        distance: number;
    }>;
}
