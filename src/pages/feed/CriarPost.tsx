import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, IconButton, Button, TextField, Card, CardContent,
  Chip, CircularProgress, Snackbar, Alert,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowLeft, Send, Dumbbell, Footprints, Waves, Clock, Check, Zap } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTreinoStore } from '../../store/treinoStore';
import { useFeedStore } from '../../store/feedStore';
import { calcularVolumeSessao } from '../../types/treino';
import type { RegistroTreino } from '../../types/treino';
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

function formatDuracao(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? `${m}min` : ''}`;
  return `${m}min`;
}

function buildSummary(reg: RegistroTreino): WorkoutSummary {
  const gruposMusculares = [...new Set(reg.exercicios.map((e) => e.exercicio.grupoMuscular))];
  return {
    exerciciosCount: reg.exercicios.length,
    volumeTotal: calcularVolumeSessao(reg.exercicios),
    distanciaKm: reg.corrida?.etapas?.reduce((sum, e) => sum + (e.distanciaKm ?? 0), 0),
    duracaoMin: reg.duracaoTotalSegundos ? Math.round(reg.duracaoTotalSegundos / 60) : undefined,
    gruposMusculares,
  };
}

export default function CriarPost() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthContext();
  const historico = useTreinoStore((s) => s.historico);
  const criarPost = useFeedStore((s) => s.criarPost);

  // Pré-seleciona se veio do histórico via query param
  const registroParam = searchParams.get('registro');
  const [selectedRegistro, setSelectedRegistro] = useState<string | null>(registroParam);
  const [texto, setTexto] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const uid = user?.id;

  // Todos os treinos do histórico
  const recentWorkouts = useMemo(() => {
    return historico;
  }, [historico]);

  const selectedReg = recentWorkouts.find((r) => r.id === selectedRegistro);

  const handleSubmit = async () => {
    if (!uid) return;
    if (!selectedRegistro && !texto.trim() && photos.length === 0) {
      setError('Selecione um treino, escreva algo ou adicione uma foto.');
      return;
    }

    setPosting(true);
    setError('');
    try {
      // Upload das fotos
      const fotoUrls: string[] = [];
      for (const photo of photos) {
        const compressed = await compressImage(photo);
        const url = await uploadFeedPhoto(uid, compressed);
        fotoUrls.push(url);
      }

      const summary = selectedReg ? buildSummary(selectedReg) : undefined;

      await criarPost(uid, {
        id: crypto.randomUUID(),
        registroId: selectedReg?.id || null,
        tipoTreino: selectedReg?.tipo || null,
        nomeTreino: selectedReg?.nome || null,
        duracaoSegundos: selectedReg?.duracaoTotalSegundos || null,
        resumo: summary || null,
        texto: texto.trim() || null,
        fotoUrls,
      });

      navigate('/feed');
    } catch (err: any) {
      console.error('Erro ao criar post:', err);
      setError('Erro ao publicar. Tente novamente.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Box sx={{ pt: 1, pb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
        <IconButton onClick={() => navigate('/feed')} sx={{ mr: 1, ml: -1 }}>
          <ArrowLeft size={22} />
        </IconButton>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1, fontSize: '1.2rem' }}>
          Novo Post
        </Typography>
        <Button
          variant="contained"
          size="small"
          disabled={posting}
          onClick={handleSubmit}
          startIcon={posting ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />}
          sx={{ borderRadius: '12px', px: 2.5, py: 1 }}
        >
          {posting ? 'Publicando...' : 'Publicar'}
        </Button>
      </Box>

      {/* Selecionar Treino */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, fontSize: '0.85rem' }}>
        Selecione um treino (opcional)
      </Typography>

      {recentWorkouts.length === 0 ? (
        <Box sx={{
          p: 2, borderRadius: '14px',
          border: '1px solid', borderColor: 'divider',
          textAlign: 'center', mb: 2.5,
        }}>
          <Typography variant="body2" color="text.secondary">
            Nenhum treino recente. Conclua um treino primeiro!
          </Typography>
        </Box>
      ) : (
        <Box sx={{
          display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 2,
          '&::-webkit-scrollbar': { display: 'none' },
        }}>
          {recentWorkouts.map((reg) => {
            const isSelected = selectedRegistro === reg.id;
            return (
              <Card
                key={reg.id}
                onClick={() => setSelectedRegistro(isSelected ? null : reg.id)}
                sx={{
                  minWidth: 160, maxWidth: 180,
                  cursor: 'pointer',
                  flexShrink: 0,
                  border: '2px solid',
                  borderColor: isSelected ? '#FF6B2C' : 'transparent',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'visible',
                  '&:active': { transform: 'scale(0.97)' },
                }}
              >
                {isSelected && (
                  <Box sx={{
                    position: 'absolute', top: -8, right: -8,
                    width: 24, height: 24, borderRadius: '50%',
                    bgcolor: '#FF6B2C', color: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1,
                  }}>
                    <Check size={14} strokeWidth={3} />
                  </Box>
                )}
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{
                    width: 32, height: 32, borderRadius: '10px',
                    background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#000', mb: 1,
                  }}>
                    {tipoIcons[reg.tipo] || <Zap size={16} />}
                  </Box>
                  <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.8rem', mb: 0.3 }}>
                    {reg.nome}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip
                      label={TIPO_LABELS[reg.tipo] || reg.tipo}
                      size="small"
                      sx={{ height: 18, fontSize: '0.6rem' }}
                    />
                    {reg.duracaoTotalSegundos && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                        <Clock size={10} color="#94A3B8" />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                          {formatDuracao(reg.duracaoTotalSegundos)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block', mt: 0.5 }}>
                    {new Date(reg.concluidoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Preview do treino selecionado */}
      {selectedReg && (
        <Box sx={{
          p: 2, mb: 2.5, borderRadius: '14px',
          background: (theme) => theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${alpha('#FF6B2C', 0.08)} 0%, ${alpha('#FF6B2C', 0.02)} 100%)`
            : `linear-gradient(135deg, ${alpha('#FF6B2C', 0.05)} 0%, ${alpha('#FF6B2C', 0.01)} 100%)`,
          border: '1px solid',
          borderColor: alpha('#FF6B2C', 0.15),
        }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
            {selectedReg.nome}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedReg.duracaoTotalSegundos && (
              <Chip icon={<Clock size={12} />} label={formatDuracao(selectedReg.duracaoTotalSegundos)} size="small" variant="outlined" sx={{ height: 24 }} />
            )}
            {selectedReg.exercicios.length > 0 && (
              <Chip icon={<Dumbbell size={12} />} label={`${selectedReg.exercicios.length} exercícios`} size="small" variant="outlined" sx={{ height: 24 }} />
            )}
            {calcularVolumeSessao(selectedReg.exercicios) > 0 && (
              <Chip label={`${(calcularVolumeSessao(selectedReg.exercicios) / 1000).toFixed(1)}t volume`} size="small" variant="outlined" sx={{ height: 24 }} />
            )}
          </Box>
          {selectedReg.exercicios.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
              {[...new Set(selectedReg.exercicios.map((e) => e.exercicio.grupoMuscular))].map((g) => (
                <Chip key={g} label={g} size="small" sx={{ height: 20, fontSize: '0.6rem' }} />
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Texto / Caption */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, fontSize: '0.85rem' }}>
        O que você quer compartilhar?
      </Typography>
      <TextField
        multiline
        minRows={3}
        maxRows={6}
        fullWidth
        placeholder="Conte como foi o treino, motivação, dicas..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        slotProps={{ htmlInput: { maxLength: 500 } }}
        sx={{ mb: 0.5 }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mb: 2.5 }}>
        {texto.length}/500
      </Typography>

      {/* Photos */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, fontSize: '0.85rem' }}>
        Fotos (opcional)
      </Typography>
      <PhotoUploader
        photos={photos}
        onAdd={(newFiles) => setPhotos((prev) => [...prev, ...newFiles].slice(0, 3))}
        onRemove={(idx) => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
      />

      {/* Error */}
      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" variant="filled" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
