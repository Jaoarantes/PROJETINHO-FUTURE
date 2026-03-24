import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, IconButton, Avatar, TextField,
  Chip, CircularProgress, Snackbar, Alert,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowLeft, Dumbbell, Footprints, Waves, Clock, Check, Zap, Image, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTreinoStore } from '../../store/treinoStore';
import { useFeedStore } from '../../store/feedStore';
import SuccessOverlay from '../../components/SuccessOverlay';
import { calcularVolumeSessao } from '../../types/treino';
import type { RegistroTreino, SessaoTreino } from '../../types/treino';
import type { WorkoutSummary } from '../../types/feed';
import { uploadFeedPhoto, compressImage } from '../../services/feedService';
import PhotoUploader from '../../components/feed/PhotoUploader';

const tipoIcons: Record<string, React.ReactNode> = {
  musculacao: <Dumbbell size={18} />,
  corrida: <Footprints size={18} />,
  natacao: <Waves size={18} />,
};

const TIPO_LABELS: Record<string, string> = {
  musculacao: 'Musculação',
  corrida: 'Corrida',
  natacao: 'Natação',
};

const TIPO_COLORS: Record<string, string> = {
  musculacao: '#AB47BC',
  corrida: '#FF6B2C',
  natacao: '#42A5F5',
};

