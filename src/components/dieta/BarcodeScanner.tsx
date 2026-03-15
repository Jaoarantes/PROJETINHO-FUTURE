import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Button,
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
  onCadastrarManualmente?: (codigo: string) => void;
}

export default function BarcodeScanner({ open, onClose, onAlimentoEncontrado, onCadastrarManualmente }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const activeRef = useRef(false);
  const processandoRef = useRef(false);
  const [status, setStatus] = useState<'scanning' | 'loading' | 'error' | 'not-found'>('scanning');
  const [erro, setErro] = useState('');
  const codigoNaoEncontradoRef = useRef('');

  const pararScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* já parado */ }
      try { scannerRef.current.clear(); } catch { /* ignora */ }
      scannerRef.current = null;
    }
  };

  const iniciarScanner = async () => {
    activeRef.current = true;
    processandoRef.current = false;
    setStatus('scanning');
    setErro('');

    // Pede permissão de câmera explicitamente
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      if (!activeRef.current) return;
      setStatus('error');
      setErro('Permissão de câmera negada. Vá em Configurações > Apps > Valere > Permissões e ative a câmera.');
      return;
    }

    if (!activeRef.current) return;

    // Garante que o elemento está limpo antes de inicializar
    const el = document.getElementById('barcode-reader');
    if (el) el.innerHTML = '';

    const scanner = new Html5Qrcode('barcode-reader');
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 150 }, aspectRatio: 1.0 },
        async (decodedText) => {
          if (processandoRef.current || !activeRef.current) return;
          processandoRef.current = true;
          setStatus('loading');

          try { await scanner.stop(); } catch { /* ignora */ }

          try {
            const alimento = await buscarPorCodigoBarras(decodedText);
            if (!activeRef.current) return;

            if (alimento) {
              onAlimentoEncontrado(alimento);
              onClose();
            } else {
              codigoNaoEncontradoRef.current = decodedText;
              setStatus('not-found');
              setErro(`Produto não encontrado para o código: ${decodedText}`);
            }
          } catch {
            if (!activeRef.current) return;
            setStatus('error');
            setErro('Erro ao buscar produto. Tente novamente.');
          }
        },
        () => { /* falhas de leitura são normais, ignora */ },
      )
      .catch(() => {
        if (!activeRef.current) return;
        setStatus('error');
        setErro('Não foi possível acessar a câmera. Verifique as permissões.');
      });
  };

  const reiniciarScanner = async () => {
    await pararScanner();
    iniciarScanner();
  };

  const handleClose = () => {
    activeRef.current = false;
    pararScanner();
    onClose();
  };

  // Limpa ao fechar
  useEffect(() => {
    if (!open) {
      activeRef.current = false;
      pararScanner();
      setStatus('scanning');
      setErro('');
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={isMobile}
      maxWidth="xs"
      fullWidth
      TransitionProps={{
        unmountOnExit: true,
        // Só inicia a câmera depois que o dialog está 100% visível
        onEntered: iniciarScanner,
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: isMobile ? '100%' : 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 1, pt: isMobile ? 'calc(16px + env(safe-area-inset-top, 0px))' : 2 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            Scanner de Código de Barras
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <X size={22} />
          </IconButton>
        </Box>

        {/* Área do scanner */}
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
            <Box sx={{ mt: 1.5 }}>
              <Alert severity={status === 'not-found' ? 'warning' : 'error'}>
                {erro}
              </Alert>
              <Button fullWidth variant="outlined" sx={{ mt: 1.5 }} onClick={reiniciarScanner}>
                Tentar novamente
              </Button>
              {status === 'not-found' && onCadastrarManualmente && (
                <Button
                  fullWidth
                  variant="contained"
                  sx={{ mt: 1 }}
                  onClick={() => {
                    activeRef.current = false;
                    pararScanner();
                    onClose();
                    onCadastrarManualmente(codigoNaoEncontradoRef.current);
                  }}
                >
                  Cadastrar manualmente
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Dialog>
  );
}
