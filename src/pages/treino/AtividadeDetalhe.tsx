import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Card } from '@mui/material';
import { ArrowLeft, Heart, HeartPulse, Flame, Zap, TrendingUp, Footprints, Thermometer, Timer, Award, Watch } from 'lucide-react';
import { Suspense, lazy, useEffect, useRef } from 'react';
import { useTreinoStore } from '../../store/treinoStore';

const StravaRouteMap = lazy(() => import('../../components/treino/StravaRouteMap'));

function formatarPace(mps: number): string {
  if (!mps || mps <= 0) return '--:--';
  const minKm = 1000 / (mps * 60);
  const mins = Math.floor(minKm);
  const secs = Math.round((minKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatarTempo(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = Math.round(seg % 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

function formatarDistancia(metros: number): string {
  if (metros >= 1000) return `${(metros / 1000).toFixed(2)} km`;
  return `${Math.round(metros)} m`;
}

function StatCard({ icon, label, value, unit, color = '#FF6B00' }: { icon: React.ReactNode; label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 120, p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1, border: '1px solid rgba(255,255,255,0.06)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        {icon}
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', color }}>{value}</Typography>
        {unit && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{unit}</Typography>}
      </Box>
    </Box>
  );
}

export default function AtividadeDetalhe() {
  const { registroId } = useParams<{ registroId: string }>();
  const navigate = useNavigate();
  const historico = useTreinoStore((s) => s.historico);
  const topRef = useRef<HTMLDivElement>(null);

  // Scroll pro topo ao entrar
  useEffect(() => {
    window.scrollTo(0, 0);
    topRef.current?.scrollIntoView();
  }, []);

  const reg = historico.find((r) => r.id === registroId);

  if (!reg || !reg.stravaData) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Atividade não encontrada</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer', mt: 1, display: 'block' }} onClick={() => navigate(-1)}>Voltar</Typography>
      </Box>
    );
  }

  const sd = reg.stravaData;
  const data = new Date(reg.concluidoEm);
  const dataFormatada = data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const isRun = reg.tipo === 'corrida';

  // Filtrar splits: só splits completos (>= 800m), remove o último parcial
  const fullSplits = sd.splits?.filter(s => s.distance >= 800) || [];

  return (
    <Box ref={topRef} sx={{ pb: 4, minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header - não grudado */}
      <Box sx={{ px: 2, pt: 2, pb: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <IconButton size="small" onClick={() => navigate(-1)} sx={{ ml: -0.5 }}>
          <ArrowLeft size={20} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.2 }}>{reg.nome}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{dataFormatada} às {horaFormatada}</Typography>
        </Box>
        <Box sx={{ px: 1.2, py: 0.3, bgcolor: 'rgba(252, 76, 2, 0.15)', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ color: '#FC4C02', fontWeight: 900, fontSize: '0.65rem' }}>STRAVA</Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pt: 2 }}>
        {/* Hero Stats - mais quadrado */}
        <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', mb: 2.5, py: 2, bgcolor: 'rgba(255,107,0,0.05)', borderRadius: 1.5, border: '1px solid rgba(255,107,0,0.15)' }}>
          {sd.distance != null && sd.distance > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Distância</Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#FF6B00', fontSize: '1.4rem' }}>{(sd.distance / 1000).toFixed(2)}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>km</Typography>
            </Box>
          )}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Duração</Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#FF6B00', fontSize: '1.4rem' }}>{formatarTempo(sd.movingTime || reg.duracaoTotalSegundos || 0)}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>em movimento</Typography>
          </Box>
          {isRun && sd.averageSpeedMps > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pace Médio</Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#FF6B00', fontSize: '1.4rem' }}>{formatarPace(sd.averageSpeedMps)}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>/km</Typography>
            </Box>
          )}
        </Box>

        {/* Mapa - 98% width, mais quadrado */}
        {sd.summaryPolyline && (
          <Box sx={{ mb: 2.5, mx: 'auto', width: '98%', borderRadius: 1.5, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Suspense fallback={<Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="caption" color="text.secondary">Carregando mapa...</Typography></Box>}>
              <StravaRouteMap polyline={sd.summaryPolyline} />
            </Suspense>
          </Box>
        )}

        {/* Grid de métricas */}
        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.8rem', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Métricas</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {sd.averageHeartrate != null && (
            <StatCard icon={<Heart size={14} color="#FF6B00" />} label="FC Média" value={Math.round(sd.averageHeartrate)} unit="bpm" />
          )}
          {sd.maxHeartrate != null && (
            <StatCard icon={<HeartPulse size={14} color="#ff4444" />} label="FC Máxima" value={Math.round(sd.maxHeartrate)} unit="bpm" color="#ff4444" />
          )}
          {sd.calories != null && Number(sd.calories) > 0 && (
            <StatCard icon={<Flame size={14} color="#FF6B00" />} label="Calorias" value={Math.round(Number(sd.calories))} unit="kcal" />
          )}
          {sd.elevationGainM > 0 && (
            <StatCard icon={<TrendingUp size={14} color="#4caf50" />} label="Elevação" value={sd.elevationGainM} unit="m" color="#4caf50" />
          )}
          {isRun && sd.maxSpeedMps > 0 && (
            <StatCard icon={<Zap size={14} color="#FF6B00" />} label="Pace Máximo" value={formatarPace(sd.maxSpeedMps)} unit="/km" />
          )}
          {sd.averageCadence != null && (
            <StatCard icon={<Footprints size={14} color="#FF6B00" />} label="Cadência" value={Math.round(sd.averageCadence * 2)} unit="ppm" />
          )}
          {sd.elapsedTime != null && sd.movingTime != null && (
            <StatCard icon={<Timer size={14} color="#FF6B00" />} label="Tempo Total" value={formatarTempo(sd.elapsedTime)} />
          )}
          {sd.sufferScore != null && (
            <StatCard icon={<Zap size={14} color="#ff9800" />} label="Esforço" value={sd.sufferScore} color="#ff9800" />
          )}
          {sd.averageWatts != null && (
            <StatCard icon={<Zap size={14} color="#FF6B00" />} label="Potência Média" value={Math.round(sd.averageWatts)} unit="W" />
          )}
          {sd.maxWatts != null && (
            <StatCard icon={<Zap size={14} color="#ff4444" />} label="Potência Máx" value={sd.maxWatts} unit="W" color="#ff4444" />
          )}
          {sd.averageTemp != null && (
            <StatCard icon={<Thermometer size={14} color="#2196f3" />} label="Temperatura" value={sd.averageTemp} unit="°C" color="#2196f3" />
          )}
          {sd.kilojoules != null && (
            <StatCard icon={<Flame size={14} color="#FF6B00" />} label="Energia" value={Math.round(sd.kilojoules)} unit="kJ" />
          )}
        </Box>

        {/* Dispositivo e Equipamento */}
        {(sd.deviceName || sd.gearName) && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.8rem', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Equipamento</Typography>
            <Card sx={{ p: 1.5, mb: 3, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
              {sd.deviceName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: sd.gearName ? 1 : 0 }}>
                  <Watch size={16} color="#FF6B00" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>Dispositivo</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{sd.deviceName}</Typography>
                  </Box>
                </Box>
              )}
              {sd.gearName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Footprints size={16} color="#FF6B00" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>Equipamento</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{sd.gearName}</Typography>
                  </Box>
                </Box>
              )}
            </Card>
          </>
        )}

        {/* Splits por km - só splits completos */}
        {fullSplits.length > 1 && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.8rem', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Splits por km</Typography>
            <Card sx={{ p: 0, mb: 3, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1, overflow: 'hidden' }}>
              {/* Header */}
              <Box sx={{ display: 'flex', px: 1.5, py: 1, bgcolor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography variant="caption" sx={{ flex: '0 0 40px', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', color: 'text.secondary' }}>KM</Typography>
                <Typography variant="caption" sx={{ flex: 1, fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', color: 'text.secondary' }}>Pace</Typography>
                <Typography variant="caption" sx={{ flex: '0 0 60px', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', color: 'text.secondary', textAlign: 'right' }}>FC</Typography>
                <Typography variant="caption" sx={{ flex: '0 0 50px', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', color: 'text.secondary', textAlign: 'right' }}>Elev.</Typography>
              </Box>
              {(() => {
                const paces = fullSplits.map(s => s.averageSpeed > 0 ? 1000 / (s.averageSpeed * 60) : 0);
                const avgPace = paces.reduce((a, b) => a + b, 0) / paces.length;
                return fullSplits.map((s, i) => {
                  const pace = s.averageSpeed > 0 ? 1000 / (s.averageSpeed * 60) : 0;
                  const isFast = pace > 0 && pace < avgPace * 0.97;
                  const isSlow = pace > avgPace * 1.03;
                  return (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', px: 1.5, py: 0.8, borderBottom: i < fullSplits.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', bgcolor: isFast ? 'rgba(76, 175, 80, 0.06)' : isSlow ? 'rgba(244, 67, 54, 0.04)' : 'transparent' }}>
                      <Typography variant="body2" sx={{ flex: '0 0 40px', fontWeight: 700, fontSize: '0.8rem', color: 'text.secondary' }}>{i + 1}</Typography>
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: isFast ? '#4caf50' : isSlow ? '#f44336' : 'text.primary' }}>
                          {formatarPace(s.averageSpeed)} <Typography component="span" variant="caption" color="text.secondary">/km</Typography>
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ flex: '0 0 60px', fontSize: '0.8rem', textAlign: 'right', color: 'text.secondary' }}>
                        {s.averageHeartrate != null ? `${Math.round(s.averageHeartrate)}` : '-'}
                      </Typography>
                      <Typography variant="body2" sx={{ flex: '0 0 50px', fontSize: '0.8rem', textAlign: 'right', color: s.elevationDifference > 0 ? '#4caf50' : s.elevationDifference < 0 ? '#f44336' : 'text.secondary' }}>
                        {s.elevationDifference !== 0 ? `${s.elevationDifference > 0 ? '+' : ''}${Math.round(s.elevationDifference)}m` : '-'}
                      </Typography>
                    </Box>
                  );
                });
              })()}
            </Card>
          </>
        )}

        {/* Laps */}
        {sd.laps && sd.laps.length > 1 && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.8rem', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Laps</Typography>
            <Card sx={{ p: 0, mb: 3, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1, overflow: 'hidden' }}>
              {sd.laps.map((lap, i) => (
                <Box key={i} sx={{ px: 1.5, py: 1, borderBottom: i < sd.laps!.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.3 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{lap.name || `Lap ${i + 1}`}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{formatarDistancia(lap.distance)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      {formatarTempo(lap.movingTime)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      Pace: {formatarPace(lap.averageSpeed)}/km
                    </Typography>
                    {lap.averageHeartrate != null && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        FC: {Math.round(lap.averageHeartrate)} bpm
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Card>
          </>
        )}

        {/* Best Efforts */}
        {sd.bestEfforts && sd.bestEfforts.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.8rem', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>Melhores Marcas</Typography>
            <Card sx={{ p: 0, mb: 3, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1, overflow: 'hidden' }}>
              {sd.bestEfforts.map((b, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1, borderBottom: i < sd.bestEfforts!.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Award size={14} color="#FF6B00" />
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.name}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#FF6B00' }}>
                    {b.movingTime >= 3600
                      ? `${Math.floor(b.movingTime / 3600)}:${String(Math.floor((b.movingTime % 3600) / 60)).padStart(2, '0')}:${String(b.movingTime % 60).padStart(2, '0')}`
                      : `${Math.floor(b.movingTime / 60)}:${String(b.movingTime % 60).padStart(2, '0')}`
                    }
                  </Typography>
                </Box>
              ))}
            </Card>
          </>
        )}
      </Box>
    </Box>
  );
}
