/**
 * Utilitários para cálculos geográficos e de corrida
 */

/**
 * Calcula a distância entre dois pontos (latitude e longitude) usando a fórmula de Haversine
 * Retorna a distância em quilômetros (km)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Formata o ritmo (PACE) de segundos por km para string 'MM:SS'
 */
export function formatPace(secondsPerKm: number): string {
    if (!isFinite(secondsPerKm) || secondsPerKm <= 0) return '00:00';
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calcula o pace atual em segundos/km baseado na distância e tempo decorrido
 */
export function calculatePace(distanceKm: number, timeSeconds: number): number {
    if (distanceKm <= 0) return 0;
    return timeSeconds / distanceKm;
}
