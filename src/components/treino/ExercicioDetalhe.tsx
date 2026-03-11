import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Typography, Chip, Box, Button, Divider,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ArrowLeft, Trash2, Dumbbell } from 'lucide-react';
import type { Exercicio } from '../../types/treino';
import { useExercicioCustomStore } from '../../store/exercicioCustomStore';
import { useAuthContext } from '../../contexts/AuthContext';
interface Props {
  exercicio: Exercicio | null;
  open: boolean;
  onClose: () => void;
  onSelecionar?: (ex: Exercicio) => void;
  modoSelecao?: boolean;
}

export default function ExercicioDetalhe({ exercicio, open, onClose, onSelecionar, modoSelecao }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const removerExercicio = useExercicioCustomStore((s) => s.removerExercicio);
  const { user } = useAuthContext();

  if (!exercicio) return null;

  const handleDelete = async () => {
    if (!user) return;
    await removerExercicio(user.uid, exercicio.id);
    onClose();
  };

  const steps = exercicio.descricao
    ? exercicio.descricao.split('\n').filter(Boolean)
    : [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="xs"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          maxWidth: '500px',
          margin: isMobile ? 0 : 'auto',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <IconButton onClick={onClose} sx={{ mr: 0.5 }}>
          <ArrowLeft />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" component="span">
            {exercicio.nome}
          </Typography>
        </Box>
        {exercicio.isCustom && (
          <IconButton onClick={handleDelete} color="error" size="small">
            <Trash2 />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: modoSelecao ? 2 : 4 }}>
        {/* Info chips */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
          <Chip label={exercicio.grupoMuscular} size="small" color="primary" />
          {exercicio.isCustom && (
            <Chip label="Personalizado" size="small" variant="outlined" />
          )}
          {exercicio.equipamento && (
            <Chip label={exercicio.equipamento} size="small" variant="outlined" />
          )}
        </Box>

        {exercicio.musculosSecundarios && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}>
              Músculos Secundários
            </Typography>
            <Typography variant="body2">{exercicio.musculosSecundarios}</Typography>
          </Box>
        )}

        {steps.length > 0 && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
              Execução passo a passo
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {steps.map((step, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      minWidth: 24, height: 24, borderRadius: '50%',
                      bgcolor: 'primary.main', color: '#000',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, flexShrink: 0, mt: 0.1,
                    }}
                  >
                    {i + 1}
                  </Box>
                  <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                    {step.replace(/^\d+\.\s*/, '')}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        )}

        {steps.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Dumbbell size={48} style={{ opacity: 0.12, marginBottom: 8 }} />
            <Typography color="text.secondary" variant="body2">
              Sem descrição cadastrada
            </Typography>
          </Box>
        )}
      </DialogContent>

      {modoSelecao && onSelecionar && (
        <DialogActions sx={{ px: 3, pb: 4 }}>
          <Button variant="contained" fullWidth onClick={() => onSelecionar(exercicio)}>
            Selecionar este exercício
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
