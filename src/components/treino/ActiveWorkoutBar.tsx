import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton } from '@mui/material';
import { Trash2, Play, Timer } from 'lucide-react';
import { useTreinoStore } from '../../store/treinoStore';
import TimerDescanso from './TimerDescanso';

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function ActiveWorkoutBar() {
  const navigate = useNavigate();
  const { treinoAtivo, sessoes, cancelarTreino } = useTreinoStore();
  const [elapsed, setElapsed] = useState(0);
  const [timerOpen, setTimerOpen] = useState(false);

  const sessao = useMemo(
    () => treinoAtivo ? sessoes.find((s) => s.id === treinoAtivo.sessaoId) : null,
    [treinoAtivo, sessoes],
  );

  useEffect(() => {
    if (!treinoAtivo) { setElapsed(0); return; }
    const update = () => setElapsed(Math.floor((Date.now() - treinoAtivo.iniciadoEm) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [treinoAtivo]);

  if (!treinoAtivo || !sessao) return null;

  const handleCancelar = (e: React.MouseEvent) => {
    e.stopPropagation();
    cancelarTreino();
  };

  const handleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerOpen(true);
  };

  const handleOpen = () => {
    navigate(`/treino/${sessao.id}`);
  };

  return (
    <Box
      onClick={handleOpen}
      sx={{
        position: 'fixed',
        bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '500px',
        zIndex: 1001,
        cursor: 'pointer',
      }}
    >
      <Box
        sx={{
          mx: 1,
          px: 2,
          py: 1,
          borderRadius: '14px 14px 0 0',
          background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          boxShadow: '0 -2px 16px rgba(255,107,44,0.3)',
        }}
      >
        <Play size={16} fill="#fff" color="#fff" />
        <Typography
          variant="body2"
          sx={{ flex: 1, color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}
          noWrap
        >
          {sessao.nome}
        </Typography>
        <Typography
          sx={{
            fontFamily: '"Oswald", sans-serif',
            color: '#fff',
            fontWeight: 700,
            fontSize: '1rem',
            letterSpacing: '0.04em',
          }}
        >
          {formatTimer(elapsed)}
        </Typography>
        <IconButton
          size="small"
          onClick={handleTimer}
          sx={{ color: '#fff', p: 0.5 }}
        >
          <Timer size={18} />
        </IconButton>
        <IconButton
          size="small"
          onClick={handleCancelar}
          sx={{ color: '#fff', p: 0.5 }}
        >
          <Trash2 size={18} />
        </IconButton>
      </Box>

      <TimerDescanso open={timerOpen} onClose={() => setTimerOpen(false)} />
    </Box>
  );
}
