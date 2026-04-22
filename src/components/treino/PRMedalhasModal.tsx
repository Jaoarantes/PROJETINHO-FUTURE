import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Box, Typography, Button, Divider } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Trophy, Medal } from 'lucide-react';
import type { MedalhaPR, MedalType } from '../../utils/prSystem';

interface PRMedalhasModalProps {
  medalhas: MedalhaPR[];
  open: boolean;
  onClose: () => void;
}

const MEDAL_CONFIG: Record<MedalType, { emoji: string; label: string; cor: string; glow: string }> = {
  ouro: {
    emoji: '🥇',
    label: 'Novo Recorde!',
    cor: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.6)',
  },
  prata: {
    emoji: '🥈',
    label: '2° ou 3° lugar',
    cor: '#94A3B8',
    glow: 'rgba(148, 163, 184, 0.4)',
  },
  bronze: {
    emoji: '🥉',
    label: 'Top 10',
    cor: '#CD7C48',
    glow: 'rgba(205, 124, 72, 0.4)',
  },
};

// ── Partícula de confete para medalha de ouro ───────────────────────────────
function ConfettiParticle({ delay, color, x }: { delay: number; color: string; x: number }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: '-10%',
        left: `${x}%`,
        width: 8,
        height: 8,
        borderRadius: '2px',
        bgcolor: color,
        opacity: 0,
        animation: `confettiFall 1.8s ${delay}s ease-in forwards`,
        '@keyframes confettiFall': {
          '0%': { opacity: 1, transform: 'translateY(0) rotate(0deg)' },
          '100%': { opacity: 0, transform: 'translateY(120vh) rotate(720deg)' },
        },
      }}
    />
  );
}

const CONFETTI_COLORS = ['#FF6B2C', '#F59E0B', '#10B981', '#6366F1', '#EC4899', '#F59E0B'];

function GoldAnimation() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    delay: Math.random() * 1.2,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    x: Math.random() * 100,
  }));

  return (
    <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100001, overflow: 'hidden' }}>
      {particles.map((p) => (
        <ConfettiParticle key={p.id} delay={p.delay} color={p.color} x={p.x} />
      ))}
    </Box>
  );
}

// ── Card individual de medalha ───────────────────────────────────────────────
function MedalhaCard({ medalha, index }: { medalha: MedalhaPR; index: number }) {
  const [visible, setVisible] = useState(false);
  const cfg = MEDAL_CONFIG[medalha.tipo];

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80 + index * 120);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: 2,
        bgcolor: alpha(cfg.cor, 0.08),
        border: `1px solid ${alpha(cfg.cor, 0.25)}`,
        transform: visible ? 'translateX(0)' : 'translateX(-24px)',
        opacity: visible ? 1 : 0,
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Emoji da medalha */}
      <Typography
        sx={{
          fontSize: '2rem',
          lineHeight: 1,
          flexShrink: 0,
          filter: medalha.tipo === 'ouro'
            ? `drop-shadow(0 0 8px ${cfg.glow})`
            : 'none',
          animation: medalha.tipo === 'ouro' ? 'medalPulse 1.5s ease-in-out infinite' : 'none',
          '@keyframes medalPulse': {
            '0%, 100%': { transform: 'scale(1)' },
            '50%': { transform: 'scale(1.15)' },
          },
        }}
      >
        {cfg.emoji}
      </Typography>

      {/* Texto */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{ color: cfg.cor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}
        >
          {cfg.label}
        </Typography>
        <Typography variant="body2" fontWeight={600} noWrap sx={{ color: 'text.primary', lineHeight: 1.2 }}>
          {medalha.label}
        </Typography>
      </Box>

      {/* Valor */}
      <Typography
        variant="subtitle2"
        fontWeight={800}
        sx={{ color: cfg.cor, flexShrink: 0, fontSize: '1rem' }}
      >
        {medalha.valorFormatado}
      </Typography>
    </Box>
  );
}

