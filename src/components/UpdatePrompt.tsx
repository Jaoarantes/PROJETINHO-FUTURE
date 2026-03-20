import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  LinearProgress,
} from '@mui/material';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Verifica atualizações a cada 60 segundos
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleClose = () => {
    setShowPrompt(false);
  };

  return (
    <Dialog open={showPrompt} onClose={handleClose}>
      <DialogTitle>Nova atualização disponível</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Uma nova versão do Valere está disponível. Deseja atualizar agora?
        </DialogContentText>
        {needRefresh && <LinearProgress sx={{ mt: 1 }} variant="indeterminate" />}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          Depois
        </Button>
        <Button onClick={handleUpdate} variant="contained" color="primary">
          Atualizar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
