import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { buscarPorCodigoBarras } from '../../services/openFoodFacts';
import type { Alimento } from '../../types/dieta';

interface Props {
  open: boolean;
  onClose: () => void;
  onAlimentoEncontrado: (alimento: Alimento) => void;
}

export default function BarcodeScanner({ open, onClose, onAlimentoEncontrado }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState<'scanning' | 'loading' | 'error' | 'not-found'>('scanning');
  const [erro, setErro] = useState('');
  const processandoRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setStatus('scanning');
    setErro('');
    processandoRef.current = false;

    const scanner = new Html5Qrcode('barcode-reader');
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 150 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          if (processandoRef.current || !mounted) return;
          processandoRef.current = true;
          setStatus('loading');

          try {
            await scanner.stop();
          } catch { /* ignore */ }

          try {
            const alimento = await buscarPorCodigoBarras(decodedText);
            if (!mounted) return;

            if (alimento) {
              onAlimentoEncontrado(alimento);
              onClose();
            } else {
              setStatus('not-found');
              setErro(`Produto não encontrado para o código: ${decodedText}`);
            }
          } catch {
            if (!mounted) return;
            setStatus('error');
            setErro('Erro ao buscar produto. Tente novamente.');
          }
        },
        () => { /* ignore scan failures */ },
      )
      .catch(() => {
        if (!mounted) return;
        setStatus('error');
        setErro('Não foi possível acessar a câmera. Verifique as permissões.');
      });

    return () => {
      mounted = false;
      scanner.stop().catch(() => {});
      scanner.clear();
    };
  }, [open]);

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={isMobile}
      maxWidth="xs"
      fullWidth
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: isMobile ? '100%' : 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 1 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            Scanner de Código de Barras
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <X size={22} />
          </IconButton>
        </Box>

        {/* Scanner area */}
        <Box sx={{ px: 2, pb: 2 }}>
          <Box
            id="barcode-reader"
            sx={{
              width: '100%',
              borderRadius: 2,
              overflow: 'hidden',
              '& video': { borderRadius: 2 },
              '& #qr-shaded-region': { borderColor: 'primary.main !important' },
            }}
          />

          {status === 'loading' && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mt: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Buscando produto...</Typography>
            </Box>
          )}

          {status === 'scanning' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, textAlign: 'center' }}>
              Aponte a câmera para o código de barras do produto
            </Typography>
          )}

          {(status === 'error' || status === 'not-found') && (
            <Alert severity={status === 'not-found' ? 'warning' : 'error'} sx={{ mt: 1.5 }}>
              {erro}
            </Alert>
          )}
        </Box>
      </Box>
    </Dialog>
  );
}
