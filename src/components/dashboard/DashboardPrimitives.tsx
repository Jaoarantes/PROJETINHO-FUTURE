import type { ReactNode } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { Target } from 'lucide-react';
import { CORES } from './dashboardUtils';

export function GlowStat({ icon, value, label, color, isDark }: {
  icon: ReactNode;
  value: string | number;
  label: string;
  color: string;
  isDark: boolean;
}) {
  return (
    <Box sx={{
      position: 'relative',
      borderRadius: '5px',
      p: '1px',
      background: `linear-gradient(135deg, ${alpha(color, 0.3)} 0%, ${alpha(color, 0.05)} 100%)`,
      overflow: 'visible',
    }}>
      <Box sx={{
        borderRadius: '5px',
        bgcolor: isDark ? 'rgba(10,10,10,0.9)' : 'rgba(255,255,255,0.95)',
        py: 1.5,
        px: 1.2,
        textAlign: 'center',
        position: 'relative',
        overflow: 'visible',
      }}>
        <Box sx={{
          position: 'absolute',
          top: -15,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 60,
          height: 30,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(color, 0.15)} 0%, transparent 70%)`,
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }} />
        <Box sx={{ color, mb: 0.5, display: 'flex', justifyContent: 'center' }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: '1.3rem', fontWeight: 700, lineHeight: 1, color: isDark ? '#FAFAFA' : '#171717' }}>
          {value}
        </Typography>
        <Typography sx={{
          fontSize: '0.52rem',
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 600,
          mt: 0.3,
        }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

export function TypePill({ icon, count, color, isDark }: {
  icon: ReactNode;
  count: number;
  color: string;
  isDark: boolean;
}) {
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 0.7,
      py: 0.8,
      px: 1,
      borderRadius: '5px',
      bgcolor: alpha(color, isDark ? 0.08 : 0.06),
      border: `1px solid ${alpha(color, isDark ? 0.12 : 0.1)}`,
      justifyContent: 'center',
    }}>
      <Box sx={{ color, display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color, lineHeight: 1 }}>
        {count}
      </Typography>
    </Box>
  );
}

export function RecordBadge({ icon, label, value, color, isDark, onClick }: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
  isDark: boolean;
  onClick?: () => void;
}) {
  return (
    <Box sx={{
      flex: 1,
      borderRadius: '6px',
      p: '1px',
      background: `linear-gradient(135deg, ${alpha(color, 0.35)} 0%, ${alpha(color, 0.08)} 100%)`,
      cursor: onClick ? 'pointer' : 'default',
    }} onClick={onClick}>
      <Box sx={{
        borderRadius: '5px',
        bgcolor: isDark ? 'rgba(10,10,10,0.92)' : 'rgba(255,255,255,0.96)',
        py: 1.5,
        px: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.2,
      }}>
        <Box sx={{
          width: 36,
          height: 36,
          borderRadius: '4px',
          background: `linear-gradient(135deg, ${alpha(color, 0.2)} 0%, ${alpha(color, 0.08)} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          flexShrink: 0,
        }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1, color: isDark ? '#FAFAFA' : '#171717' }}>
            {value}
          </Typography>
          <Typography sx={{
            fontSize: '0.52rem',
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 600,
            mt: 0.2,
          }}>
            {label}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export function SectionHeader({ icon, title, badge, isDark }: {
  icon: ReactNode;
  title: string;
  badge?: string;
  isDark: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1 }}>
      <Box sx={{ color: CORES.geral, display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {title}
      </Typography>
      <Box sx={{
        flex: 1,
        height: '1px',
        background: isDark
          ? 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, transparent 100%)'
          : 'linear-gradient(90deg, rgba(0,0,0,0.08) 0%, transparent 100%)',
        mx: 0.5,
      }} />
      {badge && (
        <Typography sx={{
          fontSize: '0.58rem',
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
          bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          px: 0.8,
          py: 0.2,
          borderRadius: '4px',
        }}>
          {badge}
        </Typography>
      )}
    </Box>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <Box sx={{
      textAlign: 'center',
      py: 4,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 1,
    }}>
      <Box sx={{ opacity: 0.2 }}>
        <Target size={32} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.6, fontSize: '0.82rem' }}>
        {text}
      </Typography>
    </Box>
  );
}

export function HeatLegend({ color, label }: { color: string; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{
        width: 10,
        height: 10,
        borderRadius: '3px',
        bgcolor: color,
        boxShadow: `0 0 6px ${alpha(color, 0.3)}`,
      }} />
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{label}</Typography>
    </Box>
  );
}
