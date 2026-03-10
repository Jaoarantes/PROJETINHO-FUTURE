import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Dialog,
  Box,
  Typography,
  TextField,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  InputAdornment,
  CircularProgress,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { X, Search, Plus, Minus, ScanBarcode } from 'lucide-react';
import { alimentosPadrao } from '../../constants/alimentos-padrao';
import { buscarAlimentos } from '../../services/openFoodFacts';
import { useDietaStore } from '../../store/dietaStore';
import BarcodeScanner from './BarcodeScanner';
import type { Alimento, TipoRefeicao } from '../../types/dieta';

interface Props {
  open: boolean;
  onClose: () => void;
  tipoRefeicao: TipoRefeicao;
}

const CATEGORIAS = [
  'Todos',
  'Proteínas',
  'Laticínios',
  'Carboidratos',
  'Frutas',
  'Verduras',
  'Gorduras',
  'Bebidas',
  'Diversos',
];

function getCategoria(id: string): string {
  const num = parseInt(id.replace('a', ''), 10);
  if (num <= 10) return 'Proteínas';
  if (num <= 27) return 'Laticínios';
  if (num <= 53) return 'Carboidratos';
  if (num <= 69) return 'Frutas';
  if (num <= 84) return 'Verduras';
  if (num <= 94) return 'Gorduras';
  if (num <= 102) return 'Bebidas';
  return 'Diversos';
}

