import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, IconButton, useTheme, alpha } from '@mui/material';
import {
  ArrowLeft, Dumbbell, Footprints, Waves, Calendar, TrendingUp,
  Clock, Flame, Zap, Trophy, Target, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useTreinoStore } from '../store/treinoStore';
import { useAuthContext } from '../contexts/AuthContext';
import {
  calcularVolumeSessao, calcularVolumeExercicio,
  calcularDistanciaCorrida, calcularDistanciaNatacao,
} from '../types/treino';
import type { RegistroTreino } from '../types/treino';
import { calcularCaloriasTreino } from '../utils/calorieCalculator';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, CartesianGrid, Cell, ComposedChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

// ── Cores por tipo ──────────────────────────────
const CORES = {
  musculacao: '#EF4444',
  corrida: '#FF6B2C',
  natacao: '#0EA5E9',
  geral: '#FF6B2C',
  tempo: '#10B981',
  recorde: '#F59E0B',
};

// ── Helpers de data (sempre local, nunca UTC) ───
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLabel(dateStr: string): string {
  const d = parseDateLocal(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getConcluidoDate(concluidoEm: string): string {
  const d = new Date(concluidoEm);
  return toLocalDateStr(d);
}

function startOfWeek(d: Date): Date {
  const result = new Date(d);
  if (isNaN(result.getTime())) return new Date();
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

// ── Helpers gerais ──────────────────────────────
function formatDuracao(seg: number): string {
  if (seg < 60) return `${seg}s`;
  const m = Math.floor(seg / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  return `${h}h${(m % 60).toString().padStart(2, '0')}`;
}

function calcPace(distKm: number, duracaoMin: number): number | null {
  if (!distKm || distKm <= 0) return null;
  return duracaoMin / distKm;
}

function formatPace(pace: number): string {
  const m = Math.floor(pace);
  const s = Math.round((pace - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function calcular1RM(peso: number, reps: number): number {
  if (reps === 1) return peso;
  return peso * (1 + 0.0333 * reps);
}

// ── Paleta de cores para grupos musculares ──────
const MUSCLE_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#0EA5E9',
  '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#F43F5E',
  '#84CC16', '#06B6D4',
];
function getMuscleColor(index: number): string {
  return MUSCLE_COLORS[index % MUSCLE_COLORS.length];
}

// ── Períodos ────────────────────────────────────
type PeriodoKey = '7d' | '30d' | '3m' | '6m' | '1a' | 'tudo' | 'custom';
const PERIODOS: { key: PeriodoKey; label: string; dias: number }[] = [
  { key: '7d', label: '7D', dias: 7 },
  { key: '30d', label: '30D', dias: 30 },
  { key: '3m', label: '3M', dias: 90 },
  { key: '6m', label: '6M', dias: 180 },
  { key: '1a', label: '1A', dias: 365 },
  { key: 'tudo', label: 'ALL', dias: 99999 },
  { key: 'custom', label: 'CUSTOM', dias: 0 },
];

function getStorageKey(uid: string) {
  return `dashboard_periodo_${uid}`;
}

// ── Heatmap helpers ─────────────────────────────
interface HeatmapCell {
  date: string;
  count: number;
  dayOfWeek: number;
  weekIndex: number;
  tipos: { musculacao: number; corrida: number; natacao: number };
}

function gerarHeatmapData(historico: RegistroTreino[], totalDias: number): HeatmapCell[] {
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

function corDominante(tipos: { musculacao: number; corrida: number; natacao: number }): string {
  const { musculacao, corrida, natacao } = tipos;
  if (musculacao >= corrida && musculacao >= natacao) return CORES.musculacao;
  if (corrida >= musculacao && corrida >= natacao) return CORES.corrida;
  return CORES.natacao;
}

// ── Keyframes (injected once) ───────────────────
const STYLE_ID = 'dashboard-keyframes';
function injectKeyframes() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes dash-fadeUp {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes dash-glowPulse {
      0%, 100% { opacity: 0.6; }
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
    /* Reduzir ou remover bordas de foco e estados ativos */
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
      from { opacity: 0; transform: scale(0.7); }
      to   { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

// ── Shared tooltip style ────────────────────────
const tooltipStyle = {
  borderRadius: '0 !important',
  fontSize: 12,
  backgroundColor: 'rgba(15, 15, 15, 0.98)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#fff',
  boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
  backdropFilter: 'blur(12px)',
  pointerEvents: 'none' as const,
};

// Portal-based custom tooltip: renders at body level, impossible to clip
function PortalTooltipWrapper(props: any) {
  const { active, payload, label, coordinate, renderContent } = props;

  // Use a global visibility flag to ensure only one portal is active at a time
  // and that scrolling hides everything.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!!(active && payload?.length && coordinate));
  }, [active, payload, coordinate]);

  useEffect(() => {
    if (!visible) return;
    const hide = () => setVisible(false);
    window.addEventListener('scroll', hide, { passive: true });
    window.addEventListener('touchstart', hide, { passive: true });
    return () => {
      window.removeEventListener('scroll', hide);
      window.removeEventListener('touchstart', hide);
    };
  }, [visible]);

  if (!visible || !payload || !coordinate) return null;

  const chartElement = document.querySelector('.recharts-responsive-container:hover') ||
    document.querySelector('.recharts-wrapper:hover') ||
    document.querySelector('.recharts-surface:hover');

  let left = coordinate.x;
  let top = coordinate.y;

  if (chartElement) {
    const rect = chartElement.getBoundingClientRect();
    left = rect.left + coordinate.x + 15;
    top = rect.top + coordinate.y - 10;

    const tooltipWidth = 180;
    if (left + tooltipWidth > window.innerWidth) {
      left = Math.max(10, rect.left + coordinate.x - tooltipWidth - 15);
    }
    if (top < 10) top = 10;
    if (top + 120 > window.innerHeight) top = window.innerHeight - 120;
  }

  return createPortal(
    <div style={{
      position: 'fixed',
      left,
      top,
      zIndex: 99999,
      pointerEvents: 'none',
      transition: 'left 0.08s ease-out, top 0.08s ease-out, opacity 0.1s ease',
      opacity: visible ? 1 : 0,
    }}>
      {renderContent(payload, label)}
    </div>,
    document.body
  );
}

const tooltipProps = {
  allowEscapeViewBox: { x: true, y: true },
  wrapperStyle: { zIndex: 9999, pointerEvents: 'none' as const, overflow: 'visible' as const },
  cursor: false,
};

// ── Component ───────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const historico = useTreinoStore((s) => s.historico);
  const carregarHistorico = useTreinoStore((s) => s.carregarHistorico);
  const carregando = useTreinoStore((s) => s.carregando);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    injectKeyframes();
    if (user?.id && historico.length === 0) {
      carregarHistorico(user.id).catch(console.error);
    }
  }, [user?.id, carregarHistorico, historico.length]);

  const [periodo, setPeriodo] = useState<PeriodoKey>(() => {
    if (user?.id) {
      const saved = localStorage.getItem(getStorageKey(user.id));
      if (saved && PERIODOS.some((p) => p.key === saved)) return saved as PeriodoKey;
    }
    return '3m';
  });

  const [dataInicio, setDataInicio] = useState(() => {
    if (user?.id) {
      return localStorage.getItem(`dashboard_inicio_${user.id}`) || toLocalDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    }
    return toLocalDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  });
  const [dataFim, setDataFim] = useState(() => {
    if (user?.id) {
      return localStorage.getItem(`dashboard_fim_${user.id}`) || toLocalDateStr(new Date());
    }
    return toLocalDateStr(new Date());
  });

  const [filtroCargaExercicio, setFiltroCargaExercicio] = useState<string | null>(null);
  const [filtroEvolucaoExercicio, setFiltroEvolucaoExercicio] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(getStorageKey(user.id), periodo);
      localStorage.setItem(`dashboard_inicio_${user.id}`, dataInicio);
      localStorage.setItem(`dashboard_fim_${user.id}`, dataFim);
    }
  }, [periodo, dataInicio, dataFim, user?.id]);

  const historicoFiltrado = useMemo(() => {
    const config = PERIODOS.find((p) => p.key === periodo)!;
    if (config.key === 'tudo') return historico;

    let limiteMin: Date;
    let limiteMax = new Date();
    limiteMax.setHours(23, 59, 59, 999);

    if (config.key === 'custom') {
      limiteMin = parseDateLocal(dataInicio);
      limiteMin.setHours(0, 0, 0, 0);
      limiteMax = parseDateLocal(dataFim);
      limiteMax.setHours(23, 59, 59, 999);
    } else {
      limiteMin = new Date();
      limiteMin.setDate(limiteMin.getDate() - config.dias);
      limiteMin.setHours(0, 0, 0, 0);
    }

    return historico.filter((r) => {
      const d = new Date(r.concluidoEm);
      return d >= limiteMin && d <= limiteMax;
    });
  }, [historico, periodo, dataInicio, dataFim]);

  const stats = useMemo(() => {
    const total = historicoFiltrado.length;
    const musculacao = historicoFiltrado.filter((r) => r.tipo === 'musculacao');
    const corrida = historicoFiltrado.filter((r) => r.tipo === 'corrida');
    const natacao = historicoFiltrado.filter((r) => r.tipo === 'natacao');

    const tempoTotal = historicoFiltrado.reduce((a, r) => a + (r.duracaoTotalSegundos || 0), 0);
    const caloriasTotais = historicoFiltrado.reduce((a, r) => a + Math.round(Number(r.calorias) || calcularCaloriasTreino(r)), 0);

    // Volume por treino e por grupo muscular (stacked)
    const allMuscleGroups = new Set<string>();
    const volumeData = [...musculacao]
      .sort((a, b) => a.concluidoEm.localeCompare(b.concluidoEm))
      .map((r) => {
        const entry: Record<string, any> = {
          label: formatDateLabel(getConcluidoDate(r.concluidoEm)),
          volume: calcularVolumeSessao(r.exercicios),
        };
        // Calcular volume por grupo muscular
        r.exercicios.forEach(ex => {
          const grupo = ex.exercicio.grupoMuscular || 'Outros';
          allMuscleGroups.add(grupo);
          entry[grupo] = (entry[grupo] || 0) + calcularVolumeExercicio(ex.series);
        });
        return entry;
      });
    const volumeMuscleGroups = Array.from(allMuscleGroups);

    // Radar: volume total por grupo muscular
    const volumePorGrupoTotal: Record<string, number> = {};
    volumeData.forEach(d => {
      volumeMuscleGroups.forEach(grupo => {
        volumePorGrupoTotal[grupo] = (volumePorGrupoTotal[grupo] || 0) + (d[grupo] || 0);
      });
    });
    const radarVolumeData = volumeMuscleGroups
      .map(grupo => ({ grupo, volume: Math.round(volumePorGrupoTotal[grupo] || 0) }))
      .filter(d => d.volume > 0)
      .sort((a, b) => b.volume - a.volume);

    const exercicioMap = new Map<string, { nome: string; dados: any[] }>();
    [...musculacao]
      .sort((a, b) => a.concluidoEm.localeCompare(b.concluidoEm))
      .forEach((r) => {
        r.exercicios.forEach((ex) => {
          const nome = ex.exercicio.nome;
          if (!exercicioMap.has(nome)) exercicioMap.set(nome, { nome, dados: [] });
          const pesoMax = Math.max(...ex.series.map((s) => (s as any).peso ?? 0), 0);
          const repsMax = Math.max(...ex.series.map((s) => (s as any).repeticoes ?? 0), 0);
          const vol = calcularVolumeExercicio(ex.series);
          const umRMs = ex.series.map(s => calcular1RM((s as any).peso ?? 0, (s as any).repeticoes ?? 0));
          const melhor1RM = Math.max(...umRMs, 0);

          exercicioMap.get(nome)!.dados.push({
            label: formatDateLabel(getConcluidoDate(r.concluidoEm)),
            pesoMax,
            repsMax,
            volume: vol,
            umRM: Number(melhor1RM.toFixed(1))
          });
        });
      });
    const exercicioEvolucaoFull = Array.from(exercicioMap.values())
      .sort((a, b) => b.dados.length - a.dados.length);

    // Carga máxima por exercício + evolução de carga
    const cargaMaxPorExercicio: Record<string, { nome: string; cargaMax: number }> = {};
    const cargaEvolucaoPorExercicio: Record<string, { label: string; cargaMax: number }[]> = {};
    let ultimoExercicioFeito = '';
    const musculacaoOrdenada = [...musculacao].sort((a, b) => a.concluidoEm.localeCompare(b.concluidoEm));
    musculacaoOrdenada.forEach(r => {
      r.exercicios.forEach(ex => {
        const nome = ex.exercicio.nome;
        const pesoMax = Math.max(...ex.series.map(s => (s as any).peso ?? 0), 0);
        if (pesoMax <= 0) return;
        if (!cargaMaxPorExercicio[nome] || pesoMax > cargaMaxPorExercicio[nome].cargaMax) {
          cargaMaxPorExercicio[nome] = { nome, cargaMax: pesoMax };
        }
        if (!cargaEvolucaoPorExercicio[nome]) cargaEvolucaoPorExercicio[nome] = [];
        cargaEvolucaoPorExercicio[nome].push({
          label: formatDateLabel(getConcluidoDate(r.concluidoEm)),
          cargaMax: pesoMax,
        });
        ultimoExercicioFeito = nome;
      });
    });
    const cargaMaxData = Object.values(cargaMaxPorExercicio)
      .filter(d => d.cargaMax > 0)
      .sort((a, b) => b.cargaMax - a.cargaMax);
    const cargaExercicioNomes = cargaMaxData.map(d => d.nome);

    const paceData = [...corrida]
      .sort((a, b) => a.concluidoEm.localeCompare(b.concluidoEm))
      .map((r) => {
        if (!r.corrida?.etapas) return null;
        const dist = calcularDistanciaCorrida(r.corrida.etapas);
        const durMin = r.corrida.etapas.reduce((a, e) => a + (e.duracaoMin ?? 0), 0);
        const pace = calcPace(dist, durMin);
        if (!pace || pace > 20) return null;
        return {
          label: formatDateLabel(getConcluidoDate(r.concluidoEm)),
          pace: Number(pace.toFixed(2)),
          distancia: dist,
        };
      })
      .filter(Boolean) as { label: string; pace: number; distancia: number }[];

    const corridaDistData = [...corrida]
      .sort((a, b) => a.concluidoEm.localeCompare(b.concluidoEm))
      .map((r) => {
        if (!r.corrida?.etapas) return null;
        const dist = calcularDistanciaCorrida(r.corrida.etapas);
        if (!dist) return null;
        return { label: formatDateLabel(getConcluidoDate(r.concluidoEm)), distancia: dist };
      })
      .filter(Boolean) as { label: string; distancia: number }[];

    const natacaoData = [...natacao]
      .sort((a, b) => a.concluidoEm.localeCompare(b.concluidoEm))
      .map((r) => {
        if (!r.natacao?.etapas) return null;
        const dist = calcularDistanciaNatacao(r.natacao.etapas);
        if (!dist) return null;
        return { label: formatDateLabel(getConcluidoDate(r.concluidoEm)), distancia: dist };
      })
      .filter(Boolean) as { label: string; distancia: number }[];

    const natacaoPaceData = [...natacao]
      .sort((a, b) => a.concluidoEm.localeCompare(b.concluidoEm))
      .map((r) => {
        if (!r.natacao?.etapas) return null;
        const distM = calcularDistanciaNatacao(r.natacao.etapas);
        const durMin = r.natacao.etapas.reduce((a, e) => a + (e.duracaoMin ?? 0), 0);
        if (!distM || distM <= 0 || !durMin) return null;
        const pace100m = (durMin / distM) * 100;
        if (pace100m > 20) return null;
        return { label: formatDateLabel(getConcluidoDate(r.concluidoEm)), pace: Number(pace100m.toFixed(2)) };
      })
      .filter(Boolean) as { label: string; pace: number }[];

    const semanasMap = new Map<string, { musculacao: number; corrida: number; natacao: number }>();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const configPeriodo = PERIODOS.find((p) => p.key === periodo)!;
    const numSemanas = Math.min(Math.ceil(configPeriodo.dias / 7), 52);

    for (let i = numSemanas - 1; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - d.getDay() - i * 7);
      const key = toLocalDateStr(d);
      semanasMap.set(key, { musculacao: 0, corrida: 0, natacao: 0 });
    }

    historicoFiltrado.forEach((r) => {
      const d = new Date(r.concluidoEm);
      const sw = startOfWeek(d);
      const key = toLocalDateStr(sw);
      let entry = semanasMap.get(key);
      if (!entry) {
        const sortedKeys = Array.from(semanasMap.keys()).sort();
        const matchingKey = sortedKeys.find(k => {
          const kw = parseDateLocal(k);
          const nextKw = new Date(kw);
          nextKw.setDate(nextKw.getDate() + 7);
          return d >= kw && d < nextKw;
        });
        if (matchingKey) entry = semanasMap.get(matchingKey);
      }
      if (entry) {
        if (r.tipo === 'musculacao') entry.musculacao++;
        else if (r.tipo === 'corrida') entry.corrida++;
        else if (r.tipo === 'natacao') entry.natacao++;
      }
    });

    const frequenciaData = Array.from(semanasMap.entries())
      .map(([date, counts]) => ({ label: formatDateLabel(date), ...counts }));

    const frequenciaFormatada = frequenciaData.map((d, i) => ({
      ...d,
      labelVisible: frequenciaData.length > 12 ? (i % 2 === 0 ? d.label : '') : d.label
    }));

    const melhorVolume = musculacao.length > 0
      ? Math.max(...musculacao.map((r) => calcularVolumeSessao(r.exercicios)))
      : 0;
    const maiorDistCorrida = corrida.length > 0
      ? Math.max(...corrida.map((r) => r.corrida ? calcularDistanciaCorrida(r.corrida.etapas) : 0))
      : 0;
    const maiorDistNatacao = natacao.length > 0
      ? Math.max(...natacao.map((r) => r.natacao ? calcularDistanciaNatacao(r.natacao.etapas) : 0))
      : 0;

    // Streak calculation
    const diasTreinados = new Set(historicoFiltrado.map(r => getConcluidoDate(r.concluidoEm)));
    let streak = 0;
    const hj = new Date();
    hj.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(hj);
      d.setDate(d.getDate() - i);
      if (diasTreinados.has(toLocalDateStr(d))) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // Média de treinos por semana
    const configP = PERIODOS.find((p) => p.key === periodo)!;
    const semanas = Math.max(1, configP.dias / 7);
    const mediaSemanal = total / Math.min(semanas, 52);

    // Muscle distribution data
    const muscleCounts: Record<string, number> = {};
    musculacao.forEach(reg => {
      reg.exercicios?.forEach(ex => {
        if (!ex.exercicio || !ex.series) return;
        const grupo = ex.exercicio.grupoMuscular || 'Outros';
        muscleCounts[grupo] = (muscleCounts[grupo] || 0) + ex.series.length;
      });
    });
    const muscleData = Object.entries(muscleCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Distribuição muscular por semana (stacked bar)
    const muscleWeekMap = new Map<string, Record<string, number>>();
    const allMuscleGroupsWeek = new Set<string>();
    musculacao.forEach(reg => {
      const d = new Date(reg.concluidoEm);
      const sw = startOfWeek(d);
      const weekKey = toLocalDateStr(sw);
      if (!muscleWeekMap.has(weekKey)) muscleWeekMap.set(weekKey, {});
      const weekEntry = muscleWeekMap.get(weekKey)!;
      reg.exercicios?.forEach(ex => {
        if (!ex.exercicio || !ex.series) return;
        const grupo = ex.exercicio.grupoMuscular || 'Outros';
        allMuscleGroupsWeek.add(grupo);
        weekEntry[grupo] = (weekEntry[grupo] || 0) + ex.series.length;
      });
    });
    const muscleWeekData = Array.from(muscleWeekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ label: formatDateLabel(date), ...counts }));
    const muscleWeekGroups = Array.from(allMuscleGroupsWeek);

    return {
      total, musculacao: musculacao.length, corrida: corrida.length, natacao: natacao.length,
      tempoTotal, caloriasTotais, volumeData, volumeMuscleGroups, radarVolumeData, exercicioEvolucaoFull, paceData, corridaDistData,
      natacaoData, natacaoPaceData, frequenciaFormatada, melhorVolume, maiorDistCorrida, maiorDistNatacao,
      cargaMaxData, cargaEvolucaoPorExercicio, cargaExercicioNomes, ultimoExercicioFeito,
      temMaisExercicios: exercicioEvolucaoFull.length > 3,
      streak, mediaSemanal, muscleData, topMuscle: muscleData[0]?.name || '—',
      muscleWeekData, muscleWeekGroups,
    };
  }, [historicoFiltrado, periodo]);

  const heatmapConfig = useMemo(() => {
    const config = PERIODOS.find((p) => p.key === periodo)!;
    let dias = config.dias;

    if (config.key === 'tudo') {
      const datas = historico.map(r => new Date(r.concluidoEm).getTime()).filter(t => !isNaN(t) && isFinite(t));
      if (datas.length === 0) dias = 30;
      else {
        const prim = new Date(Math.min(...datas));
        const dif = Date.now() - prim.getTime();
        dias = Math.ceil(dif / (24 * 60 * 60 * 1000)) + 1;
      }
    } else if (config.key === 'custom') {
      const start = parseDateLocal(dataInicio);
      const end = parseDateLocal(dataFim);
      const diff = end.getTime() - start.getTime();
      dias = (!isNaN(diff) && isFinite(diff)) ? Math.ceil(diff / (24 * 60 * 60 * 1000)) + 1 : 30;
    }

    if (!dias || isNaN(dias) || !isFinite(dias) || dias < 0) dias = 30;
    const totalSemanas = Math.ceil(dias / 7);
    return { dias: totalSemanas * 7, semanas: totalSemanas };
  }, [periodo, dataInicio, dataFim, historico]);

  const heatmap = useMemo(() => gerarHeatmapData(historico, heatmapConfig.dias), [historico, heatmapConfig.dias]);

  // ── Greeting based on time of day ──
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = user?.user_metadata?.display_name?.split(' ')[0] || '';

  if (carregando && historico.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
        <Zap size={48} color={CORES.geral} style={{ animation: 'dash-glowPulse 1.5s infinite' }} />
        <Typography variant="body2" color="text.secondary" sx={{ letterSpacing: '0.05em' }}>
          CARREGANDO ESTATÍSTICAS...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      pb: 4, position: 'relative',
      "& *": { outline: 'none !important', WebkitTapHighlightColor: 'transparent !important' }
    }}>
      {/* ═══ HERO HEADER ═══ */}
      <Box sx={{
        position: 'relative',
        pt: 1.5,
        pb: 3,
        mb: 1,
        overflow: 'hidden',
      }}>
        {/* Gradient orb background */}
        <Box sx={{
          position: 'absolute',
          top: -60,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(CORES.geral, 0.12)} 0%, transparent 70%)`,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }} />
        <Box sx={{
          position: 'absolute',
          top: 20,
          left: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(CORES.musculacao, 0.08)} 0%, transparent 70%)`,
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }} />

        {/* Back + title row */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1.5,
          animation: 'dash-fadeUp 0.4s ease-out',
        }}>
          <IconButton
            onClick={() => navigate(-1)}
            size="small"
            sx={{
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
            }}
          >
            <ArrowLeft size={20} />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{
              color: 'text.secondary',
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',

            }}>
              {saudacao}{firstName ? `, ${firstName}` : ''}
            </Typography>
            <Typography variant="h5" sx={{

              fontWeight: 700,
              fontSize: '1.6rem',
              lineHeight: 1.1,
              background: isDark
                ? `linear-gradient(135deg, #FAFAFA 0%, ${CORES.geral} 100%)`
                : `linear-gradient(135deg, #171717 0%, ${CORES.geral} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              DASHBOARD
            </Typography>
          </Box>
          {stats.streak > 0 && (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'dash-countUp 0.5s ease-out 0.3s both',
            }}>
              <Box sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${alpha(CORES.geral, 0.15)} 0%, ${alpha(CORES.recorde, 0.1)} 100%)`,
                border: `1px solid ${alpha(CORES.geral, 0.2)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
              }}>
                <Flame size={14} color={CORES.geral} />
                <Typography sx={{

                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: CORES.geral,
                  lineHeight: 1,
                  mt: 0.2,
                }}>
                  {stats.streak}
                </Typography>
              </Box>
              <Typography sx={{
                fontSize: '0.5rem',
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                mt: 0.3,
                fontWeight: 600,
              }}>
                Dias Seguidos
              </Typography>
            </Box>
          )}
        </Box>

        {/* ═══ PERIOD FILTER ═══ */}
        <Box sx={{
          display: 'flex',
          gap: 0.5,
          mb: periodo === 'custom' ? 1.5 : 0,
          overflowX: 'auto',
          pb: 0.5,
          animation: 'dash-fadeUp 0.4s ease-out 0.1s both',
          '&::-webkit-scrollbar': { display: 'none' },
        }}>
          {PERIODOS.map((p) => (
            <Box
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              sx={{
                px: 1.5,
                py: 0.6,
                borderRadius: '10px',
                cursor: 'pointer',
                flexShrink: 0,

                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                transition: 'all 0.2s ease',
                ...(periodo === p.key ? {
                  background: `linear-gradient(135deg, ${CORES.geral} 0%, ${alpha(CORES.geral, 0.8)} 100%)`,
                  color: '#000',
                  boxShadow: `0 2px 12px ${alpha(CORES.geral, 0.3)}`,
                } : {
                  bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                  color: 'text.secondary',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    borderColor: alpha(CORES.geral, 0.2),
                  },
                }),
              }}
            >
              {p.label}
            </Box>
          ))}
        </Box>

        {/* Custom date inputs */}
        {periodo === 'custom' && (
          <Box sx={{
            display: 'flex',
            gap: 1,
            animation: 'dash-fadeUp 0.3s ease-out',
          }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{
                display: 'block',
                mb: 0.5,
                ml: 0.2,
                fontSize: '0.6rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 600,
              }}>
                Início
              </Typography>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  fontSize: '0.82rem',

                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  color: 'inherit',
                  outline: 'none',
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{
                display: 'block',
                mb: 0.5,
                ml: 0.2,
                fontSize: '0.6rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 600,
              }}>
                Fim
              </Typography>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  fontSize: '0.82rem',

                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  color: 'inherit',
                  outline: 'none',
                }}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* ═══ STAT CARDS ═══ */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
        mb: 1,
        animation: 'dash-fadeUp 0.5s ease-out 0.15s both',
      }}>
        <GlowStat
          icon={<Zap size={16} />}
          value={stats.total}
          label="Treinos"
          color={CORES.geral}
          isDark={isDark}
        />
        <GlowStat
          icon={<Flame size={16} />}
          value={`${Math.round(stats.caloriasTotais)}`}
          label="Kcal Queimadas"
          color="#FF6B2C"
          isDark={isDark}
        />
        <GlowStat
          icon={<Clock size={16} />}
          value={formatDuracao(stats.tempoTotal)}
          label="Tempo"
          color={CORES.tempo}
          isDark={isDark}
        />
        <GlowStat
          icon={<Target size={16} />}
          value={stats.mediaSemanal > 0 ? `${stats.mediaSemanal.toFixed(1)}` : '-'}
          label="Por Semana"
          color={CORES.recorde}
          isDark={isDark}
        />
      </Box>

      {/* Type breakdown row */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 1,
        mb: 3,
        animation: 'dash-fadeUp 0.5s ease-out 0.2s both',
      }}>
        <TypePill icon={<Dumbbell size={14} />} count={stats.musculacao} color={CORES.musculacao} isDark={isDark} />
        <TypePill icon={<Footprints size={14} />} count={stats.corrida} color={CORES.corrida} isDark={isDark} />
        <TypePill icon={<Waves size={14} />} count={stats.natacao} color={CORES.natacao} isDark={isDark} />
      </Box>

      {/* ═══ HEATMAP ═══ */}
      <Box sx={{ animation: 'dash-fadeUp 0.5s ease-out 0.25s both' }}>
        <SectionHeader
          icon={<Calendar size={15} />}
          title="Atividade"
          badge={periodo === 'tudo' ? 'Histórico completo' : `${heatmapConfig.semanas} semanas`}
          isDark={isDark}
        />
        <Card sx={{ mb: 1, overflow: 'visible', borderRadius: '8px' }}>
          <CardContent sx={{ py: 2, px: 1.5 }}>
            <HeatmapCalendar data={heatmap} totalSemanas={heatmapConfig.semanas} isDark={isDark} />
          </CardContent>
        </Card>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'center' }}>
          <HeatLegend color={CORES.musculacao} label="Musculação" />
          <HeatLegend color={CORES.corrida} label="Corrida" />
          <HeatLegend color={CORES.natacao} label="Natação" />
        </Box>
      </Box>

      {/* ═══ FREQUENCIA SEMANAL ═══ */}
      <Box sx={{ animation: 'dash-fadeUp 0.5s ease-out 0.3s both' }}>
        <SectionHeader icon={<TrendingUp size={15} />} title="Frequência Semanal" isDark={isDark} />
        <Card sx={{ mb: 3, overflow: 'visible', position: 'relative', borderRadius: '8px' }}>
          <CardContent sx={{ py: 2, px: 0.5, overflow: 'visible' }}>
            {stats.frequenciaFormatada.some((d) => d.musculacao + d.corrida + d.natacao > 0) ? (
              <Box sx={{ overflow: 'visible', position: 'relative' }}>
                <ResponsiveContainer width="100%" height={200} style={{ overflow: 'visible', outline: 'none' }}>
                  <BarChart data={stats.frequenciaFormatada} barCategoryGap="20%" style={{ overflow: 'visible' }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                    <XAxis
                      dataKey="labelVisible"
                      tick={{ fontSize: 9, fill: isDark ? '#777' : '#999' }}
                      interval={0}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 9, fill: isDark ? '#555' : '#bbb' }}
                      width={22}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      {...tooltipProps}
                      content={<PortalTooltipWrapper renderContent={(payload: any) => <FreqTooltip active={true} payload={payload} />} />}
                    />
                    <Bar dataKey="musculacao" stackId="a" fill={CORES.musculacao} name="musculacao" radius={[0, 0, 0, 0]} stroke="none" activeBar={{ stroke: 'none' }} />
                    <Bar dataKey="corrida" stackId="a" fill={CORES.corrida} name="corrida" radius={[0, 0, 0, 0]} stroke="none" activeBar={{ stroke: 'none' }} />
                    <Bar dataKey="natacao" stackId="a" fill={CORES.natacao} radius={[0, 0, 0, 0]} name="natacao" stroke="none" activeBar={{ stroke: 'none' }} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <EmptyState text="Nenhum treino concluído neste período" />
            )}
          </CardContent>
        </Card>
      </Box>

      {/* ═══ MUSCULACAO ═══ */}
      {stats.musculacao > 0 && (
        <Box sx={{ animation: 'dash-fadeUp 0.5s ease-out 0.35s both' }}>
          {/* Record highlights */}
          {(stats.melhorVolume > 0 || stats.cargaMaxData.length > 0) && (
            <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
              {stats.melhorVolume > 0 && (
                <RecordBadge
                  icon={<Trophy size={14} />}
                  label="Recorde de Volume"
                  value={`${(stats.melhorVolume / 1000).toFixed(1)}t`}
                  color={CORES.recorde}
                  isDark={isDark}
                />
              )}
              {stats.cargaMaxData.length > 0 && (
                <RecordBadge
                  icon={<Zap size={14} />}
                  label="Carga Máxima"
                  value={`${Math.max(...stats.cargaMaxData.map(d => d.cargaMax))}kg`}
                  color={CORES.musculacao}
                  isDark={isDark}
                />
              )}
            </Box>
          )}

          {/* Volume por treino e por grupo muscular — Radar */}
          <SectionHeader icon={<Dumbbell size={15} />} title="Volume por Grupo Muscular" badge="kg" isDark={isDark} />
          <Card sx={{ mb: 3, overflow: 'visible', borderRadius: '8px' }}>
            <CardContent sx={{ py: 2, px: 0.5 }}>
              {stats.radarVolumeData.length >= 3 ? (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={stats.radarVolumeData}>
                      <PolarGrid
                        stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}
                        gridType="polygon"
                      />
                      <PolarAngleAxis
                        dataKey="grupo"
                        tick={{ fontSize: 9, fontWeight: 600, fill: isDark ? '#aaa' : '#666' }}
                      />
                      <PolarRadiusAxis
                        tick={{ fontSize: 8, fill: isDark ? '#555' : '#bbb' }}
                        axisLine={false}
                        tickCount={4}
                      />
                      <Tooltip
                        {...tooltipProps}
                        content={<PortalTooltipWrapper renderContent={(payload: any) => {
                          if (!payload || !payload.length) return null;
                          const d = payload[0].payload;
                          return (
                            <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 130 }}>
                              <Typography sx={{ color: CORES.musculacao, fontSize: '1rem', fontWeight: 700 }}>
                                {d.volume.toLocaleString('pt-BR')} kg
                              </Typography>
                              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', mt: 0.2 }}>
                                {d.grupo}
                              </Typography>
                            </Box>
                          );
                        }} />}
                      />
                      <Radar
                        dataKey="volume"
                        stroke={CORES.musculacao}
                        strokeWidth={2}
                        fill={CORES.musculacao}
                        fillOpacity={0.2}
                        dot={{ r: 3, fill: CORES.musculacao, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: CORES.musculacao, stroke: '#fff', strokeWidth: 2 }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </>
              ) : stats.radarVolumeData.length > 0 ? (
                // Fallback para poucos grupos: bar horizontal
                <Box sx={{ height: Math.max(100, stats.radarVolumeData.length * 40), width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.radarVolumeData} layout="vertical" margin={{ left: -10, right: 20 }}>
                      <XAxis type="number" tick={{ fontSize: 9, fill: isDark ? '#555' : '#bbb' }} unit="kg" axisLine={false} tickLine={false} />
                      <YAxis dataKey="grupo" type="category" width={70} tick={{ fontSize: 10, fontWeight: 600, fill: isDark ? '#aaa' : '#666' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        {...tooltipProps}
                        content={<PortalTooltipWrapper renderContent={(payload: any) => {
                          if (!payload || !payload.length) return null;
                          const d = payload[0].payload;
                          return (
                            <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 120 }}>
                              <Typography sx={{ color: CORES.musculacao, fontSize: '1rem', fontWeight: 700 }}>{d.volume.toLocaleString('pt-BR')} kg</Typography>
                              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', mt: 0.2 }}>{d.grupo}</Typography>
                            </Box>
                          );
                        }} />}
                      />
                      <Bar dataKey="volume" radius={[0, 4, 4, 0]} stroke="none" activeBar={{ stroke: 'none' }}>
                        {stats.radarVolumeData.map((_, index) => (
                          <Cell key={`rv-${index}`} fill={index === 0 ? CORES.musculacao : alpha(CORES.musculacao, 0.4)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <EmptyState text="Nenhum treino de musculação neste período" />
              )}
            </CardContent>
          </Card>

          {/* Distribuição Muscular por Semana */}
          <SectionHeader
            icon={<Target size={15} />}
            title="Distribuição Muscular por Semana"
            badge={stats.topMuscle !== '—' ? `Foco: ${stats.topMuscle}` : ''}
            isDark={isDark}
          />
          <Card sx={{ mb: 3, borderRadius: '8px', overflow: 'visible' }}>
            <CardContent sx={{ py: 2, px: 0.5 }}>
              {stats.muscleWeekData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.muscleWeekData} barCategoryGap="15%">
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: isDark ? '#666' : '#999' }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: isDark ? '#555' : '#bbb' }} width={28} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        {...tooltipProps}
                        content={<PortalTooltipWrapper renderContent={(payload: any) => {
                          if (!payload || !payload.length) return null;
                          const total = payload.reduce((sum: number, e: any) => sum + (Number(e.value) || 0), 0);
                          return (
                            <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 150 }}>
                              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', mb: 0.5, fontWeight: 600 }}>
                                Semana {payload[0]?.payload?.label}
                              </Typography>
                              {payload.filter((e: any) => e.value > 0).map((e: any, i: number) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.3 }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: 0, bgcolor: e.color }} />
                                  <Typography sx={{ color: '#fff', fontSize: '0.72rem', flex: 1 }}>{e.dataKey}</Typography>
                                  <Typography sx={{ color: '#fff', fontSize: '0.72rem', fontWeight: 700 }}>{e.value} séries</Typography>
                                </Box>
                              ))}
                              <Box sx={{ mt: 0.5, pt: 0.5, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', fontWeight: 700 }}>Total</Typography>
                                <Typography sx={{ color: CORES.geral, fontSize: '0.72rem', fontWeight: 700 }}>{total}</Typography>
                              </Box>
                            </Box>
                          );
                        }} />}
                      />
                      {stats.muscleWeekGroups.map((grupo, i) => (
                        <Bar key={grupo} dataKey={grupo} stackId="muscle" fill={getMuscleColor(i)} radius={[0, 0, 0, 0]} stroke="none" activeBar={{ stroke: 'none' }} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center', mt: 1 }}>
                    {stats.muscleWeekGroups.map((grupo, i) => (
                      <HeatLegend key={grupo} color={getMuscleColor(i)} label={grupo} />
                    ))}
                  </Box>
                </>
              ) : (
                <EmptyState text="Sem dados de distribuição" />
              )}
            </CardContent>
          </Card>

          {/* Volume trend */}
          {stats.volumeData.length >= 2 && (
            <>
              <SectionHeader icon={<TrendingUp size={15} />} title="Tendência de Volume" isDark={isDark} />
              <Card sx={{ mb: 3, overflow: 'visible', borderRadius: '8px' }}>
                <CardContent sx={{ py: 2, px: 0.5 }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={stats.volumeData}>
                      <defs>
                        <linearGradient id="gradVolume" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CORES.musculacao} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={CORES.musculacao} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: isDark ? '#666' : '#999' }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: isDark ? '#555' : '#bbb' }} width={38} axisLine={false} tickLine={false} />
                      <Tooltip
                        {...tooltipProps}
                        content={<PortalTooltipWrapper renderContent={(payload: any) => {
                          if (!payload || !payload.length) return null;
                          const d = payload[0].payload;
                          return (
                            <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 130 }}>
                              <Typography sx={{ color: CORES.musculacao, fontSize: '1.1rem', fontWeight: 700 }}>
                                {d.volume.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
                              </Typography>
                              <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem', mt: 0.2 }}>
                                {d.label}
                              </Typography>
                            </Box>
                          );
                        }} />}
                      />
                      <Area
                        type="monotone" dataKey="volume"
                        stroke={CORES.musculacao} strokeWidth={2.5}
                        fill="url(#gradVolume)"
                        dot={{ r: 3, fill: CORES.musculacao, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: CORES.musculacao, stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}

          {/* Carga máxima por exercício */}
          <SectionHeader icon={<Zap size={15} />} title="Carga Máxima por Exercício" badge="kg" isDark={isDark} />
          <Card sx={{ mb: 3, overflow: 'visible', borderRadius: '8px' }}>
            <CardContent sx={{ py: 2, px: 1 }}>
              {stats.cargaMaxData.length >= 1 ? (() => {
                const exercicioSelecionado = filtroCargaExercicio || stats.ultimoExercicioFeito;
                const evolucaoData = stats.cargaEvolucaoPorExercicio[exercicioSelecionado] || [];
                const cargaMaxDoExercicio = stats.cargaMaxData.find(d => d.nome === exercicioSelecionado)?.cargaMax || 0;
                return (
                  <>
                    {/* Dropdown selector */}
                    <ExercicioSelect
                      exercicios={stats.cargaExercicioNomes}
                      selected={exercicioSelecionado}
                      onChange={(nome) => setFiltroCargaExercicio(nome)}
                      isDark={isDark}
                    />

                    {/* Recorde badge */}
                    {cargaMaxDoExercicio > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5, px: 0.5 }}>
                        <Trophy size={13} color={CORES.recorde} />
                        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                          Recorde: <Box component="span" sx={{ color: CORES.recorde, fontWeight: 700 }}>{cargaMaxDoExercicio} kg</Box>
                        </Typography>
                      </Box>
                    )}

                    {/* Evolução de carga */}
                    {evolucaoData.length >= 2 ? (
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={evolucaoData}>
                          <defs>
                            <linearGradient id="gradCargaEvo" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={CORES.recorde} stopOpacity={0.25} />
                              <stop offset="100%" stopColor={CORES.recorde} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 9, fill: isDark ? '#666' : '#999' }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: isDark ? '#555' : '#bbb' }} width={36} unit="kg" axisLine={false} tickLine={false} />
                          <Tooltip
                            {...tooltipProps}
                            content={<PortalTooltipWrapper renderContent={(payload: any) => {
                              if (!payload || !payload.length) return null;
                              const d = payload[0].payload;
                              return (
                                <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 130 }}>
                                  <Typography sx={{ color: CORES.recorde, fontSize: '1.1rem', fontWeight: 700 }}>
                                    {d.cargaMax} kg
                                  </Typography>
                                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem', mt: 0.2 }}>
                                    {d.label}
                                  </Typography>
                                </Box>
                              );
                            }} />}
                          />
                          <Area
                            type="monotone" dataKey="cargaMax"
                            stroke={CORES.recorde} strokeWidth={2.5}
                            fill="url(#gradCargaEvo)"
                            dot={{ r: 3, fill: CORES.recorde, strokeWidth: 0 }}
                            activeDot={{ r: 5, fill: CORES.recorde, stroke: '#fff', strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : evolucaoData.length === 1 ? (
                      <Box sx={{ textAlign: 'center', py: 2 }}>
                        <Typography sx={{ fontSize: '1.3rem', fontWeight: 700, color: CORES.recorde }}>{evolucaoData[0].cargaMax} kg</Typography>
                        <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', mt: 0.3 }}>{evolucaoData[0].label} — apenas 1 registro</Typography>
                      </Box>
                    ) : (
                      <EmptyState text="Nenhum registro para este exercício" />
                    )}
                  </>
                );
              })() : (
                <EmptyState text="Nenhum treino com carga registrada" />
              )}
            </CardContent>
          </Card>

          {/* Evolucao por exercicio */}
          {stats.exercicioEvolucaoFull.length > 0 && (() => {
            const evolNomes = stats.exercicioEvolucaoFull.map(e => e.nome);
            const evolSelecionado = filtroEvolucaoExercicio && evolNomes.includes(filtroEvolucaoExercicio)
              ? filtroEvolucaoExercicio
              : stats.ultimoExercicioFeito && evolNomes.includes(stats.ultimoExercicioFeito)
                ? stats.ultimoExercicioFeito
                : evolNomes[0];
            const exData = stats.exercicioEvolucaoFull.find(e => e.nome === evolSelecionado);
            return (
              <>
                <SectionHeader icon={<TrendingUp size={15} />} title="Evolução por Exercício" isDark={isDark} />
                <Card sx={{ mb: 3, overflow: 'visible', borderRadius: '8px' }}>
                  <CardContent sx={{ py: 2, px: 1.2 }}>
                    <ExercicioSelect
                      exercicios={evolNomes}
                      selected={evolSelecionado}
                      onChange={(nome) => setFiltroEvolucaoExercicio(nome)}
                      isDark={isDark}
                    />
                    {exData && <ExerciseCard ex={exData} idx={0} isDark={isDark} inline />}
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </Box>
      )}

      {/* ═══ CORRIDA ═══ */}
      {stats.corrida > 0 && (
        <Box sx={{ animation: 'dash-fadeUp 0.5s ease-out 0.4s both' }}>
          {/* Highlights */}
          {(stats.paceData.length > 0 || stats.maiorDistCorrida > 0) && (
            <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
              {stats.paceData.length > 0 && (
                <RecordBadge
                  icon={<Zap size={14} />}
                  label="Melhor Pace"
                  value={`${formatPace(Math.min(...stats.paceData.map((d) => d.pace)))} /km`}
                  color={CORES.corrida}
                  isDark={isDark}
                />
              )}
              {stats.maiorDistCorrida > 0 && (
                <RecordBadge
                  icon={<Trophy size={14} />}
                  label="Maior Distância"
                  value={`${stats.maiorDistCorrida.toFixed(1)} km`}
                  color={CORES.recorde}
                  isDark={isDark}
                />
              )}
            </Box>
          )}

          <SectionHeader icon={<Footprints size={15} />} title="Evolução de Pace" badge="min/km" isDark={isDark} />
          <Card sx={{ mb: 3, overflow: 'visible', borderRadius: '8px' }}>
            <CardContent sx={{ py: 2, px: 0.5 }}>
              {stats.paceData.length >= 2 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={stats.paceData}>
                    <defs>
                      <linearGradient id="gradPace" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CORES.corrida} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={CORES.corrida} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: isDark ? '#666' : '#999' }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: isDark ? '#555' : '#bbb' }} width={34} reversed domain={['dataMin - 0.5', 'dataMax + 0.5']} axisLine={false} tickLine={false} />
                    <Tooltip
                      {...tooltipProps}
                      content={<PortalTooltipWrapper renderContent={(payload: any) => {
                        if (!payload || !payload.length) return null;
                        const d = payload[0].payload;
                        return (
                          <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 120 }}>
                            <Typography sx={{ color: CORES.corrida, fontSize: '1.1rem', fontWeight: 700 }}>
                              {formatPace(d.pace)} /km
                            </Typography>
                            {d.distancia > 0 && (
                              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', mt: 0.3 }}>
                                {d.distancia.toFixed(1)} km percorrido(s)
                              </Typography>
                            )}
                          </Box>
                        );
                      }} />}
                    />
                    <Area
                      type="monotone" dataKey="pace"
                      stroke={CORES.corrida} strokeWidth={2.5}
                      fill="url(#gradPace)"
                      dot={{ r: 3, fill: CORES.corrida, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: CORES.corrida, stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState text="Complete pelo menos 2 corridas com distância" />
              )}
            </CardContent>
          </Card>

          {/* Distancia corrida */}
          {stats.corridaDistData.length >= 2 && (
            <>
              <SectionHeader icon={<TrendingUp size={15} />} title="Distância por Corrida" badge="km" isDark={isDark} />
              <Card sx={{ mb: 3, overflow: 'visible', borderRadius: '8px' }}>
                <CardContent sx={{ py: 2, px: 0.5 }}>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={stats.corridaDistData} barCategoryGap="15%">
                      <defs>
                        <linearGradient id="gradDistCorr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CORES.corrida} stopOpacity={1} />
                          <stop offset="100%" stopColor={CORES.corrida} stopOpacity={0.4} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: isDark ? '#666' : '#999' }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: isDark ? '#555' : '#bbb' }} width={33} unit="km" axisLine={false} tickLine={false} />
                      <Tooltip
                        {...tooltipProps}
                        content={<PortalTooltipWrapper renderContent={(payload: any) => {
                          if (!payload || !payload.length) return null;
                          const d = payload[0].payload;
                          return (
                            <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 130 }}>
                              <Typography sx={{ color: CORES.corrida, fontSize: '1.1rem', fontWeight: 700 }}>
                                {d.distancia} km
                              </Typography>
                              <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem', mt: 0.2 }}>
                                {d.label}
                              </Typography>
                            </Box>
                          );
                        }} />}
                      />
                      <Bar dataKey="distancia" fill="url(#gradDistCorr)" radius={[0, 0, 0, 0]} stroke="none" activeBar={{ stroke: 'none' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </Box>
      )}

      {/* ═══ NATACAO ═══ */}
      {stats.natacao > 0 && (
        <Box sx={{ animation: 'dash-fadeUp 0.5s ease-out 0.45s both' }}>
          {/* Highlights */}
          {(stats.maiorDistNatacao > 0 || stats.natacaoPaceData.length > 0) && (
            <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
              {stats.maiorDistNatacao > 0 && (
                <RecordBadge
                  icon={<Trophy size={14} />}
                  label="Maior Distância"
                  value={`${stats.maiorDistNatacao} m`}
                  color={CORES.natacao}
                  isDark={isDark}
                />
              )}
              {stats.natacaoPaceData.length > 0 && (
                <RecordBadge
                  icon={<Zap size={14} />}
                  label="Melhor Pace"
                  value={`${formatPace(Math.min(...stats.natacaoPaceData.map((d) => d.pace)))} /100m`}
                  color={CORES.tempo}
                  isDark={isDark}
                />
              )}
            </Box>
          )}

          <SectionHeader icon={<Waves size={15} />} title="Evolução Natação" badge="metros" isDark={isDark} />
          <Card sx={{ mb: 3, overflow: 'visible', borderRadius: '8px' }}>
            <CardContent sx={{ py: 2, px: 0.5 }}>
              {stats.natacaoData.length >= 2 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={stats.natacaoData}>
                    <defs>
                      <linearGradient id="gradNatacao" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CORES.natacao} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={CORES.natacao} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: isDark ? '#666' : '#999' }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: isDark ? '#555' : '#bbb' }} width={42} unit="m" axisLine={false} tickLine={false} />
                    <Tooltip
                      {...tooltipProps}
                      content={<PortalTooltipWrapper renderContent={(payload: any) => {
                        if (!payload || !payload.length) return null;
                        const d = payload[0].payload;
                        return (
                          <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 120 }}>
                            <Typography sx={{ color: CORES.natacao, fontSize: '1.1rem', fontWeight: 700 }}>
                              {d.distancia} m
                            </Typography>
                            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem', mt: 0.2 }}>
                              {d.label}
                            </Typography>
                          </Box>
                        );
                      }} />}
                    />
                    <Area
                      type="monotone" dataKey="distancia"
                      stroke={CORES.natacao} strokeWidth={2.5}
                      fill="url(#gradNatacao)"
                      dot={{ r: 3, fill: CORES.natacao, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: CORES.natacao, stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState text="Complete pelo menos 2 treinos de natação com distância" />
              )}
            </CardContent>
          </Card>

          {/* Pace natacao */}
          {stats.natacaoPaceData.length >= 2 && (
            <>
              <SectionHeader icon={<TrendingUp size={15} />} title="Pace Natação" badge="min/100m" isDark={isDark} />
              <Card sx={{ mb: 3, overflow: 'visible', borderRadius: '8px' }}>
                <CardContent sx={{ py: 2, px: 0.5 }}>
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={stats.natacaoPaceData}>
                      <defs>
                        <linearGradient id="gradNatPace" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CORES.natacao} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={CORES.natacao} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: isDark ? '#666' : '#999' }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: isDark ? '#555' : '#bbb' }} width={30} reversed domain={['dataMin - 0.3', 'dataMax + 0.3']} axisLine={false} tickLine={false} />
                      <Tooltip
                        {...tooltipProps}
                        content={<PortalTooltipWrapper renderContent={(payload: any) => {
                          if (!payload || !payload.length) return null;
                          const d = payload[0].payload;
                          return (
                            <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 120 }}>
                              <Typography sx={{ color: CORES.natacao, fontSize: '1.1rem', fontWeight: 700 }}>
                                {formatPace(d.pace)} /100m
                              </Typography>
                              <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem', mt: 0.2 }}>
                                {d.label}
                              </Typography>
                            </Box>
                          );
                        }} />}
                      />
                      <Area
                        type="monotone" dataKey="pace"
                        stroke={CORES.natacao} strokeWidth={2.5}
                        fill="url(#gradNatPace)"
                        dot={{ r: 3, fill: CORES.natacao, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: CORES.natacao, stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

// ══════════════════════════════════════════════════
// ── SUB-COMPONENTS ──────────────────────────────
// ══════════════════════════════════════════════════

function ExercicioSelect({ exercicios, selected, onChange, isDark }: {
  exercicios: string[]; selected: string; onChange: (nome: string) => void; isDark: boolean;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <Box sx={{ position: 'relative', mb: 1.5, px: 0.5 }}>
      {/* Botão selector */}
      <Box
        onClick={() => setAberto(!aberto)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
          borderRadius: '10px',
          cursor: 'pointer',
          bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
            borderColor: alpha(CORES.recorde, 0.3),
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Dumbbell size={14} color={CORES.recorde} />
          <Typography sx={{
            fontSize: '0.8rem',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {selected}
          </Typography>
        </Box>
        {aberto ? <ChevronUp size={16} color={isDark ? '#888' : '#666'} /> : <ChevronDown size={16} color={isDark ? '#888' : '#666'} />}
      </Box>

      {/* Lista dropdown */}
      {aberto && (
        <Box sx={{
          position: 'absolute',
          top: '100%',
          left: 4,
          right: 4,
          mt: 0.5,
          zIndex: 50,
          bgcolor: isDark ? 'rgba(18,18,18,0.98)' : 'rgba(255,255,255,0.98)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          borderRadius: '10px',
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(12px)',
          maxHeight: 240,
          overflowY: 'auto',
          py: 0.5,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
            borderRadius: 2,
          },
        }}>
          {exercicios.map((nome) => (
            <Box
              key={nome}
              onClick={() => { onChange(nome); setAberto(false); }}
              sx={{
                px: 1.5,
                py: 0.8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                transition: 'all 0.15s ease',
                bgcolor: nome === selected ? alpha(CORES.recorde, isDark ? 0.12 : 0.08) : 'transparent',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                },
              }}
            >
              {nome === selected && (
                <Box sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: CORES.recorde, flexShrink: 0 }} />
              )}
              <Typography sx={{
                fontSize: '0.75rem',
                fontWeight: nome === selected ? 700 : 400,
                color: nome === selected ? (isDark ? '#fff' : '#111') : 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {nome}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

function GlowStat({ icon, value, label, color, isDark }: {
  icon: React.ReactNode; value: string | number; label: string; color: string; isDark: boolean;
}) {
  return (
    <Box sx={{
      position: 'relative',
      borderRadius: '5px',
      p: '1px',
      background: `linear-gradient(135deg, ${alpha(color, 0.3)} 0%, ${alpha(color, 0.05)} 100%)`,
      overflow: 'visible',
    }}>
      <Box sx={{
        borderRadius: '5px',
        bgcolor: isDark ? 'rgba(10,10,10,0.9)' : 'rgba(255,255,255,0.95)',
        py: 1.5,
        px: 1.2,
        textAlign: 'center',
        position: 'relative',
        overflow: 'visible',
      }}>
        {/* Subtle glow */}
        <Box sx={{
          position: 'absolute',
          top: -15,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 60,
          height: 30,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(color, 0.15)} 0%, transparent 70%)`,
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }} />
        <Box sx={{ color, mb: 0.5, display: 'flex', justifyContent: 'center' }}>
          {icon}
        </Box>
        <Typography sx={{

          fontSize: '1.3rem',
          fontWeight: 700,
          lineHeight: 1,
          color: isDark ? '#FAFAFA' : '#171717',
        }}>
          {value}
        </Typography>
        <Typography sx={{
          fontSize: '0.52rem',
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 600,
          mt: 0.3,
        }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

function TypePill({ icon, count, color, isDark }: {
  icon: React.ReactNode; count: number; color: string; isDark: boolean;
}) {
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 0.7,
      py: 0.8,
      px: 1,
      borderRadius: '5px',
      bgcolor: alpha(color, isDark ? 0.08 : 0.06),
      border: `1px solid ${alpha(color, isDark ? 0.12 : 0.1)}`,
      justifyContent: 'center',
    }}>
      <Box sx={{ color, display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Typography sx={{

        fontSize: '0.9rem',
        fontWeight: 700,
        color,
        lineHeight: 1,
      }}>
        {count}
      </Typography>
    </Box>
  );
}

