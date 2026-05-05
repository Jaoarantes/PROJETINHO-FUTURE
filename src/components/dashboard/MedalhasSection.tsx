import { useMemo, useState } from 'react';
import { Box, Card, CardContent, Typography, alpha } from '@mui/material';
import { Award, BarChart3, ChevronRight, Crown, Dumbbell, Footprints, Medal, Star, Trophy } from 'lucide-react';
import { computeAllTimePRs } from '../../utils/prSystem';
import type { RegistroTreino } from '../../types/treino';
import { CORES } from './dashboardUtils';
import ExercicioSelect from './ExercicioSelect';
import MedalList from './MedalList';

export default function MedalhasSection({ historico, isDark }: { historico: RegistroTreino[]; isDark: boolean }) {
  const prs = useMemo(() => computeAllTimePRs(historico), [historico]);

  const muscNomes = useMemo(() =>
    Array.from(prs.musculacao.values())
      .sort((a, b) => (b.rankings[0]?.valor ?? 0) - (a.rankings[0]?.valor ?? 0))
      .map((e) => e.nomeExercicio),
    [prs],
  );

  const corridaNomes = useMemo(() => prs.corrida.map((c) => c.label), [prs]);

  const [exercicioSel, setExercicioSel] = useState<string | null>(null);
  const [corridaSel, setCorridaSel] = useState<string | null>(null);

  const exercicioAtual = exercicioSel && muscNomes.includes(exercicioSel) ? exercicioSel : muscNomes[0] ?? null;
  const corridaAtual = corridaSel && corridaNomes.includes(corridaSel) ? corridaSel : corridaNomes[0] ?? null;

  const muscRankings = exercicioAtual
    ? (prs.musculacao.get(exercicioAtual)?.rankings.map((r) => ({ tipo: r.tipo, valor: r.valorFormatado, data: r.data })) ?? [])
    : [];
  const corridaRankings = corridaAtual
    ? (prs.corrida.find((c) => c.label === corridaAtual)?.rankings.map((r) => ({ tipo: r.tipo, valor: r.valorFormatado, data: r.data })) ?? [])
    : [];

  const totalOuro = prs.registrosComOuro.size;
  const totalPrata = prs.registrosComPrata.size;
  const totalBronze = prs.registrosComBronze.size;

  if (prs.musculacao.size === 0 && prs.corrida.length === 0) return null;

  const medalCards = [
    {
      key: 'ouro',
      count: totalOuro,
      label: 'OURO',
      caption: 'melhor desempenho',
      color: '#F59E0B',
      soft: '#FFF7E6',
      icon: Crown,
    },
    {
      key: 'prata',
      count: totalPrata,
      label: 'PRATA',
      caption: 'otimo trabalho',
      color: '#7C879A',
      soft: '#F4F7FB',
      icon: Star,
    },
    {
      key: 'bronze',
      count: totalBronze,
      label: 'BRONZE',
      caption: 'continue assim!',
      color: '#C65A1E',
      soft: '#FFF1EA',
      icon: Award,
    },
  ];

  return (
    <Box sx={{ mt: 3 }}>
      <Card
        sx={{
          mb: 2.5,
          borderRadius: '8px',
          overflow: 'hidden',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'}`,
          boxShadow: isDark ? 'none' : '0 18px 45px rgba(15,23,42,0.08)',
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, mb: 2.4 }}>
            <Box sx={{
              width: 48,
              height: 48,
              borderRadius: '8px',
              bgcolor: alpha('#F97316', isDark ? 0.18 : 0.12),
              color: '#F97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Trophy size={27} strokeWidth={2.4} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.05, color: 'text.primary' }}>
                Medalhas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                Suas conquistas, seu progresso.
              </Typography>
            </Box>
            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                gap: 1,
                px: 1.4,
                py: 0.9,
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'divider',
                color: 'text.primary',
                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
              }}
            >
              <BarChart3 size={17} color="#F97316" />
              <Typography variant="body2" fontWeight={700}>Historico</Typography>
              <ChevronRight size={17} color="currentColor" />
            </Box>
          </Box>

          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
            gap: 1.5,
          }}>
            {medalCards.map(({ key, count, label, caption, color, soft, icon: Icon }) => (
              <Box
                key={key}
                sx={{
                  minHeight: { xs: 168, sm: 210 },
                  p: 2,
                  borderRadius: '8px',
                  position: 'relative',
                  overflow: 'hidden',
                  textAlign: 'center',
                  border: `1px solid ${alpha(color, isDark ? 0.3 : 0.22)}`,
                  background: isDark
                    ? `linear-gradient(145deg, ${alpha(color, 0.16)}, rgba(255,255,255,0.03))`
                    : `linear-gradient(145deg, ${soft}, #fff)`,
                }}
              >
                <Box sx={{
                  position: 'absolute',
                  right: 18,
                  top: 22,
                  width: 44,
                  height: 56,
                  opacity: isDark ? 0.18 : 0.28,
                  backgroundImage: `radial-gradient(${alpha(color, 0.9)} 1.5px, transparent 1.5px)`,
                  backgroundSize: '12px 12px',
                }} />
                <Box sx={{
                  width: 88,
                  height: 88,
                  mx: 'auto',
                  mb: 1.8,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  background: `linear-gradient(145deg, ${alpha(color, 0.72)}, ${color})`,
                  border: `5px solid ${alpha('#fff', isDark ? 0.18 : 0.85)}`,
                  boxShadow: `0 16px 32px ${alpha(color, 0.28)}`,
                  position: 'relative',
                  zIndex: 1,
                }}>
                  <Icon size={42} strokeWidth={2.1} />
                </Box>
                <Typography variant="h3" fontWeight={900} sx={{ color, lineHeight: 0.95, fontSize: { xs: '2.45rem', sm: '2.8rem' } }}>
                  {count}
                </Typography>
                <Typography variant="subtitle2" fontWeight={900} sx={{ mt: 1, letterSpacing: '0.04em', color: 'text.primary' }}>
                  {label}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.8, mt: 2.2, color }}>
                  {key === 'ouro' ? <BarChart3 size={18} /> : key === 'prata' ? <Star size={18} /> : <Medal size={18} />}
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1 }}>
                    {caption}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {prs.corrida.length > 0 && (
        <Card sx={{ mb: 2.5, overflow: 'hidden', borderRadius: '8px', boxShadow: isDark ? 'none' : '0 14px 34px rgba(15,23,42,0.06)' }}>
          <CardContent sx={{ py: 2, px: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Footprints size={25} color={CORES.corrida} />
              <Typography variant="h6" fontWeight={900} sx={{ color: 'text.primary', lineHeight: 1 }}>
                Corrida
              </Typography>
            </Box>
            <Box sx={{ position: 'relative', mb: 1.8 }}>
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

      {muscNomes.length > 0 && (
        <Card sx={{ mb: 2.5, overflow: 'hidden', borderRadius: '8px', boxShadow: isDark ? 'none' : '0 14px 34px rgba(15,23,42,0.06)' }}>
          <CardContent sx={{ py: 2, px: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Dumbbell size={25} color={CORES.musculacao} />
              <Typography variant="h6" fontWeight={900} sx={{ color: 'text.primary', lineHeight: 1 }}>
                Musculacao
              </Typography>
            </Box>
            <Box sx={{ mb: 1.8 }}>
              <ExercicioSelect
                exercicios={muscNomes}
                selected={exercicioAtual ?? ''}
                onChange={(nome) => setExercicioSel(nome)}
                isDark={isDark}
              />
            </Box>
            <MedalList rankings={muscRankings} isDark={isDark} />
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
