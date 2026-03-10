import { Box, Typography } from '@mui/material';
import { Dumbbell } from 'lucide-react';

export default function Home() {
  return (
    <Box sx={{ textAlign: 'center', pt: 4 }}>
      <Dumbbell size={64} style={{ color: '#F97316', marginBottom: 16 }} />
      <Typography variant="h5" gutterBottom>
        Projetinho Future
      </Typography>
      <Typography color="text.secondary">
        Seu app de treino e dieta
      </Typography>
    </Box>
  );
}
