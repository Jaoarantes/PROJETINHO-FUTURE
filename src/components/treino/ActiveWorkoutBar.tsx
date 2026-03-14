import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton } from '@mui/material';
import { Square, Play, Pause, CheckCircle2 } from 'lucide-react';
import { useTreinoStore } from '../../store/treinoStore';

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function ActiveWorkoutBar() {
  const navigate = useNavigate();
  const { treinoAtivo, sessoes, cancelarTreino, pausarTreino, retomarTreino, concluirTreino } = useTreinoStore();
  const [elapsed, setElapsed] = useState(0);

  const sessao = useMemo(
    () => treinoAtivo ? sessoes.find((s) => s.id === treinoAtivo.sessaoId) : null,
    [treinoAtivo, sessoes],
  );

  useEffect(() => {
    if (!treinoAtivo) { setElapsed(0); return; }
    const update = () => {
      const agora = treinoAtivo.pausadoEm || Date.now();
      const msBruto = agora - treinoAtivo.iniciadoEm;
      setElapsed(Math.floor((msBruto - treinoAtivo.tempoPausadoTotal) / 1000));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [treinoAtivo]);

  if (!treinoAtivo || !sessao) return null;

  const handleCancelar = (e: React.MouseEvent) => {
    e.stopPropagation();
    cancelarTreino();
  };

  const handlePauseResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (treinoAtivo.pausadoEm) {
      retomarTreino();
    } else {
      pausarTreino();
    }
  };

  const handleConcluir = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!treinoAtivo) return;
    try {
      await concluirTreino(treinoAtivo.sessaoId);
    } catch (err) {
      console.error('Erro ao concluir treino pela barra:', err);
    }
  };
  const handleOpen = () => {
    navigate(`/treino/${sessao.id}`);
  };

  return (
    <Box
      onClick={handleOpen}
      sx={{
        position: 'fixed',
        bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: '480px',
        zIndex: 1001,
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.2,
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          boxShadow: '0 8px 24px rgba(255,107,44,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
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
          onClick={handlePauseResume}
          sx={{ color: '#fff', p: 0.5 }}
        >
          {treinoAtivo.pausadoEm ? <Play size={18} fill="#fff" /> : <Pause size={18} fill="#fff" />}
        </IconButton>

        <IconButton
          size="small"
          onClick={handleConcluir}
          sx={{ color: '#fff', p: 0.5 }}
        >
          <CheckCircle2 size={18} />
        </IconButton>

        <IconButton
          size="small"
          onClick={handleCancelar}
          sx={{ color: '#fff', p: 0.5 }}
        >
          <Square size={16} fill="#fff" />
        </IconButton>
      </Box>
    </Box>
  );
}