export default function AlimentoPicker({ open, onClose, tipoRefeicao }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const adicionarItem = useDietaStore((s) => s.adicionarItem);

  const [aba, setAba] = useState(0); // 0 = local, 1 = online
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');
  const [selecionado, setSelecionado] = useState<Alimento | null>(null);
  const [quantidade, setQuantidade] = useState(1);

  // Online search state
  const [resultadosOnline, setResultadosOnline] = useState<Alimento[]>([]);
  const [buscandoOnline, setBuscandoOnline] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Barcode scanner
  const [scannerOpen, setScannerOpen] = useState(false);

  // Debounced online search
  useEffect(() => {
    if (aba !== 1 || !busca.trim()) {
      setResultadosOnline([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setBuscandoOnline(true);
      const results = await buscarAlimentos(busca);
      setResultadosOnline(results);
      setBuscandoOnline(false);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [busca, aba]);

  const alimentosLocais = useMemo(() => {
    let lista = alimentosPadrao;
    if (categoriaAtiva !== 'Todos') {
      lista = lista.filter((a) => getCategoria(a.id) === categoriaAtiva);
    }
    if (busca.trim()) {
      const termo = busca.toLowerCase().trim();
      lista = lista.filter((a) => a.nome.toLowerCase().includes(termo));
    }
    return lista;
  }, [busca, categoriaAtiva]);

  const handleSelecionar = (alimento: Alimento) => {
    setSelecionado(alimento);
    setQuantidade(1);
  };

  const handleAdicionar = () => {
    if (!selecionado) return;
    adicionarItem(tipoRefeicao, { alimento: selecionado, quantidade });
    setSelecionado(null);
    setQuantidade(1);
  };

  const handleBarcodeResult = (alimento: Alimento) => {
    setScannerOpen(false);
    setSelecionado(alimento);
    setQuantidade(1);
  };

  const handleClose = () => {
    setBusca('');
    setCategoriaAtiva('Todos');
    setSelecionado(null);
    setQuantidade(1);
    setAba(0);
    setResultadosOnline([]);
    onClose();
  };

  const listaAtual = aba === 0 ? alimentosLocais : resultadosOnline;

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        fullScreen={isMobile}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { height: isMobile ? '100%' : '80vh' } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 1 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              Adicionar Alimento
            </Typography>
            <IconButton onClick={() => setScannerOpen(true)} size="small" sx={{ mr: 0.5 }}>
              <ScanBarcode size={22} />
            </IconButton>
            <IconButton onClick={handleClose} size="small">
              <X size={22} />
            </IconButton>
          </Box>

          {/* Tabs: Local / Online */}
          <Tabs
            value={aba}
            onChange={(_, v) => setAba(v)}
            variant="fullWidth"
            sx={{ px: 2, minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.8rem' } }}
          >
            <Tab label="Alimentos Comuns" />
            <Tab label="Buscar Online" />
          </Tabs>

          {/* Search */}
          <Box sx={{ px: 2, py: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder={aba === 0 ? 'Buscar alimento...' : 'Buscar produto (ex: Nesfit, Yakult)...'}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} />
                    </InputAdornment>
                  ),
                  endAdornment: buscandoOnline ? (
                    <InputAdornment position="end">
                      <CircularProgress size={18} />
                    </InputAdornment>
                  ) : undefined,
                },
              }}
            />
          </Box>

          {/* Category chips (only for local tab) */}
          {aba === 0 && (
            <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 0.5, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
              {CATEGORIAS.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  size="small"
                  onClick={() => setCategoriaAtiva(cat)}
                  color={categoriaAtiva === cat ? 'primary' : 'default'}
                  variant={categoriaAtiva === cat ? 'filled' : 'outlined'}
                  sx={{ flexShrink: 0 }}
                />
              ))}
            </Box>
          )}

          {/* Selected food detail / quantity */}
          {selecionado && (
            <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {selecionado.nome}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selecionado.porcao}{selecionado.unidade} por porção — {selecionado.calorias} kcal
                {selecionado.marca && ` · ${selecionado.marca}`}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                <Typography variant="body2" sx={{ mr: 'auto' }}>Porções:</Typography>
                <IconButton
                  size="small"
                  onClick={() => setQuantidade(Math.max(0.5, quantidade - 0.5))}
                  disabled={quantidade <= 0.5}
                >
                  <Minus size={18} />
                </IconButton>
                <Typography variant="body1" fontWeight={600} sx={{ minWidth: 32, textAlign: 'center' }}>
                  {quantidade}
                </Typography>
                <IconButton size="small" onClick={() => setQuantidade(quantidade + 0.5)}>
                  <Plus size={18} />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <MacroChip label="Cal" value={Math.round(selecionado.calorias * quantidade)} />
                <MacroChip label="P" value={+(selecionado.proteinas * quantidade).toFixed(1)} />
                <MacroChip label="C" value={+(selecionado.carboidratos * quantidade).toFixed(1)} />
                <MacroChip label="G" value={+(selecionado.gorduras * quantidade).toFixed(1)} />
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                <Chip
                  label="Cancelar"
                  size="small"
                  variant="outlined"
                  onClick={() => setSelecionado(null)}
                  sx={{ flex: 1 }}
                />
                <Chip
                  label="Adicionar"
                  size="small"
                  color="primary"
                  onClick={handleAdicionar}
                  sx={{ flex: 1, fontWeight: 600 }}
                />
              </Box>
            </Box>
          )}

          {/* Food list */}
          <List sx={{ flex: 1, overflow: 'auto', pt: 0 }}>
            {listaAtual.map((alimento) => (
              <ListItemButton
                key={alimento.id}
                onClick={() => handleSelecionar(alimento)}
                selected={selecionado?.id === alimento.id}
                sx={{ py: 1 }}
              >
                <ListItemText
                  primary={
                    alimento.marca
                      ? `${alimento.nome} — ${alimento.marca}`
                      : alimento.nome
                  }
                  secondary={`${alimento.porcao}${alimento.unidade} · ${alimento.calorias} kcal · P${alimento.proteinas}g C${alimento.carboidratos}g G${alimento.gorduras}g`}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItemButton>
            ))}

            {/* Empty states */}
            {aba === 0 && alimentosLocais.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Nenhum alimento encontrado
                </Typography>
              </Box>
            )}
            {aba === 1 && !buscandoOnline && busca.trim() && resultadosOnline.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Nenhum produto encontrado
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tente outro termo ou escaneie o código de barras
                </Typography>
              </Box>
            )}
            {aba === 1 && !busca.trim() && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Digite o nome do produto para buscar
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Busca no banco de dados Open Food Facts
                </Typography>
              </Box>
            )}
          </List>
        </Box>
      </Dialog>

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onAlimentoEncontrado={handleBarcodeResult}
      />
    </>
  );
}

function MacroChip({ label, value }: { label: string; value: number }) {
  return (
    <Box sx={{ flex: 1, textAlign: 'center', bgcolor: 'background.default', borderRadius: 1, py: 0.5 }}>
      <Typography variant="caption" color="text.secondary" display="block" lineHeight={1}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} lineHeight={1.3}>
        {value}
      </Typography>
    </Box>
  );
}
