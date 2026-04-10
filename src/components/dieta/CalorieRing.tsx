import { Box, Typography, useTheme } from '@mui/material';

interface Props {
  consumido: number;
  meta: number;
  size?: number;
}

export default function CalorieRing({ consumido, meta, size = 180 }: Props) {
  const theme = useTheme();
  const trackColor = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const restante = Math.max(0, meta - consumido);
  const pct = Math.min(consumido / meta, 1);
  const ultrapassou = consumido > meta;

  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <Box sx={{ position: 'relative', width: size, height: size, mx: 'auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="calorie-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.palette.primary.main} />
            <stop offset="100%" stopColor={theme.palette.primary.light} />
          </linearGradient>
          <linearGradient id="calorie-over" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.palette.error.main} />
            <stop offset="100%" stopColor={theme.palette.mode === 'dark' ? '#F87171' : '#EF4444'} />
          </linearGradient>
          <filter id="ring-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress arc with glow */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={ultrapassou ? 'url(#calorie-over)' : 'url(#calorie-gradient)'}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          filter={pct > 0.05 ? 'url(#ring-glow)' : undefined}
          style={{
            transition: 'stroke-dashoffset 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </svg>

      {/* Center text */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            
            fontWeight: 700,
            fontSize: '2.2rem',
            lineHeight: 1,
            color: ultrapassou ? 'error.main' : 'text.primary',
          }}
        >
          {ultrapassou ? `+${consumido - meta}` : restante}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          {ultrapassou ? 'ACIMA' : 'RESTANTE'}
        </Typography>
      </Box>
    </Box>
  );
}
