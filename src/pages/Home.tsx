import { Box, Typography } from '@mui/material';

export default function Home() {
  return (
    <Box sx={{ textAlign: 'center', pt: 6 }}>
      <Box
        sx={{
          width: 100, height: 100, borderRadius: '24px',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          mx: 'auto', mb: 3,
          boxShadow: '0 10px 35px rgba(255,107,44,0.3)',
        }}
      >
        <img src="/img/logo.png" alt="Valere Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '0.05em', fontFamily: '"Oswald", sans-serif' }}>
        VALERE
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Seu app de treino e refeição
      </Typography>
    </Box>
  );
}
