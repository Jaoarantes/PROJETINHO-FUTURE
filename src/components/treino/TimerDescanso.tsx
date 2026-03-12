import { useEffect, useState } from 'react';
import { Box, Typography, IconButton, Drawer, Chip } from '@mui/material';
import { X, Play, Square, RotateCcw } from 'lucide-react';

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const beeps = [
      { freq: 880, start: 0, dur: 0.15 },
      { freq: 880, start: 0.25, dur: 0.15 },
      { freq: 1100, start: 0.5, dur: 0.3 },
    ];
    beeps.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch { /* ignora */ }
}

const PRESETS = [
  { label: '30s', seg: 30 },
  { label: '1min', seg: 60 },
  { label: '90s', seg: 90 },
  { label: '2min', seg: 120 },
  { label: '3min', seg: 180 },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function TimerDescanso({ open, onClose }: Props) {
  const [duracao, setDuracao] = useState(60);
  const [restante, setRestante] = useState(60);
  const [ativo, setAtivo] = useState(false);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => {
      setRestante((r) => {
        if (r <= 1) {
          setAtivo(false);
          setConcluido(true);
          try { navigator.vibrate?.([200, 100, 200, 100, 400]); } catch { /* ignora */ }
          playBeep();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [ativo]);

  // Reseta quando fecha
  useEffect(() => {
    if (!open) {
      setAtivo(false);
      setConcluido(false);
      setRestante(duracao);
    }
  }, [open]);

  const iniciar = (d?: number) => {
    const dur = d ?? duracao;
    if (d !== undefined) setDuracao(dur);
    setRestante(dur);
    setAtivo(true);
    setConcluido(false);
  };

  const parar = () => {
    setAtivo(false);
    setConcluido(false);
    setRestante(duracao);
  };

  const progresso = duracao > 0 ? restante / duracao : 0;
  const R = 52;
  const circumference = 2 * Math.PI * R;
  const strokeDash = circumference * progresso;

  const mins = Math.floor(restante / 60);
  const secs = restante % 60;
  const display = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          px: 3,
          pb: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          pt: 2.5,
          maxWidth: 500,
          mx: 'auto',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
          Timer de Descanso
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </Box>

      {/* Presets */}
      <Box sx={{ display: 'flex', gap: 0.8, mb: 3, justifyContent: 'center' }}>
        {PRESETS.map(({ label, seg }) => (
          <Chip
            key={seg}
            label={label}
            onClick={() => iniciar(seg)}
            variant={duracao === seg ? 'filled' : 'outlined'}
            color={duracao === seg ? 'primary' : 'default'}
            sx={{ flex: 1, fontWeight: duracao === seg ? 700 : 400 }}
          />
        ))}
      </Box>

      {/* Circular countdown */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Box sx={{ position: 'relative', width: 148, height: 148 }}>
          <svg width="148" height="148" style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle cx="74" cy="74" r={R} fill="none" stroke="rgba(128,128,128,0.15)" strokeWidth="10" />
            {/* Progress */}
            <circle
              cx="74" cy="74" r={R}
              fill="none"
              stroke={concluido ? '#4caf50' : '#FF6B2C'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circumference}`}
              style={{ transition: ativo ? 'stroke-dasharray 0.9s linear' : 'none' }}
            />
          </svg>

          <Box sx={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 0.3,
          }}>
            <Typography sx={{
              fontFamily: '"Oswald", sans-serif',
              fontSize: concluido ? '2rem' : '2.2rem',
              fontWeight: 700,
              lineHeight: 1,
              color: concluido ? 'success.main' : 'text.primary',
            }}>
              {concluido ? '✓' : display}
            </Typography>
            {concluido && (
              <Typography variant="caption" color="success.main" fontWeight={600} sx={{ fontSize: '0.75rem' }}>
                Pronto!
              </Typography>
            )}
            {ativo && !concluido && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                descansando
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* Controles */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {!ativo && !concluido && (
          <IconButton
            onClick={() => iniciar()}
            sx={{
              bgcolor: '#FF6B2C', color: '#fff',
              width: 60, height: 60,
              '&:hover': { bgcolor: '#E55A1B' },
              boxShadow: '0 4px 16px rgba(255,107,44,0.4)',
            }}
          >
            <Play size={26} fill="#fff" />
          </IconButton>
        )}

        {ativo && (
          <IconButton
            onClick={() => setAtivo(false)}
            sx={{ bgcolor: 'action.selected', width: 60, height: 60 }}
          >
            <Square size={22} />
          </IconButton>
        )}

        {(ativo || concluido || restante < duracao) && (
          <IconButton
            onClick={parar}
            sx={{ bgcolor: 'action.hover', width: 60, height: 60 }}
          >
            <RotateCcw size={22} />
          </IconButton>
        )}
      </Box>
    </Drawer>
  );
}
