import { createTheme, alpha } from '@mui/material/styles';

// ─── MIDNIGHT FORGE PALETTE ─────────────────────────────────────────────────
const EMBER       = '#FF6B2C';
const EMBER_LIGHT = '#FF8A50';
const EMBER_DARK  = '#E55A1B';
const NEON_GREEN  = '#00E676';
const CHARCOAL    = '#0A0A0A';
const SURFACE     = '#141414';
const SURFACE_2   = '#1C1C1C';
const ZINC_400    = '#A1A1AA';
const ZINC_600    = '#52525B';

const headingFont = '"Oswald", sans-serif';
const bodyFont    = '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif';

const typography = {
  fontFamily: bodyFont,
  h1: { fontFamily: headingFont, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  h2: { fontFamily: headingFont, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.03em' },
  h3: { fontFamily: headingFont, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.02em' },
  h4: { fontFamily: headingFont, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.02em' },
  h5: { fontFamily: headingFont, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.01em' },
  h6: { fontFamily: headingFont, fontWeight: 600, letterSpacing: '0.01em' },
  subtitle1: { fontWeight: 600 },
  subtitle2: { fontWeight: 600, fontSize: '0.8rem' },
  body1: { fontWeight: 400 },
  body2: { fontWeight: 400, fontSize: '0.875rem' },
  button: {
    fontFamily: headingFont,
    textTransform: 'uppercase' as const,
    fontWeight: 600,
    letterSpacing: '0.06em',
    fontSize: '0.95rem',
  },
  caption: { fontSize: '0.75rem', fontWeight: 500 },
};

// ─────────────────────────── DARK THEME ─────────────────────────────────────
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: EMBER, light: EMBER_LIGHT, dark: EMBER_DARK, contrastText: '#000' },
    secondary: { main: '#7C3AED', light: '#A78BFA', dark: '#6D28D9' },
    background: { default: CHARCOAL, paper: SURFACE },
    text: { primary: '#FAFAFA', secondary: ZINC_400 },
    divider: 'rgba(255,255,255,0.06)',
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
        html: { backgroundColor: CHARCOAL },
        body: {
          backgroundColor: CHARCOAL,
          maxWidth: '500px',
          margin: '0 auto',
          minHeight: '100vh',
          position: 'relative',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': { width: 3 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: '#333', borderRadius: 3 },
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
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${EMBER} 0%, ${EMBER_DARK} 100%)`,
          color: '#000',
          fontWeight: 700,
          boxShadow: `0 4px 20px ${alpha(EMBER, 0.3)}`,
          '&:hover': {
            background: `linear-gradient(135deg, ${EMBER_LIGHT} 0%, ${EMBER} 100%)`,
            boxShadow: `0 8px 32px ${alpha(EMBER, 0.45)}`,
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'scale(0.98)' },
          '&.Mui-disabled': {
            background: alpha(EMBER, 0.12),
            color: 'rgba(255,255,255,0.25)',
            boxShadow: 'none',
          },
        },
        outlinedPrimary: {
          borderColor: alpha(EMBER, 0.4),
          borderWidth: 1.5,
          color: EMBER_LIGHT,
          '&:hover': {
            borderColor: EMBER,
            background: alpha(EMBER, 0.06),
            borderWidth: 1.5,
          },
        },
        outlined: {
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1.5,
          '&:hover': {
            borderColor: 'rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.03)',
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
            background: alpha('#fff', 0.03),
            transition: 'all 0.2s ease',
            '& fieldset': { borderColor: alpha('#fff', 0.08) },
            '&:hover fieldset': { borderColor: alpha(EMBER, 0.3) },
            '&.Mui-focused fieldset': { borderColor: EMBER, borderWidth: 2 },
            '&.Mui-focused': { background: alpha(EMBER, 0.04) },
          },
          '& .MuiInputLabel-root': { color: ZINC_400 },
          '& .MuiInputLabel-root.Mui-focused': { color: EMBER_LIGHT },
          '& .MuiInputBase-input': { color: '#FAFAFA' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          background: SURFACE,
          border: `1px solid ${alpha('#fff', 0.06)}`,
          backgroundImage: 'none',
          boxShadow: 'none',
          transition: 'border-color 0.2s ease',
          '&:hover': { borderColor: alpha(EMBER, 0.2) },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600, fontSize: '0.75rem' },
        colorPrimary: {
          background: alpha(EMBER, 0.12),
          color: EMBER_LIGHT,
          border: `1px solid ${alpha(EMBER, 0.2)}`,
        },
        outlinedPrimary: { borderColor: alpha(EMBER, 0.3), color: EMBER_LIGHT },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: SURFACE,
          backgroundImage: 'none',
          border: `1px solid ${alpha('#fff', 0.08)}`,
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)',
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
          color: ZINC_600,
          minWidth: 0,
          padding: '6px 0',
          transition: 'color 0.2s',
          '&.Mui-selected': { color: EMBER },
        },
        label: {
          fontFamily: headingFont,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontSize: '0.6rem',
          fontWeight: 600,
          marginTop: '2px',
          '&.Mui-selected': { fontSize: '0.62rem' },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        primary: {
          background: `linear-gradient(135deg, ${EMBER} 0%, ${EMBER_DARK} 100%)`,
          color: '#000',
          boxShadow: `0 6px 24px ${alpha(EMBER, 0.35)}`,
          '&:hover': {
            background: `linear-gradient(135deg, ${EMBER_LIGHT} 0%, ${EMBER} 100%)`,
            boxShadow: `0 10px 36px ${alpha(EMBER, 0.5)}`,
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
          '&:hover': { background: alpha('#fff', 0.04) },
          '&.Mui-selected': {
            background: alpha(EMBER, 0.1),
            '&:hover': { background: alpha(EMBER, 0.14) },
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12, border: `1px solid ${alpha('#fff', 0.05)}` },
        standardError: { background: alpha('#EF4444', 0.12), color: '#FCA5A5' },
        standardSuccess: { background: alpha(NEON_GREEN, 0.12), color: '#6EE7B7' },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: alpha('#fff', 0.06) } } },
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: SURFACE_2,
          backdropFilter: 'blur(24px)',
          border: `1px solid ${alpha('#fff', 0.08)}`,
          borderRadius: 14,
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 6px',
          fontSize: '0.9rem',
          '&:hover': { background: alpha(EMBER, 0.08) },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 6, height: 6, backgroundColor: alpha('#fff', 0.06) },
        bar: { borderRadius: 6 },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: '10px !important',
          border: `1px solid ${alpha('#fff', 0.1)}`,
          color: ZINC_400,
          fontFamily: headingFont,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontWeight: 600,
          '&.Mui-selected': {
            background: alpha(EMBER, 0.15),
            color: EMBER_LIGHT,
            borderColor: alpha(EMBER, 0.3),
            '&:hover': { background: alpha(EMBER, 0.2) },
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
          fontFamily: headingFont,
          textTransform: 'uppercase',
          fontWeight: 600,
          letterSpacing: '0.04em',
          '&.Mui-selected': { color: EMBER_LIGHT },
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
    divider: 'rgba(0,0,0,0.06)',
    error: { main: '#EF4444' },
    success: { main: '#16A34A' },
    warning: { main: '#F59E0B' },
    info: { main: EMBER },
  },
  typography: darkTheme.typography,
  shape: darkTheme.shape,
  components: {
    ...darkTheme.components,
    MuiCssBaseline: {
      styleOverrides: {
        html: { backgroundColor: '#EBEBEB' },
        body: {
          backgroundColor: '#F5F5F5',
          maxWidth: '500px',
          margin: '0 auto',
          minHeight: '100vh',
          boxShadow: '0 0 40px rgba(0,0,0,0.04)',
          position: 'relative',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': { width: 3 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: '#D4D4D4', borderRadius: 3 },
        },
        '#root': { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: darkTheme.components?.MuiButton?.styleOverrides?.root,
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
        },
        outlinedPrimary: {
          borderColor: alpha(EMBER, 0.4),
          borderWidth: 1.5,
          '&:hover': { background: alpha(EMBER, 0.04), borderColor: EMBER, borderWidth: 1.5 },
        },
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
          '& .MuiInputLabel-root.Mui-focused': { color: EMBER },
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
          border: '1px solid rgba(0,0,0,0.05)',
          transition: 'all 0.2s ease',
          '&:hover': { borderColor: alpha(EMBER, 0.15) },
        },
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
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: '10px !important',
          border: '1px solid rgba(0,0,0,0.1)',
          color: '#737373',
          fontFamily: headingFont,
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
  },
});
