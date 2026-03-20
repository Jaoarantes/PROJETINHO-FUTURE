import { useEffect, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useTreinoStore } from '../store/treinoStore';
import { calcularXPTotal, calcularLevelInfo } from '../utils/xpCalculator';
import { calcularVolumeSessao } from '../types/treino';
import type { SocialStats } from '../services/feedService';

interface AchievementDef {
  id: string;
  titulo: string;
  desc: string;
}

const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'primeiro', titulo: 'Primeiro Passo', desc: 'Completou seu primeiro treino!' },
  { id: 'cinco', titulo: 'Esquentando', desc: '5 treinos completados!' },
  { id: 'dez', titulo: 'Consistente', desc: '10 treinos completados!' },
  { id: 'vinte5', titulo: 'Dedicado', desc: '25 treinos completados!' },
  { id: 'cinquenta', titulo: 'Imparável', desc: '50 treinos completados!' },
  { id: 'cem', titulo: 'Lenda', desc: '100 treinos completados!' },
  { id: 'streak3', titulo: 'Em Chamas', desc: '3 semanas seguidas treinando!' },
  { id: '1ton', titulo: '1 Tonelada', desc: '1.000 kg de volume total!' },
  { id: '10ton', titulo: 'Monstro', desc: '10.000 kg de volume total!' },
  { id: 'variado', titulo: 'Versátil', desc: '10 exercícios diferentes!' },
  { id: 'social_primeiro', titulo: 'Estreia', desc: 'Primeiro post no feed!' },
  { id: 'social_foto', titulo: 'Fotogênico', desc: 'Post com foto publicado!' },
  { id: 'social_5fotos', titulo: 'Influencer', desc: '5 posts com foto!' },
  { id: 'social_10posts', titulo: 'Criador', desc: '10 posts no feed!' },
  { id: 'social_chamas10', titulo: 'Aquecido', desc: '10 chamas recebidas!' },
  { id: 'social_chamas50', titulo: 'Em Brasa', desc: '50 chamas recebidas!' },
  { id: 'social_seguidores5', titulo: 'Popular', desc: '5 seguidores!' },
  { id: 'social_seguidores25', titulo: 'Referência', desc: '25 seguidores!' },
  { id: 'social_comentarios', titulo: 'Engajado', desc: '10 comentários recebidos!' },
  { id: 'social_chamas100', titulo: 'Viral', desc: '100 chamas recebidas!' },
];

function getUnlockedIds(totalTreinos: number, volumeTotal: number, exerciciosUnicos: number, streak: number, social: SocialStats): Set<string> {
  const ids = new Set<string>();

  if (totalTreinos >= 1) ids.add('primeiro');
  if (totalTreinos >= 5) ids.add('cinco');
  if (totalTreinos >= 10) ids.add('dez');
  if (totalTreinos >= 25) ids.add('vinte5');
  if (totalTreinos >= 50) ids.add('cinquenta');
  if (totalTreinos >= 100) ids.add('cem');
  if (streak >= 3) ids.add('streak3');
  if (volumeTotal >= 1000) ids.add('1ton');
  if (volumeTotal >= 10000) ids.add('10ton');
  if (exerciciosUnicos >= 10) ids.add('variado');
  if (social.totalPosts >= 1) ids.add('social_primeiro');
  if (social.postsComFoto >= 1) ids.add('social_foto');
  if (social.postsComFoto >= 5) ids.add('social_5fotos');
  if (social.totalPosts >= 10) ids.add('social_10posts');
  if (social.totalChamasRecebidas >= 10) ids.add('social_chamas10');
  if (social.totalChamasRecebidas >= 50) ids.add('social_chamas50');
  if (social.totalSeguidores >= 5) ids.add('social_seguidores5');
  if (social.totalSeguidores >= 25) ids.add('social_seguidores25');
  if (social.totalComentariosRecebidos >= 10) ids.add('social_comentarios');
  if (social.totalChamasRecebidas >= 100) ids.add('social_chamas100');

  return ids;
}

const STORAGE_KEY = 'valere_seen_achievements';
const LEVEL_KEY = 'valere_last_level';

function getSeenAchievements(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${uid}`);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenAchievements(uid: string, seen: Set<string>) {
  localStorage.setItem(`${STORAGE_KEY}_${uid}`, JSON.stringify([...seen]));
}

function getLastLevel(uid: string): number {
  try {
    return Number(localStorage.getItem(`${LEVEL_KEY}_${uid}`)) || 0;
  } catch {
    return 0;
  }
}

function saveLastLevel(uid: string, level: number) {
  localStorage.setItem(`${LEVEL_KEY}_${uid}`, String(level));
}

export function useAchievementDetector(uid: string | undefined, socialStats: SocialStats) {
  const { showToast } = useToast();
  const historico = useTreinoStore((s) => s.historico);
  const initialized = useRef(false);

  useEffect(() => {
    if (!uid || historico.length === 0) return;

    const totalXP = calcularXPTotal(historico, socialStats);
    const { level } = calcularLevelInfo(totalXP);

    // Calcular stats para conquistas
    const validos = historico.filter((r) => {
      const d = r.duracaoTotalSegundos || 0;
      if (d < 1200) return false;
      if (r.tipo === 'musculacao' && r.exercicios.length < 3) return false;
      return true;
    });

    const totalTreinos = validos.length;
    const volumeTotal = validos.reduce((acc, r) => {
      if (r.tipo !== 'musculacao') return acc;
      return acc + calcularVolumeSessao(r.exercicios);
    }, 0);
    const exerciciosUnicos = new Set<string>();
    validos.forEach((r) => r.exercicios.forEach((ex) => exerciciosUnicos.add(ex.exercicio.nome)));

    // Streak
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
      if (sorted[i] === expected.toISOString().slice(0, 10)) streak++;
      else break;
    }

    const currentUnlocked = getUnlockedIds(totalTreinos, volumeTotal, exerciciosUnicos.size, streak, socialStats);
    const seen = getSeenAchievements(uid);
    const lastLevel = getLastLevel(uid);

    // Na primeira execução, salva o estado atual sem mostrar toasts
    if (!initialized.current) {
      initialized.current = true;
      if (seen.size === 0 && currentUnlocked.size > 0) {
        // Primeira vez — salva tudo como já visto
        saveSeenAchievements(uid, currentUnlocked);
        saveLastLevel(uid, level);
        return;
      }
    }

    // Detecta novas conquistas
    const newAchievements: AchievementDef[] = [];
    for (const id of currentUnlocked) {
      if (!seen.has(id)) {
        const def = ACHIEVEMENTS.find((a) => a.id === id);
        if (def) newAchievements.push(def);
      }
    }

    // Mostra toasts para novas conquistas (com delay entre elas)
    newAchievements.forEach((achievement, i) => {
      setTimeout(() => {
        showToast({
          type: 'achievement',
          title: `Conquista: ${achievement.titulo}`,
          message: achievement.desc,
          duration: 5000,
        });
      }, i * 2000);
    });

    // Detecta level up
    if (lastLevel > 0 && level > lastLevel) {
      setTimeout(() => {
        showToast({
          type: 'levelUp',
          title: `Subiu para o Nível ${level}!`,
          message: `Você alcançou ${totalXP} XP total`,
          duration: 5000,
        });
      }, newAchievements.length * 2000);
    }

    // Salva estado atualizado
    if (newAchievements.length > 0 || level !== lastLevel) {
      saveSeenAchievements(uid, currentUnlocked);
      saveLastLevel(uid, level);
    }
  }, [uid, historico, socialStats, showToast]);
}
