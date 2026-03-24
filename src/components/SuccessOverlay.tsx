import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CheckCircle, Dumbbell, Send, Copy } from 'lucide-react';

type OverlayVariant = 'treino' | 'post' | 'copiar';

interface SuccessOverlayProps {
  open: boolean;
  variant?: OverlayVariant;
  message?: string;
  submessage?: string;
  onComplete?: () => void;
  duration?: number;
}

const VARIANT_CONFIG: Record<OverlayVariant, {
  icon: React.ReactNode;
  color: string;
  defaultMessage: string;
  defaultSub: string;
}> = {
  treino: {
    icon: <Dumbbell size={40} color="#fff" />,
    color: '#FF6B2C',
    defaultMessage: 'Treino concluído!',
    defaultSub: 'Salvo no histórico',
  },
  post: {
    icon: <Send size={36} color="#fff" />,
    color: '#FF6B2C',
    defaultMessage: 'Publicado!',
    defaultSub: 'Seu post está no feed',
  },
  copiar: {
    icon: <Copy size={36} color="#fff" />,
    color: '#4CAF50',
    defaultMessage: 'Treino copiado!',
    defaultSub: 'Adicionado aos seus treinos',
  },
};

export default function SuccessOverlay({
  open,
  variant = 'treino',
  message,
  submessage,
  onComplete,
  duration = 1400,
}: SuccessOverlayProps) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit' | 'gone'>('gone');
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!open) {
      setPhase('gone');
      return;
    }

    setPhase('enter');
    const t1 = setTimeout(() => setPhase('visible'), 50);
    const t2 = setTimeout(() => setPhase('exit'), duration - 400);
    const t3 = setTimeout(() => {
      setPhase('gone');
      onCompleteRef.current?.();
    }, duration);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [open, duration]);

  if (phase === 'gone') return null;

  const cfg = VARIANT_CONFIG[variant];
  const msg = message || cfg.defaultMessage;
  const sub = submessage || cfg.defaultSub;

  const isVisible = phase === 'visible' || phase === 'enter';

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: alpha('#000', phase === 'enter' ? 0 : phase === 'exit' ? 0 : 0.6),
        backdropFilter: isVisible ? 'blur(8px)' : 'blur(0px)',
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'none',
      }}
    >
      {/* Ripple rings */}
      <Box sx={{
        position: 'absolute',
        width: 200, height: 200,
        borderRadius: '50%',
        border: `2px solid ${alpha(cfg.color, 0.2)}`,
        animation: isVisible ? 'successRipple 1s ease-out forwards' : 'none',
        '@keyframes successRipple': {
          '0%': { transform: 'scale(0.3)', opacity: 1 },
          '100%': { transform: 'scale(2.5)', opacity: 0 },
        },
      }} />
      <Box sx={{
        position: 'absolute',
        width: 200, height: 200,
        borderRadius: '50%',
        border: `2px solid ${alpha(cfg.color, 0.15)}`,
        animation: isVisible ? 'successRipple 1s 0.15s ease-out forwards' : 'none',
        '@keyframes successRipple': {
          '0%': { transform: 'scale(0.3)', opacity: 1 },
          '100%': { transform: 'scale(2.5)', opacity: 0 },
        },
      }} />

      {/* Icon circle */}
      <Box sx={{
        width: 88, height: 88,
        borderRadius: '50%',
        bgcolor: cfg.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 8px 32px ${alpha(cfg.color, 0.4)}`,
        transform: phase === 'enter' ? 'scale(0.3)' : phase === 'exit' ? 'scale(0.8)' : 'scale(1)',
        opacity: phase === 'exit' ? 0 : 1,
        transition: phase === 'enter'
          ? 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          : 'all 0.3s ease-in',
      }}>
        {cfg.icon}
      </Box>

      {/* Check badge */}
      <Box sx={{
        position: 'relative',
        mt: -2, ml: 7,
        width: 32, height: 32,
        borderRadius: '50%',
        bgcolor: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        transform: phase === 'visible' ? 'scale(1)' : 'scale(0)',
        transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s',
      }}>
        <CheckCircle size={20} color={cfg.color} fill={cfg.color} />
      </Box>

      {/* Text */}
      <Typography
        variant="h5"
        fontWeight={800}
        sx={{
          color: '#fff',
          mt: 2,
          fontSize: '1.4rem',
          textAlign: 'center',
          transform: phase === 'visible' ? 'translateY(0)' : 'translateY(12px)',
          opacity: phase === 'visible' ? 1 : 0,
          transition: 'all 0.35s ease 0.15s',
        }}
      >
        {msg}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: alpha('#fff', 0.7),
          mt: 0.5,
          fontSize: '0.9rem',
          textAlign: 'center',
          transform: phase === 'visible' ? 'translateY(0)' : 'translateY(12px)',
          opacity: phase === 'visible' ? 1 : 0,
          transition: 'all 0.35s ease 0.25s',
        }}
      >
        {sub}
      </Typography>
    </Box>
  );
}
