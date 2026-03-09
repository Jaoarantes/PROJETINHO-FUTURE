import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import {
  FitnessCenterRounded,
  RestaurantRounded,
  HistoryRounded,
  PersonRounded,
} from '@mui/icons-material';

const tabs = [
  { label: 'Treino', icon: <FitnessCenterRounded />, path: '/treino' },
  { label: 'Dieta', icon: <RestaurantRounded />, path: '/dieta' },
  { label: 'Histórico', icon: <HistoryRounded />, path: '/historico' },
  { label: 'Perfil', icon: <PersonRounded />, path: '/perfil' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = tabs.findIndex((tab) =>
    location.pathname.startsWith(tab.path)
  );

  return (
    <Paper
      sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}
      elevation={8}
    >
      <BottomNavigation
        value={currentTab === -1 ? 0 : currentTab}
        onChange={(_, newValue) => navigate(tabs[newValue].path)}
        sx={{
          bgcolor: 'background.paper',
          '& .MuiBottomNavigationAction-root': {
            color: 'text.secondary',
            '&.Mui-selected': {
              color: 'primary.main',
            },
          },
        }}
      >
        {tabs.map((tab) => (
          <BottomNavigationAction
            key={tab.path}
            label={tab.label}
            icon={tab.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
