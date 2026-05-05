import { useState } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { Award, CalendarDays, ChevronDown, ChevronRight, ChevronUp, Crown, Flame, Star } from 'lucide-react';

const MEDAL_META: Record<string, { color: string; label: string; icon: typeof Crown }> = {
  ouro: { color: '#F97316', label: 'RECORDE PESSOAL', icon: Crown },
  prata: { color: '#8792A8', label: 'OTIMO TRABALHO', icon: Star },
  bronze: { color: '#C65A1E', label: 'CONTINUE ASSIM', icon: Award },
};

function formatDate(data: string) {
  return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function FeaturedMedal({ tipo, valor, data }: { tipo: string; valor: string; data: string }) {
  const meta = MEDAL_META[tipo] ?? MEDAL_META.bronze;
  const Icon = meta.icon;

  return (
    <Box
      sx={{
        minHeight: 146,
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        px: { xs: 2, sm: 2.5 },
        py: 2,
        color: '#fff',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: { xs: 1.4, sm: 2 },
        background: 'linear-gradient(115deg, #121820 0%, #111820 48%, #B44A04 100%)',
        boxShadow: `0 16px 34px ${alpha('#F97316', 0.26)}`,
      }}
    >
      <Box sx={{
        position: 'absolute',
        inset: 0,
        opacity: 0.18,
        background: 'radial-gradient(circle at 84% 55%, #FF7A1A 0%, transparent 34%)',
      }} />
      <Box sx={{
        position: 'absolute',
        right: { xs: 42, sm: 120 },
        top: 12,
        bottom: 0,
        width: 150,
        opacity: 0.1,
        border: '2px solid #fff',
        borderRadius: '45% 55% 50% 42%',
        transform: 'rotate(-26deg)',
      }} />

      <Box sx={{
        width: { xs: 74, sm: 96 },
        height: { xs: 74, sm: 96 },
        borderRadius: '50%',
        border: `5px solid ${alpha(meta.color, 0.4)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        <Box sx={{
          width: { xs: 44, sm: 56 },
          height: { xs: 44, sm: 56 },
          borderRadius: '50%',
          bgcolor: '#fff',
          color: meta.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 18px rgba(0,0,0,0.22)',
        }}>
          <Icon size={28} strokeWidth={2.4} />
        </Box>
      </Box>

      <Box sx={{ minWidth: 0, position: 'relative', zIndex: 1 }}>
        <Box sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.7,
          px: 1.2,
          py: 0.35,
          mb: 1,
          borderRadius: '999px',
          color: meta.color,
          border: `1px solid ${alpha(meta.color, 0.55)}`,
          bgcolor: alpha('#000', 0.2),
        }}>
          <Flame size={14} />
          <Typography variant="caption" fontWeight={900} sx={{ lineHeight: 1 }}>
            {meta.label}
          </Typography>
        </Box>
        <Typography
          fontWeight={900}
          sx={{
            fontSize: { xs: '2.15rem', sm: '3rem' },
            lineHeight: 0.95,
            letterSpacing: 0,
            textShadow: '0 2px 10px rgba(0,0,0,0.28)',
            whiteSpace: 'nowrap',
          }}
        >
          {valor}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.7, color: 'rgba(255,255,255,0.72)' }}>
          Seu melhor resultado
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <CalendarDays size={24} />
        <Typography variant="subtitle2" fontWeight={800} sx={{ mt: 0.7, fontSize: { xs: '0.78rem', sm: '0.875rem' } }}>
          {formatDate(data)}
        </Typography>
      </Box>
    </Box>
  );
}

function MedalRow({ tipo, valor, data, index }: { tipo: string; valor: string; data: string; index: number }) {
  const meta = MEDAL_META[tipo] ?? MEDAL_META.bronze;
  const Icon = meta.icon;

  return (
    <Box
      sx={{
        minHeight: 70,
        borderRadius: '8px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'grid',
        gridTemplateColumns: { xs: '48px 46px minmax(74px, 1fr) auto auto', sm: '58px 58px 1fr auto auto' },
        alignItems: 'center',
        gap: { xs: 1, sm: 1.5 },
        px: { xs: 1.2, sm: 1.8 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, bgcolor: meta.color }} />
      <Box sx={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        bgcolor: alpha(meta.color, 0.14),
        color: meta.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: '1.1rem',
        ml: 0.5,
      }}>
        {index + 1}º
      </Box>
      <Box sx={{
        width: 42,
        height: 42,
        borderRadius: '50%',
        bgcolor: `linear-gradient(145deg, ${alpha(meta.color, 0.2)}, ${alpha(meta.color, 0.05)})`,
        color: meta.color,
        border: `1px solid ${alpha(meta.color, 0.22)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={25} />
      </Box>
      <Typography fontWeight={900} sx={{ fontSize: { xs: '1.18rem', sm: '1.7rem' }, lineHeight: 1, color: 'text.primary' }}>
        {valor}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, color: 'text.secondary' }}>
        <CalendarDays size={17} />
        <Typography variant="body2" sx={{ fontSize: { xs: '0.72rem', sm: '0.875rem' } }}>{formatDate(data)}</Typography>
      </Box>
      <ChevronRight size={21} color="currentColor" style={{ opacity: 0.65 }} />
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
  const featured = rankings[0];
  const rows = expandido ? rankings.slice(1) : rankings.slice(1, 3);
  const temMais = rankings.length > 3;

  if (!featured) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <FeaturedMedal tipo={featured.tipo} valor={featured.valor} data={featured.data} />
      {rows.map((r, i) => <MedalRow key={`${r.tipo}-${r.valor}-${r.data}`} tipo={r.tipo} valor={r.valor} data={r.data} index={i + 1} />)}
      {temMais && (
        <Box
          onClick={() => setExpandido(!expandido)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            py: 0.9,
            cursor: 'pointer',
            borderRadius: '8px',
            color: 'text.secondary',
            bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)',
            border: `1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)'}`,
            transition: 'all 0.2s',
            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)' },
          }}
        >
          {expandido
            ? <><ChevronUp size={15} /><Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 700 }}>Ver menos</Typography></>
            : <><ChevronDown size={15} /><Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 700 }}>Ver mais ({rankings.length - 3})</Typography></>
          }
        </Box>
      )}
    </Box>
  );
}
