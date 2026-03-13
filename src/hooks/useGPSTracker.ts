import { useState, useRef, useCallback, useEffect } from 'react';
import { calculateDistance, calculatePace } from '../utils/geoUtils';
import { useTreinoStore } from '../store/treinoStore';

interface Location {
    latitude: number;
    longitude: number;
    timestamp: number;
}

export interface GPSTrackingResult {
    isActive: boolean;
    isPaused: boolean;
    distanceKm: number;
    currentPace: number; // segundos por km
    coordinates: Location[];
    startTracking: () => void;
    stopTracking: () => void;
    pauseTracking: () => void;
    resumeTracking: () => void;
    resetTracking: () => void;
    accuracy: number | null;
    error: string | null;
}

export function useGPSTracker(): GPSTrackingResult {
    const { treinoAtivo, atualizarGPSAtivo } = useTreinoStore();

    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Inicialização do estado baseado no que está persistido no store
    const [distanceKm, setDistanceKm] = useState(0);
    const [currentPace, setCurrentPace] = useState(0);
    const [coordinates, setCoordinates] = useState<Location[]>([]);
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const watchId = useRef<number | null>(null);
    const lastCoord = useRef<Location | null>(null);
    const startTime = useRef<number | null>(null);

    // Efeito para ressincronizar se o treino ativo mudar (ex: reload)
    useEffect(() => {
        if (treinoAtivo) {
            setDistanceKm(treinoAtivo.distanceKm || 0);
            setCoordinates(treinoAtivo.coordinates || []);
            setIsActive(true);
            setIsPaused(!!treinoAtivo.pausadoEm);

            if (treinoAtivo.coordinates && treinoAtivo.coordinates.length > 0) {
                lastCoord.current = treinoAtivo.coordinates[treinoAtivo.coordinates.length - 1];
            }
        }
    }, [treinoAtivo?.sessaoId]);

    // Sempre que o estado local mudar, sincronizamos com o store para persistência
    useEffect(() => {
        if (isActive) {
            atualizarGPSAtivo(distanceKm, coordinates);
        }
    }, [distanceKm, coordinates, isActive, atualizarGPSAtivo]);

    const startTracking = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocalização não suportada no seu navegador.');
            return;
        }

        setError(null);
        setIsActive(true);
        setIsPaused(false);
        if (startTime.current === null) {
            startTime.current = Date.now();
        }

        watchId.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy: acc } = position.coords;
                const timestamp = position.timestamp;
                const newCoord: Location = { latitude, longitude, timestamp };

                setAccuracy(acc);
                setCoordinates((prev) => [...prev, newCoord]);

                // Só calcula distância se NÃO estiver pausado
                if (lastCoord.current && !isPaused) {
                    const distIncrement = calculateDistance(
                        lastCoord.current.latitude,
                        lastCoord.current.longitude,
                        newCoord.latitude,
                        newCoord.longitude
                    );

                    if (distIncrement > 0.002) { // mais de 2 metros
                        setDistanceKm((prev) => {
                            const newTotalDist = prev + distIncrement;
                            const totalSeconds = (Date.now() - (startTime.current || Date.now())) / 1000;
                            setCurrentPace(calculatePace(newTotalDist, totalSeconds));
                            return newTotalDist;
                        });
                    }
                }

                lastCoord.current = newCoord;
            },
            (err) => {
                console.error('Erro no GPS:', err);
                setError(err.code === 1 ? 'Permissão de localização negada.' : 'Erro ao obter sinal GPS.');
                stopTracking();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }, [isPaused]);

    const stopTracking = useCallback(() => {
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
        setIsActive(false);
        setIsPaused(false);
    }, []);

    const pauseTracking = useCallback(() => {
        setIsPaused(true);
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
    }, []);

    const resumeTracking = useCallback(() => {
        setIsPaused(false);
        // Reinicia o watch pegando a posição atual
        startTracking();
    }, [startTracking]);

    const resetTracking = useCallback(() => {
        stopTracking();
        setDistanceKm(0);
        setCoordinates([]);
        lastCoord.current = null;
        startTime.current = null;
        setError(null);
    }, [stopTracking]);

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
