import type { RegistroTreino } from '../../types/treino';

export const CORES = {
  musculacao: '#EF4444',
  corrida: '#FF6B2C',
  natacao: '#0EA5E9',
  geral: '#FF6B2C',
  tempo: '#10B981',
  recorde: '#F59E0B',
};

export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateLabel(dateStr: string): string {
  const d = parseDateLocal(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function getConcluidoDate(concluidoEm: string): string {
  const d = new Date(concluidoEm);
  return toLocalDateStr(d);
}

export function startOfWeek(d: Date): Date {
  const result = new Date(d);
  if (isNaN(result.getTime())) return new Date();
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

export function formatDuracao(seg: number): string {
  if (seg < 60) return `${seg}s`;
  const m = Math.floor(seg / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  return `${h}h${(m % 60).toString().padStart(2, '0')}`;
}

export function calcPace(distKm: number, duracaoMin: number): number | null {
  if (!distKm || distKm <= 0) return null;
  return duracaoMin / distKm;
}

export function formatPace(pace: number): string {
  const m = Math.floor(pace);
  const s = Math.round((pace - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function calcular1RM(peso: number, reps: number): number {
  if (reps === 1) return peso;
  return peso * (1 + 0.0333 * reps);
}

const MUSCLE_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#0EA5E9',
  '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#F43F5E',
  '#84CC16', '#06B6D4',
];

export function getMuscleColor(index: number): string {
  return MUSCLE_COLORS[index % MUSCLE_COLORS.length];
}

export type PeriodoKey = '7d' | '30d' | '3m' | '6m' | '1a' | 'tudo' | 'custom';

export const PERIODOS: { key: PeriodoKey; label: string; dias: number }[] = [
  { key: '7d', label: '7D', dias: 7 },
  { key: '30d', label: '30D', dias: 30 },
  { key: '3m', label: '3M', dias: 90 },
  { key: '6m', label: '6M', dias: 180 },
  { key: '1a', label: '1A', dias: 365 },
  { key: 'tudo', label: 'ALL', dias: 99999 },
  { key: 'custom', label: 'CUSTOM', dias: 0 },
];

export function getStorageKey(uid: string) {
  return `dashboard_periodo_${uid}`;
}

export interface HeatmapCell {
  date: string;
  count: number;
  dayOfWeek: number;
  weekIndex: number;
  tipos: { musculacao: number; corrida: number; natacao: number };
}

export function gerarHeatmapData(historico: RegistroTreino[], totalDias: number): HeatmapCell[] {
  const porDia = new Map<string, { count: number; tipos: { musculacao: number; corrida: number; natacao: number } }>();
  historico.forEach((r) => {
    const dia = getConcluidoDate(r.concluidoEm);
    const entry = porDia.get(dia) || { count: 0, tipos: { musculacao: 0, corrida: 0, natacao: 0 } };
    entry.count++;
    if (r.tipo === 'musculacao') entry.tipos.musculacao++;
    else if (r.tipo === 'corrida') entry.tipos.corrida++;
    else if (r.tipo === 'natacao') entry.tipos.natacao++;
    porDia.set(dia, entry);
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dias: HeatmapCell[] = [];

  for (let i = totalDias - 1; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const key = toLocalDateStr(d);
    const weekIndex = Math.floor((totalDias - 1 - i) / 7);
    const entry = porDia.get(key);
    dias.push({
      date: key,
      count: entry?.count || 0,
      dayOfWeek: d.getDay(),
      weekIndex,
      tipos: entry?.tipos || { musculacao: 0, corrida: 0, natacao: 0 },
    });
  }

  return dias;
}

export function corDominante(tipos: { musculacao: number; corrida: number; natacao: number }): string {
  const { musculacao, corrida, natacao } = tipos;
  if (musculacao >= corrida && musculacao >= natacao) return CORES.musculacao;
  if (corrida >= musculacao && corrida >= natacao) return CORES.corrida;
  return CORES.natacao;
}

const STYLE_ID = 'dashboard-keyframes';

export function injectKeyframes() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes dash-fadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes dash-glowPulse {
      0%, 100% { opacity: 0.7; }
      50%      { opacity: 1; }
    }
    @keyframes dash-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .recharts-wrapper,
    .recharts-wrapper *,
    .recharts-wrapper svg,
    .recharts-surface,
    .recharts-tooltip-wrapper,
    .recharts-responsive-container,
    .recharts-responsive-container * {
      overflow: visible !important;
      outline: none !important;
      border: none !important;
      box-shadow: none !important;
      -webkit-tap-highlight-color: transparent !important;
      -webkit-user-select: none !important;
      user-select: none !important;
    }
    .recharts-tooltip-wrapper {
      z-index: 9999 !important;
      pointer-events: none !important;
    }
    .recharts-rectangle,
    .recharts-bar-rectangle,
    .recharts-bar-rectangle-active,
    .recharts-active-dot,
    .recharts-dot {
      stroke: none !important;
      outline: none !important;
      -webkit-tap-highlight-color: transparent !important;
      border: none !important;
    }
    .recharts-bar-cursor,
    .recharts-tooltip-cursor,
    .recharts-cursor {
      fill: transparent !important;
      stroke: none !important;
      opacity: 0 !important;
    }
    @keyframes dash-countUp {
      from { opacity: 0; transform: scale(0.85); }
      to   { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

export const tooltipStyle = {
  borderRadius: '0 !important',
  fontSize: 12,
  backgroundColor: 'rgba(15, 15, 15, 0.98)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#fff',
  boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
  backdropFilter: 'blur(12px)',
  pointerEvents: 'none' as const,
};

export const tooltipProps = {
  allowEscapeViewBox: { x: false, y: false },
  wrapperStyle: { zIndex: 50, pointerEvents: 'none' as const },
  cursor: false,
  isAnimationActive: false,
  offset: 10,
};
