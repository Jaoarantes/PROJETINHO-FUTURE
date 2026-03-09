import { createTheme } from '@mui/material/styles';

// Paleta base: https://coolors.co/palette/7f5539-a68a64-ede0d4-656d4a-414833
const palette = {
  brown: '#7F5539',
  brownLight: '#9B7356',
  brownDark: '#5C3D28',
  tan: '#A68A64',
  tanLight: '#C4AB85',
  tanDark: '#7A6545',
  cream: '#EDE0D4',
  creamLight: '#F5F0EA',
  creamDark: '#D4C4B0',
  olive: '#656D4A',
  oliveLight: '#7E8862',
  oliveDark: '#4A5035',
  forest: '#414833',
  forestLight: '#5A6347',
  forestDark: '#2D3323',
};

const sharedComponents = {
  MuiButton: {
    styleOverrides: {
      root: { borderRadius: 12, padding: '12px 24px' },
      contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: { '& .MuiOutlinedInput-root': { borderRadius: 12 } },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: { borderRadius: 16, backgroundImage: 'none' },
    },
  },
};

const sharedTypography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h4: { fontWeight: 700 },
  h5: { fontWeight: 700 },
  h6: { fontWeight: 600 },
  button: { textTransform: 'none' as const, fontWeight: 600 },
};

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: palette.brown,
      light: palette.brownLight,
      dark: palette.brownDark,
    },
    secondary: {
      main: palette.olive,
      light: palette.oliveLight,
      dark: palette.oliveDark,
    },
    background: {
      default: palette.creamLight,
      paper: '#FFFFFF',
    },
    text: {
      primary: palette.forestDark,
      secondary: '#6B6355',
    },
    divider: palette.creamDark,
  },
  typography: sharedTypography,
  shape: { borderRadius: 12 },
  components: sharedComponents,
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#C9A87C',
      light: '#DBBF9A',
      dark: palette.tan,
    },
    secondary: {
      main: '#8A9468',
      light: '#A3AD82',
      dark: palette.olive,
    },
    background: {
      default: '#1C1C16',
      paper: '#2A2A22',
    },
    text: {
      primary: '#F0E8DC',
      secondary: '#B5AA98',
    },
    divider: '#3E3E32',
    error: {
      main: '#CF6679',
    },
    success: {
      main: '#81C784',
    },
  },
  typography: sharedTypography,
  shape: { borderRadius: 12 },
  components: sharedComponents,
});
