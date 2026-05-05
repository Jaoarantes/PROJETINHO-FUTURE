import { Box } from '@mui/material';
import { Clock, Dumbbell, Flame, Footprints, Target, Waves, Zap } from 'lucide-react';
import { CORES, formatDuracao } from './dashboardUtils';
import { GlowStat, TypePill } from './DashboardPrimitives';

export default function DashboardSummary({
  stats,
  isDark,
}: {
  stats: {
    total: number;
    caloriasTotais: number;
    tempoTotal: number;
    mediaSemanal: number;
    musculacao: number;
    corrida: number;
    natacao: number;
  };
  isDark: boolean;
}) {
  return (
    <>
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
    </>
  );
}
