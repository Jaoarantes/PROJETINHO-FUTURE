import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { corDominante, formatDateLabel, type HeatmapCell } from './dashboardUtils';

export default function HeatmapCalendar({ data, totalSemanas, isDark }: {
  data: HeatmapCell[];
  totalSemanas: number;
  isDark: boolean;
}) {
  const cellSize = 13;
  const gap = 2.5;
  const weeks = totalSemanas || Math.ceil(data.length / 7);

  const dataMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    data.forEach(d => map.set(`${d.weekIndex}-${d.dayOfWeek}`, d));
    return map;
  }, [data]);

  const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <Box sx={{ overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
      <Box sx={{ display: 'flex', gap: `${gap}px` }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${gap}px`, mr: 0.5 }}>
          {diasSemana.map((d, i) => (
            <Typography
              key={i}
              sx={{
                fontSize: '0.48rem',
                height: cellSize,
                lineHeight: `${cellSize}px`,
                textAlign: 'right',
                width: 12,
                color: 'text.secondary',
                fontWeight: 600,
                letterSpacing: '0.03em',
              }}
            >
              {i % 2 === 1 ? d : ''}
            </Typography>
          ))}
        </Box>

        {Array.from({ length: weeks }).map((_, weekIdx) => (
          <Box key={weekIdx} sx={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
            {Array.from({ length: 7 }).map((_, dayIdx) => {
              const item = dataMap.get(`${weekIdx}-${dayIdx}`);
              if (!item) {
                return <Box key={dayIdx} sx={{ width: cellSize, height: cellSize }} />;
              }

              let bg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
              let shadow = 'none';
              if (item.count > 0) {
                const cor = corDominante(item.tipos);
                const intensity = Math.min(0.35 + (item.count - 1) * 0.3, 1);
                const r = parseInt(cor.slice(1, 3), 16);
                const g = parseInt(cor.slice(3, 5), 16);
                const b = parseInt(cor.slice(5, 7), 16);
                bg = `rgba(${r}, ${g}, ${b}, ${intensity})`;
                shadow = `0 0 ${3 + item.count * 2}px rgba(${r}, ${g}, ${b}, ${intensity * 0.4})`;
              }

              return (
                <Box
                  key={dayIdx}
                  title={`${formatDateLabel(item.date)} - ${item.count} treino${item.count !== 1 ? 's' : ''}`}
                  sx={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: '2px',
                    bgcolor: bg,
                    boxShadow: shadow,
                    transition: 'all 0.2s ease',
                  }}
                />
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
