import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, IconButton, Button, Card, CardContent,
  TextField, Chip,
} from '@mui/material';
import { MinusCircle, ArrowLeft, Trash2, Plus, PlusCircle } from 'lucide-react';
import { useTreinoStore } from '../../store/treinoStore';
import ExercicioPicker from '../../components/treino/ExercicioPicker';
import type { TecnicaTreino } from '../../types/treino';
import { TECNICA_LABELS } from '../../types/treino';
const TECNICA_COR = '#FBBF24';

export default function SessaoTreino() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessoes, removerExercicio, atualizarSerie, adicionarSerie, removerSerie, atualizarTecnica } = useTreinoStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const sessao = sessoes.find((s) => s.id === id);

  if (!sessao) {
    return (
      <Box sx={{ pt: 2, textAlign: 'center' }}>
        <Typography>Treino não encontrado</Typography>
        <Button onClick={() => navigate('/treino')} sx={{ mt: 2 }}>Voltar</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 1, pb: 10 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate('/treino')} sx={{ mr: 1, ml: -1 }}>
          <ArrowLeft size={22} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontSize: '1.4rem', lineHeight: 1.2 }}>
            {sessao.nome}
          </Typography>
          {sessao.diaSemana && (
            <Typography variant="caption" color="primary.main" fontWeight={600}>
              {sessao.diaSemana}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Stats bar */}
      {sessao.exercicios.length > 0 && (
        <Box
          sx={{
            display: 'flex', gap: 1, mb: 2.5,
            p: 1.5, borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Exercícios
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {sessao.exercicios.length}
            </Typography>
          </Box>
          <Box sx={{ width: '1px', bgcolor: 'divider' }} />
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Séries
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {sessao.exercicios.reduce((acc, ex) => acc + ex.series.length, 0)}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Exercise list */}
      {sessao.exercicios.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 6, mb: 4, p: 4, borderRadius: 3, border: '1px dashed rgba(255,255,255,0.08)' }}>
          <Typography color="text.secondary" sx={{ mb: 0.5 }} fontWeight={500}>
            Nenhum exercício adicionado
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
            Adicione exercícios ao seu treino
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
          {sessao.exercicios.map((exTreino) => {
            return (
              <Card key={exTreino.id}>
                <CardContent sx={{ pb: '12px !important', px: 2 }}>
                  {/* Exercise header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ fontSize: '0.95rem' }}>
                        {exTreino.exercicio.nome}
                      </Typography>
                      <Chip
                        label={exTreino.exercicio.grupoMuscular}
                        size="small" variant="outlined"
                        sx={{ height: 20, fontSize: '0.6rem', mt: 0.2 }}
                      />
                    </Box>
                    <IconButton size="small" color="error" onClick={() => removerExercicio(sessao.id, exTreino.id)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </Box>

                  {/* Technique chips — all yellow */}
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                    {(Object.entries(TECNICA_LABELS) as [TecnicaTreino, string][]).map(([key, label]) => {
                      const isSelected = exTreino.tecnica === key || (!exTreino.tecnica && key === 'normal');
                      const isActive = isSelected && key !== 'normal';
                      return (
                        <Chip
                          key={key} label={label} size="small"
                          onClick={() => atualizarTecnica(sessao.id, exTreino.id, key)}
                          sx={{
                            height: 22, fontSize: '0.65rem',
                            bgcolor: isActive ? TECNICA_COR : undefined,
                            color: isActive ? '#000' : undefined,
                            fontWeight: isActive ? 700 : undefined,
                            border: isSelected ? `1.5px solid ${key === 'normal' ? 'rgba(255,255,255,0.3)' : TECNICA_COR}` : undefined,
                          }}
                          variant={isSelected ? 'filled' : 'outlined'}
                        />
                      );
                    })}
                  </Box>

                  {/* Series header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5, mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ width: 32, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Série</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peso</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reps</Typography>
                    <Box sx={{ width: 32 }} />
                  </Box>

                  {/* Series rows */}
                  {exTreino.series.map((serie, idx) => (
                    <Box
                      key={serie.id}
                      sx={{
                        display: 'flex', alignItems: 'center', px: 0.5, py: 0.4,
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" sx={{ width: 32, fontWeight: 600, fontSize: '0.85rem' }}>{idx + 1}</Typography>
                      <TextField
                        size="small" type="number" placeholder="—"
                        value={serie.peso ?? ''}
                        onChange={(e) => atualizarSerie(sessao.id, exTreino.id, serie.id, { peso: e.target.value ? Number(e.target.value) : undefined })}
                        sx={{ flex: 1, mx: 0.5, '& input': { textAlign: 'center', py: 0.8, fontSize: '0.85rem' }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        slotProps={{ htmlInput: { min: 0, step: 0.5, inputMode: 'decimal' } }}
                      />
                      <TextField
                        size="small" type="number"
                        value={serie.repeticoes}
                        onChange={(e) => atualizarSerie(sessao.id, exTreino.id, serie.id, { repeticoes: Number(e.target.value) || 0 })}
                        sx={{ flex: 1, mx: 0.5, '& input': { textAlign: 'center', py: 0.8, fontSize: '0.85rem' }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        slotProps={{ htmlInput: { min: 0, inputMode: 'numeric' } }}
                      />
                      <IconButton size="small" onClick={() => removerSerie(sessao.id, exTreino.id, serie.id)} disabled={exTreino.series.length <= 1} sx={{ width: 32 }}>
                        <MinusCircle size={18} />
                      </IconButton>
                    </Box>
                  ))}

                  {/* Add series button */}
                  <Button size="small" startIcon={<PlusCircle size={18} />} onClick={() => adicionarSerie(sessao.id, exTreino.id)} sx={{ mt: 0.5, fontSize: '0.8rem' }}>
                    Adicionar série
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Add exercise button */}
      <Button
        variant="outlined" fullWidth startIcon={<Plus size={20} />}
        onClick={() => setPickerOpen(true)}
        sx={{ py: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)' }}
      >
        Adicionar Exercício
      </Button>

      <ExercicioPicker open={pickerOpen} onClose={() => setPickerOpen(false)} sessaoId={sessao.id} />
    </Box>
  );
}
