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
  }));
  return {
    exerciciosCount: reg.exercicios.length,
    volumeTotal: calcularVolumeSessao(reg.exercicios),
    distanciaKm: reg.corrida?.etapas?.reduce((sum, e) => sum + (e.distanciaKm ?? 0), 0),
    duracaoMin: reg.duracaoTotalSegundos ? Math.round(reg.duracaoTotalSegundos / 60) : undefined,
    gruposMusculares,
    exercicios,
  };
}

function buildSummaryFromSessao(sessao: SessaoTreino): WorkoutSummary {
  const gruposMusculares = [...new Set(sessao.exercicios.map((e) => e.exercicio.grupoMuscular))];
  const exercicios = sessao.exercicios.map((e) => ({
    nome: e.exercicio.nome,
    sets: e.series.length,
    exercicioId: e.exercicio.id,
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
  const { user } = useAuthContext();
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

  const uid = user?.id;

  const recentWorkouts = useMemo(() => historico, [historico]);
  const selectedReg = recentWorkouts.find((r) => r.id === selectedRegistro);
  const selectedSes = sessoes.find((s) => s.id === selectedSessao);

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

      {/* Selecionar Treino - Tabs */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, fontSize: '0.85rem' }}>
        Selecione um treino (opcional)
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
        <Chip
          label="Histórico"
          onClick={() => { setTab('historico'); setSelectedSessao(null); }}
          color={tab === 'historico' ? 'primary' : 'default'}
          variant={tab === 'historico' ? 'filled' : 'outlined'}
          sx={{ fontWeight: 700 }}
        />
        <Chip
          label="Meus Treinos"
          onClick={() => { setTab('treinos'); setSelectedRegistro(null); }}
          color={tab === 'treinos' ? 'primary' : 'default'}
          variant={tab === 'treinos' ? 'filled' : 'outlined'}
          sx={{ fontWeight: 700 }}
        />
      </Box>

      {tab === 'historico' && (
        recentWorkouts.length === 0 ? (
          <Box sx={{ p: 2, borderRadius: '14px', border: '1px solid', borderColor: 'divider', textAlign: 'center', mb: 2.5 }}>
            <Typography variant="body2" color="text.secondary">Nenhum treino recente. Conclua um treino primeiro!</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 2, '&::-webkit-scrollbar': { display: 'none' } }}>
            {recentWorkouts.map((reg) => {
              const isSelected = selectedRegistro === reg.id;
              return (
                <Card key={reg.id} onClick={() => { setSelectedRegistro(isSelected ? null : reg.id); setSelectedSessao(null); }}
                  sx={{ minWidth: 160, maxWidth: 180, cursor: 'pointer', flexShrink: 0, border: '2px solid', borderColor: isSelected ? '#FF6B2C' : 'transparent', transition: 'all 0.2s', position: 'relative', overflow: 'visible', '&:active': { transform: 'scale(0.97)' } }}>
                  {isSelected && (
                    <Box sx={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%', bgcolor: '#FF6B2C', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                      <Check size={14} strokeWidth={3} />
                    </Box>
                  )}
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '10px', background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', mb: 1 }}>
                      {tipoIcons[reg.tipo] || <Zap size={16} />}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.8rem', mb: 0.3 }}>{reg.nome}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Chip label={TIPO_LABELS[reg.tipo] || reg.tipo} size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                      {reg.duracaoTotalSegundos && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                          <Clock size={10} color="#94A3B8" />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{formatDuracao(reg.duracaoTotalSegundos)}</Typography>
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
        )
      )}

      {tab === 'treinos' && (
        sessoes.length === 0 ? (
          <Box sx={{ p: 2, borderRadius: '14px', border: '1px solid', borderColor: 'divider', textAlign: 'center', mb: 2.5 }}>
            <Typography variant="body2" color="text.secondary">Nenhum treino criado ainda.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 2, '&::-webkit-scrollbar': { display: 'none' } }}>
            {sessoes.map((ses) => {
              const isSelected = selectedSessao === ses.id;
              return (
                <Card key={ses.id} onClick={() => { setSelectedSessao(isSelected ? null : ses.id); setSelectedRegistro(null); }}
                  sx={{ minWidth: 160, maxWidth: 180, cursor: 'pointer', flexShrink: 0, border: '2px solid', borderColor: isSelected ? '#FF6B2C' : 'transparent', transition: 'all 0.2s', position: 'relative', overflow: 'visible', '&:active': { transform: 'scale(0.97)' } }}>
                  {isSelected && (
                    <Box sx={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%', bgcolor: '#FF6B2C', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                      <Check size={14} strokeWidth={3} />
                    </Box>
                  )}
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '10px', background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', mb: 1 }}>
                      {tipoIcons[ses.tipo] || <Zap size={16} />}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.8rem', mb: 0.3 }}>{ses.nome}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Chip label={TIPO_LABELS[ses.tipo] || ses.tipo} size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                        {ses.exercicios.length} exerc.
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )
      )}

      {/* Preview do treino selecionado (sessão) */}
      {selectedSes && (
        <Box sx={{
          p: 2, mb: 2.5, borderRadius: '14px',
          background: (theme) => theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${alpha('#FF6B2C', 0.08)} 0%, ${alpha('#FF6B2C', 0.02)} 100%)`
            : `linear-gradient(135deg, ${alpha('#FF6B2C', 0.05)} 0%, ${alpha('#FF6B2C', 0.01)} 100%)`,
          border: '1px solid', borderColor: alpha('#FF6B2C', 0.15),
        }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>{selectedSes.nome}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedSes.exercicios.length > 0 && (
              <Chip icon={<Dumbbell size={12} />} label={`${selectedSes.exercicios.length} exercícios`} size="small" variant="outlined" sx={{ height: 24 }} />
            )}
            {calcularVolumeSessao(selectedSes.exercicios) > 0 && (
              <Chip label={`${(calcularVolumeSessao(selectedSes.exercicios) / 1000).toFixed(1)}t volume`} size="small" variant="outlined" sx={{ height: 24 }} />
            )}
          </Box>
          {selectedSes.exercicios.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
              {[...new Set(selectedSes.exercicios.map((e) => e.exercicio.grupoMuscular))].map((g) => (
                <Chip key={g} label={g} size="small" sx={{ height: 20, fontSize: '0.6rem' }} />
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Preview do treino selecionado (histórico) */}
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
