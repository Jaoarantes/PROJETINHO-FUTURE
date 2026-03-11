import { Box, Typography } from '@mui/material';
import { Clock } from 'lucide-react';

export default function Historico() {
  return (
    <Box sx={{ pt: 2 }}>
      <Typography variant="h4" sx={{ fontSize: '1.8rem', mb: 3 }}>HISTÓRICO</Typography>

      <Box
        sx={{
          textAlign: 'center',
          mt: 8,
          p: 4,
          borderRadius: 3,
          border: '1px dashed rgba(255,255,255,0.08)',
        }}
      >
        <Clock size={48} style={{ opacity: 0.12, marginBottom: 16 }} />
        <Typography color="text.secondary" fontWeight={500} sx={{ mb: 0.5 }}>
          Em breve
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
          Seu histórico de treinos e dieta aparecerá aqui
        </Typography>
      </Box>
    </Box>
  );
}