// ── Modal principal ──────────────────────────────────────────────────────────
export default function PRMedalhasModal({ medalhas, open, onClose }: PRMedalhasModalProps) {
  const [visible, setVisible] = useState(false);
  const [headerIn, setHeaderIn] = useState(false);
  const hasGold = medalhas.some((m) => m.tipo === 'ouro');
  const closedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      setHeaderIn(false);
      closedRef.current = false;
      return;
    }
    closedRef.current = false;
    // Abre com pequeno delay para o portal montar primeiro
    const t1 = setTimeout(() => setVisible(true), 30);
    const t2 = setTimeout(() => setHeaderIn(true), 150);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [open]);

  if (!open && !visible) return null;

  const totalOuro = medalhas.filter((m) => m.tipo === 'ouro').length;
  const totalPrata = medalhas.filter((m) => m.tipo === 'prata').length;
  const totalBronze = medalhas.filter((m) => m.tipo === 'bronze').length;

  const tituloTexto = hasGold
    ? totalOuro === 1
      ? 'Novo Recorde Pessoal!'
      : `${totalOuro} Novos Recordes!`
    : 'Ótima Performance!';

  const subtituloTexto = [
    totalOuro > 0 && `${totalOuro} 🥇`,
    totalPrata > 0 && `${totalPrata} 🥈`,
    totalBronze > 0 && `${totalBronze} 🥉`,
  ]
    .filter(Boolean)
    .join('  ');

  const overlay = (
    <>
      {/* Confete de ouro */}
      {hasGold && visible && <GoldAnimation />}

      {/* Backdrop */}
      <Box
        onClick={() => { if (!closedRef.current) { closedRef.current = true; onClose(); } }}
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 100000,
          bgcolor: visible ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0)',
          backdropFilter: visible ? 'blur(4px)' : 'none',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        {/* Card do modal */}
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            width: '100%',
            maxWidth: 400,
            maxHeight: '85vh',
            bgcolor: 'background.paper',
            borderRadius: 3,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.95)',
            opacity: visible ? 1 : 0,
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: hasGold
              ? `0 24px 80px ${alpha('#F59E0B', 0.3)}, 0 0 0 1px ${alpha('#F59E0B', 0.2)}`
              : '0 24px 80px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 3,
              pt: 3,
              pb: 2,
              textAlign: 'center',
              background: hasGold
                ? 'linear-gradient(135deg, #1A0A00 0%, #2D1500 100%)'
                : 'linear-gradient(135deg, #0D0D0D 0%, #1A1A1A 100%)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Brilho de fundo para ouro */}
            {hasGold && (
              <Box sx={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />
            )}

            {/* Ícone principal */}
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: hasGold ? alpha('#F59E0B', 0.15) : alpha('#FF6B2C', 0.15),
                border: `2px solid ${hasGold ? alpha('#F59E0B', 0.4) : alpha('#FF6B2C', 0.3)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 1.5,
                transform: headerIn ? 'scale(1)' : 'scale(0)',
                transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s',
                animation: hasGold ? 'iconGlow 2s ease-in-out infinite' : 'none',
                '@keyframes iconGlow': {
                  '0%, 100%': { boxShadow: `0 0 20px ${alpha('#F59E0B', 0.3)}` },
                  '50%': { boxShadow: `0 0 40px ${alpha('#F59E0B', 0.6)}` },
                },
              }}
            >
              {hasGold
                ? <Trophy size={32} color="#F59E0B" />
                : <Medal size={32} color="#FF6B2C" />}
            </Box>

            <Typography
              variant="h6"
              fontWeight={800}
              sx={{
                color: hasGold ? '#F59E0B' : '#FF6B2C',
                transform: headerIn ? 'translateY(0)' : 'translateY(12px)',
                opacity: headerIn ? 1 : 0,
                transition: 'all 0.35s ease 0.2s',
                lineHeight: 1.2,
              }}
            >
              {tituloTexto}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255,255,255,0.5)',
                mt: 0.5,
                transform: headerIn ? 'translateY(0)' : 'translateY(8px)',
                opacity: headerIn ? 1 : 0,
                transition: 'all 0.35s ease 0.3s',
                fontSize: '1.1rem',
              }}
            >
              {subtituloTexto}
            </Typography>
          </Box>

          {/* Lista de medalhas */}
          <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {medalhas.map((m, i) => (
              <MedalhaCard key={`${m.categoria}-${m.label}`} medalha={m} index={i} />
            ))}
          </Box>

          <Divider />

          {/* Footer */}
          <Box sx={{ px: 2, py: 2 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={() => { if (!closedRef.current) { closedRef.current = true; onClose(); } }}
              sx={{
                borderRadius: 2,
                py: 1.2,
                fontWeight: 700,
                background: hasGold
                  ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                  : 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
                boxShadow: hasGold
                  ? `0 4px 20px ${alpha('#F59E0B', 0.4)}`
                  : `0 4px 20px ${alpha('#FF6B2C', 0.4)}`,
                '&:hover': {
                  background: hasGold
                    ? 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)'
                    : 'linear-gradient(135deg, #FF7D45 0%, #FF6B2C 100%)',
                },
              }}
            >
              {hasGold ? 'Incrível! Continuar' : 'Continuar'}
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );

  return createPortal(overlay, document.body);
}
