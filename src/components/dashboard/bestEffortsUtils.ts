import type { EtapaCorrida, RegistroTreino } from '../../types/treino';

export const MARCAS_PRINCIPAIS = [
  { key: '1km', label: '1 km', distancia: 1000 },
  { key: '3km', label: '3 km', distancia: 3000 },
  { key: '5km', label: '5 km', distancia: 5000 },
  { key: '10km', label: '10 km', distancia: 10000 },
  { key: '15km', label: '15 km', distancia: 15000 },
  { key: '21km', label: 'Meia Maratona', distancia: 21097 },
  { key: '30km', label: '30 km', distancia: 30000 },
  { key: '42km', label: 'Maratona', distancia: 42195 },
];

export function formatarTempoMarca(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = Math.round(seg % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function calcPaceMarca(distanciaM: number, tempoSeg: number): string {
  const minKm = (tempoSeg / 60) / (distanciaM / 1000);
  const mins = Math.floor(minKm);
  const secs = Math.round((minKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function calcularTempoSplits(
  splits: NonNullable<RegistroTreino['stravaData']>['splits'],
  distanciaM: number,
): number | null {
  if (!splits || splits.length === 0) return null;
  const numKmInteiros = Math.floor(distanciaM / 1000);
  if (splits.length < numKmInteiros) return null;

  let tempo = 0;
  for (let i = 0; i < numKmInteiros; i++) {
    if (splits[i].distance < 800) return null;
    tempo += splits[i].movingTime;
  }

  const fracaoRestanteM = distanciaM % 1000;
  if (fracaoRestanteM > 0 && splits.length > numKmInteiros) {
    const splitParcial = splits[numKmInteiros];
    if (splitParcial && splitParcial.distance > 50) {
      tempo += splitParcial.movingTime * (fracaoRestanteM / splitParcial.distance);
    }
  }

  return tempo > 0 ? Math.round(tempo) : null;
}

export function calcularTempoEtapas(etapas: EtapaCorrida[], distanciaAlvoM: number): number | null {
  if (!etapas || etapas.length === 0) return null;
  let distAcumM = 0;
  let tempoAcumSeg = 0;
  for (const etapa of etapas) {
    const etapaDistM = (etapa.distanciaKm || 0) * 1000;
    const etapaDurSeg = etapa.duracaoSegundos ?? (etapa.duracaoMin || 0) * 60;
    if (etapaDistM <= 0 || etapaDurSeg <= 0) continue;
    if (distAcumM + etapaDistM >= distanciaAlvoM) {
      const restanteM = distanciaAlvoM - distAcumM;
      tempoAcumSeg += etapaDurSeg * (restanteM / etapaDistM);
      return Math.round(tempoAcumSeg);
    }
    distAcumM += etapaDistM;
    tempoAcumSeg += etapaDurSeg;
  }
  return null;
}

export function getNomesStrava(distanciaM: number): string[] {
  const map: Record<number, string[]> = {
    1000: ['1k', '1km', '1 km', '1000m'],
    3000: ['3k', '3km', '3 km', '3000m'],
    5000: ['5k', '5km', '5 km', '5000m'],
    10000: ['10k', '10km', '10 km', '10000m'],
    15000: ['15k', '15km', '15 km', '15000m'],
    21097: ['Half-Marathon', 'Meia Maratona', '21k', '21km'],
    30000: ['30k', '30km', '30 km', '30000m'],
    42195: ['Marathon', 'Maratona', '42k', '42km'],
  };
  return map[distanciaM] || [];
}
