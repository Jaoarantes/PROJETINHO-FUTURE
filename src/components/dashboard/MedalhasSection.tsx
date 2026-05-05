import { useMemo, useState } from 'react';
import { Box, Card, CardContent, Typography, alpha } from '@mui/material';
import { Dumbbell, Footprints, Trophy } from 'lucide-react';
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

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box sx={{
          width: 28,
          height: 28,
          borderRadius: '7px',
          bgcolor: alpha('#F59E0B', 0.15),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Trophy size={14} color="#F59E0B" />
        </Box>
        <Typography
          variant="subtitle2"
          fontWeight={800}
          sx={{ letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.8rem' }}
        >
          Medalhas
        </Typography>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider', ml: 0.5 }} />
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
        {[
          { emoji: '🥇', count: totalOuro, label: 'Ouro', cor: '#F59E0B' },
          { emoji: '🥈', count: totalPrata, label: 'Prata', cor: '#94A3B8' },
          { emoji: '🥉', count: totalBronze, label: 'Bronze', cor: '#CD7C48' },
        ].map(({ emoji, count, label, cor }) => (
          <Box key={label} sx={{
            flex: 1,
            textAlign: 'center',
            py: 1.2,
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${alpha(cor, 0.12)} 0%, ${alpha(cor, 0.04)} 100%)`,
            border: `1px solid ${alpha(cor, 0.22)}`,
          }}>
            <Typography sx={{ fontSize: '1.5rem', lineHeight: 1 }}>{emoji}</Typography>
            <Typography variant="h6" fontWeight={800} sx={{ color: cor, lineHeight: 1.3, mt: 0.3, fontSize: '1.1rem' }}>
              {count}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>

      {prs.corrida.length > 0 && (
        <Card sx={{ mb: 2.5, overflow: 'hidden', borderRadius: '8px' }}>
          <CardContent sx={{ py: 1.5, px: 1.2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.2 }}>
              <Footprints size={13} color={CORES.corrida} />
              <Typography
                variant="caption"
                fontWeight={800}
                sx={{ color: CORES.corrida, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}
              >
                Corrida
              </Typography>
            </Box>
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

      {muscNomes.length > 0 && (
        <Card sx={{ mb: 2.5, overflow: 'hidden', borderRadius: '8px' }}>
          <CardContent sx={{ py: 1.5, px: 1.2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.2 }}>
              <Dumbbell size={13} color={CORES.musculacao} />
              <Typography
                variant="caption"
                fontWeight={800}
                sx={{ color: CORES.musculacao, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}
              >
                Musculação
              </Typography>
            </Box>
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
