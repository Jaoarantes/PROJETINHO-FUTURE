import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { lightTheme, darkTheme } from './theme';
import { useThemeStore } from './store/themeStore';
import App from './App';

function Root() {
  const mode = useThemeStore((s) => s.mode);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
