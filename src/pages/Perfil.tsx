import {
  Box, Typography, Button, Avatar, Divider,
  ToggleButtonGroup, ToggleButton, Card, CardContent,
} from '@mui/material';
import { LogOut, Moon, Sun, Settings2, Dumbbell, Utensils, Flame } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { useThemeStore } from '../store/themeStore';
import { useTreinoStore } from '../store/treinoStore';
import { useDietaStore } from '../store/dietaStore';

export default function Perfil() {
  const { user, signOut } = useAuthContext();
  const { mode, setMode } = useThemeStore();
  const { sessoes } = useTreinoStore();
  const { metas } = useDietaStore();

  const totalExercicios = sessoes.reduce((acc, s) => acc + s.exercicios.length, 0);

  return (
    <Box sx={{ pt: 2, pb: 4 }}>
      <Typography variant="h4" sx={{ fontSize: '1.8rem', mb: 3 }}>PERFIL</Typography>

      {/* User card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5 }}>
          <Avatar
            sx={{
              width: 60, height: 60,
              background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
              fontFamily: '"Oswald", sans-serif',
              fontSize: '1.5rem',
              fontWeight: 700,
            }}
          >
            {user?.displayName?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
              {user?.displayName || 'Usuário'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <StatCard icon={<Dumbbell size={18} />} label="Treinos" value={sessoes.length} />
        <StatCard icon={<Flame size={18} />} label="Exercícios" value={totalExercicios} />
        <StatCard icon={<Utensils size={18} />} label="Meta kcal" value={metas.calorias} />
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Theme */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}
      >
        Aparência
      </Typography>
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(_, value) => { if (value) setMode(value); }}
        fullWidth
        sx={{ mb: 3 }}
      >
        <ToggleButton value="light">
          <Sun size={18} style={{ marginRight: 8 }} />
          Claro
        </ToggleButton>
        <ToggleButton value="system">
          <Settings2 size={18} style={{ marginRight: 8 }} />
          Sistema
        </ToggleButton>
        <ToggleButton value="dark">
          <Moon size={18} style={{ marginRight: 8 }} />
          Escuro
        </ToggleButton>
      </ToggleButtonGroup>

      <Divider sx={{ mb: 3 }} />

      <Button
        variant="outlined"
        color="error"
        startIcon={<LogOut size={18} />}
        onClick={signOut}
        fullWidth
        sx={{ py: 1.3 }}
      >
        Sair da conta
      </Button>
    </Box>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card sx={{ flex: 1 }}>
      <CardContent sx={{ textAlign: 'center', py: 2, px: 1 }}>
        <Box sx={{ color: 'primary.main', mb: 0.5 }}>{icon}</Box>
        <Typography
          variant="h6"
          sx={{ fontFamily: '"Oswald", sans-serif', fontSize: '1.3rem', lineHeight: 1 }}
        >
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}
