import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Snackbar, Slide, Box, Typography, IconButton, alpha, useTheme } from '@mui/material';
import { Trophy, Zap, Flame, X, Bell } from 'lucide-react';

type ToastType = 'achievement' | 'levelUp' | 'streak' | 'info';

interface ToastOptions {
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS: Record<ToastType, ReactNode> = {
  achievement: <Trophy size={22} />,
  levelUp: <Zap size={22} />,
  streak: <Flame size={22} />,
  info: <Bell size={22} />,
};

const GRADIENTS: Record<ToastType, string> = {
  achievement: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
  levelUp: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
  streak: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  info: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<ToastOptions>({ type: 'info', title: '', message: '' });

  const showToast = useCallback((options: ToastOptions) => {
    setToast(options);
    setOpen(true);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={toast.duration || 4000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={Slide}
        sx={{ top: 'calc(16px + env(safe-area-inset-top, 0px)) !important' }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2.5,
            py: 1.5,
            borderRadius: 3,
            background: theme.palette.mode === 'dark'
              ? alpha('#0D0D0D', 0.95)
              : alpha('#FFFFFF', 0.95),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            boxShadow: `0 12px 40px ${alpha('#000', 0.3)}`,
            minWidth: 300,
            maxWidth: '90vw',
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: GRADIENTS[toast.type],
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {ICONS[toast.type]}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {toast.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
              {toast.message}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'text.secondary', ml: 0.5 }}>
            <X size={16} />
          </IconButton>
        </Box>
      </Snackbar>
    </ToastContext.Provider>
  );
}
