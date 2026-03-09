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
} from '@mui/material';
import {
  ArrowBackRounded,
  AddRounded,
  DeleteOutlineRounded,
  AddCircleOutlineRounded,
  RemoveCircleOutlineRounded,
} from '@mui/icons-material';
import { useTreinoStore } from '../../store/treinoStore';
import ExercicioPicker from '../../components/treino/ExercicioPicker';

export default function SessaoTreino() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessoes, removerExercicio, atualizarSerie, adicionarSerie, removerSerie } = useTreinoStore();
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
        <IconButton onClick={() => navigate('/treino')} sx={{ mr: 1 }}>
          <ArrowBackRounded />
        </IconButton>
        <Box>
          <Typography variant="h6">{sessao.nome}</Typography>
          {sessao.diaSemana && (
            <Typography variant="body2" color="text.secondary">{sessao.diaSemana}</Typography>
          )}
        </Box>
      </Box>

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
          {sessao.exercicios.map((exTreino) => (
            <Card key={exTreino.id} variant="outlined">
              <CardContent sx={{ pb: '12px !important' }}>
                {/* Header do exercício */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {exTreino.exercicio.nome}
                    </Typography>
                    <Chip
                      label={exTreino.exercicio.grupoMuscular}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 0.5, height: 22, fontSize: '0.7rem' }}
                    />
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removerExercicio(sessao.id, exTreino.id)}
                  >
                    <DeleteOutlineRounded fontSize="small" />
                  </IconButton>
                </Box>

                {/* Header da tabela de séries */}
                <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5, mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ width: 36 }}>
                    Série
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: 'center' }}>
                    Peso (kg)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: 'center' }}>
                    Reps
                  </Typography>
                  <Box sx={{ width: 32 }} />
                </Box>

                {/* Séries */}
                {exTreino.series.map((serie, idx) => (
                  <Box
                    key={serie.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      px: 0.5,
                      py: 0.5,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ width: 36 }}>
                      {idx + 1}
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      placeholder="—"
                      value={serie.peso ?? ''}
                      onChange={(e) =>
                        atualizarSerie(sessao.id, exTreino.id, serie.id, {
                          peso: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      sx={{ flex: 1, mx: 0.5, '& input': { textAlign: 'center', py: 0.75, fontSize: '0.875rem' } }}
                      slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      value={serie.repeticoes}
                      onChange={(e) =>
                        atualizarSerie(sessao.id, exTreino.id, serie.id, {
                          repeticoes: Number(e.target.value) || 0,
                        })
                      }
                      sx={{ flex: 1, mx: 0.5, '& input': { textAlign: 'center', py: 0.75, fontSize: '0.875rem' } }}
                      slotProps={{ htmlInput: { min: 0 } }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removerSerie(sessao.id, exTreino.id, serie.id)}
                      disabled={exTreino.series.length <= 1}
                      sx={{ width: 32 }}
                    >
                      <RemoveCircleOutlineRounded fontSize="small" />
                    </IconButton>
                  </Box>
                ))}

                {/* Botão adicionar série */}
                <Button
                  size="small"
                  startIcon={<AddCircleOutlineRounded />}
                  onClick={() => adicionarSerie(sessao.id, exTreino.id)}
                  sx={{ mt: 0.5 }}
                >
                  Adicionar série
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Botão adicionar exercício */}
      <Button
        variant="outlined"
        fullWidth
        startIcon={<AddRounded />}
        onClick={() => setPickerOpen(true)}
        sx={{ py: 1.5 }}
      >
        Adicionar Exercício
      </Button>

      {/* Modal de seleção de exercício */}
      <ExercicioPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        sessaoId={sessao.id}
      />
    </Box>
  );
}
