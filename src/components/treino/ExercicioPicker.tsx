import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  CircularProgress,
  IconButton,
  Slider,
  Button,
  DialogActions,
} from '@mui/material';
import { CloseRounded, SearchRounded } from '@mui/icons-material';
import { buscarExercicios, getGruposMusculares } from '../../services/exercicioApi';
import { useTreinoStore } from '../../store/treinoStore';
import type { Exercicio } from '../../types/treino';

interface Props {
  open: boolean;
  onClose: () => void;
  sessaoId: string;
}

export default function ExercicioPicker({ open, onClose, sessaoId }: Props) {
  const { adicionarExercicio } = useTreinoStore();
  const [step, setStep] = useState<'buscar' | 'configurar'>('buscar');
  const [termo, setTermo] = useState('');
  const [grupoId, setGrupoId] = useState<number | undefined>();
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecionado, setSelecionado] = useState<Exercicio | null>(null);
  const [series, setSeries] = useState(3);
  const [reps, setReps] = useState(12);

  const grupos = getGruposMusculares();

  const buscar = useCallback(async () => {
    setLoading(true);
    try {
      const result = await buscarExercicios(termo || undefined, grupoId);
      setExercicios(result);
    } catch {
      setExercicios([]);
    } finally {
      setLoading(false);
    }
  }, [termo, grupoId]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(buscar, 400);
    return () => clearTimeout(timer);
  }, [open, buscar]);

  const handleSelect = (ex: Exercicio) => {
    setSelecionado(ex);
    setSeries(3);
    setReps(12);
    setStep('configurar');
  };

  const handleConfirm = () => {
    if (!selecionado) return;
    adicionarExercicio(sessaoId, selecionado, series, reps);
    handleReset();
  };

  const handleReset = () => {
    setStep('buscar');
    setTermo('');
    setGrupoId(undefined);
    setSelecionado(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleReset} fullWidth maxWidth="xs" fullScreen>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1 }}>
        <IconButton onClick={handleReset} sx={{ mr: 1 }}>
          <CloseRounded />
        </IconButton>
        {step === 'buscar' ? 'Escolher Exercício' : 'Configurar'}
      </DialogTitle>

      {step === 'buscar' ? (
        <DialogContent sx={{ px: 2, pt: 0 }}>
          {/* Busca */}
          <TextField
            size="small"
            fullWidth
            placeholder="Buscar exercício..."
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <SearchRounded sx={{ mr: 1, color: 'text.secondary' }} />,
              },
            }}
            sx={{ mb: 1.5 }}
          />

          {/* Filtros por grupo muscular */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
            <Chip
              label="Todos"
              size="small"
              onClick={() => setGrupoId(undefined)}
              color={!grupoId ? 'primary' : 'default'}
              variant={!grupoId ? 'filled' : 'outlined'}
            />
            {grupos.map((g) => (
              <Chip
                key={g.id}
                label={g.nome}
                size="small"
                onClick={() => setGrupoId(grupoId === g.id ? undefined : g.id)}
                color={grupoId === g.id ? 'primary' : 'default'}
                variant={grupoId === g.id ? 'filled' : 'outlined'}
              />
            ))}
          </Box>

          {/* Lista de exercícios */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : exercicios.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                {termo ? 'Nenhum exercício encontrado' : 'Busque um exercício ou selecione um grupo muscular'}
              </Typography>
            </Box>
          ) : (
            <List sx={{ mx: -2 }}>
              {exercicios.map((ex) => (
                <ListItemButton key={ex.id} onClick={() => handleSelect(ex)}>
                  <ListItemText
                    primary={ex.nome}
                    secondary={ex.grupoMuscular}
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
      ) : (
        <>
          <DialogContent sx={{ px: 3 }}>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              {selecionado?.nome}
            </Typography>
            <Chip label={selecionado?.grupoMuscular} size="small" variant="outlined" sx={{ mb: 4 }} />

            <Typography variant="subtitle2" gutterBottom>
              Séries: {series}
            </Typography>
            <Slider
              value={series}
              onChange={(_, v) => setSeries(v as number)}
              min={1}
              max={10}
              step={1}
              marks
              valueLabelDisplay="auto"
              sx={{ mb: 3 }}
            />

            <Typography variant="subtitle2" gutterBottom>
              Repetições: {reps}
            </Typography>
            <Slider
              value={reps}
              onChange={(_, v) => setReps(v as number)}
              min={1}
              max={30}
              step={1}
              marks={[
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 15, label: '15' },
                { value: 20, label: '20' },
                { value: 25, label: '25' },
                { value: 30, label: '30' },
              ]}
              valueLabelDisplay="auto"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setStep('buscar')} sx={{ mr: 1 }}>
              Voltar
            </Button>
            <Button variant="contained" onClick={handleConfirm} fullWidth>
              Adicionar ao treino
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
