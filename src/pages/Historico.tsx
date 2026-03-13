import { Box, Typography, Card, CardContent, IconButton, Divider, Alert, Chip } from '@mui/material';
import { Clock, Calendar, MapPin, Gauge, Dumbbell, Waves, Trash2, Info, Navigation } from 'lucide-react';
import { useTreinoStore } from '../store/treinoStore';
import { formatPace } from '../utils/geoUtils';
import { calcularDistanciaCorrida, calcularDistanciaNatacao } from '../types/treino';

function formatarData(isoString: string): string {
  const data = new Date(isoString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(data);
}

function formatarDuracao(segundos?: number): string {
  if (!segundos) return '--';
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function Historico() {
  const { historico, removerRegistro } = useTreinoStore();

  if (historico.length === 0) {
    return (
      <Box sx={{ pt: 2, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontSize: '1.8rem', mb: 3 }}>HISTÓRICO</Typography>
        <Box sx={{ mt: 8, p: 4, borderRadius: 3, border: 1, borderStyle: 'dashed', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Clock size={48} style={{ opacity: 0.12, marginBottom: 16 }} />
          <Typography color="text.secondary" fontWeight={500} sx={{ mb: 0.5 }}>Sem treinos registrados</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>Complete seu primeiro treino para vê-lo aqui!</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 2, pb: 4 }}>
      <Typography variant="h4" sx={{ fontSize: '1.8rem', mb: 3 }}>HISTÓRICO</Typography>

      <Alert severity="info" icon={<Info size={20} />} sx={{ mb: 3, borderRadius: 3, '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
        O GPS usa a fórmula de <strong>Haversine</strong> para precisão esférica e filtros de ruído para ignorar oscilações menores que 2 metros.
      </Alert>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {historico.map((reg) => {
          const isCorrida = reg.tipo === 'corrida';
          const isMusculacao = reg.tipo === 'musculacao';
          const isNatacao = reg.tipo === 'natacao';

          let distTotal = 0;
          let paceMedio = 0;

          if (isCorrida && reg.corrida) {
            distTotal = calcularDistanciaCorrida(reg.corrida.etapas);
            if (distTotal > 0 && reg.duracaoTotalSegundos) {
              paceMedio = (reg.duracaoTotalSegundos / 60) / distTotal;
            }
          }

          if (isNatacao && reg.natacao) {
            distTotal = calcularDistanciaNatacao(reg.natacao.etapas);
          }

          return (
            <Card key={reg.id} variant="outlined" sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: 2,
                    bgcolor: isCorrida ? 'rgba(255, 107, 44, 0.1)' : isMusculacao ? 'rgba(171, 71, 188, 0.1)' : 'rgba(66, 165, 245, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5
                  }}>
                    {isCorrida ? <MapPin size={20} color="#FF6B2C" /> : isMusculacao ? <Dumbbell size={20} color="#AB47BC" /> : <Waves size={20} color="#42A5F5" />}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>{reg.nome}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Calendar size={12} style={{ opacity: 0.5 }} />
                      <Typography variant="caption" color="text.secondary">{formatarData(reg.concluidoEm)}</Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => removerRegistro(reg.id)} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                    <Trash2 size={18} />
                  </IconButton>
                </Box>

                <Divider sx={{ mb: 1.5, borderStyle: 'dashed' }} />

                {/* Stats Rack */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duração</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Clock size={14} style={{ opacity: 0.6 }} />
                      <Typography variant="body2" fontWeight={700}>{formatarDuracao(reg.duracaoTotalSegundos)}</Typography>
                    </Box>
                  </Box>

                  {isCorrida && (
                    <>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Distância</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                          <Typography variant="h6" fontWeight={800} color="primary.main">{distTotal.toFixed(2)}</Typography>
                          <Typography variant="caption" fontWeight={700} color="primary.main">km</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ritmo Médio</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Gauge size={14} color="#FF6B2C" />
                          <Typography variant="body2" fontWeight={800}>{formatPace(paceMedio)}/km</Typography>
                        </Box>
                      </Box>
                      {reg.stravaData && (
                        <Chip
                          icon={<Navigation size={12} fill="#FC4C02" />}
                          label="STRAVA"
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            bgcolor: 'rgba(252, 76, 2, 0.1)',
                            color: '#FC4C02',
                            border: '1px solid rgba(252, 76, 2, 0.2)',
                            ml: 'auto'
                          }}
                        />
                      )}
                    </>
                  )}

                  {isMusculacao && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Volume</Typography>
                      <Typography variant="body2" fontWeight={700}>{reg.exercicios.length} exercícios</Typography>
                    </Box>
                  )}

                  {isNatacao && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Distância</Typography>
                      <Typography variant="body2" fontWeight={700}>{distTotal} m</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
