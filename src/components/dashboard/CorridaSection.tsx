import type { Dispatch, SetStateAction } from 'react';
import { Box, Card, CardContent, Typography, alpha } from '@mui/material';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Footprints, TrendingUp, Trophy, Zap } from 'lucide-react';
import { CORES, formatPace, tooltipProps, tooltipStyle } from './dashboardUtils';
import { InlineTooltip, LazyChart } from './DashboardChartHelpers';
import { EmptyState, RecordBadge, SectionHeader } from './DashboardPrimitives';

type CorridaSectionProps = {
  stats: any;
  isDark: boolean;
  showPaceCorrida: boolean;
  setShowPaceCorrida: Dispatch<SetStateAction<boolean>>;
  showDistCorrida: boolean;
  setShowDistCorrida: Dispatch<SetStateAction<boolean>>;
};

export default function CorridaSection({
  stats,
  isDark,
  showPaceCorrida,
  setShowPaceCorrida,
  showDistCorrida,
  setShowDistCorrida,
}: CorridaSectionProps) {
  return (
    <>
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
                  value={`${formatPace(Math.min(...stats.paceData.map((d: any) => d.pace)))} /km`}
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

    </>
  );
}
