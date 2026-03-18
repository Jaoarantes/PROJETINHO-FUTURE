import type { RegistroTreino } from '../types/treino';
import { calcularDistanciaCorrida, calcularDistanciaNatacao } from '../types/treino';

export function calcularCaloriasTreino(registro: RegistroTreino): number {
  if (registro.stravaData?.calories && Number(registro.stravaData.calories) > 0) {
    return Number(registro.stravaData.calories);
  }

  // Defensivamente tratar os dados vindo do DB
  const secs = Number(registro.duracaoTotalSegundos) || 0;
  const duracaoMin = secs > 0 ? secs / 60 : 0;

  const tipo = String(registro.tipo || '').toLowerCase();

  if (tipo === 'corrida') {
    let dist = 0;
    if (registro.corrida && Array.isArray(registro.corrida.etapas)) {
      dist = calcularDistanciaCorrida(registro.corrida.etapas);
    }
    if (dist > 0) return dist * 70; // 70 kcal/km
    if (duracaoMin > 0) return duracaoMin * 10; // estimate via tempo
  }

  if (tipo === 'natacao') {
    let distM = 0;
    if (registro.natacao && Array.isArray(registro.natacao.etapas)) {
      distM = calcularDistanciaNatacao(registro.natacao.etapas);
    }
    if (distM > 0) return distM * 0.25; // 250 kcal/km
    if (duracaoMin > 0) return duracaoMin * 8; // estimate via tempo
  }

  // Validar se tem séries válidas para Musculação / Outros
  let totalSeries = 0;
  if (Array.isArray(registro.exercicios)) {
    totalSeries = registro.exercicios.reduce((acc, ex) => acc + (ex?.series?.length || 0), 0);
  }

  if (tipo === 'musculacao' || tipo === 'outro') {
    if (duracaoMin > 0) return duracaoMin * 5; // 5 kcal/min
    if (totalSeries > 0) return totalSeries * 7.5; // ~7.5 kcal per set se não tiver tempo
  }

  // Fallback genérico absoluto caso caia fora do radar:
  if (duracaoMin > 0) return duracaoMin * 5;
  if (totalSeries > 0) return totalSeries * 7.5;

  return 0;
}
