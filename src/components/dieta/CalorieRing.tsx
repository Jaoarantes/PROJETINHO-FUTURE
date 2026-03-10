import { Box, Typography } from '@mui/material';

interface Props {
    consumido: number;
    meta: number;
    size?: number;
}

export default function CalorieRing({ consumido, meta, size = 180 }: Props) {
    const restante = Math.max(0, meta - consumido);
    const pct = Math.min(consumido / meta, 1);
    const ultrapassou = consumido > meta;

    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - pct);

    return (
        <Box sx={{ position: 'relative', width: size, height: size, mx: 'auto' }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <defs>
                    <linearGradient id="calorie-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F97316" />
                        <stop offset="100%" stopColor="#FB923C" />
                    </linearGradient>
                    <linearGradient id="calorie-over" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#EF4444" />
                        <stop offset="100%" stopColor="#F87171" />
                    </linearGradient>
                </defs>

                {/* Track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={strokeWidth}
                    fill="none"
                />

                {/* Progress arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={ultrapassou ? 'url(#calorie-over)' : 'url(#calorie-gradient)'}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{
                        transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
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
                    variant="h3"
                    fontWeight={700}
                    lineHeight={1}
                    color={ultrapassou ? 'error.main' : 'text.primary'}
                >
                    {ultrapassou ? `+${consumido - meta}` : restante}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {ultrapassou ? 'ACIMA' : 'RESTANTE'}
                </Typography>
            </Box>
        </Box>
    );
}
