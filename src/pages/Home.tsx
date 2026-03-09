import { Box, Typography } from '@mui/material';
import { FitnessCenterRounded } from '@mui/icons-material';

export default function Home() {
  return (
    <Box sx={{ textAlign: 'center', pt: 4 }}>
      <FitnessCenterRounded sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        Projetinho Future
      </Typography>
      <Typography color="text.secondary">
        Seu app de treino e dieta
      </Typography>
    </Box>
  );
}
