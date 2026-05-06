import { lazy, Suspense, useState, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, useTheme } from '@mui/material';
import { Zap } from 'lucide-react';
import { useTreinoStore } from '../store/treinoStore';
import { useAuthContext } from '../contexts/AuthContext';
import {
  CORES,
  PERIODOS,
  gerarHeatmapData,
  getStorageKey,
  injectKeyframes,
  parseDateLocal,
  toLocalDateStr,
  type PeriodoKey,
} from '../components/dashboard/dashboardUtils';
import useDashboardStats from '../components/dashboard/useDashboardStats';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import DashboardSummary from '../components/dashboard/DashboardSummary';
import BestEffortsSection from '../components/dashboard/BestEffortsSection';
import MedalhasSection from '../components/dashboard/MedalhasSection';

const DashboardActivitySection = lazy(() => import('../components/dashboard/DashboardActivitySection'));
const MusculacaoSection = lazy(() => import('../components/dashboard/MusculacaoSection'));
const CorridaSection = lazy(() => import('../components/dashboard/CorridaSection'));
const NatacaoSection = lazy(() => import('../components/dashboard/NatacaoSection'));

function DashboardSectionFallback({ height = 220 }: { height?: number }) {
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: '8px',
        minHeight: height,
        mb: 3,
        opacity: 0.35,
      }}
    />
  );
}

function DeferredDashboardSection({
  children,
  fallbackHeight,
}: {
  children: ReactNode;
  fallbackHeight: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shouldRender) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: '350px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldRender]);

  return (
    <Box ref={ref}>
      {shouldRender ? (
        <Suspense fallback={<DashboardSectionFallback height={fallbackHeight} />}>
          {children}
        </Suspense>
      ) : (
        <DashboardSectionFallback height={fallbackHeight} />
      )}
    </Box>
  );
}

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
  const [dashboardNow] = useState(() => Date.now());

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

  const stats = useDashboardStats(historicoFiltrado, periodo);

  const heatmapConfig = useMemo(() => {
    const config = PERIODOS.find((p) => p.key === periodo)!;
    let dias = config.dias;

    if (config.key === 'tudo') {
      const datas = historico.map(r => new Date(r.concluidoEm).getTime()).filter(t => !isNaN(t) && isFinite(t));
      if (datas.length === 0) dias = 30;
      else {
        const prim = new Date(Math.min(...datas));
        const dif = dashboardNow - prim.getTime();
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
  }, [periodo, dataInicio, dataFim, historico, dashboardNow]);

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

      <DeferredDashboardSection fallbackHeight={330}>
        <DashboardActivitySection
          heatmap={heatmap}
          heatmapWeeks={heatmapConfig.semanas}
          showFullHistory={periodo === 'tudo'}
          frequenciaFormatada={stats.frequenciaFormatada}
          isDark={isDark}
        />
      </DeferredDashboardSection>

      <DeferredDashboardSection fallbackHeight={520}>
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
      </DeferredDashboardSection>

      <DeferredDashboardSection fallbackHeight={300}>
        <CorridaSection
          stats={stats}
          isDark={isDark}
          showPaceCorrida={showPaceCorrida}
          setShowPaceCorrida={setShowPaceCorrida}
          showDistCorrida={showDistCorrida}
          setShowDistCorrida={setShowDistCorrida}
        />
      </DeferredDashboardSection>

      <DeferredDashboardSection fallbackHeight={300}>
        <NatacaoSection
          stats={stats}
          isDark={isDark}
          showPaceNatacao={showPaceNatacao}
          setShowPaceNatacao={setShowPaceNatacao}
          showDistNatacao={showDistNatacao}
          setShowDistNatacao={setShowDistNatacao}
        />
      </DeferredDashboardSection>

      {/* ═══ MELHORES MARCAS (CORRIDA) ═══ */}
      <BestEffortsSection historico={historico} isDark={isDark} />

      {/* ═══ MEDALHAS ═══ */}
      <MedalhasSection historico={historico} isDark={isDark} />
    </Box>
  );
}
