import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, useTheme, alpha } from '@mui/material';
import {
  Dumbbell, Footprints, Waves, Calendar, TrendingUp,
  Clock, Flame, Zap, Trophy, Target,
} from 'lucide-react';
import { useTreinoStore } from '../store/treinoStore';
import { useAuthContext } from '../contexts/AuthContext';
import {
  calcularVolumeSessao, calcularVolumeExercicio,
  calcularDistanciaCorrida, calcularDistanciaNatacao,
} from '../types/treino';
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
  BarChart, Bar, CartesianGrid, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { EmptyState, GlowStat, HeatLegend, RecordBadge, SectionHeader, TypePill } from '../components/dashboard/DashboardPrimitives';
import HeatmapCalendar from '../components/dashboard/HeatmapCalendar';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import ExercicioSelect from '../components/dashboard/ExercicioSelect';
import ExerciseCard from '../components/dashboard/ExerciseCard';
import BestEffortsSection from '../components/dashboard/BestEffortsSection';
import MedalhasSection from '../components/dashboard/MedalhasSection';

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
      <DashboardHeader
        isDark={isDark}
        saudacao={saudacao}
        firstName={firstName}
        streak={stats.streak}
        periodo={periodo}
        dataInicio={dataInicio}
        dataFim={dataFim}
        onBack={() => navigate(-1)}
        onPeriodoChange={setPeriodo}
        onDataInicioChange={setDataInicio}
        onDataFimChange={setDataFim}
      />

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
