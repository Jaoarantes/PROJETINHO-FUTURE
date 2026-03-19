import type { RegistroTreino } from '../types/treino';
import { calcularVolumeSessao } from '../types/treino';
import type { SocialStats } from '../services/feedService';

function filtrarTreinosValidos(historico: RegistroTreino[]) {
  return historico.filter((r) => {
    const duracao = r.duracaoTotalSegundos || 0;
    if (duracao < 1200) return false;
    if (r.tipo === 'musculacao' && r.exercicios.length < 3) return false;
    return true;
  });
}

function calcularStreak(historico: RegistroTreino[]): number {
  const validos = filtrarTreinosValidos(historico);
  if (validos.length === 0) return 0;

  const semanas = new Set<string>();
  validos.forEach((r) => {
    const d = new Date(r.concluidoEm);
    const inicio = new Date(d);
    inicio.setDate(inicio.getDate() - inicio.getDay());
    semanas.add(inicio.toISOString().slice(0, 10));
  });

  const sorted = Array.from(semanas).sort().reverse();
  let streak = 0;

  const agora = new Date();
  agora.setDate(agora.getDate() - agora.getDay());
  const semanaAtual = agora.toISOString().slice(0, 10);

  for (let i = 0; i < sorted.length; i++) {
    const expected = new Date(semanaAtual);
    expected.setDate(expected.getDate() - i * 7);
    if (sorted[i] === expected.toISOString().slice(0, 10)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export interface LevelInfo {
  level: number;
  totalXP: number;
  progresso: number;
  xpParaProximoLevel: number;
}

const defaultSocialStats: SocialStats = {
  totalPosts: 0, postsComFoto: 0, totalChamasRecebidas: 0, totalSeguidores: 0, totalComentariosRecebidos: 0,
};

export function calcularXPTotal(historico: RegistroTreino[], socialStats: SocialStats = defaultSocialStats): number {
  const validos = filtrarTreinosValidos(historico);
  const totalTreinos = validos.length;
  const treinoXP = validos.reduce((acc, r) => acc + (r.xpEarned || 0), 0);

  const volumeTotal = validos.reduce((acc, r) => {
    if (r.tipo !== 'musculacao') return acc;
    return acc + calcularVolumeSessao(r.exercicios);
  }, 0);

  const exerciciosUnicos = new Set<string>();
  validos.forEach((r) => {
    r.exercicios.forEach((ex) => exerciciosUnicos.add(ex.exercicio.nome));
  });

  const streak = calcularStreak(historico);

  // Conquistas — same as Perfil.tsx
  let conquistaXP = 0;

  // Treino conquistas
  if (totalTreinos >= 1) conquistaXP += 50;
  if (totalTreinos >= 5) conquistaXP += 100;
  if (totalTreinos >= 10) conquistaXP += 200;
  if (totalTreinos >= 25) conquistaXP += 400;
  if (totalTreinos >= 50) conquistaXP += 750;
  if (totalTreinos >= 100) conquistaXP += 1500;
  if (streak >= 3) conquistaXP += 300;
  if (volumeTotal >= 1000) conquistaXP += 200;
  if (volumeTotal >= 10000) conquistaXP += 500;
  if (exerciciosUnicos.size >= 10) conquistaXP += 250;

  // Social conquistas
  if (socialStats.totalPosts >= 1) conquistaXP += 50;
  if (socialStats.postsComFoto >= 1) conquistaXP += 75;
  if (socialStats.postsComFoto >= 5) conquistaXP += 300;
  if (socialStats.totalPosts >= 10) conquistaXP += 400;
  if (socialStats.totalChamasRecebidas >= 10) conquistaXP += 150;
  if (socialStats.totalChamasRecebidas >= 50) conquistaXP += 500;
  if (socialStats.totalSeguidores >= 5) conquistaXP += 200;
  if (socialStats.totalSeguidores >= 25) conquistaXP += 600;
  if (socialStats.totalComentariosRecebidos >= 10) conquistaXP += 200;
  if (socialStats.totalChamasRecebidas >= 100) conquistaXP += 1000;

  return treinoXP + conquistaXP;
}

export function calcularLevelInfo(totalXP: number): LevelInfo {
  const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;
  const xpParaEsteLevel = (level - 1) * (level - 1) * 100;
  const xpParaProximoLevel = level * level * 100;
  const xpNoLevel = totalXP - xpParaEsteLevel;
  const xpNecessario = xpParaProximoLevel - xpParaEsteLevel;
  const progresso = xpNecessario > 0 ? xpNoLevel / xpNecessario : 0;
  return { level, totalXP, progresso, xpParaProximoLevel };
}