function RecordBadge({ icon, label, value, color, isDark }: {
  icon: React.ReactNode; label: string; value: string; color: string; isDark: boolean;
}) {
  return (
    <Box sx={{
      flex: 1,
      borderRadius: '6px',
      p: '1px',
      background: `linear-gradient(135deg, ${alpha(color, 0.35)} 0%, ${alpha(color, 0.08)} 100%)`,
    }}>
      <Box sx={{
        borderRadius: '5px',
        bgcolor: isDark ? 'rgba(10,10,10,0.92)' : 'rgba(255,255,255,0.96)',
        py: 1.5,
        px: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.2,
      }}>
        <Box sx={{
          width: 36,
          height: 36,
          borderRadius: '4px',
          background: `linear-gradient(135deg, ${alpha(color, 0.2)} 0%, ${alpha(color, 0.08)} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          flexShrink: 0,
        }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{

            fontSize: '1.1rem',
            fontWeight: 700,
            lineHeight: 1,
            color: isDark ? '#FAFAFA' : '#171717',
          }}>
            {value}
          </Typography>
          <Typography sx={{
            fontSize: '0.52rem',
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 600,
            mt: 0.2,
          }}>
            {label}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function SectionHeader({ icon, title, badge, isDark }: {
  icon: React.ReactNode; title: string; badge?: string; isDark: boolean;
}) {
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 0.8,
      mb: 1,
    }}>
      <Box sx={{ color: CORES.geral, display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Typography sx={{

        fontSize: '0.9rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
      }}>
        {title}
      </Typography>
      <Box sx={{
        flex: 1,
        height: '1px',
        background: isDark
          ? 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, transparent 100%)'
          : 'linear-gradient(90deg, rgba(0,0,0,0.08) 0%, transparent 100%)',
        mx: 0.5,
      }} />
      {badge && (
        <Typography sx={{
          fontSize: '0.58rem',
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
          bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          px: 0.8,
          py: 0.2,
          borderRadius: '4px',
        }}>
          {badge}
        </Typography>
      )}
    </Box>
  );
}

function ExerciseCard({ ex, idx, isDark, inline }: { ex: any; idx: number; isDark: boolean; inline?: boolean }) {
  const bestPeso = Math.max(...ex.dados.map((d: any) => d.pesoMax));
  const bestReps = Math.max(...ex.dados.map((d: any) => d.repsMax));

  // Dados com label de treino sequencial (Treino 1, Treino 2...)
  const dadosComTreino = ex.dados.map((d: any, i: number) => ({
    ...d,
    treino: `T${i + 1}`,
    treinoFull: `Treino ${i + 1}`,
  }));

  const content = (
    <>
        {/* Header row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{
            width: 32,
            height: 32,
            borderRadius: '4px',
            background: `linear-gradient(135deg, ${alpha(CORES.musculacao, 0.15)} 0%, ${alpha(CORES.musculacao, 0.05)} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Dumbbell size={14} color={CORES.musculacao} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{
              fontWeight: 700,
              fontSize: '0.78rem',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {ex.nome}
            </Typography>
            <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary' }}>
              {ex.dados.length} treino{ex.dados.length > 1 ? 's' : ''} registrado{ex.dados.length > 1 ? 's' : ''}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.2, flexShrink: 0 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: CORES.musculacao,
                lineHeight: 1,
              }}>
                {bestPeso}
              </Typography>
              <Typography sx={{ fontSize: '0.45rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                kg max
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: CORES.recorde,
                lineHeight: 1,
              }}>
                {bestReps}
              </Typography>
              <Typography sx={{ fontSize: '0.45rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                reps max
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Chart: barras de peso + linha de reps */}
        {ex.dados.length >= 2 ? (
          <>
            <ResponsiveContainer width="100%" height={130}>
              <ComposedChart data={dadosComTreino}>
                <defs>
                  <linearGradient id={`gradExBar_${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CORES.musculacao} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={CORES.musculacao} stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                <XAxis dataKey="treino" tick={{ fontSize: 8, fill: isDark ? '#555' : '#bbb' }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="peso"
                  tick={{ fontSize: 8, fill: isDark ? '#444' : '#ccc' }}
                  width={32}
                  unit="kg"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="reps"
                  orientation="right"
                  tick={{ fontSize: 8, fill: isDark ? '#444' : '#ccc' }}
                  width={28}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  {...tooltipProps}
                  content={<PortalTooltipWrapper renderContent={(payload: any) => {
                    if (!payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 140 }}>
                        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem', fontWeight: 600, mb: 0.3 }}>
                          {d.treinoFull} — {d.label}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.3 }}>
                          <Box sx={{ width: 8, height: 8, bgcolor: CORES.musculacao, borderRadius: 0 }} />
                          <Typography sx={{ color: CORES.musculacao, fontSize: '0.9rem', fontWeight: 700 }}>
                            {d.pesoMax} kg
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <Box sx={{ width: 8, height: 8, bgcolor: CORES.recorde, borderRadius: '50%' }} />
                          <Typography sx={{ color: CORES.recorde, fontSize: '0.9rem', fontWeight: 700 }}>
                            {d.repsMax} reps
                          </Typography>
                        </Box>
                      </Box>
                    );
                  }} />}
                />
                <Bar
                  yAxisId="peso"
                  dataKey="pesoMax"
                  fill={`url(#gradExBar_${idx})`}
                  radius={[3, 3, 0, 0]}
                  barSize={20}
                  stroke="none"
                  activeBar={{ stroke: 'none' }}
                />
                <Line
                  yAxisId="reps"
                  type="monotone"
                  dataKey="repsMax"
                  stroke={CORES.recorde}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: CORES.recorde, strokeWidth: 2, stroke: isDark ? '#111' : '#fff' }}
                  activeDot={{ r: 6, fill: CORES.recorde, stroke: '#fff', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 0.5 }}>
              <HeatLegend color={CORES.musculacao} label="Peso (kg)" />
              <HeatLegend color={CORES.recorde} label="Repetições" />
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', py: 1 }}>
            {ex.dados.map((d: any, i: number) => (
              <Box key={i} sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{d.label}</Typography>
                <Typography variant="body2" fontWeight={600}>{d.pesoMax} kg x {d.repsMax} reps</Typography>
              </Box>
            ))}
          </Box>
        )}
    </>
  );

  if (inline) return content;

  return (
    <Card sx={{ mb: 2, overflow: 'visible', borderRadius: '8px' }}>
      <CardContent sx={{ py: 1.5, px: 1.2 }}>
        {content}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Box sx={{
      textAlign: 'center',
      py: 4,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 1,
    }}>
      <Box sx={{ opacity: 0.2 }}>
        <Target size={32} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.6, fontSize: '0.82rem' }}>
        {text}
      </Typography>
    </Box>
  );
}

function HeatLegend({ color, label }: { color: string; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{
        width: 10,
        height: 10,
        borderRadius: '3px',
        bgcolor: color,
        boxShadow: `0 0 6px ${alpha(color, 0.3)}`,
      }} />
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{label}</Typography>
    </Box>
  );
}

