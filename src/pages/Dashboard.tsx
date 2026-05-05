import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, useTheme, alpha } from '@mui/material';
import {
  Waves, TrendingUp,
  Zap, Trophy,
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
  formatPace,
  gerarHeatmapData,
  getConcluidoDate,
  getStorageKey,
  injectKeyframes,
  parseDateLocal,
  startOfWeek,
  toLocalDateStr,
  tooltipProps,
  tooltipStyle,
  type PeriodoKey,
} from '../components/dashboard/dashboardUtils';
import { InlineTooltip, LazyChart } from '../components/dashboard/DashboardChartHelpers';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid,
} from 'recharts';
import { EmptyState, RecordBadge, SectionHeader } from '../components/dashboard/DashboardPrimitives';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import DashboardSummary from '../components/dashboard/DashboardSummary';
import DashboardActivitySection from '../components/dashboard/DashboardActivitySection';
import MusculacaoSection from '../components/dashboard/MusculacaoSection';
import CorridaSection from '../components/dashboard/CorridaSection';
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

      <DashboardSummary stats={stats} isDark={isDark} />

      <DashboardActivitySection
        heatmap={heatmap}
        heatmapWeeks={heatmapConfig.semanas}
        showFullHistory={periodo === 'tudo'}
        frequenciaFormatada={stats.frequenciaFormatada}
        isDark={isDark}
      />

      <MusculacaoSection
        stats={stats}
        isDark={isDark}
        showVolumeMax={showVolumeMax}
        setShowVolumeMax={setShowVolumeMax}
        showCargaMax={showCargaMax}
        setShowCargaMax={setShowCargaMax}
        filtroCargaExercicio={filtroCargaExercicio}
        setFiltroCargaExercicio={setFiltroCargaExercicio}
        filtroEvolucaoExercicio={filtroEvolucaoExercicio}
        setFiltroEvolucaoExercicio={setFiltroEvolucaoExercicio}
      />

      <CorridaSection
        stats={stats}
        isDark={isDark}
        showPaceCorrida={showPaceCorrida}
        setShowPaceCorrida={setShowPaceCorrida}
        showDistCorrida={showDistCorrida}
        setShowDistCorrida={setShowDistCorrida}
      />

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
