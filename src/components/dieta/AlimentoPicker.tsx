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
  Button,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { X, Search, Plus, Minus, ScanBarcode, Trash2 } from 'lucide-react';
import { alimentosPadrao } from '../../constants/alimentos-padrao';
import { buscarAlimentos } from '../../services/openFoodFacts';
import { carregarAlimentosCustom, salvarAlimentoCustom, deletarAlimentoCustom } from '../../services/dietaService';
import { useDietaStore } from '../../store/dietaStore';
import { useAuthContext } from '../../contexts/AuthContext';
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
  const { user } = useAuthContext();

  const [alimentosCustom, setAlimentosCustom] = useState<Alimento[]>([]);

  useEffect(() => {
    if (open && user?.id) {
      carregarAlimentosCustom(user.id).then(setAlimentosCustom).catch(console.error);
    }
  }, [open, user?.id]);

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

  // Cadastro manual
  const [formOpen, setFormOpen] = useState(false);
  const [formCodigo, setFormCodigo] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formMarca, setFormMarca] = useState('');
  const [formPorcao, setFormPorcao] = useState('100');
  const [formCal, setFormCal] = useState('');
  const [formProt, setFormProt] = useState('');
  const [formCarb, setFormCarb] = useState('');
  const [formGord, setFormGord] = useState('');

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

  const alimentosCustomFiltrados = useMemo(() => {
    if (!busca.trim()) return alimentosCustom;
    const termo = busca.toLowerCase().trim();
    return alimentosCustom.filter((a) => a.nome.toLowerCase().includes(termo) || a.marca?.toLowerCase().includes(termo));
  }, [busca, alimentosCustom]);

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

  const handleCadastrarManualmente = (codigo: string) => {
    setFormCodigo(codigo);
    setFormNome('');
    setFormMarca('');
    setFormPorcao('100');
    setFormCal('');
    setFormProt('');
    setFormCarb('');
    setFormGord('');
    setFormOpen(true);
  };

  const handleSalvarManual = async () => {
    const alimento: Alimento = {
      id: `manual_${formCodigo || Date.now()}`,
      nome: formNome.trim(),
      marca: formMarca.trim() || undefined,
      porcao: parseFloat(formPorcao) || 100,
      unidade: 'g',
      calorias: parseFloat(formCal) || 0,
      proteinas: parseFloat(formProt) || 0,
      carboidratos: parseFloat(formCarb) || 0,
      gorduras: parseFloat(formGord) || 0,
      isCustom: true,
    };
    if (user?.id) {
      await salvarAlimentoCustom(user.id, alimento).catch(console.error);
      setAlimentosCustom((prev) => [...prev.filter((a) => a.id !== alimento.id), alimento].sort((a, b) => a.nome.localeCompare(b.nome)));
    }
    setFormOpen(false);
    setSelecionado(alimento);
    setQuantidade(1);
  };

  const handleDeletarCustom = async (id: string) => {
    if (!user?.id) return;
    await deletarAlimentoCustom(user.id, id).catch(console.error);
    setAlimentosCustom((prev) => prev.filter((a) => a.id !== id));
    if (selecionado?.id === id) setSelecionado(null);
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
          <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 1, pt: isMobile ? 'calc(16px + env(safe-area-inset-top, 0px))' : 2 }}>
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

              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1.5, gap: 2 }}>
                {selecionado.unidade === 'g' ? (
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">Peso (g)</Typography>
                    <TextField
                      size="small"
                      fullWidth
                      type="number"
                      value={Math.round(quantidade * selecionado.porcao)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setQuantidade(val / selecionado.porcao);
                      }}
                      slotProps={{ htmlInput: { min: 0 } }}
                    />
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ mr: 'auto' }}>Quantidade:</Typography>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="block">Porções</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <IconButton
                        size="small"
                        onClick={() => setQuantidade(Math.max(0.25, Math.round((quantidade - 0.25) * 100) / 100))}
                        disabled={quantidade <= 0.25}
                      >
                        <Minus size={18} />
                      </IconButton>
                      <Typography variant="body1" fontWeight={600} sx={{ minWidth: 40, textAlign: 'center' }}>
                        {+(quantidade.toFixed(2))}
                      </Typography>
                      <IconButton size="small" onClick={() => setQuantidade(Math.round((quantidade + 0.25) * 100) / 100)}>
                        <Plus size={18} />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
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
            {/* Seção: Meus Alimentos (aba local) */}
            {aba === 0 && alimentosCustomFiltrados.length > 0 && (
              <>
                <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                    Meus Alimentos
                  </Typography>
                </Box>
                {alimentosCustomFiltrados.map((alimento) => (
                  <ListItemButton
                    key={alimento.id}
                    onClick={() => handleSelecionar(alimento)}
                    selected={selecionado?.id === alimento.id}
                    sx={{ py: 1 }}
                  >
                    <ListItemText
                      primary={alimento.marca ? `${alimento.nome} — ${alimento.marca}` : alimento.nome}
                      secondary={`${alimento.porcao}${alimento.unidade} · ${alimento.calorias} kcal · P${alimento.proteinas}g C${alimento.carboidratos}g G${alimento.gorduras}g`}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <IconButton
                      size="small"
                      edge="end"
                      onClick={(e) => { e.stopPropagation(); handleDeletarCustom(alimento.id); }}
                      sx={{ opacity: 0.4, ml: 0.5 }}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </ListItemButton>
                ))}
                {alimentosLocais.length > 0 && (
                  <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                      Alimentos Comuns
                    </Typography>
                  </Box>
                )}
              </>
            )}

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
            {aba === 0 && alimentosLocais.length === 0 && alimentosCustomFiltrados.length === 0 && (
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
        onCadastrarManualmente={handleCadastrarManualmente}
      />

      {/* Form de cadastro manual */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        fullScreen={isMobile}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4 } }}
      >
        <Box sx={{ p: 2.5, pt: isMobile ? 'calc(20px + env(safe-area-inset-top, 0px))' : 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
              Cadastrar Produto
            </Typography>
            <IconButton size="small" onClick={() => setFormOpen(false)}>
              <X size={20} />
            </IconButton>
          </Box>

          {formCodigo && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Código: {formCodigo}
            </Typography>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              label="Nome do produto *"
              value={formNome}
              onChange={(e) => setFormNome(e.target.value)}
              fullWidth size="small"
            />
            <TextField
              label="Marca (opcional)"
              value={formMarca}
              onChange={(e) => setFormMarca(e.target.value)}
              fullWidth size="small"
            />
            <TextField
              label="Porção (g)"
              value={formPorcao}
              onChange={(e) => setFormPorcao(e.target.value)}
              fullWidth size="small"
              type="number"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Valores por porção:
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <TextField label="Calorias (kcal)" value={formCal} onChange={(e) => setFormCal(e.target.value)} size="small" type="number" />
              <TextField label="Proteínas (g)" value={formProt} onChange={(e) => setFormProt(e.target.value)} size="small" type="number" />
              <TextField label="Carboidratos (g)" value={formCarb} onChange={(e) => setFormCarb(e.target.value)} size="small" type="number" />
              <TextField label="Gorduras (g)" value={formGord} onChange={(e) => setFormGord(e.target.value)} size="small" type="number" />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mt: 2.5 }}>
            <Button variant="outlined" color="inherit" fullWidth onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              fullWidth
              disabled={!formNome.trim()}
              onClick={handleSalvarManual}
            >
              Adicionar
            </Button>
          </Box>
        </Box>
      </Dialog>
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
