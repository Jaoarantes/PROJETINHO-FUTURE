import { useState } from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { ChevronDown, ChevronUp, Dumbbell } from 'lucide-react';
import { CORES } from './dashboardUtils';

export default function ExercicioSelect({
  exercicios,
  selected,
  onChange,
  isDark,
}: {
  exercicios: string[];
  selected: string;
  onChange: (nome: string) => void;
  isDark: boolean;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <Box sx={{ position: 'relative', mb: 1.5, px: 0.5 }}>
      <Box
        onClick={() => setAberto(!aberto)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
          borderRadius: '10px',
          cursor: 'pointer',
          bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
            borderColor: alpha(CORES.recorde, 0.3),
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Dumbbell size={14} color={CORES.recorde} />
          <Typography sx={{
            fontSize: '0.8rem',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {selected}
          </Typography>
        </Box>
        {aberto ? <ChevronUp size={16} color={isDark ? '#888' : '#666'} /> : <ChevronDown size={16} color={isDark ? '#888' : '#666'} />}
      </Box>

      {aberto && (
        <Box sx={{
          position: 'absolute',
          top: '100%',
          left: 4,
          right: 4,
          mt: 0.5,
          zIndex: 50,
          bgcolor: isDark ? 'rgba(18,18,18,0.98)' : 'rgba(255,255,255,0.98)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          borderRadius: '10px',
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(12px)',
          maxHeight: 240,
          overflowY: 'auto',
          py: 0.5,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
            borderRadius: 2,
          },
        }}>
          {exercicios.map((nome) => (
            <Box
              key={nome}
              onClick={() => { onChange(nome); setAberto(false); }}
              sx={{
                px: 1.5,
                py: 0.8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                transition: 'all 0.15s ease',
                bgcolor: nome === selected ? alpha(CORES.recorde, isDark ? 0.12 : 0.08) : 'transparent',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                },
              }}
            >
              {nome === selected && (
                <Box sx={{ width: 3, height: 16, borderRadius: 2, bgcolor: CORES.recorde, flexShrink: 0 }} />
              )}
              <Typography sx={{
                fontSize: '0.75rem',
                fontWeight: nome === selected ? 700 : 400,
                color: nome === selected ? (isDark ? '#fff' : '#111') : 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {nome}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
