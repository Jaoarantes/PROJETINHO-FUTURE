import { Box, Card, CardContent } from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calendar, TrendingUp } from 'lucide-react';
import { CORES, tooltipProps } from './dashboardUtils';
import { FreqTooltip, InlineTooltip, LazyChart } from './DashboardChartHelpers';
import { EmptyState, HeatLegend, SectionHeader } from './DashboardPrimitives';
import HeatmapCalendar from './HeatmapCalendar';
import type { FrequencyDataPoint } from './useDashboardStats';

export default function DashboardActivitySection({
  heatmap,
  heatmapWeeks,
  showFullHistory,
  frequenciaFormatada,
  isDark,
}: {
  heatmap: Parameters<typeof HeatmapCalendar>[0]['data'];
  heatmapWeeks: number;
  showFullHistory: boolean;
  frequenciaFormatada: FrequencyDataPoint[];
  isDark: boolean;
}) {
  return (
    <>
      <Box sx={{ animation: 'dash-fadeUp 0.15s ease-out both' }}>
        <SectionHeader
          icon={<Calendar size={15} />}
          title="Atividade"
          badge={showFullHistory ? 'Histórico completo' : `${heatmapWeeks} semanas`}
          isDark={isDark}
        />
        <Card sx={{ mb: 1, overflow: 'hidden', borderRadius: '8px' }}>
          <CardContent sx={{ py: 2, px: 1.5 }}>
            <HeatmapCalendar data={heatmap} totalSemanas={heatmapWeeks} isDark={isDark} />
          </CardContent>
        </Card>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'center' }}>
          <HeatLegend color={CORES.musculacao} label="Musculação" />
          <HeatLegend color={CORES.corrida} label="Corrida" />
          <HeatLegend color={CORES.natacao} label="Natação" />
        </Box>
      </Box>

      <Box sx={{ animation: 'dash-fadeUp 0.15s ease-out both' }}>
        <SectionHeader icon={<TrendingUp size={15} />} title="Frequência Semanal" isDark={isDark} />
        <Card sx={{ mb: 3, overflow: 'hidden', position: 'relative', borderRadius: '8px' }}>
          <CardContent sx={{ py: 2, px: 0.5 }}>
            {frequenciaFormatada.some((d) => d.musculacao + d.corrida + d.natacao > 0) ? (
              <Box sx={{ position: 'relative' }}>
                <LazyChart height={200}><ResponsiveContainer width="100%" height={200}>
                  <BarChart data={frequenciaFormatada} barCategoryGap="20%">
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
    </>
  );
}
