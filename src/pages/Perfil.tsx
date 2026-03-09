import {
  Box,
  Typography,
  Button,
  Avatar,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  LogoutRounded,
  LightModeRounded,
  DarkModeRounded,
  SettingsBrightnessRounded,
} from '@mui/icons-material';
import { useAuthContext } from '../contexts/AuthContext';
import { useThemeStore } from '../store/themeStore';

export default function Perfil() {
  const { user, signOut } = useAuthContext();
  const { mode, setMode } = useThemeStore();

  return (
    <Box sx={{ pt: 2 }}>
      <Typography variant="h5" gutterBottom>Perfil</Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, mb: 3 }}>
        <Avatar
          sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 24 }}
        >
          {user?.displayName?.charAt(0).toUpperCase() || 'U'}
        </Avatar>
        <Box>
          <Typography variant="h6">{user?.displayName || 'Usuário'}</Typography>
          <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Tema
      </Typography>
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(_, value) => { if (value) setMode(value); }}
        fullWidth
        sx={{ mb: 3 }}
      >
        <ToggleButton value="light">
          <LightModeRounded sx={{ mr: 1, fontSize: 20 }} />
          Claro
        </ToggleButton>
        <ToggleButton value="system">
          <SettingsBrightnessRounded sx={{ mr: 1, fontSize: 20 }} />
          Sistema
        </ToggleButton>
        <ToggleButton value="dark">
          <DarkModeRounded sx={{ mr: 1, fontSize: 20 }} />
          Escuro
        </ToggleButton>
      </ToggleButtonGroup>

      <Divider sx={{ mb: 3 }} />

      <Button
        variant="outlined"
        color="error"
        startIcon={<LogoutRounded />}
        onClick={signOut}
        fullWidth
      >
        Sair da conta
      </Button>
    </Box>
  );
}
