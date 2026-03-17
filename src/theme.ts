import { createTheme, alpha } from '@mui/material/styles';

// ─── PREMIUM DARK PALETTE (Slate & Onyx) ──────────────────────────────────
const EMBER = '#FF6B2C';
const EMBER_LIGHT = '#FF8A50';
const EMBER_DARK = '#E55A1B';
const NEON_GREEN = '#00E676';
const ONYX_950 = '#050505'; // Fundo profundo
const ONYX_900 = '#0D0D0D'; // Cards principais
const SLATE_400 = '#94A3B8';
const SLATE_600 = '#475569';
const GLASS_BG = 'rgba(15, 15, 15, 0.85)';

const poppins = '"Poppins", -apple-system, BlinkMacSystemFont, sans-serif';

const typography = {
  fontFamily: poppins,
  fontSize: 15,
  h1: { fontFamily: poppins, fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.01em' },
  h2: { fontFamily: poppins, fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.01em' },
  h3: { fontFamily: poppins, fontWeight: 700, fontSize: '1.3rem', letterSpacing: '-0.005em' },
  h4: { fontFamily: poppins, fontWeight: 600, fontSize: '1.15rem' },
  h5: { fontFamily: poppins, fontWeight: 600, fontSize: '1.05rem' },
  h6: { fontFamily: poppins, fontWeight: 600, fontSize: '1rem' },
  subtitle1: { fontWeight: 600, fontSize: '1rem' },
  subtitle2: { fontWeight: 600, fontSize: '0.9rem' },
  body1: { fontWeight: 400, fontSize: '0.95rem' },
  body2: { fontWeight: 400, fontSize: '0.9rem' },
  button: {
    fontFamily: poppins,
    textTransform: 'none' as const,
    fontWeight: 600,
    letterSpacing: '0.01em',
    fontSize: '0.95rem',
  },
  caption: { fontSize: '0.8rem', fontWeight: 500 },
};

// ─────────────────────────── DARK THEME ─────────────────────────────────────
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: EMBER, light: EMBER_LIGHT, dark: EMBER_DARK, contrastText: '#000' },
    secondary: { main: '#7C3AED', light: '#A78BFA', dark: '#6D28D9' },
    background: { default: ONYX_950, paper: ONYX_900 },
    text: { primary: '#F8FAFC', secondary: SLATE_400 },
    divider: 'rgba(255,255,255,0.04)',
    error: { main: '#EF4444' },
    success: { main: NEON_GREEN },
    warning: { main: '#FBBF24' },
    info: { main: EMBER },
  },
  typography,
  shape: { borderRadius: 16 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { backgroundColor: ONYX_950 },
        body: {
          backgroundColor: ONYX_950,
          margin: 0,
          minHeight: '100vh',
          position: 'relative',
          overflowX: 'hidden',
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          '&::-webkit-scrollbar': { width: 3 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: '#222', borderRadius: 3 },
        },
        '#root': {
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '12px 24px',
          boxShadow: 'none',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          textTransform: 'none',
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${EMBER} 0%, ${EMBER_DARK} 100%)`,
          color: '#000',
          fontWeight: 700,
          boxShadow: `0 4px 20px ${alpha(EMBER, 0.35)}`,
          '&:hover': {
            background: `linear-gradient(135deg, ${EMBER_LIGHT} 0%, ${EMBER} 100%)`,
            boxShadow: `0 6px 24px ${alpha(EMBER, 0.4)}`,
          },
          '&:active': { transform: 'scale(0.97)', transition: 'transform 0.1s' },
          '&.Mui-disabled': {
            background: alpha(EMBER, 0.12),
            color: 'rgba(255,255,255,0.25)',
            boxShadow: 'none',
          },
        },
        outlinedPrimary: {
          borderColor: alpha(EMBER, 0.35),
          borderWidth: 1.5,
          color: EMBER_LIGHT,
          '&:hover': {
            borderColor: EMBER,
            background: alpha(EMBER, 0.08),
            borderWidth: 1.5,
          },
        },
        outlined: {
          borderColor: alpha('#fff', 0.1),
          borderWidth: 1.5,
          '&:hover': {
            borderColor: alpha('#fff', 0.2),
            background: alpha('#fff', 0.03),
            borderWidth: 1.5,
          },
        },
        text: {
          '&:hover': { borderRadius: 12, background: alpha(EMBER, 0.08) }
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            background: alpha('#fff', 0.02),
            transition: 'all 0.2s ease',
            '& fieldset': { borderColor: alpha('#fff', 0.06) },
            '&:hover fieldset': { borderColor: alpha(EMBER, 0.3) },
            '&.Mui-focused fieldset': { borderColor: EMBER, borderWidth: 1.5 },
            '&.Mui-focused': { background: alpha(EMBER, 0.04) },
          },
          '& .MuiInputLabel-root': { color: SLATE_400 },
          '& .MuiInputLabel-root.Mui-focused': { color: EMBER_LIGHT },
          '& .MuiInputBase-input': { color: '#F8FAFC' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          background: ONYX_900,
          border: `1px solid ${alpha('#fff', 0.045)}`,
          backgroundImage: 'none',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          transition: 'all 0.3s ease',
          '&:active': {
            borderColor: alpha(EMBER, 0.15),
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 10, fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.02em', height: 28 },
        colorPrimary: {
          background: alpha(EMBER, 0.1),
          color: EMBER_LIGHT,
          border: `1px solid ${alpha(EMBER, 0.2)}`,
        },
        outlinedPrimary: { borderColor: alpha(EMBER, 0.3), color: EMBER_LIGHT },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: ONYX_900,
          backgroundImage: 'none',
          border: `1px solid ${alpha('#fff', 0.06)}`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          borderRadius: 24,
          padding: 8,
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          background: GLASS_BG,
          backdropFilter: 'blur(16px)',
          borderTop: `1px solid ${alpha('#fff', 0.05)}`,
          height: 72,
        }
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: SLATE_600,
          minWidth: 0,
          padding: '8px 0',
          transition: 'all 0.2s',
          '&.Mui-selected': { color: EMBER },
        },
        label: {
          fontFamily: poppins,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontSize: '0.65rem',
          fontWeight: 700,
          marginTop: '4px',
          '&.Mui-selected': { fontSize: '0.68rem' },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        primary: {
          background: `linear-gradient(135deg, ${EMBER} 0%, ${EMBER_DARK} 100%)`,
          color: '#000',
          boxShadow: `0 8px 24px ${alpha(EMBER, 0.45)}`,
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          '&:active': {
            transform: 'scale(0.95)',
            transition: 'transform 0.1s',
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: EMBER },
        rail: { background: alpha(EMBER, 0.15) },
        thumb: {
          width: 14,
          height: 14,
          boxShadow: `0 0 10px ${alpha(EMBER, 0.5)}`,
          '&:hover, &.Mui-focusVisible': {
            boxShadow: `0 0 0 8px ${alpha(EMBER, 0.15)}`,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          margin: '4px 8px',
          transition: 'all 0.2s',
          border: '1px solid transparent',
          '&:hover': {
            background: alpha('#fff', 0.035),
            borderColor: alpha('#fff', 0.05),
          },
          '&.Mui-selected': {
            background: alpha(EMBER, 0.08),
            borderColor: alpha(EMBER, 0.15),
            '&:hover': { background: alpha(EMBER, 0.12) },
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${alpha('#fff', 0.05)}`,
          fontSize: '0.85rem',
          fontWeight: 500,
        },
        standardError: {
          background: alpha('#EF4444', 0.08),
          color: '#FCA5A5',
          borderColor: alpha('#EF4444', 0.15),
        },
        standardSuccess: {
          background: alpha(NEON_GREEN, 0.08),
          color: '#6EE7B7',
          borderColor: alpha(NEON_GREEN, 0.15),
        },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: alpha('#fff', 0.04) } } },
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: alpha(ONYX_900, 0.95),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha('#fff', 0.08)}`,
          borderRadius: 18,
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '4px 8px',
          padding: '10px 14px',
          fontSize: '0.88rem',
          fontWeight: 500,
          transition: 'all 0.15s',
          '&:hover': { background: alpha(EMBER, 0.1), color: EMBER_LIGHT },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 10, height: 8, backgroundColor: alpha('#fff', 0.04) },
        bar: { borderRadius: 10, background: `linear-gradient(90deg, ${EMBER_DARK}, ${EMBER})` },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px !important',
          border: `1px solid ${alpha('#fff', 0.08)}`,
          color: SLATE_400,
          fontFamily: poppins,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 700,
          fontSize: '0.8rem',
          padding: '10px 18px',
          '&.Mui-selected': {
            background: `linear-gradient(135deg, ${alpha(EMBER, 0.2)} 0%, ${alpha(EMBER, 0.1)} 100%)`,
            color: EMBER_LIGHT,
            borderColor: alpha(EMBER, 0.4),
            '&:hover': { background: alpha(EMBER, 0.25) },
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: EMBER, height: 4, borderRadius: '4px 4px 0 0' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: poppins,
          textTransform: 'uppercase',
          fontWeight: 700,
          letterSpacing: '0.08em',
          fontSize: '0.85rem',
          padding: '14px 12px',
          minHeight: 48,
          transition: 'all 0.2s',
          '&.Mui-selected': { color: '#fff' },
          '&:hover': { color: EMBER_LIGHT },
        },
      },
    },
  },
});

// ─────────────────────────── LIGHT THEME ────────────────────────────────────
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: EMBER, light: EMBER_LIGHT, dark: EMBER_DARK, contrastText: '#fff' },
    secondary: { main: '#7C3AED', light: '#A78BFA', dark: '#6D28D9' },
    background: { default: '#F5F5F5', paper: '#FFFFFF' },
    text: { primary: '#171717', secondary: '#737373' },
    divider: 'rgba(0,0,0,0.08)',
    error: { main: '#EF4444' },
    success: { main: '#16A34A' },
    warning: { main: '#F59E0B' },
    info: { main: EMBER },
  },
  typography: darkTheme.typography,
  shape: darkTheme.shape,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { backgroundColor: '#EBEBEB' },
        body: {
          backgroundColor: '#F5F5F5',
          margin: 0,
          minHeight: '100vh',
          boxShadow: '0 0 40px rgba(0,0,0,0.04)',
          position: 'relative',
          overflowX: 'hidden',
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          '&::-webkit-scrollbar': { width: 3 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: '#D4D4D4', borderRadius: 3 },
        },
        '#root': { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '12px 24px',
          boxShadow: 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${EMBER} 0%, ${EMBER_DARK} 100%)`,
          color: '#FFFFFF',
          fontWeight: 700,
          boxShadow: `0 4px 16px ${alpha(EMBER, 0.25)}`,
          '&:hover': {
            background: `linear-gradient(135deg, ${EMBER_LIGHT} 0%, ${EMBER} 100%)`,
            boxShadow: `0 6px 24px ${alpha(EMBER, 0.35)}`,
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'scale(0.98)' },
          '&.Mui-disabled': {
            background: alpha(EMBER, 0.12),
            color: 'rgba(0,0,0,0.25)',
            boxShadow: 'none',
          },
        },
        outlinedPrimary: {
          borderColor: alpha(EMBER, 0.4),
          borderWidth: 1.5,
          '&:hover': { background: alpha(EMBER, 0.04), borderColor: EMBER, borderWidth: 1.5 },
        },
        outlined: {
          borderColor: 'rgba(0,0,0,0.12)',
          borderWidth: 1.5,
          '&:hover': {
            borderColor: 'rgba(0,0,0,0.25)',
            background: 'rgba(0,0,0,0.02)',
            borderWidth: 1.5,
          },
        },
        text: { '&:hover': { background: alpha(EMBER, 0.06) } },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            background: 'rgba(0,0,0,0.02)',
            transition: 'all 0.2s',
            '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' },
            '&:hover fieldset': { borderColor: alpha(EMBER, 0.4) },
            '&.Mui-focused fieldset': { borderColor: EMBER, borderWidth: 2 },
            '&.Mui-focused': { background: alpha(EMBER, 0.02) },
          },
          '& .MuiInputLabel-root': { color: '#737373' },
          '& .MuiInputLabel-root.Mui-focused': { color: EMBER },
          '& .MuiInputBase-input': { color: '#171717' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          background: '#FFFFFF',
          backgroundImage: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.06)',
          transition: 'all 0.2s ease',
          '&:hover': { borderColor: alpha(EMBER, 0.15) },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600, fontSize: '0.75rem' },
        colorPrimary: {
          background: alpha(EMBER, 0.1),
          color: EMBER_DARK,
          border: `1px solid ${alpha(EMBER, 0.2)}`,
        },
        outlinedPrimary: { borderColor: alpha(EMBER, 0.3), color: EMBER_DARK },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: '#FFFFFF',
          backgroundImage: 'none',
          border: '1px solid rgba(0,0,0,0.05)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.1)',
          borderRadius: 20,
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: { root: { background: 'transparent', height: 64 } },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: '#A1A1AA',
          minWidth: 0,
          padding: '6px 0',
          transition: 'color 0.2s',
          '&.Mui-selected': { color: EMBER },
        },
        label: {
          fontFamily: poppins,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontSize: '0.65rem',
          fontWeight: 600,
          marginTop: '2px',
          '&.Mui-selected': { fontSize: '0.68rem' },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        primary: {
          background: `linear-gradient(135deg, ${EMBER} 0%, ${EMBER_DARK} 100%)`,
          color: '#fff',
          boxShadow: `0 6px 20px ${alpha(EMBER, 0.3)}`,
          '&:hover': {
            background: `linear-gradient(135deg, ${EMBER_LIGHT} 0%, ${EMBER} 100%)`,
            boxShadow: `0 10px 32px ${alpha(EMBER, 0.4)}`,
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: EMBER },
        rail: { background: alpha(EMBER, 0.15) },
        thumb: {
          boxShadow: `0 0 8px ${alpha(EMBER, 0.4)}`,
          '&:hover, &.Mui-focusVisible': {
            boxShadow: `0 0 0 8px ${alpha(EMBER, 0.12)}`,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '2px 0',
          transition: 'all 0.15s',
          '&:hover': { background: 'rgba(0,0,0,0.04)' },
          '&.Mui-selected': {
            background: alpha(EMBER, 0.08),
            '&:hover': { background: alpha(EMBER, 0.12) },
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)' },
        standardError: { background: alpha('#EF4444', 0.08), color: '#B91C1C' },
        standardSuccess: { background: alpha('#16A34A', 0.08), color: '#15803D' },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: 'rgba(0,0,0,0.08)' } } },
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: '#FFFFFF',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 14,
          boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 6px',
          fontSize: '0.9rem',
          '&:hover': { background: alpha(EMBER, 0.06) },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 6, height: 6, backgroundColor: 'rgba(0,0,0,0.06)' },
        bar: { borderRadius: 6 },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: '10px !important',
          border: '1px solid rgba(0,0,0,0.1)',
          color: '#737373',
          fontFamily: poppins,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontWeight: 600,
          '&.Mui-selected': {
            background: alpha(EMBER, 0.1),
            color: EMBER_DARK,
            borderColor: alpha(EMBER, 0.3),
            '&:hover': { background: alpha(EMBER, 0.15) },
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: EMBER, height: 3, borderRadius: 3 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: poppins,
          textTransform: 'uppercase',
          fontWeight: 600,
          letterSpacing: '0.04em',
          '&.Mui-selected': { color: EMBER_DARK },
        },
      },
    },
  },
});
