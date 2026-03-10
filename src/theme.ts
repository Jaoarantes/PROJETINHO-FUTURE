import { createTheme, alpha } from '@mui/material/styles';

const ORANGE_MAIN = '#F97316';       // Primary Orange
const ORANGE_LIGHT = '#FB923C';       // Light Orange
const ORANGE_DARK = '#EA580C';       // Dark Orange
const MIDNIGHT_BLUE = '#020617';   // Deep Blue Background
const DEEP_NAVY = '#0F172A';       // Card/Paper Blue
const SLATE_400 = '#94A3B8';
const SUCCESS_GREEN = '#22C55E';

const typography = {
  fontFamily: '"Barlow", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  h1: { fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.02em' },
  h2: { fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.02em' },
  h3: { fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.02em' },
  h4: { fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.02em' },
  h5: { fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.01em' },
  h6: { fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 600, textTransform: 'uppercase' as const },
  subtitle1: { fontWeight: 500 },
  subtitle2: { fontWeight: 500 },
  body1: {},
  body2: {},
  button: { fontFamily: '"Barlow Condensed", sans-serif', textTransform: 'uppercase' as const, fontWeight: 700, letterSpacing: '0.04em', fontSize: '1rem' },
};

// ─────────────────────────── DEEP BLUE DARK ──────────────────────────────────
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: ORANGE_MAIN, light: ORANGE_LIGHT, dark: ORANGE_DARK, contrastText: '#fff' },
    secondary: { main: '#8B5CF6', light: '#A78BFA', dark: '#7C3AED' },
    background: { default: MIDNIGHT_BLUE, paper: DEEP_NAVY },
    text: { primary: '#F8FAFC', secondary: SLATE_400 },
    divider: 'rgba(255,255,255,0.06)',
    error: { main: '#EF4444' },
    success: { main: SUCCESS_GREEN },
    warning: { main: '#F59E0B' },
    info: { main: ORANGE_MAIN },
  },
  typography,
  shape: { borderRadius: 20 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          backgroundColor: '#020617', // Sincronizado com background.default
        },
        body: {
          backgroundColor: MIDNIGHT_BLUE,
          maxWidth: '500px',
          margin: '0 auto',
          minHeight: '100vh',
          boxShadow: '0 0 80px rgba(0,0,0,0.8)',
          borderLeft: '1px solid rgba(255,255,255,0.03)',
          borderRight: '1px solid rgba(255,255,255,0.03)',
          position: 'relative',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: '#1E293B', borderRadius: 4 },
        },
        '#root': {
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          padding: '12px 28px',
          boxShadow: 'none',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        containedPrimary: {
          background: ORANGE_MAIN,
          color: '#000', // Contraste forte no botão neon
          boxShadow: `0 8px 24px ${alpha(ORANGE_MAIN, 0.2)}`,
          '&:hover': {
            background: ORANGE_LIGHT,
            boxShadow: `0 12px 32px ${alpha(ORANGE_MAIN, 0.35)}`,
            transform: 'translateY(-2px)'
          },
          '&:active': {
            background: ORANGE_DARK,
            transform: 'scale(0.98)'
          },
          '&.Mui-disabled': {
            background: alpha(ORANGE_MAIN, 0.15),
            color: 'rgba(255,255,255,0.3)',
            boxShadow: 'none'
          },
        },
        outlinedPrimary: {
          borderColor: alpha(ORANGE_MAIN, 0.5),
          borderWidth: 2,
          '&:hover': {
            borderColor: ORANGE_MAIN,
            background: alpha(ORANGE_MAIN, 0.08),
            borderWidth: 2,
            boxShadow: `0 0 16px ${alpha(ORANGE_MAIN, 0.15)}`
          },
        },
        outlined: {
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 2,
          boxShadow: 'none',
          '&:hover': {
            borderColor: 'rgba(255,255,255,0.25)',
            background: 'rgba(255,255,255,0.04)',
            borderWidth: 2
          },
        },
        text: { '&:hover': { background: alpha(ORANGE_MAIN, 0.08) } },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 16,
            background: 'rgba(255,255,255,0.02)',
            transition: 'all 0.2s ease',
            '&fieldSet': { borderColor: 'rgba(255,255,255,0.08)' },
            '&:hover fieldset': { borderColor: alpha(ORANGE_MAIN, 0.3) },
            '&.Mui-focused fieldset': { borderColor: ORANGE_MAIN, borderWidth: 2 },
            '&.Mui-focused': {
              background: alpha(ORANGE_MAIN, 0.03),
              boxShadow: `0 0 12px ${alpha(ORANGE_MAIN, 0.1)}`
            }
          },
          '& .MuiInputLabel-root': { color: SLATE_400 },
          '& .MuiInputLabel-root.Mui-focused': { color: ORANGE_LIGHT },
          '& .MuiInputBase-input': { color: '#F8FAFC' }
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          background: DEEP_NAVY,
          border: '1px solid rgba(255,255,255,0.05)',
          backgroundImage: 'none',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
          '&:hover': {
            borderColor: alpha(ORANGE_MAIN, 0.3),
            transform: 'translateY(-3px)',
            boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 20px ${alpha(ORANGE_MAIN, 0.1)}`
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontFamily: '"Barlow Condensed", sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 600
        },
        colorPrimary: {
          background: alpha(ORANGE_MAIN, 0.1),
          color: ORANGE_LIGHT,
          border: `1px solid ${alpha(ORANGE_MAIN, 0.2)}`,
        },
        outlinedPrimary: { borderColor: alpha(ORANGE_MAIN, 0.4), color: ORANGE_LIGHT },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: DEEP_NAVY,
          backgroundImage: 'none',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          borderRadius: 28,
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          background: 'transparent', // manipulado no componente com backdrop-filter
          height: 72,
        }
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: SLATE_400,
          minWidth: 0,
          padding: '8px 0',
          transition: 'all 0.25s',
          '&.Mui-selected': {
            color: ORANGE_LIGHT,
            '& svg': {
              filter: `drop-shadow(0 0 10px ${alpha(ORANGE_MAIN, 0.5)})`
            }
          },
        },
        label: {
          fontFamily: '"Barlow Condensed", sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontSize: '0.65rem', fontWeight: 600,
          marginTop: '4px',
          '&.Mui-selected': { fontSize: '0.7rem' },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        primary: {
          background: ORANGE_MAIN,
          color: '#000',
          boxShadow: `0 8px 24px ${alpha(ORANGE_MAIN, 0.3)}`,
          '&:hover': {
            background: ORANGE_LIGHT,
            boxShadow: `0 12px 32px ${alpha(ORANGE_MAIN, 0.45)}`
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: ORANGE_MAIN },
        rail: { background: alpha(ORANGE_MAIN, 0.2) },
        thumb: {
          boxShadow: `0 0 10px ${alpha(ORANGE_MAIN, 0.4)}`,
          '&:hover, &.Mui-focusVisible': {
            boxShadow: `0 0 0 8px ${alpha(ORANGE_MAIN, 0.16)}`
          }
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          margin: '4px 8px',
          transition: 'all 0.2s',
          border: '1px solid transparent',
          '&:hover': { background: alpha(ORANGE_MAIN, 0.05), borderColor: alpha(ORANGE_MAIN, 0.1) },
          '&.Mui-selected': { background: alpha(ORANGE_MAIN, 0.12), borderColor: alpha(ORANGE_MAIN, 0.25) },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' },
        standardError: { background: alpha('#EF4444', 0.15), color: '#FCA5A5' },
        standardSuccess: { background: alpha(SUCCESS_GREEN, 0.15), color: '#6EE7B7' },
      }
    },
    MuiDivider: { styleOverrides: { root: { borderColor: 'rgba(255,255,255,0.06)' } } },
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: alpha(DEEP_NAVY, 0.9),
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          mx: 1,
          fontFamily: '"Barlow Condensed", sans-serif', textTransform: 'uppercase', letterSpacing: '0.02em', fontWeight: 600,
          '&:hover': { background: alpha(ORANGE_MAIN, 0.1) },
        },
      },
    },
  },
});

// ─────────────────────────── LIGHT ────────────────────────────────────────────
// The Light Theme defaults to a clean, crisp "Sport" look if they ever toggle it.
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: ORANGE_MAIN, light: ORANGE_LIGHT, dark: ORANGE_DARK, contrastText: '#fff' },
    secondary: { main: '#8B5CF6', light: '#A78BFA', dark: '#7C3AED' },
    background: { default: '#F8FAFC', paper: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#475569' },
    divider: 'rgba(0,0,0,0.06)',
    error: { main: '#EF4444' },
    success: { main: SUCCESS_GREEN },
    warning: { main: '#F59E0B' },
    info: { main: ORANGE_MAIN },
  },
  typography: darkTheme.typography,
  shape: darkTheme.shape,
  components: {
    ...darkTheme.components,
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          backgroundColor: '#F1F5F9', // Light Blue Gray
        },
        body: {
          backgroundColor: '#F8FAFC',
          maxWidth: '500px',
          margin: '0 auto',
          minHeight: '100vh',
          boxShadow: '0 0 40px rgba(0,0,0,0.05)',
          borderLeft: '1px solid rgba(0,0,0,0.02)',
          borderRight: '1px solid rgba(0,0,0,0.02)',
          position: 'relative',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: '#CBD5E1', borderRadius: 4 },
        },
        '#root': {
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }
      },
    },
    MuiButton: {
      styleOverrides: {
        root: darkTheme.components?.MuiButton?.styleOverrides?.root,
        containedPrimary: {
          background: ORANGE_MAIN,
          color: '#FFFFFF',
          boxShadow: `0 4px 14px 0 ${alpha(ORANGE_MAIN, 0.3)}`,
          '&:hover': { background: ORANGE_DARK, boxShadow: `0 6px 20px ${alpha(ORANGE_MAIN, 0.4)}`, transform: 'translateY(-2px)' },
          '&:active': { transform: 'scale(0.98)' },
        },
        outlinedPrimary: {
          borderColor: alpha(ORANGE_MAIN, 0.5), borderWidth: 2,
          '&:hover': { background: alpha(ORANGE_MAIN, 0.04), borderColor: ORANGE_MAIN, borderWidth: 2 },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 16,
            background: 'rgba(0,0,0,0.01)',
            transition: 'background 0.2s, border-color 0.2s',
            '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' },
            '&:hover fieldset': { borderColor: alpha(ORANGE_MAIN, 0.4) },
            '&.Mui-focused fieldset': { borderColor: ORANGE_MAIN, borderWidth: 2 },
            '&.Mui-focused': { background: alpha(ORANGE_MAIN, 0.02) }
          },
          '& .MuiInputLabel-root.Mui-focused': { color: ORANGE_MAIN },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          background: '#FFFFFF',
          backgroundImage: 'none',
          boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(0,0,0,0.04)',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: alpha(ORANGE_MAIN, 0.2),
            transform: 'translateY(-3px)',
            boxShadow: '0 12px 24px -4px rgba(0, 0, 0, 0.08)'
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: '#FFFFFF',
          backgroundImage: 'none',
          border: '1px solid rgba(0,0,0,0.05)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
          borderRadius: 28,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        primary: {
          background: ORANGE_MAIN,
          color: '#fff',
          boxShadow: `0 8px 20px ${alpha(ORANGE_MAIN, 0.3)}`,
          '&:hover': { background: ORANGE_DARK, boxShadow: `0 12px 28px ${alpha(ORANGE_MAIN, 0.4)}` },
          '&:active': { transform: 'scale(0.95)' }
        },
      },
    },
  },
});
