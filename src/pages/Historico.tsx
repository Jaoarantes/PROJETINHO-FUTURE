import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, IconButton, Divider, Alert, Chip, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Clock, Calendar, MapPin, Gauge, Dumbbell, Waves, Trash2, Info, Navigation, Share2, Flame } from 'lucide-react';
import { useTreinoStore } from '../store/treinoStore';
import { formatPace } from '../utils/geoUtils';
import { calcularCaloriasTreino } from '../utils/calorieCalculator';
import { calcularDistanciaCorrida, calcularDistanciaNatacao } from '../types/treino';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import { useConfirmDelete } from '../hooks/useConfirmDelete';
import { computeAllTimePRs } from '../utils/prSystem';

function formatarData(isoString: string): string {
  const data = new Date(isoString);
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(data);
}

function formatarDataGrupo(isoString: string): string {
  const data = new Date(isoString);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);

  const mesmodia = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  if (mesmodia(data, hoje)) return 'Hoje';
  if (mesmodia(data, ontem)) return 'Ontem';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  }).format(data);
}

function agruparPorData(registros: { concluidoEm: string;[key: string]: any }[]) {
  const grupos: { data: string; label: string; registros: any[] }[] = [];
  const mapa = new Map<string, any[]>();
  const ordemChaves: string[] = [];

  for (const reg of registros) {
    const d = new Date(reg.concluidoEm);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!mapa.has(chave)) {
      mapa.set(chave, []);
      ordemChaves.push(chave);
    }
    mapa.get(chave)!.push(reg);
  }

  for (const chave of ordemChaves) {
    const regs = mapa.get(chave)!;
    grupos.push({ data: chave, label: formatarDataGrupo(regs[0].concluidoEm), registros: regs });
  }

  return grupos;
}

function formatarDuracao(segundos?: number): string {
  if (!segundos) return '--';
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function Historico() {
  const navigate = useNavigate();
  const historico = useTreinoStore((s) => s.historico);
  const removerRegistro = useTreinoStore((s) => s.removerRegistro);
  const deleteReg = useConfirmDelete();
  const allTimePRs = useMemo(() => computeAllTimePRs(historico), [historico]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [limite, setLimite] = useState(7);

  const handleHighlight = useCallback(() => {
    if (historico.length > 0) {
      setHighlightId(historico[0].id);
      setTimeout(() => setHighlightId(null), 2500);
    }
  }, [historico]);

  useEffect(() => {
    window.addEventListener('highlight-latest-history', handleHighlight);
    return () => window.removeEventListener('highlight-latest-history', handleHighlight);
  }, [handleHighlight]);

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

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {agruparPorData(historico.slice(0, limite)).map((grupo) => (
          <Box key={grupo.data}>
            {/* Date header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Calendar size={16} style={{ opacity: 0.5 }} />
              <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.85rem', letterSpacing: '0.03em' }}>
                {grupo.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.6 }}>
                {grupo.registros.length} {grupo.registros.length === 1 ? 'treino' : 'treinos'}
              </Typography>
              <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider', ml: 1 }} />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {grupo.registros.map((reg) => {
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
                  <Card key={reg.id} variant="outlined" sx={{
                    borderRadius: 4, border: '1px solid',
                    borderColor: highlightId === reg.id ? '#FF6B2C' : 'divider',
                    overflow: 'hidden',
                    transition: 'border-color 0.15s ease',
                    ...(highlightId === reg.id && {
                      boxShadow: `0 0 12px ${alpha('#FF6B2C', 0.2)}`,
                    }),
                  }}>
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                            <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>{reg.nome}</Typography>
                            {(() => {
                              const isOuro   = allTimePRs.registrosComOuro.has(reg.id);
                              const isPrata  = allTimePRs.registrosComPrata.has(reg.id);
                              const isBronze = allTimePRs.registrosComBronze.has(reg.id);
                              if (!isOuro && !isPrata && !isBronze) return null;
                              const emoji = isOuro ? '🥇' : isPrata ? '🥈' : '🥉';
                              const label = isOuro ? 'PR' : isPrata ? 'Top 3' : 'Top 10';
                              const cor   = isOuro ? '#F59E0B' : isPrata ? '#94A3B8' : '#CD7C48';
                              return (
                                <Chip
                                  label={`${emoji} ${label}`}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    bgcolor: alpha(cor, 0.15),
                                    color: cor,
                                    border: `1px solid ${alpha(cor, 0.35)}`,
                                    letterSpacing: '0.02em',
                                    '& .MuiChip-label': { px: 0.8 },
                                  }}
                                />
                              );
                            })()}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Calendar size={12} style={{ opacity: 0.5 }} />
                            <Typography variant="caption" color="text.secondary">{formatarData(reg.concluidoEm)}</Typography>
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/feed/novo?registro=${reg.id}`)}
                          sx={{ opacity: 0.5, '&:hover': { opacity: 1, color: '#FF6B2C' } }}
                        >
                          <Share2 size={17} />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => deleteReg.requestDelete(reg.id)} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
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

                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calorias</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Flame size={14} color="#FF6B2C" />
                            <Typography variant="body2" fontWeight={700}>{Math.round(Number(reg.calorias) || calcularCaloriasTreino(reg))} kcal</Typography>
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
        ))}
        {historico.length > limite && (
          <Button
            fullWidth
            onClick={() => setLimite(prev => prev + 15)}
            sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}
          >
            Ver mais ({historico.length - limite} restantes)
          </Button>
        )}
      </Box>

      <ConfirmDeleteDialog
        open={deleteReg.open}
        loading={deleteReg.loading}
        title="Excluir registro?"
        message="Tem certeza que deseja excluir este registro do histórico?"
        onClose={deleteReg.cancel}
        onConfirm={() => deleteReg.confirmDelete(async () => { removerRegistro(deleteReg.payload); })}
      />
    </Box>
  );
}
