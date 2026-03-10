import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Card,
  CardContent,
  TextField,
  Chip,
  Collapse,
} from '@mui/material';
import { MinusCircle, ArrowLeft, Trash2, Plus, PlusCircle, StickyNote, Zap } from 'lucide-react';
import { useTreinoStore } from '../../store/treinoStore';
import ExercicioPicker from '../../components/treino/ExercicioPicker';
import { calcularVolumeExercicio, calcularVolumeSessao } from '../../types/treino';
import type { TecnicaTreino } from '../../types/treino';
import { TECNICA_LABELS } from '../../types/treino';
import { getExerciseGifUrl } from '../../services/exerciseGifs';

const TECNICA_CORES: Record<TecnicaTreino, string> = {
  normal: 'default',
  superset: '#8B5CF6',
  dropset: '#EF4444',
  restpause: '#F59E0B',
};

export default function SessaoTreino() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessoes, removerExercicio, atualizarSerie, adicionarSerie, removerSerie, atualizarNotas, atualizarTecnica } = useTreinoStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notasAbertas, setNotasAbertas] = useState<Record<string, boolean>>({});
  const [gifExpandido, setGifExpandido] = useState<string | null>(null);

  const sessao = sessoes.find((s) => s.id === id);

  if (!sessao) {
    return (
      <Box sx={{ pt: 2, textAlign: 'center' }}>
        <Typography>Treino não encontrado</Typography>
        <Button onClick={() => navigate('/treino')} sx={{ mt: 2 }}>Voltar</Button>
      </Box>
    );
  }

  const volumeTotal = calcularVolumeSessao(sessao.exercicios);

  return (
    <Box sx={{ pt: 1, pb: 10 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <IconButton onClick={() => navigate('/treino')} sx={{ mr: 1 }}>
          <ArrowLeft />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">{sessao.nome}</Typography>
          {sessao.diaSemana && (
            <Typography variant="body2" color="text.secondary">{sessao.diaSemana}</Typography>
          )}
        </Box>
      </Box>

      {/* Volume total da sessão */}
      {volumeTotal > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, px: 0.5 }}>
          <Chip
            icon={<Zap size={14} />}
            label={`Volume total: ${volumeTotal.toLocaleString('pt-BR')} kg`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${sessao.exercicios.length} exercícios`}
            size="small"
            variant="outlined"
          />
        </Box>
      )}

      {/* Lista de exercícios */}
      {sessao.exercicios.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 6, mb: 4 }}>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            Nenhum exercício adicionado
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Adicione exercícios ao seu treino
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
          {sessao.exercicios.map((exTreino) => {
            const volExercicio = calcularVolumeExercicio(exTreino.series);
            const gifUrl = getExerciseGifUrl(exTreino.exercicio.id, exTreino.exercicio.gifUrl);
            const notaAberta = notasAbertas[exTreino.id] ?? false;
            const gifAberto = gifExpandido === exTreino.id;

            return (
              <Card key={exTreino.id} variant="outlined">
                <CardContent sx={{ pb: '12px !important' }}>
                  {/* Header do exercício */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {/* Mini GIF */}
                    {gifUrl && (
                      <Box
                        onClick={() => setGifExpandido(gifAberto ? null : exTreino.id)}
                        sx={{
                          width: 44, height: 44, borderRadius: '10px', overflow: 'hidden',
                          bgcolor: 'action.hover', mr: 1.5, cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        <img
                          src={gifUrl}
                          alt={exTreino.exercicio.nome}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </Box>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={600} noWrap>
                        {exTreino.exercicio.nome}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                        <Chip
                          label={exTreino.exercicio.grupoMuscular}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                        {volExercicio > 0 && (
                          <Chip
                            label={`${volExercicio.toLocaleString('pt-BR')} kg`}
                            size="small"
                            sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'primary.main', color: '#000', fontWeight: 600 }}
                          />
                        )}
                      </Box>
                    </Box>
                    <IconButton size="small" onClick={() => setNotasAbertas({ ...notasAbertas, [exTreino.id]: !notaAberta })} sx={{ mr: 0.5 }}>
                      <StickyNote size={18} />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => removerExercicio(sessao.id, exTreino.id)}>
                      <Trash2 size={18} />
                    </IconButton>
                  </Box>

                  {/* GIF expandido */}
                  <Collapse in={gifAberto}>
                    {gifUrl && (
                      <Box sx={{ mb: 1.5, borderRadius: 2, overflow: 'hidden', bgcolor: 'action.hover', maxHeight: 240 }}>
                        <img src={gifUrl} alt={exTreino.exercicio.nome} style={{ width: '100%', maxHeight: 240, objectFit: 'contain', display: 'block' }} />
                      </Box>
                    )}
                  </Collapse>

                  {/* Técnica (Superset/Dropset/Rest-Pause) */}
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                    {(Object.entries(TECNICA_LABELS) as [TecnicaTreino, string][]).map(([key, label]) => (
                      <Chip
                        key={key}
                        label={label}
                        size="small"
                        onClick={() => atualizarTecnica(sessao.id, exTreino.id, key)}
                        sx={{
                          height: 22, fontSize: '0.7rem',
                          bgcolor: exTreino.tecnica === key && key !== 'normal' ? TECNICA_CORES[key] : undefined,
                          color: exTreino.tecnica === key && key !== 'normal' ? '#fff' : undefined,
                          border: (!exTreino.tecnica && key === 'normal') || exTreino.tecnica === key ? '2px solid' : undefined,
                          borderColor: key === 'normal' ? 'text.secondary' : TECNICA_CORES[key],
                        }}
                        variant={exTreino.tecnica === key ? 'filled' : 'outlined'}
                      />
                    ))}
                  </Box>

                  {/* Notas */}
                  <Collapse in={notaAberta}>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      minRows={2}
                      placeholder="Ex: pegada supinada, focar na descida..."
                      value={exTreino.notas ?? ''}
                      onChange={(e) => atualizarNotas(sessao.id, exTreino.id, e.target.value)}
                      sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Collapse>

                  {/* Header da tabela de séries */}
                  <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5, mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ width: 36 }}>Série</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: 'center' }}>Peso (kg)</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: 'center' }}>Reps</Typography>
                    <Box sx={{ width: 32 }} />
                  </Box>

                  {/* Séries */}
                  {exTreino.series.map((serie, idx) => (
                    <Box
                      key={serie.id}
                      sx={{
                        display: 'flex', alignItems: 'center', px: 0.5, py: 0.5,
                        borderRadius: 1, '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" sx={{ width: 36 }}>{idx + 1}</Typography>
                      <TextField
                        size="small" type="number" placeholder="—"
                        value={serie.peso ?? ''}
                        onChange={(e) => atualizarSerie(sessao.id, exTreino.id, serie.id, { peso: e.target.value ? Number(e.target.value) : undefined })}
                        sx={{ flex: 1, mx: 0.5, '& input': { textAlign: 'center', py: 1, fontSize: '0.9rem' }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        slotProps={{ htmlInput: { min: 0, step: 0.5, inputMode: 'decimal' } }}
                      />
                      <TextField
                        size="small" type="number"
                        value={serie.repeticoes}
                        onChange={(e) => atualizarSerie(sessao.id, exTreino.id, serie.id, { repeticoes: Number(e.target.value) || 0 })}
                        sx={{ flex: 1, mx: 0.5, '& input': { textAlign: 'center', py: 1, fontSize: '0.9rem' }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        slotProps={{ htmlInput: { min: 0, inputMode: 'numeric' } }}
                      />
                      <IconButton size="small" onClick={() => removerSerie(sessao.id, exTreino.id, serie.id)} disabled={exTreino.series.length <= 1} sx={{ width: 32 }}>
                        <MinusCircle size={20} />
                      </IconButton>
                    </Box>
                  ))}

                  {/* Botão adicionar série */}
                  <Button size="small" startIcon={<PlusCircle size={20} />} onClick={() => adicionarSerie(sessao.id, exTreino.id)} sx={{ mt: 0.5 }}>
                    Adicionar série
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Botão adicionar exercício */}
      <Button variant="outlined" fullWidth startIcon={<Plus />} onClick={() => setPickerOpen(true)} sx={{ py: 1.5 }}>
        Adicionar Exercício
      </Button>

      {/* Modal de seleção de exercício */}
      <ExercicioPicker open={pickerOpen} onClose={() => setPickerOpen(false)} sessaoId={sessao.id} />
    </Box>
  );
}
