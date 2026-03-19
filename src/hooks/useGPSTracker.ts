import { useState, useRef, useCallback, useEffect } from 'react';
import { calculateDistance, calculatePace } from '../utils/geoUtils';
import { useTreinoStore } from '../store/treinoStore';
import { Capacitor } from '@capacitor/core';

interface Location {
    latitude: number;
    longitude: number;
    timestamp: number;
}

export interface GPSTrackingResult {
    isActive: boolean;
    isPaused: boolean;
    distanceKm: number;
    currentPace: number;
    coordinates: Location[];
    startTracking: () => void;
    stopTracking: () => void;
    pauseTracking: () => void;
    resumeTracking: () => void;
    resetTracking: () => void;
    accuracy: number | null;
    error: string | null;
}

// Checa se roda em plataforma nativa (Capacitor)
const isNative = Capacitor.isNativePlatform();

// ── Wake Lock: mantém a tela ligada durante a corrida ──
let wakeLockSentinel: WakeLockSentinel | null = null;

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLockSentinel = await navigator.wakeLock.request('screen');
            wakeLockSentinel.addEventListener('release', () => {
                wakeLockSentinel = null;
            });
        }
    } catch {
        // Wake Lock não suportado ou negado
    }
}

function releaseWakeLock() {
    wakeLockSentinel?.release();
    wakeLockSentinel = null;
}

// ── Foreground Service (Android) ──
async function startForegroundService() {
    if (!isNative) return;
    try {
        const { ForegroundService } = await import('@capawesome-team/capacitor-android-foreground-service');
        await ForegroundService.startForegroundService({
            id: 1,
            title: 'Valere - Corrida em andamento',
            body: 'Rastreando sua corrida via GPS...',
            smallIcon: 'ic_stat_directions_run',
        });
    } catch (err) {
        console.warn('[GPS] Foreground service não disponível:', err);
    }
}

async function stopForegroundService() {
    if (!isNative) return;
    try {
        const { ForegroundService } = await import('@capawesome-team/capacitor-android-foreground-service');
        await ForegroundService.stopForegroundService();
    } catch {
        // Ignora
    }
}

// ── GPS nativo via Capacitor ──
async function watchPositionNative(
    callback: (pos: { latitude: number; longitude: number; accuracy: number; timestamp: number }) => void,
    errorCallback: (err: string) => void,
): Promise<string> {
    try {
        const { Geolocation } = await import('@capacitor/geolocation');

        // Pede permissão
        const perms = await Geolocation.checkPermissions();
        if (perms.location !== 'granted' && perms.coarseLocation !== 'granted') {
            await Geolocation.requestPermissions();
        }

        const watchId = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
            (position, err) => {
                if (err) {
                    errorCallback(err.message || 'Erro GPS nativo');
                    return;
                }
                if (position) {
                    callback({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp,
                    });
                }
            },
        );
        return watchId;
    } catch (err: any) {
        errorCallback(err?.message || 'Erro ao iniciar GPS nativo');
        return '';
    }
}

async function clearWatchNative(watchId: string) {
    try {
        const { Geolocation } = await import('@capacitor/geolocation');
        await Geolocation.clearWatch({ id: watchId });
    } catch {
        // Ignora
    }
}

