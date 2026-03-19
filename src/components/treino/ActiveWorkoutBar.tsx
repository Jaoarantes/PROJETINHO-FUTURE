import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
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
  const treinoAtivo = useTreinoStore((s) => s.treinoAtivo);
  const sessoes = useTreinoStore((s) => s.sessoes);
  const cancelarTreino = useTreinoStore((s) => s.cancelarTreino);
  const pausarTreino = useTreinoStore((s) => s.pausarTreino);
  const retomarTreino = useTreinoStore((s) => s.retomarTreino);
  const concluirTreino = useTreinoStore((s) => s.concluirTreino);
  const [confirmAction, setConfirmAction] = useState<null | 'pausar' | 'retomar' | 'concluir' | 'cancelar'>(null);

  // Use ref + direct DOM update for the timer to avoid re-rendering the whole component every second
  const timerRef = useRef<HTMLSpanElement>(null);
  const treinoAtivoRef = useRef(treinoAtivo);
  treinoAtivoRef.current = treinoAtivo;

  const sessao = useMemo(
    () => treinoAtivo ? sessoes.find((s) => s.id === treinoAtivo.sessaoId) : null,
    [treinoAtivo, sessoes],
  );

  useEffect(() => {
    if (!treinoAtivo) return;
    const update = () => {
      const t = treinoAtivoRef.current;
      if (!t || !timerRef.current) return;
      const agora = t.pausadoEm || Date.now();
      const msBruto = agora - t.iniciadoEm;
      const seconds = Math.floor((msBruto - t.tempoPausadoTotal) / 1000);
      timerRef.current.textContent = formatTimer(seconds);
    };
    update();
    // Don't run interval if paused
    if (treinoAtivo.pausadoEm) return;
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [treinoAtivo]);

  const handleCancelar = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmAction('cancelar');
  }, []);

  const handlePauseResume = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const t = treinoAtivoRef.current;
    setConfirmAction(t?.pausadoEm ? 'retomar' : 'pausar');
  }, []);

  const handleConcluir = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmAction('concluir');
  }, []);

  const executeConfirmedAction = useCallback(async () => {
    const action = confirmAction;
    setConfirmAction(null);
    const t = treinoAtivoRef.current;
    if (action === 'pausar') pausarTreino();
    else if (action === 'retomar') retomarTreino();
    else if (action === 'concluir') {
      try { if (t) await concluirTreino(t.sessaoId); } catch (err) { console.error('Erro ao concluir treino pela barra:', err); }
    } else if (action === 'cancelar') cancelarTreino();
  }, [confirmAction, pausarTreino, retomarTreino, concluirTreino, cancelarTreino]);

  if (!treinoAtivo || !sessao) return null;

  const confirmLabels: Record<string, { title: string; desc: string }> = {
    pausar: { title: 'Pausar treino?', desc: 'O cronômetro será pausado.' },
    retomar: { title: 'Retomar treino?', desc: 'O cronômetro continuará de onde parou.' },
    concluir: { title: 'Concluir treino?', desc: 'O treino será salvo no histórico.' },
    cancelar: { title: 'Parar treino?', desc: 'O treino será descartado e o progresso perdido.' },
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
          component="span"
          ref={timerRef}
          sx={{
            color: '#fff',
            fontWeight: 700,
            fontSize: '1rem',
            letterSpacing: '0.04em',
          }}
        >
          00:00
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

      {/* Confirmation Dialog */}
      <Dialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onClick={(e) => e.stopPropagation()}
        PaperProps={{ sx: { borderRadius: 3, px: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {confirmAction && confirmLabels[confirmAction]?.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmAction && confirmLabels[confirmAction]?.desc}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAction(null)} color="inherit">Cancelar</Button>
          <Button onClick={executeConfirmedAction} variant="contained" color={confirmAction === 'cancelar' ? 'error' : 'primary'} sx={{ fontWeight: 700 }}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