function formatDuracao(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? `${m}min` : ''}`;
  return `${m}min`;
}

function buildSummary(reg: RegistroTreino): WorkoutSummary {
  const gruposMusculares = [...new Set(reg.exercicios.map((e) => e.exercicio.grupoMuscular))];
  const exercicios = reg.exercicios.map((e) => ({
    nome: e.exercicio.nome,
    sets: e.series.length,
    exercicioId: e.exercicio.id,
    series: e.series.map((s: any) => ({ reps: s.repeticoes ?? 0, peso: s.peso, tipo: s.tipo || 'normal' })),
  }));
  return {
    exerciciosCount: reg.exercicios.length,
    volumeTotal: calcularVolumeSessao(reg.exercicios),
    distanciaKm: reg.corrida?.etapas?.reduce((sum, e) => sum + (e.distanciaKm ?? 0), 0),
    duracaoMin: reg.duracaoTotalSegundos ? Math.round(reg.duracaoTotalSegundos / 60) : undefined,
    gruposMusculares,
    exercicios,
    summaryPolyline: reg.stravaData?.summaryPolyline || undefined,
  };
}

function buildSummaryFromSessao(sessao: SessaoTreino): WorkoutSummary {
  const gruposMusculares = [...new Set(sessao.exercicios.map((e) => e.exercicio.grupoMuscular))];
  const exercicios = sessao.exercicios.map((e) => ({
    nome: e.exercicio.nome,
    sets: e.series.length,
    exercicioId: e.exercicio.id,
    series: e.series.map((s: any) => ({ reps: s.repeticoes ?? 0, peso: s.peso, tipo: s.tipo || 'normal' })),
  }));
  return {
    exerciciosCount: sessao.exercicios.length,
    volumeTotal: calcularVolumeSessao(sessao.exercicios),
    gruposMusculares,
    exercicios,
  };
}

export default function CriarPost() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuthContext();
  const historico = useTreinoStore((s) => s.historico);
  const sessoes = useTreinoStore((s) => s.sessoes);
  const criarPost = useFeedStore((s) => s.criarPost);

  const registroParam = searchParams.get('registro');
  const [selectedRegistro, setSelectedRegistro] = useState<string | null>(registroParam);
  const [selectedSessao, setSelectedSessao] = useState<string | null>(null);
  const [tab, setTab] = useState<'historico' | 'treinos'>('historico');
  const [texto, setTexto] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(!registroParam);
  const [successOpen, setSuccessOpen] = useState(false);

  const uid = user?.id;
  const userName = user?.user_metadata?.display_name || profile?.displayName || 'Você';
  const userPhoto = user?.user_metadata?.avatar_url || profile?.photoURL || null;

  const recentWorkouts = useMemo(() => historico, [historico]);
  const selectedReg = recentWorkouts.find((r) => r.id === selectedRegistro);
  const selectedSes = sessoes.find((s) => s.id === selectedSessao);
  const selectedItem = selectedReg || selectedSes;
  const selectedColor = selectedItem ? TIPO_COLORS[selectedItem.tipo] || '#FF6B2C' : '#FF6B2C';

  const handleSubmit = async () => {
    if (!uid) return;
    if (!selectedRegistro && !selectedSessao && !texto.trim() && photos.length === 0) {
      setError('Selecione um treino, escreva algo ou adicione uma foto.');
      return;
    }

    setPosting(true);
    setError('');
    try {
      const fotoUrls: string[] = [];
      for (const photo of photos) {
        const compressed = await compressImage(photo);
        const url = await uploadFeedPhoto(uid, compressed);
        fotoUrls.push(url);
      }

      let summary: WorkoutSummary | undefined;
      let tipoTreino: string | null = null;
      let nomeTreino: string | null = null;
      let duracaoSegundos: number | null = null;

      if (selectedReg) {
        summary = buildSummary(selectedReg);
        tipoTreino = selectedReg.tipo;
        nomeTreino = selectedReg.nome;
        duracaoSegundos = selectedReg.duracaoTotalSegundos || null;
      } else if (selectedSes) {
        summary = buildSummaryFromSessao(selectedSes);
        tipoTreino = selectedSes.tipo;
        nomeTreino = selectedSes.nome;
      }

      await criarPost(uid, {
        id: crypto.randomUUID(),
        registroId: selectedReg?.id || null,
        tipoTreino,
        nomeTreino,
        duracaoSegundos,
        resumo: summary || null,
        texto: texto.trim() || null,
        fotoUrls,
      });

      setSuccessOpen(true);
      setTimeout(() => navigate('/feed'), 1200);
    } catch (err: any) {
      console.error('Erro ao criar post:', err);
      setError('Erro ao publicar. Tente novamente.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Box sx={{ pt: 0.5, pb: 4, mx: -2.5 }}>
      {/* ─── Top bar (Instagram-style) ─── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', px: 2, py: 1.5,
        borderBottom: '1px solid', borderColor: 'divider',
      }}>
        <IconButton onClick={() => navigate('/feed')} sx={{ mr: 1 }}>
          <ArrowLeft size={22} />
        </IconButton>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
          Nova publicação
        </Typography>
        <Typography
          onClick={posting ? undefined : handleSubmit}
          sx={{
            fontWeight: 800, fontSize: '0.95rem',
            color: posting ? 'text.disabled' : '#FF6B2C',
            cursor: posting ? 'default' : 'pointer',
            '&:active': { opacity: 0.6 },
          }}
        >
          {posting ? 'Publicando...' : 'Compartilhar'}
        </Typography>
      </Box>

      {/* ─── Compose area ─── */}
      <Box sx={{ px: 2.5, pt: 2 }}>
        {/* User + text input */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
          <Avatar src={userPhoto || undefined} sx={{ width: 40, height: 40, mt: 0.3 }}>
            {userName.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.88rem', mb: 0.5 }}>
              {userName}
            </Typography>
            <TextField
              multiline
              minRows={2}
              maxRows={8}
              fullWidth
              placeholder="Como foi o treino hoje?"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 500 }, input: { disableUnderline: true, sx: { fontSize: '0.92rem', p: 0 } } }}
              variant="standard"
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block', textAlign: 'right', mt: 0.5 }}>
              {texto.length}/500
            </Typography>
          </Box>
        </Box>

        {/* ─── Workout attachment card ─── */}
        {selectedItem && (
          <Box sx={{
            mb: 2, borderRadius: '16px', overflow: 'hidden',
            border: '1px solid', borderColor: alpha(selectedColor, 0.2),
            bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha(selectedColor, 0.06) : alpha(selectedColor, 0.04),
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5 }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: '12px',
                bgcolor: alpha(selectedColor, 0.12),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mr: 1.5, color: selectedColor,
              }}>
                {tipoIcons[selectedItem.tipo] || <Zap size={20} />}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.88rem' }}>
                  {selectedItem.nome}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.2 }}>
                  <Chip
                    label={TIPO_LABELS[selectedItem.tipo] || selectedItem.tipo}
                    size="small"
                    sx={{
                      height: 20, fontSize: '0.6rem', fontWeight: 700,
                      bgcolor: alpha(selectedColor, 0.12), color: selectedColor,
                    }}
                  />
                  {selectedReg?.duracaoTotalSegundos && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      <Clock size={11} style={{ opacity: 0.5 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        {formatDuracao(selectedReg.duracaoTotalSegundos)}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
              <IconButton
                size="small"
                onClick={() => { setSelectedRegistro(null); setSelectedSessao(null); }}
                sx={{ opacity: 0.5 }}
              >
                <ArrowLeft size={16} />
              </IconButton>
            </Box>

            {/* Stats */}
            {(() => {
              const exercCount = selectedItem.exercicios?.length || 0;
              const volume = calcularVolumeSessao(selectedItem.exercicios || []);
              const grupos = [...new Set((selectedItem.exercicios || []).map((e: any) => e.exercicio.grupoMuscular))];
              if (exercCount === 0 && volume === 0) return null;
              return (
                <Box sx={{ px: 2, pb: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 2, mb: grupos.length > 0 ? 1 : 0 }}>
                    {exercCount > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Exercícios
                        </Typography>
                        <Typography variant="body2" fontWeight={800} sx={{ fontSize: '0.95rem' }}>{exercCount}</Typography>
                      </Box>
                    )}
                    {volume > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Volume
                        </Typography>
                        <Typography variant="body2" fontWeight={800} sx={{ fontSize: '0.95rem' }}>{(volume / 1000).toFixed(1)}t</Typography>
                      </Box>
                    )}
                  </Box>
                  {grupos.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {grupos.map((g) => (
                        <Chip key={g} label={g} size="small" sx={{ height: 20, fontSize: '0.6rem', bgcolor: alpha(selectedColor, 0.08) }} />
                      ))}
                    </Box>
                  )}
                </Box>
              );
            })()}
          </Box>
        )}

        {/* ─── Photos ─── */}
        {photos.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <PhotoUploader
              photos={photos}
              onAdd={(newFiles) => setPhotos((prev) => [...prev, ...newFiles].slice(0, 3))}
              onRemove={(idx) => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
            />
          </Box>
        )}
      </Box>

      {/* ─── Bottom toolbar ─── */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.5,
        px: 2.5, py: 1.5,
        borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider',
      }}>
        <Box
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e) => {
              const files = Array.from((e.target as HTMLInputElement).files || []);
              if (files.length > 0) setPhotos((prev) => [...prev, ...files].slice(0, 3));
            };
            input.click();
          }}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.8,
            px: 1.5, py: 0.8, borderRadius: '10px', cursor: 'pointer',
            '&:active': { bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05) },
          }}
        >
          <Image size={20} style={{ opacity: 0.6 }} />
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ fontSize: '0.78rem' }}>
            Foto
          </Typography>
        </Box>

        <Box
          onClick={() => setShowWorkoutPicker((v) => !v)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.8,
            px: 1.5, py: 0.8, borderRadius: '10px', cursor: 'pointer',
            bgcolor: selectedItem ? alpha(selectedColor, 0.08) : 'transparent',
            '&:active': { bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05) },
          }}
        >
          <Dumbbell size={20} style={{ opacity: 0.6 }} />
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ fontSize: '0.78rem' }}>
            {selectedItem ? 'Trocar treino' : 'Treino'}
          </Typography>
          {showWorkoutPicker ? <ChevronUp size={14} style={{ opacity: 0.4 }} /> : <ChevronDown size={14} style={{ opacity: 0.4 }} />}
        </Box>
      </Box>

      {/* ─── Workout picker (collapsible) ─── */}
      {showWorkoutPicker && (
        <Box sx={{ px: 2.5, pt: 2 }}>
          {/* Tabs */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <Chip
              label="Histórico"
              onClick={() => { setTab('historico'); setSelectedSessao(null); }}
              sx={{
                fontWeight: 700, fontSize: '0.78rem',
                bgcolor: tab === 'historico' ? alpha('#FF6B2C', 0.12) : 'transparent',
                color: tab === 'historico' ? '#FF6B2C' : 'text.secondary',
                border: '1px solid',
                borderColor: tab === 'historico' ? alpha('#FF6B2C', 0.3) : 'divider',
                '&:hover': { bgcolor: alpha('#FF6B2C', 0.08) },
              }}
            />
            <Chip
              label="Meus Treinos"
              onClick={() => { setTab('treinos'); setSelectedRegistro(null); }}
              sx={{
                fontWeight: 700, fontSize: '0.78rem',
                bgcolor: tab === 'treinos' ? alpha('#FF6B2C', 0.12) : 'transparent',
                color: tab === 'treinos' ? '#FF6B2C' : 'text.secondary',
                border: '1px solid',
                borderColor: tab === 'treinos' ? alpha('#FF6B2C', 0.3) : 'divider',
                '&:hover': { bgcolor: alpha('#FF6B2C', 0.08) },
              }}
            />
          </Box>

          {/* Workout list */}
          {tab === 'historico' && (
            recentWorkouts.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center', opacity: 0.6 }}>
                Nenhum treino recente
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {recentWorkouts.slice(0, 8).map((reg) => {
                  const isSelected = selectedRegistro === reg.id;
                  const color = TIPO_COLORS[reg.tipo] || '#FF6B2C';
                  return (
                    <Box
                      key={reg.id}
                      onClick={() => { setSelectedRegistro(isSelected ? null : reg.id); setSelectedSessao(null); }}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        px: 1.5, py: 1.2, borderRadius: '12px', cursor: 'pointer',
                        bgcolor: isSelected ? alpha(color, 0.08) : 'transparent',
                        border: '1px solid',
                        borderColor: isSelected ? alpha(color, 0.25) : 'transparent',
                        transition: 'all 0.15s',
                        '&:active': { bgcolor: alpha(color, 0.06) },
                      }}
                    >
                      <Box sx={{
                        width: 36, height: 36, borderRadius: '10px',
                        bgcolor: alpha(color, 0.1),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color, flexShrink: 0,
                      }}>
                        {tipoIcons[reg.tipo] || <Zap size={16} />}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ fontSize: '0.82rem' }}>
                          {reg.nome}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            {new Date(reg.concluidoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </Typography>
                          {reg.duracaoTotalSegundos && (
                            <>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>·</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                {formatDuracao(reg.duracaoTotalSegundos)}
                              </Typography>
                            </>
                          )}
                        </Box>
                      </Box>
                      {isSelected && (
                        <Box sx={{
                          width: 22, height: 22, borderRadius: '50%',
                          bgcolor: color, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Check size={13} strokeWidth={3} />
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )
          )}

          {tab === 'treinos' && (
            sessoes.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center', opacity: 0.6 }}>
                Nenhum treino criado
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {sessoes.map((ses) => {
                  const isSelected = selectedSessao === ses.id;
                  const color = TIPO_COLORS[ses.tipo] || '#FF6B2C';
                  return (
                    <Box
                      key={ses.id}
                      onClick={() => { setSelectedSessao(isSelected ? null : ses.id); setSelectedRegistro(null); }}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        px: 1.5, py: 1.2, borderRadius: '12px', cursor: 'pointer',
                        bgcolor: isSelected ? alpha(color, 0.08) : 'transparent',
                        border: '1px solid',
                        borderColor: isSelected ? alpha(color, 0.25) : 'transparent',
                        transition: 'all 0.15s',
                        '&:active': { bgcolor: alpha(color, 0.06) },
                      }}
                    >
                      <Box sx={{
                        width: 36, height: 36, borderRadius: '10px',
                        bgcolor: alpha(color, 0.1),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color, flexShrink: 0,
                      }}>
                        {tipoIcons[ses.tipo] || <Zap size={16} />}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap sx={{ fontSize: '0.82rem' }}>
                          {ses.nome}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          {ses.exercicios.length} exercícios · {TIPO_LABELS[ses.tipo] || ses.tipo}
                        </Typography>
                      </Box>
                      {isSelected && (
                        <Box sx={{
                          width: 22, height: 22, borderRadius: '50%',
                          bgcolor: color, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Check size={13} strokeWidth={3} />
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )
          )}
        </Box>
      )}

      {/* Loading overlay */}
      {posting && (
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
        }}>
          <Box sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            p: 4, borderRadius: '20px',
            bgcolor: 'background.paper',
            boxShadow: 24,
          }}>
            <CircularProgress size={36} sx={{ color: '#FF6B2C' }} />
            <Typography variant="body2" fontWeight={600}>Publicando...</Typography>
          </Box>
        </Box>
      )}

      {/* Error */}
      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" variant="filled" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>

      <SuccessOverlay
        open={successOpen}
        variant="post"
        onComplete={() => setSuccessOpen(false)}
      />
    </Box>
  );
}
