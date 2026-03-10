import { useState, useMemo } from 'react';
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
  IconButton,
  Slider,
  Button,
  DialogActions,
  InputAdornment,
  Fab,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { X, Plus, Search, Info } from 'lucide-react';
import { buscarExercicios, getGruposMusculares } from '../../services/exercicioApi';
import { useTreinoStore } from '../../store/treinoStore';
import { useExerciciosCustom } from '../../hooks/useExerciciosCustom';
import type { Exercicio } from '../../types/treino';
import ExercicioDetalhe from './ExercicioDetalhe';
import CadastrarExercicio from './CadastrarExercicio';

interface Props {
  open: boolean;
  onClose: () => void;
  sessaoId: string;
}

export default function ExercicioPicker({ open, onClose, sessaoId }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { adicionarExercicio } = useTreinoStore();
  const { exerciciosCustom } = useExerciciosCustom();

  const [step, setStep] = useState<'buscar' | 'configurar'>('buscar');
  const [termo, setTermo] = useState('');
  const [grupoSelecionado, setGrupoSelecionado] = useState<string | undefined>();
  const [selecionado, setSelecionado] = useState<Exercicio | null>(null);
  const [series, setSeries] = useState(3);
  const [reps, setReps] = useState(12);

  const [detalheAberto, setDetalheAberto] = useState(false);
  const [exercicioDetalhe, setExercicioDetalhe] = useState<Exercicio | null>(null);
  const [cadastrarAberto, setCadastrarAberto] = useState(false);

  const grupos = getGruposMusculares(exerciciosCustom);

  const exercicios = useMemo(
    () => buscarExercicios(termo, grupoSelecionado, exerciciosCustom),
    [termo, grupoSelecionado, exerciciosCustom],
  );

  const handleSelect = (ex: Exercicio) => {
    setSelecionado(ex);
    setSeries(3);
    setReps(12);
    setStep('configurar');
  };

  const handleOpenDetalhe = (e: React.MouseEvent, ex: Exercicio) => {
    e.stopPropagation();
    setExercicioDetalhe(ex);
    setDetalheAberto(true);
  };

  const handleConfirm = () => {
    if (!selecionado) return;
    adicionarExercicio(sessaoId, selecionado, series, reps);
    handleReset();
  };

  const handleReset = () => {
    setStep('buscar');
    setTermo('');
    setGrupoSelecionado(undefined);
    setSelecionado(null);
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleReset}
        fullScreen={isMobile}
        maxWidth="xs"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            maxWidth: '500px',
            margin: isMobile ? 0 : 'auto'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1 }}>
          <IconButton onClick={step === 'configurar' ? () => setStep('buscar') : handleReset} sx={{ mr: 1 }}>
            <X />
          </IconButton>
          {step === 'buscar' ? 'Escolher Exercício' : 'Configurar Exercício'}
        </DialogTitle>

        {step === 'buscar' ? (
          <DialogContent sx={{ px: 2, pt: 0, pb: '80px', background: 'transparent' }}>
            {/* Campo de busca */}
            <TextField
              size="small"
              fullWidth
              placeholder="Buscar exercício..."
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search color="gray" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ mb: 1.5 }}
            />

            {/* Filtros por grupo muscular */}
            <Box
              sx={{
                display: 'flex',
                gap: 0.75,
                mb: 2,
                overflowX: 'auto',
                pb: 0.5,
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              <Chip
                label="Todos"
                size="small"
                onClick={() => setGrupoSelecionado(undefined)}
                color={!grupoSelecionado ? 'primary' : 'default'}
                variant={!grupoSelecionado ? 'filled' : 'outlined'}
                sx={{ flexShrink: 0 }}
              />
              {grupos.map((g) => (
                <Chip
                  key={g}
                  label={g}
                  size="small"
                  onClick={() => setGrupoSelecionado(grupoSelecionado === g ? undefined : g)}
                  color={grupoSelecionado === g ? 'primary' : 'default'}
                  variant={grupoSelecionado === g ? 'filled' : 'outlined'}
                  sx={{ flexShrink: 0 }}
                />
              ))}
            </Box>

            {/* Contagem */}
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              {exercicios.length} exercício{exercicios.length !== 1 ? 's' : ''}
              {grupoSelecionado ? ` em ${grupoSelecionado}` : ''}
            </Typography>

            {/* Lista */}
            {exercicios.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography color="text.secondary">Nenhum exercício encontrado</Typography>
              </Box>
            ) : (
              <List sx={{ mx: -2 }} disablePadding>
                {exercicios.map((ex) => (
                  <ListItemButton key={ex.id} onClick={() => handleSelect(ex)} divider>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {ex.nome}
                          {ex.isCustom && (
                            <Chip label="Meu" size="small" variant="outlined" sx={{ height: 16, fontSize: 10 }} />
                          )}
                        </Box>
                      }
                      secondary={ex.grupoMuscular}
                      primaryTypographyProps={{ fontWeight: 500 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => handleOpenDetalhe(e, ex)}
                      sx={{ color: 'text.secondary' }}
                    >
                      <Info fontSize="small" />
                    </IconButton>
                  </ListItemButton>
                ))}
              </List>
            )}

            {/* FAB cadastrar exercício */}
            <Fab
              color="primary"
              size="medium"
              onClick={() => setCadastrarAberto(true)}
              sx={{
                position: 'fixed',
                bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
                right: { xs: 16, sm: 'calc(50% - 234px)' },
                zIndex: 1301,
              }}
            >
              <Plus />
            </Fab>
          </DialogContent>
        ) : (
          <>
            <DialogContent sx={{ px: 3 }}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6">{selecionado?.nome}</Typography>
                <Chip label={selecionado?.grupoMuscular} size="small" variant="outlined" sx={{ mt: 0.5 }} />
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Número de séries: <strong>{series}</strong>
              </Typography>
              <Slider
                value={series}
                onChange={(_, v) => setSeries(v as number)}
                min={1}
                max={10}
                step={1}
                marks
                valueLabelDisplay="auto"
                sx={{ mb: 4 }}
              />

              <Typography variant="subtitle2" gutterBottom>
                Repetições por série: <strong>{reps}</strong>
              </Typography>
              <Slider
                value={reps}
                onChange={(_, v) => setReps(v as number)}
                min={1}
                max={30}
                step={1}
                marks={[
                  { value: 6, label: '6' },
                  { value: 10, label: '10' },
                  { value: 15, label: '15' },
                  { value: 20, label: '20' },
                  { value: 25, label: '25' },
                  { value: 30, label: '30' },
                ]}
                valueLabelDisplay="auto"
              />

              <Box
                sx={{
                  mt: 4,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  textAlign: 'center',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Será adicionado com
                </Typography>
                <Typography variant="h6" color="primary.main">
                  {series} séries × {reps} reps
                </Typography>
              </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 4, gap: 1 }}>
              <Button onClick={() => setStep('buscar')} variant="outlined" fullWidth>
                Voltar
              </Button>
              <Button variant="contained" onClick={handleConfirm} fullWidth>
                Adicionar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Modal de detalhe do exercício */}
      <ExercicioDetalhe
        exercicio={exercicioDetalhe}
        open={detalheAberto}
        onClose={() => setDetalheAberto(false)}
        onSelecionar={(ex) => {
          setDetalheAberto(false);
          handleSelect(ex);
        }}
        modoSelecao
      />

      {/* Modal de cadastrar exercício */}
      <CadastrarExercicio
        open={cadastrarAberto}
        onClose={() => setCadastrarAberto(false)}
      />
    </>
  );
}
