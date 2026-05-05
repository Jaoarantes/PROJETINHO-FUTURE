import { useMemo, useState } from 'react';
import { Box, Card, CardContent, Typography, alpha } from '@mui/material';
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import type { RegistroTreino } from '../../types/treino';
import { CORES } from './dashboardUtils';
import { SectionHeader } from './DashboardPrimitives';
import {
  MARCAS_PRINCIPAIS,
  calcPaceMarca,
  calcularTempoEtapas,
  calcularTempoSplits,
  formatarTempoMarca,
  getNomesStrava,
} from './bestEffortsUtils';

export default function BestEffortsSection({ historico, isDark }: { historico: RegistroTreino[]; isDark: boolean }) {
  const [marcaCustom, setMarcaCustom] = useState<string | null>(null);

  const todosBestEfforts = useMemo(() => {
    const map = new Map<string, { tempo: number; data: string; registroId: string }>();

    for (const reg of historico) {
      if (reg.stravaData?.bestEfforts) {
        for (const be of reg.stravaData.bestEfforts) {
          const existing = map.get(be.name);
          if (!existing || be.movingTime < existing.tempo) {
            map.set(be.name, { tempo: be.movingTime, data: reg.concluidoEm, registroId: reg.id });
          }
        }
      }

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

  const marcasPrincipais = useMemo(() => {
    return MARCAS_PRINCIPAIS.map((m) => {
      const nomes = getNomesStrava(m.distancia);
      let melhor: { tempo: number; data: string; registroId: string } | undefined;
      for (const nome of nomes) {
        const found = todosBestEfforts.get(nome);
        if (found && (!melhor || found.tempo < melhor.tempo)) {
          melhor = found;
        }
      }

      if (!melhor) {
        const km = Math.round(m.distancia / 1000);
        const found = todosBestEfforts.get(`${km}k_calc`);
        if (found) melhor = found;
      }

      return { ...m, melhor };
    });
  }, [todosBestEfforts]);

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
                    <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', color: CORES.corrida }}>
                      {formatarTempoMarca(m.melhor.tempo)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ px: 0.8, py: 0.2, bgcolor: alpha(CORES.corrida, 0.1), borderRadius: 1 }}>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: CORES.corrida }}>
                        {calcPaceMarca(m.distancia, m.melhor.tempo)} /km
                      </Typography>
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
                    <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: CORES.corrida }}>
                      {formatarTempoMarca(m.tempo)}
                    </Typography>
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
