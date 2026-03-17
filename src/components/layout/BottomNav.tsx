import { useMemo, useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Badge, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Dumbbell, User, Utensils, Home } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { contarNotificacoesNaoLidas } from '../../services/feedService';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { user } = useAuthContext();
  const [unread, setUnread] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!user?.id) return;
    try {
      const count = await contarNotificacoesNaoLidas(user.id);
      setUnread(count);
    } catch { /* ignore */ }
  }, [user?.id]);

  // Poll every 30s + on mount + on route change
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread, location.pathname]);

  const currentTab = useMemo(() => {
    if (location.pathname.startsWith('/treino') || location.pathname.startsWith('/historico')) return 0;
    if (location.pathname.startsWith('/dieta')) return 1;
    if (location.pathname.startsWith('/feed')) return 2;
    if (location.pathname.startsWith('/perfil') || location.pathname.startsWith('/dashboard')) return 3;
    return 0;
  }, [location.pathname]);

  const feedIcon = unread > 0 ? (
    <Badge
      variant="dot"
      sx={{
        '& .MuiBadge-dot': {
          bgcolor: '#FF6B2C',
          width: 8,
          height: 8,
          borderRadius: '50%',
          top: 2,
          right: 2,
        },
      }}
    >
      <Home size={22} />
    </Badge>
  ) : (
    <Home size={22} />
  );

  const tabs = [
    { label: 'Treino', icon: <Dumbbell size={22} />, path: '/treino' },
    { label: 'Refeição', icon: <Utensils size={22} />, path: '/dieta' },
    { label: 'Feed', icon: feedIcon, path: '/feed' },
    { label: 'Perfil', icon: <User size={22} />, path: '/perfil' },
  ];

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
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
        value={currentTab}
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
