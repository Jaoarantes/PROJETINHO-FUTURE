import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  duration = 1800,
}: SuccessOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!open) return;

    // Show overlay immediately
    setVisible(true);
    // Trigger animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimating(true);
      });
    });

    // Schedule hide + callback
    timerRef.current = setTimeout(() => {
      setAnimating(false);
      setTimeout(() => {
        setVisible(false);
        onCompleteRef.current?.();
      }, 200);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, duration]);

  if (!visible) return null;

  const cfg = VARIANT_CONFIG[variant];
  const msg = message || cfg.defaultMessage;
  const sub = submessage || cfg.defaultSub;

  const overlay = (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: animating ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
        transition: 'background-color 0.2s ease',
        pointerEvents: 'none',
      }}
    >
      {/* Ripple rings */}
      {animating && (
        <>
          <Box sx={{
            position: 'absolute',
            width: 180, height: 180,
            borderRadius: '50%',
            border: `2px solid ${alpha(cfg.color, 0.25)}`,
            animation: 'successRipple 0.6s ease-out forwards',
            '@keyframes successRipple': {
              '0%': { transform: 'scale(0.5)', opacity: 1 },
              '100%': { transform: 'scale(2.5)', opacity: 0 },
            },
          }} />
          <Box sx={{
            position: 'absolute',
            width: 180, height: 180,
            borderRadius: '50%',
            border: `2px solid ${alpha(cfg.color, 0.15)}`,
            animation: 'successRipple2 0.6s 0.1s ease-out forwards',
            '@keyframes successRipple2': {
              '0%': { transform: 'scale(0.5)', opacity: 1 },
              '100%': { transform: 'scale(2.5)', opacity: 0 },
            },
          }} />
        </>
      )}

      {/* Icon circle */}
      <Box sx={{
        width: 92, height: 92,
        borderRadius: '50%',
        bgcolor: cfg.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 12px 40px ${alpha(cfg.color, 0.5)}`,
        transform: animating ? 'scale(1)' : 'scale(0)',
        opacity: animating ? 1 : 0,
        transition: 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.15s ease',
      }}>
        {cfg.icon}
      </Box>

      {/* Check badge */}
      <Box sx={{
        position: 'relative',
        mt: -2.5, ml: 7,
        width: 34, height: 34,
        borderRadius: '50%',
        bgcolor: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
        transform: animating ? 'scale(1)' : 'scale(0)',
        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.12s',
      }}>
        <CheckCircle size={22} color={cfg.color} fill={cfg.color} />
      </Box>

      {/* Text */}
      <Typography
        variant="h5"
        fontWeight={800}
        sx={{
          color: '#fff',
          mt: 2.5,
          fontSize: '1.5rem',
          textAlign: 'center',
          transform: animating ? 'translateY(0)' : 'translateY(16px)',
          opacity: animating ? 1 : 0,
          transition: 'all 0.2s ease 0.08s',
        }}
      >
        {msg}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: 'rgba(255,255,255,0.7)',
          mt: 0.5,
          fontSize: '0.95rem',
          textAlign: 'center',
          transform: animating ? 'translateY(0)' : 'translateY(8px)',
          opacity: animating ? 1 : 0,
          transition: 'all 0.2s ease 0.12s',
        }}
      >
        {sub}
      </Typography>
    </Box>
  );

  return createPortal(overlay, document.body);
}
