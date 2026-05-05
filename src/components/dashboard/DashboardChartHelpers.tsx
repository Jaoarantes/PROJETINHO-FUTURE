import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { CORES, tooltipStyle } from './dashboardUtils';

export function LazyChart({ height, children }: { height: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: '100px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Box ref={ref} sx={{ minHeight: height }}>
      {visible ? children : null}
    </Box>
  );
}

export function InlineTooltip({
  active,
  payload,
  renderContent,
}: {
  active?: boolean;
  payload?: unknown[];
  renderContent: (payload: unknown[]) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return <div style={{ pointerEvents: 'none' }}>{renderContent(payload)}</div>;
}

export function FreqTooltip(props: any) {
  const { active, payload, label: weekLabel } = props;
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum: number, entry: any) => sum + (Number(entry.value) || 0), 0);
  return (
    <Box sx={{
      ...tooltipStyle,
      p: 2,
      minWidth: 160,
      borderRadius: '0 !important',
    }}>
      <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', mb: 0.8, fontWeight: 600 }}>
        Semana {weekLabel}
      </Typography>
      {payload.map((entry: any, index: number) => {
        if (!entry.value) return null;
        const lbl = entry.name === 'musculacao' ? 'Musculação' : entry.name === 'corrida' ? 'Corrida' : 'Natação';
        return (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.4 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: 0, bgcolor: entry.color, boxShadow: `0 0 4px ${entry.color}` }} />
            <Typography sx={{ color: '#fff', fontSize: '0.75rem', flex: 1 }}>{lbl}</Typography>
            <Typography sx={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>{entry.value}</Typography>
          </Box>
        );
      })}
      <Box sx={{
        mt: 0.8,
        pt: 0.8,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 700 }}>Total</Typography>
        <Typography sx={{ color: CORES.geral, fontSize: '0.75rem', fontWeight: 700 }}>{total}</Typography>
      </Box>
    </Box>
  );
}
