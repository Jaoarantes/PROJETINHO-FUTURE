import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, IconButton, useTheme, alpha } from '@mui/material';
import {
  ArrowLeft, Dumbbell, Footprints, Waves, Calendar, TrendingUp,
  Clock, Flame, Zap, Trophy, Target, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { useTreinoStore } from '../store/treinoStore';
import { useAuthContext } from '../contexts/AuthContext';
import { computeAllTimePRs } from '../utils/prSystem';
import {
  calcularVolumeSessao, calcularVolumeExercicio,
  calcularDistanciaCorrida, calcularDistanciaNatacao,
} from '../types/treino';
import type { RegistroTreino } from '../types/treino';
import { calcularCaloriasTreino } from '../utils/calorieCalculator';
import {
  CORES,
  PERIODOS,
  calcPace,
  calcular1RM,
  formatDateLabel,
  formatDuracao,
  formatPace,
  gerarHeatmapData,
  getConcluidoDate,
  getMuscleColor,
  getStorageKey,
  injectKeyframes,
  parseDateLocal,
  startOfWeek,
  toLocalDateStr,
  tooltipProps,
  tooltipStyle,
  type PeriodoKey,
} from '../components/dashboard/dashboardUtils';
import { FreqTooltip, InlineTooltip, LazyChart } from '../components/dashboard/DashboardChartHelpers';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, CartesianGrid, Cell, ComposedChart,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { EmptyState, GlowStat, HeatLegend, RecordBadge, SectionHeader, TypePill } from '../components/dashboard/DashboardPrimitives';
import HeatmapCalendar from '../components/dashboard/HeatmapCalendar';
import ExercicioSelect from '../components/dashboard/ExercicioSelect';
import MedalList from '../components/dashboard/MedalList';
import {
  MARCAS_PRINCIPAIS,
  calcPaceMarca,
  calcularTempoEtapas,
  calcularTempoSplits,
  formatarTempoMarca,
  getNomesStrava,
} from '../components/dashboard/bestEffortsUtils';

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
  const [showCargaMax, setShowCargaMax] = useState(false);
  const [showVolumeMax, setShowVolumeMax] = useState(false);
  const [showPaceCorrida, setShowPaceCorrida] = useState(false);
  const [showDistCorrida, setShowDistCorrida] = useState(false);
  const [showPaceNatacao, setShowPaceNatacao] = useState(false);
  const [showDistNatacao, setShowDistNatacao] = useState(false);

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
            dataISO: r.concluidoEm,
            pesoMax,
            repsMax,
            volume: vol,
            series: ex.series.length,
            umRM: Number(melhor1RM.toFixed(1))
          });
        });
      });
    const exercicioEvolucaoFull = Array.from(exercicioMap.values())
      .sort((a, b) => b.dados.length - a.dados.length);

    // Carga máxima por exercício + evolução de carga
    const cargaMaxPorExercicio: Record<string, { nome: string; cargaMax: number; data: string }> = {};
    const cargaEvolucaoPorExercicio: Record<string, { label: string; cargaMax: number }[]> = {};
    let ultimoExercicioFeito = '';
    const musculacaoOrdenada = [...musculacao].sort((a, b) => a.concluidoEm.localeCompare(b.concluidoEm));
    musculacaoOrdenada.forEach(r => {
      r.exercicios.forEach(ex => {
        const nome = ex.exercicio.nome;
        const pesoMax = Math.max(...ex.series.map(s => (s as any).peso ?? 0), 0);
        if (pesoMax <= 0) return;
        if (!cargaMaxPorExercicio[nome] || pesoMax > cargaMaxPorExercicio[nome].cargaMax) {
          cargaMaxPorExercicio[nome] = { nome, cargaMax: pesoMax, data: r.concluidoEm };
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

    let melhorVolume = 0;
    let melhorVolumeInfo = { nome: '', data: '' };
    musculacao.forEach(r => {
      const vol = calcularVolumeSessao(r.exercicios);
      if (vol > melhorVolume) {
        melhorVolume = vol;
        melhorVolumeInfo = { nome: r.nome || 'Treino sem nome', data: r.concluidoEm };
      }
    });
    let maiorDistCorrida = 0;
    let maiorDistCorridaInfo = { nome: '', data: '' };
    let melhorPaceCorrida = Infinity;
    let melhorPaceCorridaInfo = { nome: '', data: '', distancia: 0 };
    corrida.forEach(r => {
      if (!r.corrida?.etapas) return;
      const dist = calcularDistanciaCorrida(r.corrida.etapas);
      if (dist > maiorDistCorrida) {
        maiorDistCorrida = dist;
        maiorDistCorridaInfo = { nome: r.nome || 'Corrida', data: r.concluidoEm };
      }
      const durMin = r.corrida.etapas.reduce((a, e) => a + (e.duracaoMin ?? 0), 0);
      const pace = calcPace(dist, durMin);
      if (pace && pace < melhorPaceCorrida && pace <= 20) {
        melhorPaceCorrida = pace;
        melhorPaceCorridaInfo = { nome: r.nome || 'Corrida', data: r.concluidoEm, distancia: dist };
      }
    });

    let maiorDistNatacao = 0;
    let maiorDistNatacaoInfo = { nome: '', data: '' };
    let melhorPaceNatacao = Infinity;
    let melhorPaceNatacaoInfo = { nome: '', data: '', distancia: 0 };
    natacao.forEach(r => {
      if (!r.natacao?.etapas) return;
      const dist = calcularDistanciaNatacao(r.natacao.etapas);
      if (dist > maiorDistNatacao) {
        maiorDistNatacao = dist;
        maiorDistNatacaoInfo = { nome: r.nome || 'Natação', data: r.concluidoEm };
      }
      const durMin = r.natacao.etapas.reduce((a, e) => a + (e.duracaoMin ?? 0), 0);
      if (dist > 0 && durMin > 0) {
        const pace100m = (durMin / dist) * 100;
        if (pace100m < melhorPaceNatacao && pace100m <= 20) {
          melhorPaceNatacao = pace100m;
          melhorPaceNatacaoInfo = { nome: r.nome || 'Natação', data: r.concluidoEm, distancia: dist };
        }
      }
    });

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
      natacaoData, natacaoPaceData, frequenciaFormatada, melhorVolume, melhorVolumeInfo,
      maiorDistCorrida, maiorDistCorridaInfo, melhorPaceCorridaInfo,
      maiorDistNatacao, maiorDistNatacaoInfo, melhorPaceNatacaoInfo,
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
        <Zap size={48} color={CORES.geral} style={{ animation: 'dash-glowPulse 2.5s infinite' }} />
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
          animation: 'dash-fadeUp 0.15s ease-out',
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
              animation: 'dash-countUp 0.2s ease-out both',
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
          animation: 'dash-fadeUp 0.15s ease-out 0.1s both',
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
            animation: 'dash-fadeUp 0.15s ease-out',
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
        animation: 'dash-fadeUp 0.15s ease-out both',
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
        animation: 'dash-fadeUp 0.15s ease-out both',
      }}>
        <TypePill icon={<Dumbbell size={14} />} count={stats.musculacao} color={CORES.musculacao} isDark={isDark} />
        <TypePill icon={<Footprints size={14} />} count={stats.corrida} color={CORES.corrida} isDark={isDark} />
        <TypePill icon={<Waves size={14} />} count={stats.natacao} color={CORES.natacao} isDark={isDark} />
      </Box>

      {/* ═══ HEATMAP ═══ */}
      <Box sx={{ animation: 'dash-fadeUp 0.15s ease-out both' }}>
        <SectionHeader
          icon={<Calendar size={15} />}
          title="Atividade"
          badge={periodo === 'tudo' ? 'Histórico completo' : `${heatmapConfig.semanas} semanas`}
          isDark={isDark}
        />
        <Card sx={{ mb: 1, overflow: 'hidden', borderRadius: '8px' }}>
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
      <Box sx={{ animation: 'dash-fadeUp 0.15s ease-out both' }}>
        <SectionHeader icon={<TrendingUp size={15} />} title="Frequência Semanal" isDark={isDark} />
        <Card sx={{ mb: 3, overflow: 'hidden', position: 'relative', borderRadius: '8px' }}>
          <CardContent sx={{ py: 2, px: 0.5 }}>
            {stats.frequenciaFormatada.some((d) => d.musculacao + d.corrida + d.natacao > 0) ? (
              <Box sx={{ position: 'relative' }}>
                <LazyChart height={200}><ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.frequenciaFormatada} barCategoryGap="20%">
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
                      content={<InlineTooltip renderContent={(payload: any) => <FreqTooltip active={true} payload={payload} />} />}
                    />
                    <Bar dataKey="musculacao" stackId="a" fill={CORES.musculacao} name="musculacao" radius={[0, 0, 0, 0]} stroke="none" activeBar={{ stroke: 'none' }} />
                    <Bar dataKey="corrida" stackId="a" fill={CORES.corrida} name="corrida" radius={[0, 0, 0, 0]} stroke="none" activeBar={{ stroke: 'none' }} />
                    <Bar dataKey="natacao" stackId="a" fill={CORES.natacao} radius={[0, 0, 0, 0]} name="natacao" stroke="none" activeBar={{ stroke: 'none' }} />
                  </BarChart>
                </ResponsiveContainer></LazyChart>
              </Box>
            ) : (
              <EmptyState text="Nenhum treino concluído neste período" />
            )}
          </CardContent>
        </Card>
      </Box>

      {/* ═══ MUSCULACAO ═══ */}
      {stats.musculacao > 0 && (
        <Box sx={{ animation: 'dash-fadeUp 0.15s ease-out both' }}>
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
                  onClick={() => setShowVolumeMax(v => !v)}
                />
              )}
              {stats.cargaMaxData.length > 0 && (() => {
                const top = stats.cargaMaxData[0];
                return (
                  <>
                    <RecordBadge
                      icon={<Zap size={14} />}
                      label="Carga Máxima"
                      value={`${top.cargaMax}kg`}
                      color={CORES.musculacao}
                      isDark={isDark}
                      onClick={() => setShowCargaMax(v => !v)}
                    />
                  </>
                );
              })()}
            </Box>
          )}
          {showVolumeMax && stats.melhorVolume > 0 && (() => {
            const dataFormatada = new Date(stats.melhorVolumeInfo.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
            return (
              <Box sx={{
                mb: 2, mx: 0.5, p: 1.5, borderRadius: '6px',
                bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)',
                border: `1px solid ${alpha(CORES.recorde, 0.2)}`,
                animation: 'dash-fadeUp 0.12s ease-out both',
              }}>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: CORES.recorde }}>
                  {stats.melhorVolumeInfo.nome}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.3 }}>
                  {(stats.melhorVolume / 1000).toFixed(1)}t — {dataFormatada}
                </Typography>
              </Box>
            );
          })()}
          {showCargaMax && stats.cargaMaxData.length > 0 && (() => {
            const top = stats.cargaMaxData[0];
            const dataFormatada = new Date(top.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
            return (
              <Box sx={{
                mb: 2, mx: 0.5, p: 1.5, borderRadius: '6px',
                bgcolor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${alpha(CORES.musculacao, 0.2)}`,
                animation: 'dash-fadeUp 0.12s ease-out both',
              }}>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: CORES.musculacao }}>
                  {top.nome}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.3 }}>
                  {top.cargaMax}kg — {dataFormatada}
                </Typography>
              </Box>
            );
          })()}

          {/* Volume por treino e por grupo muscular — Radar */}
          <SectionHeader icon={<Dumbbell size={15} />} title="Volume por Grupo Muscular" badge="kg" isDark={isDark} />
          <Card sx={{ mb: 3, overflow: 'hidden', borderRadius: '8px' }}>
            <CardContent sx={{ py: 2, px: 0.5 }}>
              {stats.radarVolumeData.length >= 3 ? (
                <>
                  <LazyChart height={260}><ResponsiveContainer width="100%" height={260}>
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
                        content={<InlineTooltip renderContent={(payload: any) => {
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
                  </ResponsiveContainer></LazyChart>
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
                        content={<InlineTooltip renderContent={(payload: any) => {
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
          <Card sx={{ mb: 3, borderRadius: '8px', overflow: 'hidden' }}>
            <CardContent sx={{ py: 2, px: 0.5 }}>
              {stats.muscleWeekData.length > 0 ? (
                <>
                  <LazyChart height={220}><ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.muscleWeekData} barCategoryGap="15%">
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: isDark ? '#666' : '#999' }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: isDark ? '#555' : '#bbb' }} width={28} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        {...tooltipProps}
                        content={<InlineTooltip renderContent={(payload: any) => {
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
                  </ResponsiveContainer></LazyChart>
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
              <Card sx={{ mb: 3, overflow: 'hidden', borderRadius: '8px' }}>
                <CardContent sx={{ py: 2, px: 0.5 }}>
                  <LazyChart height={180}><ResponsiveContainer width="100%" height={180}>
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
                        content={<InlineTooltip renderContent={(payload: any) => {
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
                  </ResponsiveContainer></LazyChart>
                </CardContent>
              </Card>
            </>
          )}

          {/* Carga máxima por exercício */}
          <SectionHeader icon={<Zap size={15} />} title="Carga Máxima por Exercício" badge="kg" isDark={isDark} />
          <Card sx={{ mb: 3, overflow: 'hidden', borderRadius: '8px' }}>
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
                      <LazyChart height={160}><ResponsiveContainer width="100%" height={160}>
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
                            content={<InlineTooltip renderContent={(payload: any) => {
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
                      </ResponsiveContainer></LazyChart>
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
                <Card sx={{ mb: 3, overflow: 'hidden', borderRadius: '8px' }}>
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
        <Box sx={{ animation: 'dash-fadeUp 0.15s ease-out both' }}>
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
                  onClick={() => setShowPaceCorrida(v => !v)}
                />
              )}
              {stats.maiorDistCorrida > 0 && (
                <RecordBadge
                  icon={<Trophy size={14} />}
                  label="Maior Distância"
                  value={`${stats.maiorDistCorrida.toFixed(1)} km`}
                  color={CORES.recorde}
                  isDark={isDark}
                  onClick={() => setShowDistCorrida(v => !v)}
                />
              )}
            </Box>
          )}
          {showPaceCorrida && stats.melhorPaceCorridaInfo.nome && (() => {
            const dataFormatada = new Date(stats.melhorPaceCorridaInfo.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
            return (
              <Box sx={{
                mb: 2, mx: 0.5, p: 1.5, borderRadius: '6px',
                bgcolor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)',
                border: `1px solid ${alpha(CORES.corrida, 0.2)}`,
                animation: 'dash-fadeUp 0.12s ease-out both',
              }}>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: CORES.corrida }}>
                  {stats.melhorPaceCorridaInfo.nome}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.3 }}>
                  {stats.melhorPaceCorridaInfo.distancia.toFixed(1)} km — {dataFormatada}
                </Typography>
              </Box>
            );
          })()}
          {showDistCorrida && stats.maiorDistCorridaInfo.nome && (() => {
            const dataFormatada = new Date(stats.maiorDistCorridaInfo.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
            return (
              <Box sx={{
                mb: 2, mx: 0.5, p: 1.5, borderRadius: '6px',
                bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)',
                border: `1px solid ${alpha(CORES.recorde, 0.2)}`,
                animation: 'dash-fadeUp 0.12s ease-out both',
              }}>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: CORES.recorde }}>
                  {stats.maiorDistCorridaInfo.nome}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.3 }}>
                  {stats.maiorDistCorrida.toFixed(1)} km — {dataFormatada}
                </Typography>
              </Box>
            );
          })()}

          <SectionHeader icon={<Footprints size={15} />} title="Evolução de Pace" badge="min/km" isDark={isDark} />
          <Card sx={{ mb: 3, overflow: 'hidden', borderRadius: '8px' }}>
            <CardContent sx={{ py: 2, px: 0.5 }}>
              {stats.paceData.length >= 2 ? (
                <LazyChart height={180}><ResponsiveContainer width="100%" height={180}>
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
                      content={<InlineTooltip renderContent={(payload: any) => {
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
                </ResponsiveContainer></LazyChart>
              ) : (
                <EmptyState text="Complete pelo menos 2 corridas com distância" />
              )}
            </CardContent>
          </Card>

          {/* Distancia corrida */}
          {stats.corridaDistData.length >= 2 && (
            <>
              <SectionHeader icon={<TrendingUp size={15} />} title="Distância por Corrida" badge="km" isDark={isDark} />
              <Card sx={{ mb: 3, overflow: 'hidden', borderRadius: '8px' }}>
                <CardContent sx={{ py: 2, px: 0.5 }}>
                  <LazyChart height={150}><ResponsiveContainer width="100%" height={150}>
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
                        content={<InlineTooltip renderContent={(payload: any) => {
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
                  </ResponsiveContainer></LazyChart>
                </CardContent>
              </Card>
            </>
          )}
        </Box>
      )}

      {/* ═══ NATACAO ═══ */}
      {stats.natacao > 0 && (
        <Box sx={{ animation: 'dash-fadeUp 0.15s ease-out both' }}>
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
                  onClick={() => setShowDistNatacao(v => !v)}
                />
              )}
              {stats.natacaoPaceData.length > 0 && (
                <RecordBadge
                  icon={<Zap size={14} />}
                  label="Melhor Pace"
                  value={`${formatPace(Math.min(...stats.natacaoPaceData.map((d) => d.pace)))} /100m`}
                  color={CORES.tempo}
                  isDark={isDark}
                  onClick={() => setShowPaceNatacao(v => !v)}
                />
              )}
            </Box>
          )}
          {showDistNatacao && stats.maiorDistNatacaoInfo.nome && (() => {
            const dataFormatada = new Date(stats.maiorDistNatacaoInfo.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
            return (
              <Box sx={{
                mb: 2, mx: 0.5, p: 1.5, borderRadius: '6px',
                bgcolor: isDark ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.06)',
                border: `1px solid ${alpha(CORES.natacao, 0.2)}`,
                animation: 'dash-fadeUp 0.12s ease-out both',
              }}>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: CORES.natacao }}>
                  {stats.maiorDistNatacaoInfo.nome}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.3 }}>
                  {stats.maiorDistNatacao} m — {dataFormatada}
                </Typography>
              </Box>
            );
          })()}
          {showPaceNatacao && stats.melhorPaceNatacaoInfo.nome && (() => {
            const dataFormatada = new Date(stats.melhorPaceNatacaoInfo.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
            return (
              <Box sx={{
                mb: 2, mx: 0.5, p: 1.5, borderRadius: '6px',
                bgcolor: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.06)',
                border: `1px solid ${alpha(CORES.tempo, 0.2)}`,
                animation: 'dash-fadeUp 0.12s ease-out both',
              }}>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: CORES.tempo }}>
                  {stats.melhorPaceNatacaoInfo.nome}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.3 }}>
                  {stats.melhorPaceNatacaoInfo.distancia} m — {dataFormatada}
                </Typography>
              </Box>
            );
          })()}

          <SectionHeader icon={<Waves size={15} />} title="Evolução Natação" badge="metros" isDark={isDark} />
          <Card sx={{ mb: 3, overflow: 'hidden', borderRadius: '8px' }}>
            <CardContent sx={{ py: 2, px: 0.5 }}>
              {stats.natacaoData.length >= 2 ? (
                <LazyChart height={180}><ResponsiveContainer width="100%" height={180}>
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
                      content={<InlineTooltip renderContent={(payload: any) => {
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
                </ResponsiveContainer></LazyChart>
              ) : (
                <EmptyState text="Complete pelo menos 2 treinos de natação com distância" />
              )}
            </CardContent>
          </Card>

          {/* Pace natacao */}
          {stats.natacaoPaceData.length >= 2 && (
            <>
              <SectionHeader icon={<TrendingUp size={15} />} title="Pace Natação" badge="min/100m" isDark={isDark} />
              <Card sx={{ mb: 3, overflow: 'hidden', borderRadius: '8px' }}>
                <CardContent sx={{ py: 2, px: 0.5 }}>
                  <LazyChart height={150}><ResponsiveContainer width="100%" height={150}>
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
                        content={<InlineTooltip renderContent={(payload: any) => {
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
                  </ResponsiveContainer></LazyChart>
                </CardContent>
              </Card>
            </>
          )}
        </Box>
      )}

      {/* ═══ MELHORES MARCAS (CORRIDA) ═══ */}
      <BestEffortsSection historico={historico} isDark={isDark} />

      {/* ═══ MEDALHAS ═══ */}
      <MedalhasSection historico={historico} isDark={isDark} />
    </Box>
  );
}

// ══════════════════════════════════════════════════
// ── MELHORES MARCAS ─────────────────────────────
// ══════════════════════════════════════════════════

function BestEffortsSection({ historico, isDark }: { historico: RegistroTreino[]; isDark: boolean }) {
  const [marcaCustom, setMarcaCustom] = useState<string | null>(null);

  // Coletar todos os bestEfforts de todos os registros + calcular a partir de splits
  const todosBestEfforts = useMemo(() => {
    const map = new Map<string, { tempo: number; data: string; registroId: string }>();

    for (const reg of historico) {
      // Best efforts do Strava
      if (reg.stravaData?.bestEfforts) {
        for (const be of reg.stravaData.bestEfforts) {
          const existing = map.get(be.name);
          if (!existing || be.movingTime < existing.tempo) {
            map.set(be.name, { tempo: be.movingTime, data: reg.concluidoEm, registroId: reg.id });
          }
        }
      }

      // Calcular marcas a partir dos splits (distâncias que o Strava não fornece como best effort)
      if (reg.stravaData?.splits) {
        const splitsDistanciasM = [3000, 15000, 21097, 30000];
        for (const distM of splitsDistanciasM) {
          const tempo = calcularTempoSplits(reg.stravaData.splits, distM);
          if (tempo) {
            const km = Math.round(distM / 1000);
            const key = `${km}k_calc`;
            const existing = map.get(key);
            if (!existing || tempo < existing.tempo) {
              map.set(key, { tempo, data: reg.concluidoEm, registroId: reg.id });
            }
          }
        }
      }

      // Calcular marcas a partir das etapas de corrida registradas no app
      if (reg.corrida?.etapas && reg.corrida.etapas.length > 0) {
        const etapasDistanciasM = [1000, 3000, 5000, 10000, 15000, 21097, 30000, 42195];
        for (const distM of etapasDistanciasM) {
          const tempo = calcularTempoEtapas(reg.corrida.etapas, distM);
          if (tempo) {
            const km = Math.round(distM / 1000);
            const key = `${km}k_calc`;
            const existing = map.get(key);
            if (!existing || tempo < existing.tempo) {
              map.set(key, { tempo, data: reg.concluidoEm, registroId: reg.id });
            }
          }
        }
      }
    }

    return map;
  }, [historico]);

  // Mapear marcas principais
  const marcasPrincipais = useMemo(() => {
    return MARCAS_PRINCIPAIS.map(m => {
      // Tentar encontrar por nomes comuns do Strava
      const nomes = getNomesStrava(m.distancia);
      let melhor: { tempo: number; data: string; registroId: string } | undefined;
      for (const nome of nomes) {
        const found = todosBestEfforts.get(nome);
        if (found && (!melhor || found.tempo < melhor.tempo)) {
          melhor = found;
        }
      }
      // Fallback: tentar marca calculada a partir dos splits
      if (!melhor) {
        const km = Math.round(m.distancia / 1000);
        const calcKey = `${km}k_calc`;
        const found = todosBestEfforts.get(calcKey);
        if (found) melhor = found;
      }
      return { ...m, melhor };
    });
  }, [todosBestEfforts]);

  // Todas as marcas disponíveis que não estão nas principais
  const marcasExtras = useMemo(() => {
    const principalNomes = new Set<string>();
    for (const m of MARCAS_PRINCIPAIS) {
      for (const n of getNomesStrava(m.distancia)) principalNomes.add(n);
    }
    const extras: { name: string; tempo: number; data: string; registroId: string }[] = [];
    todosBestEfforts.forEach((val, name) => {
      if (!principalNomes.has(name) && !name.endsWith('_calc')) {
        extras.push({ name, ...val });
      }
    });
    return extras.sort((a, b) => a.tempo - b.tempo);
  }, [todosBestEfforts]);

  if (todosBestEfforts.size === 0) return null;

  return (
    <Box sx={{ animation: 'dash-fadeUp 0.15s ease-out both' }}>
      <SectionHeader icon={<Trophy size={15} />} title="Melhores Marcas" badge="corrida" isDark={isDark} />
      <Card sx={{ mb: 3, overflow: 'hidden', borderRadius: '8px' }}>
        <CardContent sx={{ p: 0 }}>
          {/* Marcas principais */}
          {marcasPrincipais.map((m, i) => (
            <Box
              key={m.key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 1.3,
                borderBottom: i < marcasPrincipais.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}` : 'none',
                opacity: m.melhor ? 1 : 0.35,
              }}
            >
              <Box sx={{ flex: '0 0 90px' }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>{m.label}</Typography>
              </Box>
              {m.melhor ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', color: CORES.corrida }}>{formatarTempoMarca(m.melhor.tempo)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ px: 0.8, py: 0.2, bgcolor: alpha(CORES.corrida, 0.1), borderRadius: 1 }}>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: CORES.corrida }}>{calcPaceMarca(m.distancia, m.melhor.tempo)} /km</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {new Date(m.melhor.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>—</Typography>
              )}
            </Box>
          ))}

          {/* Separador + outras marcas */}
          {marcasExtras.length > 0 && (
            <>
              <Box
                onClick={() => setMarcaCustom(marcaCustom ? null : 'open')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  py: 1,
                  cursor: 'pointer',
                  bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem', color: CORES.corrida }}>
                  {marcaCustom ? 'Esconder' : 'Ver'} outras marcas ({marcasExtras.length})
                </Typography>
                {marcaCustom ? <ChevronUp size={14} color={CORES.corrida} /> : <ChevronDown size={14} color={CORES.corrida} />}
              </Box>
              {marcaCustom && marcasExtras.map((m, i) => (
                <Box
                  key={m.name}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    py: 1,
                    borderBottom: i < marcasExtras.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'}` : 'none',
                    bgcolor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
                  }}
                >
                  <Box sx={{ flex: '0 0 90px' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{m.name}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: CORES.corrida }}>{formatarTempoMarca(m.tempo)}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {new Date(m.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

// Mapeia distâncias para nomes que o Strava usa em best_efforts


// ══════════════════════════════════════════════════
// ── SUB-COMPONENTS ──────────────────────────────
// ══════════════════════════════════════════════════

function ExerciseCard({ ex, idx, isDark, inline }: { ex: any; idx: number; isDark: boolean; inline?: boolean }) {
  const [metrica, setMetrica] = useState<'peso' | 'volume' | '1rm'>('peso');

  const dados = ex.dados;
  const total = dados.length;
  const ultimo = dados[total - 1];
  const penultimo = total >= 2 ? dados[total - 2] : null;

  // Records
  const bestPeso = Math.max(...dados.map((d: any) => d.pesoMax));
  const bestVolume = Math.max(...dados.map((d: any) => d.volume));
  const best1RM = Math.max(...dados.map((d: any) => d.umRM));
  const bestPesoDate = dados.find((d: any) => d.pesoMax === bestPeso)?.label || '';
  const best1RMDate = dados.find((d: any) => d.umRM === best1RM)?.label || '';

  // Chart config
  const chartKey = metrica === 'peso' ? 'pesoMax' : metrica === 'volume' ? 'volume' : 'umRM';
  const chartUnit = 'kg';
  const chartColor = metrica === 'peso' ? CORES.musculacao : metrica === 'volume' ? CORES.corrida : CORES.recorde;

  // Dados com label de treino sequencial
  const dadosComTreino = dados.map((d: any, i: number) => ({
    ...d,
    treino: `T${i + 1}`,
    treinoFull: `Treino ${i + 1}`,
  }));

  // Average of last 3 vs previous 3 for improvement suggestion
  const last3 = dados.slice(-3);
  const prev3 = dados.slice(-6, -3);
  const avgPesoLast = last3.reduce((s: number, d: any) => s + d.pesoMax, 0) / last3.length;
  const avgVolLast = last3.reduce((s: number, d: any) => s + d.volume, 0) / last3.length;
  let dica = '';
  if (prev3.length >= 3) {
    const avgPesoPrev = prev3.reduce((s: number, d: any) => s + d.pesoMax, 0) / prev3.length;
    const avgVolPrev = prev3.reduce((s: number, d: any) => s + d.volume, 0) / prev3.length;
    const pesoDiff = ((avgPesoLast - avgPesoPrev) / avgPesoPrev) * 100;
    const volDiff = ((avgVolLast - avgVolPrev) / avgVolPrev) * 100;

    if (pesoDiff < -5 && volDiff < -5) {
      dica = 'Carga e volume em queda. Considere um deload ou rever a periodização.';
    } else if (pesoDiff < 2 && pesoDiff > -2) {
      dica = 'Carga estagnada. Tente aumentar 2.5kg ou adicionar 1 série extra.';
    } else if (volDiff < 0 && pesoDiff > 0) {
      dica = 'Carga subindo mas volume caiu. Ótimo para força, mas mantenha as séries.';
    } else if (pesoDiff > 5) {
      dica = 'Excelente progresso de carga! Continue assim.';
    }
  } else if (total >= 2 && ultimo.pesoMax === penultimo?.pesoMax) {
    dica = 'Mesma carga nos últimos 2 treinos. Tente subir 2.5kg na próxima sessão.';
  }

  const metricaButtons = [
    { key: 'peso' as const, label: 'Peso', cor: CORES.musculacao },
    { key: 'volume' as const, label: 'Volume', cor: CORES.corrida },
    { key: '1rm' as const, label: '1RM', cor: CORES.recorde },
  ];

  const content = (
    <>
      {/* Records row */}
      <Box sx={{ display: 'flex', gap: 0.8, mb: 1.5 }}>
        {[
          { label: 'Peso Máx', value: `${bestPeso}kg`, sub: bestPesoDate, cor: CORES.musculacao },
          { label: '1RM Est.', value: `${best1RM}kg`, sub: best1RMDate, cor: CORES.recorde },
          { label: 'Vol. Máx', value: `${bestVolume.toLocaleString('pt-BR')}kg`, sub: `${total} treinos`, cor: CORES.corrida },
        ].map((r) => (
          <Box key={r.label} sx={{
            flex: 1, textAlign: 'center', py: 0.8, px: 0.5,
            borderRadius: '6px', bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
          }}>
            <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.2 }}>
              {r.label}
            </Typography>
            <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: r.cor, lineHeight: 1.1 }}>
              {r.value}
            </Typography>
            <Typography sx={{ fontSize: '0.5rem', color: 'text.secondary', mt: 0.2 }}>
              {r.sub}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Last workout vs previous */}
      {ultimo && (
        <Box sx={{
          mb: 1.5, px: 1, py: 0.8,
          borderRadius: '6px', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
        }}>
          <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', mb: 0.3 }}>Último treino ({ultimo.label})</Typography>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, mb: penultimo ? 0.5 : 0 }}>
            {ultimo.pesoMax}kg × {ultimo.repsMax} reps · {ultimo.series} séries · vol {ultimo.volume}kg
          </Typography>
          {penultimo && (() => {
            const diffs = [
              { label: 'Peso', atual: ultimo.pesoMax, anterior: penultimo.pesoMax, unit: 'kg' },
              { label: 'Reps', atual: ultimo.repsMax, anterior: penultimo.repsMax, unit: '' },
              { label: 'Séries', atual: ultimo.series, anterior: penultimo.series, unit: '' },
              { label: 'Volume', atual: ultimo.volume, anterior: penultimo.volume, unit: 'kg' },
            ];
            return (
              <Box sx={{ pt: 0.5, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary', mb: 0.4 }}>
                  vs treino anterior ({penultimo.label})
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, mb: 0.4 }}>
                  {penultimo.pesoMax}kg × {penultimo.repsMax} reps · {penultimo.series} séries · vol {penultimo.volume}kg
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.6 }}>
                  {diffs.map((d) => {
                    const diff = d.atual - d.anterior;
                    const cor = diff > 0 ? '#16A34A' : diff < 0 ? '#EF4444' : 'text.secondary';
                    return (
                      <Box key={d.label} sx={{
                        flex: 1, textAlign: 'center', py: 0.4, borderRadius: '4px',
                        bgcolor: diff !== 0 ? alpha(cor as string, 0.06) : 'transparent',
                      }}>
                        <Typography sx={{ fontSize: '0.5rem', color: 'text.secondary', textTransform: 'uppercase' }}>
                          {d.label}
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: cor }}>
                          {diff === 0 ? '=' : `${diff > 0 ? '+' : ''}${diff}${d.unit}`}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })()}
        </Box>
      )}

      {/* Metric toggle */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1.2 }}>
        {metricaButtons.map((m) => (
          <Box
            key={m.key}
            onClick={() => setMetrica(m.key)}
            sx={{
              flex: 1, textAlign: 'center', py: 0.5, borderRadius: '6px', cursor: 'pointer',
              fontSize: '0.7rem', fontWeight: 600, transition: 'all 0.12s',
              bgcolor: metrica === m.key ? alpha(m.cor, 0.12) : 'transparent',
              color: metrica === m.key ? m.cor : 'text.secondary',
              border: `1px solid ${metrica === m.key ? alpha(m.cor, 0.3) : 'transparent'}`,
            }}
          >
            {m.label}
          </Box>
        ))}
      </Box>

      {/* Chart */}
      {total >= 2 ? (
        <LazyChart height={140}><ResponsiveContainer width="100%" height={140}>
          <ComposedChart data={dadosComTreino}>
            <defs>
              <linearGradient id={`gradEx_${idx}_${metrica}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={chartColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'} vertical={false} />
            <XAxis dataKey="treino" tick={{ fontSize: 8, fill: isDark ? '#555' : '#bbb' }} axisLine={false} tickLine={false} />
            <YAxis
              yAxisId="main"
              tick={{ fontSize: 8, fill: isDark ? '#444' : '#ccc' }}
              width={36}
              unit={chartUnit}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              {...tooltipProps}
              content={<InlineTooltip renderContent={(payload: any) => {
                if (!payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 150 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem', fontWeight: 600, mb: 0.5 }}>
                      {d.treinoFull} — {d.label}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                      <Typography sx={{ color: CORES.musculacao, fontSize: '0.78rem', fontWeight: 600 }}>
                        Peso: {d.pesoMax}kg × {d.repsMax} reps
                      </Typography>
                      <Typography sx={{ color: CORES.corrida, fontSize: '0.78rem', fontWeight: 600 }}>
                        Volume: {d.volume.toLocaleString('pt-BR')}kg
                      </Typography>
                      <Typography sx={{ color: CORES.recorde, fontSize: '0.78rem', fontWeight: 600 }}>
                        1RM est.: {d.umRM}kg
                      </Typography>
                    </Box>
                  </Box>
                );
              }} />}
            />
            <Area
              yAxisId="main"
              type="monotone"
              dataKey={chartKey}
              fill={`url(#gradEx_${idx}_${metrica})`}
              stroke={chartColor}
              strokeWidth={2.5}
              dot={{ r: 4, fill: chartColor, strokeWidth: 2, stroke: isDark ? '#111' : '#fff' }}
              activeDot={{ r: 6, fill: chartColor, stroke: '#fff', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer></LazyChart>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', py: 1 }}>
          {dados.map((d: any, i: number) => (
            <Box key={i} sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{d.label}</Typography>
              <Typography variant="body2" fontWeight={600}>{d.pesoMax}kg × {d.repsMax} reps</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>Vol: {d.volume}kg · 1RM: {d.umRM}kg</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Improvement tip */}
      {dica && (
        <Box sx={{
          display: 'flex', alignItems: 'flex-start', gap: 0.8, mt: 1.2, px: 1, py: 0.8,
          borderRadius: '6px', bgcolor: alpha('#FF6B2C', 0.06),
          border: `1px solid ${alpha('#FF6B2C', 0.12)}`,
        }}>
          <Info size={13} color="#FF6B2C" style={{ flexShrink: 0, marginTop: 1 }} />
          <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', lineHeight: 1.4 }}>
            {dica}
          </Typography>
        </Box>
      )}
    </>
  );

  if (inline) return content;

  return (
    <Card sx={{ mb: 2, overflow: 'hidden', borderRadius: '8px' }}>
      <CardContent sx={{ py: 1.5, px: 1.2 }}>
        {content}
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════
// ── MEDALHAS SECTION ────────────────────────────
// ══════════════════════════════════════════════════

function MedalhasSection({ historico, isDark }: { historico: RegistroTreino[]; isDark: boolean }) {
  const prs = useMemo(() => computeAllTimePRs(historico), [historico]);

  // Exercícios para dropdown musculação
  const muscNomes = useMemo(() =>
    Array.from(prs.musculacao.values())
      .sort((a, b) => (b.rankings[0]?.valor ?? 0) - (a.rankings[0]?.valor ?? 0))
      .map((e) => e.nomeExercicio),
    [prs],
  );

  // Categorias corrida para dropdown
  const corridaNomes = useMemo(() => prs.corrida.map((c) => c.label), [prs]);

  const [exercicioSel, setExercicioSel] = useState<string | null>(null);
  const [corridaSel, setCorridaSel]     = useState<string | null>(null);

  const exercicioAtual = exercicioSel && muscNomes.includes(exercicioSel) ? exercicioSel : muscNomes[0] ?? null;
  const corridaAtual   = corridaSel && corridaNomes.includes(corridaSel) ? corridaSel : corridaNomes[0] ?? null;

  const muscRankings = exercicioAtual
    ? (prs.musculacao.get(exercicioAtual)?.rankings.map((r) => ({ tipo: r.tipo, valor: r.valorFormatado, data: r.data })) ?? [])
    : [];
  const corridaRankings = corridaAtual
    ? (prs.corrida.find((c) => c.label === corridaAtual)?.rankings.map((r) => ({ tipo: r.tipo, valor: r.valorFormatado, data: r.data })) ?? [])
    : [];

  // Contadores globais (treinos únicos com cada tipo)
  const totalOuro   = prs.registrosComOuro.size;
  const totalPrata  = prs.registrosComPrata.size;
  const totalBronze = prs.registrosComBronze.size;

  if (prs.musculacao.size === 0 && prs.corrida.length === 0) return null;

  return (
    <Box sx={{ mt: 3 }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: '7px', bgcolor: alpha('#F59E0B', 0.15),
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trophy size={14} color="#F59E0B" />
        </Box>
        <Typography variant="subtitle2" fontWeight={800}
          sx={{ letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.8rem' }}>
          Medalhas
        </Typography>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider', ml: 0.5 }} />
      </Box>

      {/* ── Contadores ── */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
        {[
          { emoji: '🥇', count: totalOuro,   label: 'Ouro',   cor: '#F59E0B' },
          { emoji: '🥈', count: totalPrata,  label: 'Prata',  cor: '#94A3B8' },
          { emoji: '🥉', count: totalBronze, label: 'Bronze', cor: '#CD7C48' },
        ].map(({ emoji, count, label, cor }) => (
          <Box key={label} sx={{
            flex: 1, textAlign: 'center', py: 1.2, borderRadius: '10px',
            background: `linear-gradient(135deg, ${alpha(cor, 0.12)} 0%, ${alpha(cor, 0.04)} 100%)`,
            border: `1px solid ${alpha(cor, 0.22)}`,
          }}>
            <Typography sx={{ fontSize: '1.5rem', lineHeight: 1 }}>{emoji}</Typography>
            <Typography variant="h6" fontWeight={800} sx={{ color: cor, lineHeight: 1.3, mt: 0.3, fontSize: '1.1rem' }}>{count}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{label}</Typography>
          </Box>
        ))}
      </Box>

      {/* ── Corrida ── */}
      {prs.corrida.length > 0 && (
        <Card sx={{ mb: 2.5, overflow: 'hidden', borderRadius: '8px' }}>
          <CardContent sx={{ py: 1.5, px: 1.2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.2 }}>
              <Footprints size={13} color={CORES.corrida} />
              <Typography variant="caption" fontWeight={800}
                sx={{ color: CORES.corrida, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Corrida
              </Typography>
            </Box>
            {/* Dropdown de categoria */}
            <Box sx={{ position: 'relative', mb: 1.2 }}>
              <ExercicioSelect
                exercicios={corridaNomes}
                selected={corridaAtual ?? ''}
                onChange={(nome) => setCorridaSel(nome)}
                isDark={isDark}
              />
            </Box>
            <MedalList rankings={corridaRankings} isDark={isDark} />
          </CardContent>
        </Card>
      )}

      {/* ── Musculação ── */}
      {muscNomes.length > 0 && (
        <Card sx={{ mb: 2.5, overflow: 'hidden', borderRadius: '8px' }}>
          <CardContent sx={{ py: 1.5, px: 1.2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.2 }}>
              <Dumbbell size={13} color={CORES.musculacao} />
              <Typography variant="caption" fontWeight={800}
                sx={{ color: CORES.musculacao, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Musculação
              </Typography>
            </Box>
            {/* Dropdown de exercício */}
            <ExercicioSelect
              exercicios={muscNomes}
              selected={exercicioAtual ?? ''}
              onChange={(nome) => setExercicioSel(nome)}
              isDark={isDark}
            />
            <MedalList rankings={muscRankings} isDark={isDark} />
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
