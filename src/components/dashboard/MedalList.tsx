import { useState } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { ChevronDown, ChevronUp } from 'lucide-react';

const MEDAL_META: Record<string, { cor: string; glow: string; label: string; emoji: string }> = {
  ouro: { cor: '#F59E0B', glow: 'rgba(245,158,11,0.35)', label: 'Recorde', emoji: '🥇' },
  prata: { cor: '#94A3B8', glow: 'rgba(148,163,184,0.25)', label: '2° / 3°', emoji: '🥈' },
  bronze: { cor: '#CD7C48', glow: 'rgba(205,124,72,0.2)', label: 'Top 10', emoji: '🥉' },
};

function MedalPill({ tipo, valor, data }: { tipo: string; valor: string; data: string }) {
  const m = MEDAL_META[tipo] ?? MEDAL_META.bronze;
  const dataFmt = new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.2,
      px: 1.4,
      py: 1,
      borderRadius: '10px',
      background: `linear-gradient(135deg, ${alpha(m.cor, 0.12)} 0%, ${alpha(m.cor, 0.04)} 100%)`,
      border: `1px solid ${alpha(m.cor, 0.28)}`,
      boxShadow: tipo === 'ouro' ? `0 2px 12px ${m.glow}` : 'none',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, bgcolor: m.cor, borderRadius: '10px 0 0 10px' }} />
      <Typography sx={{
        fontSize: '1.25rem',
        lineHeight: 1,
        flexShrink: 0,
        ml: 0.5,
        filter: tipo === 'ouro' ? `drop-shadow(0 0 4px ${m.glow})` : 'none',
      }}>
        {m.emoji}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" sx={{
          color: m.cor,
          fontWeight: 700,
          fontSize: '0.6rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          display: 'block',
          lineHeight: 1,
        }}>
          {m.label}
        </Typography>
        <Typography variant="body2" fontWeight={800} sx={{ lineHeight: 1.3, fontSize: '0.95rem' }}>
          {valor}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.58rem', flexShrink: 0 }}>
        {dataFmt}
      </Typography>
    </Box>
  );
}

export default function MedalList({
  rankings,
  isDark,
}: {
  rankings: { tipo: string; valor: string; data: string }[];
  isDark: boolean;
}) {
  const [expandido, setExpandido] = useState(false);
  const visiveis = expandido ? rankings : rankings.slice(0, 3);
  const temMais = rankings.length > 3;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
      {visiveis.map((r, i) => <MedalPill key={i} tipo={r.tipo} valor={r.valor} data={r.data} />)}
      {temMais && (
        <Box
          onClick={() => setExpandido(!expandido)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            py: 0.7,
            cursor: 'pointer',
            borderRadius: '8px',
            color: 'text.secondary',
            bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            border: `1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            transition: 'all 0.2s',
            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
          }}
        >
          {expandido
            ? <><ChevronUp size={13} /><Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>Ver menos</Typography></>
            : <><ChevronDown size={13} /><Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>Ver mais ({rankings.length - 3})</Typography></>
          }
        </Box>
      )}
    </Box>
  );
}
