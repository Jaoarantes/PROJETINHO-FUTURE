import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, CircularProgress, Box,
} from '@mui/material';

interface Props {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteDialog({
  open, title = 'Excluir?', message = 'Tem certeza? Esta ação não pode ser desfeita.',
  confirmLabel = 'Excluir', loading = false, onClose, onConfirm,
}: Props) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} PaperProps={{ sx: { borderRadius: '16px' } }}>
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5, px: 6, gap: 2 }}>
          <CircularProgress size={32} sx={{ color: '#FF6B2C' }} />
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            Excluindo...
          </Typography>
        </Box>
      ) : (
        <>
          <DialogTitle sx={{ fontSize: '1.05rem', fontWeight: 700 }}>
            {title}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              {message}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              variant="contained"
              sx={{
                textTransform: 'none', fontWeight: 700,
                bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' },
              }}
            >
              {confirmLabel}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
