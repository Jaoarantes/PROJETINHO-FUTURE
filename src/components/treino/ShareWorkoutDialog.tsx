import { lazy, Suspense } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Send, Share2, X } from 'lucide-react';
import type { RegistroTreino } from '../../types/treino';

const PhotoUploader = lazy(() => import('../feed/PhotoUploader'));

interface ShareWorkoutDialogProps {
  open: boolean;
  registro: RegistroTreino | null;
  texto: string;
  photos: File[];
  posting: boolean;
  onTextoChange: (texto: string) => void;
  onAddPhotos: (photos: File[]) => void;
  onRemovePhoto: (index: number) => void;
  onSkip: () => void;
  onPost: () => void;
}

export default function ShareWorkoutDialog({
  open,
  registro,
  texto,
  photos,
  posting,
  onTextoChange,
  onAddPhotos,
  onRemovePhoto,
  onSkip,
  onPost,
}: ShareWorkoutDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!posting) onSkip();
      }}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: '24px', mx: 2, p: 0 } }}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(255,107,44,0.15) 0%, rgba(255,107,44,0.05) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5,
          }}>
            <Share2 size={22} color="#FF6B2C" />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.1rem' }}>
              Compartilhar treino?
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Mostre seu progresso para a comunidade
            </Typography>
          </Box>
          <IconButton onClick={onSkip} size="small" disabled={posting}>
            <X size={20} />
          </IconButton>
        </Box>

        {registro && (
          <Box sx={{
            p: 2, mb: 2, borderRadius: '14px',
            background: (theme) => theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${alpha('#FF6B2C', 0.08)} 0%, ${alpha('#FF6B2C', 0.02)} 100%)`
              : `linear-gradient(135deg, ${alpha('#FF6B2C', 0.05)} 0%, ${alpha('#FF6B2C', 0.01)} 100%)`,
            border: '1px solid',
            borderColor: alpha('#FF6B2C', 0.12),
          }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
              {registro.nome}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {registro.duracaoTotalSegundos && (
                <Chip label={`${Math.round(registro.duracaoTotalSegundos / 60)}min`} size="small" sx={{ height: 22, fontSize: '0.7rem' }} />
              )}
              {registro.exercicios.length > 0 && (
                <Chip label={`${registro.exercicios.length} exerc.`} size="small" sx={{ height: 22, fontSize: '0.7rem' }} />
              )}
            </Box>
          </Box>
        )}

        <TextField
          multiline
          minRows={2}
          maxRows={4}
          fullWidth
          placeholder="Conte como foi o treino..."
          value={texto}
          onChange={(e) => onTextoChange(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 300 } }}
          sx={{ mb: 2 }}
        />

        <Box sx={{ mb: 2.5 }}>
          <Suspense fallback={null}>
            <PhotoUploader
              photos={photos}
              onAdd={onAddPhotos}
              onRemove={onRemovePhoto}
            />
          </Suspense>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            fullWidth
            disabled={posting}
            onClick={onSkip}
            sx={{ py: 1.3, borderRadius: '12px' }}
          >
            Pular
          </Button>
          <Button
            variant="contained"
            fullWidth
            disabled={posting}
            onClick={onPost}
            startIcon={posting ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
            sx={{ py: 1.3, borderRadius: '12px' }}
          >
            {posting ? 'Publicando...' : 'Compartilhar'}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
