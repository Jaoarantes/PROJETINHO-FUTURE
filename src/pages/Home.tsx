import { Box, Typography } from '@mui/material';
import { Dumbbell } from 'lucide-react';

export default function Home() {
  return (
    <Box sx={{ textAlign: 'center', pt: 6 }}>
      <Box
        sx={{
          width: 80, height: 80, borderRadius: '22px',
          background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          mx: 'auto', mb: 3,
          boxShadow: '0 8px 32px rgba(255,107,44,0.25)',
        }}
      >
        <Dumbbell size={40} color="#000" strokeWidth={2.5} />
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '0.06em' }}>
        FUTURE FIT
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Seu app de treino e dieta
      </Typography>
    </Box>
  );
}
