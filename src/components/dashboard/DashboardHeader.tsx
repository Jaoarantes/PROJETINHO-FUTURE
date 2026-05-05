import { Box, IconButton, Typography, alpha } from '@mui/material';
import { ArrowLeft, Flame } from 'lucide-react';
import { CORES, PERIODOS, type PeriodoKey } from './dashboardUtils';

export default function DashboardHeader({
  isDark,
  saudacao,
  firstName,
  streak,
  periodo,
  dataInicio,
  dataFim,
  onBack,
  onPeriodoChange,
  onDataInicioChange,
  onDataFimChange,
}: {
  isDark: boolean;
  saudacao: string;
  firstName: string;
  streak: number;
  periodo: PeriodoKey;
  dataInicio: string;
  dataFim: string;
  onBack: () => void;
  onPeriodoChange: (periodo: PeriodoKey) => void;
  onDataInicioChange: (data: string) => void;
  onDataFimChange: (data: string) => void;
}) {
  return (
    <Box sx={{
      position: 'relative',
      pt: 1.5,
      pb: 3,
      mb: 1,
      overflow: 'hidden',
    }}>
      <Box sx={{
        position: 'absolute',
        top: -60,
        right: -40,
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${alpha(CORES.geral, 0.12)} 0%, transparent 70%)`,
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute',
        top: 20,
        left: -30,
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${alpha(CORES.musculacao, 0.08)} 0%, transparent 70%)`,
        filter: 'blur(30px)',
        pointerEvents: 'none',
      }} />

      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mb: 1.5,
        animation: 'dash-fadeUp 0.15s ease-out',
      }}>
        <IconButton
          onClick={onBack}
          size="small"
          sx={{
            bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
          }}
        >
          <ArrowLeft size={20} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{
            color: 'text.secondary',
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            {saudacao}{firstName ? `, ${firstName}` : ''}
          </Typography>
          <Typography variant="h5" sx={{
            fontWeight: 700,
            fontSize: '1.6rem',
            lineHeight: 1.1,
            background: isDark
              ? `linear-gradient(135deg, #FAFAFA 0%, ${CORES.geral} 100%)`
              : `linear-gradient(135deg, #171717 0%, ${CORES.geral} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            DASHBOARD
          </Typography>
        </Box>
        {streak > 0 && (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            animation: 'dash-countUp 0.2s ease-out both',
          }}>
            <Box sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${alpha(CORES.geral, 0.15)} 0%, ${alpha(CORES.recorde, 0.1)} 100%)`,
              border: `1px solid ${alpha(CORES.geral, 0.2)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}>
              <Flame size={14} color={CORES.geral} />
              <Typography sx={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: CORES.geral,
                lineHeight: 1,
                mt: 0.2,
              }}>
                {streak}
              </Typography>
            </Box>
            <Typography sx={{
              fontSize: '0.5rem',
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              mt: 0.3,
              fontWeight: 600,
            }}>
              Dias Seguidos
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{
        display: 'flex',
        gap: 0.5,
        mb: periodo === 'custom' ? 1.5 : 0,
        overflowX: 'auto',
        pb: 0.5,
        animation: 'dash-fadeUp 0.15s ease-out 0.1s both',
        '&::-webkit-scrollbar': { display: 'none' },
      }}>
        {PERIODOS.map((p) => (
          <Box
            key={p.key}
            onClick={() => onPeriodoChange(p.key)}
            sx={{
              px: 1.5,
              py: 0.6,
              borderRadius: '10px',
              cursor: 'pointer',
              flexShrink: 0,
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              transition: 'all 0.2s ease',
              ...(periodo === p.key ? {
                background: `linear-gradient(135deg, ${CORES.geral} 0%, ${alpha(CORES.geral, 0.8)} 100%)`,
                color: '#000',
                boxShadow: `0 2px 12px ${alpha(CORES.geral, 0.3)}`,
              } : {
                bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                color: 'text.secondary',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  borderColor: alpha(CORES.geral, 0.2),
                },
              }),
            }}
          >
            {p.label}
          </Box>
        ))}
      </Box>

      {periodo === 'custom' && (
        <Box sx={{
          display: 'flex',
          gap: 1,
          animation: 'dash-fadeUp 0.15s ease-out',
        }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{
              display: 'block',
              mb: 0.5,
              ml: 0.2,
              fontSize: '0.6rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 600,
            }}>
              Início
            </Typography>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => onDataInicioChange(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '12px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                fontSize: '0.82rem',
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                color: 'inherit',
                outline: 'none',
              }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{
              display: 'block',
              mb: 0.5,
              ml: 0.2,
              fontSize: '0.6rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 600,
            }}>
              Fim
            </Typography>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => onDataFimChange(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '12px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                fontSize: '0.82rem',
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                color: 'inherit',
                outline: 'none',
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