function FreqTooltip(props: any) {
  const { active, payload, label: weekLabel } = props;
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum: number, entry: any) => sum + (Number(entry.value) || 0), 0);
  return (
    <Box sx={{
      ...tooltipStyle,
      p: 2,
      minWidth: 160,
      borderRadius: '0 !important',
    }}>
      <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', mb: 0.8, fontWeight: 600 }}>
        Semana {weekLabel}
      </Typography>
      {payload.map((entry: any, index: number) => {
        if (!entry.value) return null;
        const lbl = entry.name === 'musculacao' ? 'Musculação' : entry.name === 'corrida' ? 'Corrida' : 'Natação';
        return (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.4 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: 0, bgcolor: entry.color, boxShadow: `0 0 4px ${entry.color}` }} />
            <Typography sx={{ color: '#fff', fontSize: '0.75rem', flex: 1 }}>{lbl}</Typography>
            <Typography sx={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>{entry.value}</Typography>
          </Box>
        );
      })}
      <Box sx={{
        mt: 0.8,
        pt: 0.8,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 700 }}>Total</Typography>
        <Typography sx={{ color: CORES.geral, fontSize: '0.75rem', fontWeight: 700 }}>{total}</Typography>
      </Box>
    </Box>
  );
}

function HeatmapCalendar({ data, totalSemanas, isDark }: { data: HeatmapCell[]; totalSemanas: number; isDark: boolean }) {
  const cellSize = 13;
  const gap = 2.5;
  const weeks = totalSemanas || Math.ceil(data.length / 7);

  const dataMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    data.forEach(d => map.set(`${d.weekIndex}-${d.dayOfWeek}`, d));
    return map;
  }, [data]);

  const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <Box sx={{ overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
      <Box sx={{ display: 'flex', gap: `${gap}px` }}>
        {/* Day labels */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${gap}px`, mr: 0.5 }}>
          {diasSemana.map((d, i) => (
            <Typography
              key={i}
              sx={{
                fontSize: '0.48rem',
                height: cellSize,
                lineHeight: `${cellSize}px`,
                textAlign: 'right',
                width: 12,
                color: 'text.secondary',
                fontWeight: 600,

                letterSpacing: '0.03em',
              }}
            >
              {i % 2 === 1 ? d : ''}
            </Typography>
          ))}
        </Box>

        {/* Weeks */}
        {Array.from({ length: weeks }).map((_, weekIdx) => (
          <Box key={weekIdx} sx={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
            {Array.from({ length: 7 }).map((_, dayIdx) => {
              const item = dataMap.get(`${weekIdx}-${dayIdx}`);
              if (!item) {
                return <Box key={dayIdx} sx={{ width: cellSize, height: cellSize }} />;
              }

              let bg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
              let shadow = 'none';
              if (item.count > 0) {
                const cor = corDominante(item.tipos);
                const intensity = Math.min(0.35 + (item.count - 1) * 0.3, 1);
                const r = parseInt(cor.slice(1, 3), 16);
                const g = parseInt(cor.slice(3, 5), 16);
                const b = parseInt(cor.slice(5, 7), 16);
                bg = `rgba(${r}, ${g}, ${b}, ${intensity})`;
                shadow = `0 0 ${3 + item.count * 2}px rgba(${r}, ${g}, ${b}, ${intensity * 0.4})`;
              }

              return (
                <Box
                  key={dayIdx}
                  title={`${formatDateLabel(item.date)} — ${item.count} treino${item.count !== 1 ? 's' : ''}`}
                  sx={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: '2px',
                    bgcolor: bg,
                    boxShadow: shadow,
                    transition: 'all 0.2s ease',
                  }}
                />
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