// ── GPS Web (fallback) ──
function watchPositionWeb(
    callback: (pos: { latitude: number; longitude: number; accuracy: number; timestamp: number }) => void,
    errorCallback: (err: string) => void,
): number {
    return navigator.geolocation.watchPosition(
        (position) => {
            callback({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp,
            });
        },
        (err) => {
            errorCallback(
                err.code === 1 ? 'Permissão de localização negada.' : 'Erro ao obter sinal GPS.',
            );
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
}

// ── Hook principal ──
export function useGPSTracker(): GPSTrackingResult {
    const treinoAtivo = useTreinoStore((s) => s.treinoAtivo);
    const atualizarGPSAtivo = useTreinoStore((s) => s.atualizarGPSAtivo);

    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [distanceKm, setDistanceKm] = useState(0);
    const [currentPace, setCurrentPace] = useState(0);
    const [coordinates, setCoordinates] = useState<Location[]>([]);
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Refs para evitar stale closures
    const watchId = useRef<string | number | null>(null);
    const lastCoord = useRef<Location | null>(null);
    const isPausedRef = useRef(false);
    const distanceRef = useRef(0);
    const coordsRef = useRef<Location[]>([]);

    // Sync refs
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
    useEffect(() => { distanceRef.current = distanceKm; }, [distanceKm]);
    useEffect(() => { coordsRef.current = coordinates; }, [coordinates]);

    // Restaurar estado do store (ex: reload)
    useEffect(() => {
        if (treinoAtivo) {
            setDistanceKm(treinoAtivo.distanceKm || 0);
            distanceRef.current = treinoAtivo.distanceKm || 0;
            setCoordinates(treinoAtivo.coordinates || []);
            coordsRef.current = treinoAtivo.coordinates || [];
            setIsActive(true);
            setIsPaused(!!treinoAtivo.pausadoEm);
            isPausedRef.current = !!treinoAtivo.pausadoEm;

            if (treinoAtivo.coordinates && treinoAtivo.coordinates.length > 0) {
                lastCoord.current = treinoAtivo.coordinates[treinoAtivo.coordinates.length - 1];
            }
        }
    }, [treinoAtivo?.sessaoId]);

    // Persistir GPS no store
    useEffect(() => {
        if (isActive) {
            atualizarGPSAtivo(distanceKm, coordinates);
        }
    }, [distanceKm, coordinates, isActive, atualizarGPSAtivo]);

    // Handler de nova posição GPS
    const handlePosition = useCallback(
        (pos: { latitude: number; longitude: number; accuracy: number; timestamp: number }) => {
            const newCoord: Location = {
                latitude: pos.latitude,
                longitude: pos.longitude,
                timestamp: pos.timestamp,
            };

            setAccuracy(pos.accuracy);

            // Filtra posições com precisão ruim (> 50m)
            if (pos.accuracy > 50) return;

            setCoordinates((prev) => [...prev, newCoord]);

            // Só calcula distância se NÃO estiver pausado
            if (lastCoord.current && !isPausedRef.current) {
                const distIncrement = calculateDistance(
                    lastCoord.current.latitude,
                    lastCoord.current.longitude,
                    newCoord.latitude,
                    newCoord.longitude,
                );

                // Filtra GPS drift: ignora movimentos < 3m ou > 500m (teleporte/GPS bug)
                if (distIncrement > 0.003 && distIncrement < 0.5) {
                    setDistanceKm((prev) => {
                        const newTotal = prev + distIncrement;
                        // Calcula pace baseado no tempo efetivo (descontando pausas)
                        if (treinoAtivo) {
                            const pausado = treinoAtivo.tempoPausadoTotal || 0;
                            const tempoEfetivo = (Date.now() - treinoAtivo.iniciadoEm - pausado) / 1000;
                            setCurrentPace(calculatePace(newTotal, tempoEfetivo));
                        }
                        return newTotal;
                    });
                }
            }

            lastCoord.current = newCoord;
        },
        [treinoAtivo],
    );

    const handleError = useCallback((errMsg: string) => {
        console.error('[GPS] Erro:', errMsg);
        setError(errMsg);
    }, []);

    // Iniciar tracking
    const startTracking = useCallback(async () => {
        if (!navigator.geolocation && !isNative) {
            setError('Geolocalização não suportada.');
            return;
        }

        setError(null);
        setIsActive(true);
        setIsPaused(false);
        isPausedRef.current = false;

        // Wake Lock - mantém tela ligada
        await requestWakeLock();

        // Foreground Service no Android - mantém app viva em background
        await startForegroundService();

        // Inicia watch GPS
        if (isNative) {
            const id = await watchPositionNative(handlePosition, handleError);
            watchId.current = id;
        } else {
            watchId.current = watchPositionWeb(handlePosition, handleError);
        }
    }, [handlePosition, handleError]);

    // Parar tracking
    const stopTracking = useCallback(async () => {
        if (watchId.current !== null) {
            if (isNative && typeof watchId.current === 'string') {
                await clearWatchNative(watchId.current);
            } else if (typeof watchId.current === 'number') {
                navigator.geolocation.clearWatch(watchId.current);
            }
            watchId.current = null;
        }
        setIsActive(false);
        setIsPaused(false);
        releaseWakeLock();
        await stopForegroundService();
    }, []);

    // Pausar
    const pauseTracking = useCallback(async () => {
        setIsPaused(true);
        isPausedRef.current = true;
        // NÃO para o GPS! Continua recebendo posições mas não conta distância
        // Isso permite que o GPS continue ativo em background
    }, []);

    // Retomar
    const resumeTracking = useCallback(async () => {
        setIsPaused(false);
        isPausedRef.current = false;

        // Se o watch morreu (ex: app foi para background muito tempo), reinicia
        if (watchId.current === null) {
            await requestWakeLock();
            await startForegroundService();
            if (isNative) {
                const id = await watchPositionNative(handlePosition, handleError);
                watchId.current = id;
            } else {
                watchId.current = watchPositionWeb(handlePosition, handleError);
            }
        }
    }, [handlePosition, handleError]);

    // Reset
    const resetTracking = useCallback(async () => {
        await stopTracking();
        setDistanceKm(0);
        distanceRef.current = 0;
        setCoordinates([]);
        coordsRef.current = [];
        lastCoord.current = null;
        setError(null);
    }, [stopTracking]);

    // ── Visibility Change: re-adquire GPS quando app volta ao foco ──
    useEffect(() => {
        const handleVisibility = async () => {
            if (document.visibilityState === 'visible' && isActive && !isPausedRef.current) {
                // Re-adquire Wake Lock (pode ter sido liberado)
                await requestWakeLock();

                // Se o watch morreu, reinicia
                if (watchId.current === null) {
                    if (isNative) {
                        const id = await watchPositionNative(handlePosition, handleError);
                        watchId.current = id;
                    } else {
                        watchId.current = watchPositionWeb(handlePosition, handleError);
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [isActive, handlePosition, handleError]);

    // ── Cleanup no unmount ──
    useEffect(() => {
        return () => {
            releaseWakeLock();
        };
    }, []);

    return {
        isActive,
        isPaused,
        distanceKm,
        currentPace,
        coordinates,
        startTracking,
        stopTracking,
        pauseTracking,
        resumeTracking,
        resetTracking,
        accuracy,
        error,
    };
}
