import type { Dispatch, SetStateAction } from 'react';
import { Box, Card, CardContent, Typography, alpha } from '@mui/material';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { Dumbbell, Target, TrendingUp, Trophy, Zap } from 'lucide-react';
import { CORES, getMuscleColor, tooltipProps, tooltipStyle } from './dashboardUtils';
import { InlineTooltip, LazyChart } from './DashboardChartHelpers';
import { EmptyState, HeatLegend, RecordBadge, SectionHeader } from './DashboardPrimitives';
import type {
  CargaEvolucaoPoint,
  DashboardStats,
  ExerciseEvolution,
  MuscleWeekDataPoint,
  RadarVolumeDataPoint,
  VolumeDataPoint,
} from './useDashboardStats';
import ExercicioSelect from './ExercicioSelect';
import ExerciseCard from './ExerciseCard';

type MusculacaoSectionProps = {
  stats: DashboardStats;
  isDark: boolean;
  showVolumeMax: boolean;
  setShowVolumeMax: Dispatch<SetStateAction<boolean>>;
  showCargaMax: boolean;
  setShowCargaMax: Dispatch<SetStateAction<boolean>>;
  filtroCargaExercicio: string | null;
  setFiltroCargaExercicio: Dispatch<SetStateAction<string | null>>;
  filtroEvolucaoExercicio: string | null;
  setFiltroEvolucaoExercicio: Dispatch<SetStateAction<string | null>>;
};

export default function MusculacaoSection({
  stats,
  isDark,
  showVolumeMax,
  setShowVolumeMax,
  showCargaMax,
  setShowCargaMax,
  filtroCargaExercicio,
  setFiltroCargaExercicio,
  filtroEvolucaoExercicio,
  setFiltroEvolucaoExercicio,
}: MusculacaoSectionProps) {
  return (
    <>
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
                        content={<InlineTooltip renderContent={(payload) => {
                          if (!payload || !payload.length) return null;
                          const d = payload[0].payload as RadarVolumeDataPoint;
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
                        content={<InlineTooltip renderContent={(payload) => {
                          if (!payload || !payload.length) return null;
                          const d = payload[0].payload as RadarVolumeDataPoint;
                          return (
                            <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 120 }}>
                              <Typography sx={{ color: CORES.musculacao, fontSize: '1rem', fontWeight: 700 }}>{d.volume.toLocaleString('pt-BR')} kg</Typography>
                              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', mt: 0.2 }}>{d.grupo}</Typography>
                            </Box>
                          );
                        }} />}
                      />
                      <Bar dataKey="volume" radius={[0, 4, 4, 0]} stroke="none" activeBar={{ stroke: 'none' }}>
                        {stats.radarVolumeData.map((_: RadarVolumeDataPoint, index: number) => (
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
                        content={<InlineTooltip renderContent={(payload) => {
                          if (!payload || !payload.length) return null;
                          const total = payload.reduce((sum, e) => sum + (Number(e.value) || 0), 0);
                          return (
                            <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 150 }}>
                              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', mb: 0.5, fontWeight: 600 }}>
                                Semana {(payload[0]?.payload as MuscleWeekDataPoint | undefined)?.label}
                              </Typography>
                              {payload.filter((e) => Number(e.value) > 0).map((e, i) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.3 }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: 0, bgcolor: e.color }} />
                                  <Typography sx={{ color: '#fff', fontSize: '0.72rem', flex: 1 }}>{String(e.dataKey)}</Typography>
                                  <Typography sx={{ color: '#fff', fontSize: '0.72rem', fontWeight: 700 }}>{Number(e.value)} séries</Typography>
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
                      {stats.muscleWeekGroups.map((grupo: string, i: number) => (
                        <Bar key={grupo} dataKey={grupo} stackId="muscle" fill={getMuscleColor(i)} radius={[0, 0, 0, 0]} stroke="none" activeBar={{ stroke: 'none' }} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer></LazyChart>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center', mt: 1 }}>
                    {stats.muscleWeekGroups.map((grupo: string, i: number) => (
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
                        content={<InlineTooltip renderContent={(payload) => {
                          if (!payload || !payload.length) return null;
                          const d = payload[0].payload as VolumeDataPoint;
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
                const cargaMaxDoExercicio = stats.cargaMaxData.find((d) => d.nome === exercicioSelecionado)?.cargaMax || 0;
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
                            content={<InlineTooltip renderContent={(payload) => {
                              if (!payload || !payload.length) return null;
                              const d = payload[0].payload as CargaEvolucaoPoint;
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
            const evolNomes = stats.exercicioEvolucaoFull.map((e: ExerciseEvolution) => e.nome);
            const evolSelecionado = filtroEvolucaoExercicio && evolNomes.includes(filtroEvolucaoExercicio)
              ? filtroEvolucaoExercicio
              : stats.ultimoExercicioFeito && evolNomes.includes(stats.ultimoExercicioFeito)
                ? stats.ultimoExercicioFeito
                : evolNomes[0];
            const exData = stats.exercicioEvolucaoFull.find((e) => e.nome === evolSelecionado);
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

    </>
  );
}
