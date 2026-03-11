import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Dumbbell, User, Utensils } from 'lucide-react';

const tabs = [
  { label: 'Treino', icon: <Dumbbell size={22} />, path: '/treino' },
  { label: 'Dieta', icon: <Utensils size={22} />, path: '/dieta' },
  { label: 'Perfil', icon: <User size={22} />, path: '/perfil' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const currentTab = tabs.findIndex((t) => location.pathname.startsWith(t.path));

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '500px',
        zIndex: 1000,
        background: isDark
          ? 'rgba(10, 10, 10, 0.92)'
          : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: isDark
          ? '1px solid rgba(255,255,255,0.06)'
          : '1px solid rgba(0,0,0,0.06)',
        pb: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <BottomNavigation
        value={currentTab === -1 ? 0 : currentTab}
        onChange={(_, v) => navigate(tabs[v].path)}
      >
        {tabs.map((tab) => (
          <BottomNavigationAction
            key={tab.path}
            label={tab.label}
            icon={tab.icon}
          />
        ))}
      </BottomNavigation>
    </Box>
  );
}
