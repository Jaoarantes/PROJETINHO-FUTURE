import { useState, lazy, Suspense } from 'react';
import {
  Box, Typography, IconButton, Card, CardContent, Button,
  LinearProgress, Collapse, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, List, ListItemButton, ListItemText,
  Snackbar, Alert,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Coffee,
  UtensilsCrossed, Cookie, Moon, Droplets, Calculator,
  Minus, Pencil, Apple, Dumbbell, Sunset, Copy, Zap,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import ConfirmDeleteDialog from '../../components/ConfirmDeleteDialog';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import { useDietaStore } from '../../store/dietaStore';
const AlimentoPicker = lazy(() => import('../../components/dieta/AlimentoPicker'));
import CalorieRing from '../../components/dieta/CalorieRing';
const MetasWizard = lazy(() => import('../../components/dieta/MetasWizard'));
import {
  calcularMacrosItem, calcularMacrosRefeicao,
  calcularMacrosDia, REFEICAO_LABELS,
} from '../../types/dieta';
import type { TipoRefeicao, Refeicao, MetasDieta, PerfilCorporal } from '../../types/dieta';

const REFEICAO_ICONS: Record<TipoRefeicao, typeof Coffee> = {
  cafe: Coffee,
  almoco: UtensilsCrossed,
  lanche: Cookie,
  jantar: Moon,
  lanche_tarde: Apple,
  pre_treino: Dumbbell,
  ceia: Sunset,
};

const ALL_REFEICOES: TipoRefeicao[] = ['cafe', 'almoco', 'lanche', 'jantar', 'lanche_tarde', 'pre_treino', 'ceia'];

function formatarData(dataStr: string) {
  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diff = Math.round((data.getTime() - hoje.getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === -1) return 'Ontem';
  if (diff === 1) return 'Amanhã';
  return data.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function navegarData(dataStr: string, delta: number) {
  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia + delta);
  return d.toISOString().slice(0, 10);
}

export default function DietaTab() {
  const dataSelecionada = useDietaStore((s) => s.dataSelecionada);
  const setData = useDietaStore((s) => s.setData);
  const getDiarioAtual = useDietaStore((s) => s.getDiarioAtual);
  const diarios = useDietaStore((s) => s.diarios);
  const removerItem = useDietaStore((s) => s.removerItem);
  const adicionarItem = useDietaStore((s) => s.adicionarItem);
  const metas = useDietaStore((s) => s.metas);
  const atualizarMetas = useDietaStore((s) => s.atualizarMetas);
  const adicionarAgua = useDietaStore((s) => s.adicionarAgua);
  const adicionarRefeicao = useDietaStore((s) => s.adicionarRefeicao);
  const removerRefeicao = useDietaStore((s) => s.removerRefeicao);
  const perfil = useDietaStore((s) => s.perfil);
  const atualizarPerfil = useDietaStore((s) => s.atualizarPerfil);
  const carregando = useDietaStore((s) => s.carregando);
  const uid = useDietaStore((s) => s.uid);
  const diario = getDiarioAtual();
  const totais = calcularMacrosDia(diario.refeicoes);

  const corProteina = '#16A34A';
  const corCarbo = '#FF6B2C';
  const corGordura = '#7C3AED';

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTipo, setPickerTipo] = useState<TipoRefeicao>('cafe');
  const [expandido, setExpandido] = useState<TipoRefeicao | null>(null);
  const [metasOpen, setMetasOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [aguaEditOpen, setAguaEditOpen] = useState(false);
  const [addRefeicaoOpen, setAddRefeicaoOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddTipo, setQuickAddTipo] = useState<TipoRefeicao>('cafe');
  const [snackMsg, setSnackMsg] = useState('');

  const abrirPicker = (tipo: TipoRefeicao) => {
    setPickerTipo(tipo);
    setPickerOpen(true);
  };

  const handleWizardSalvar = (novoPerfil: PerfilCorporal, novasMetas: MetasDieta) => {
    atualizarPerfil(novoPerfil);
    atualizarMetas(novasMetas);
  };

  const handleAddRefeicao = (tipo: TipoRefeicao) => {
    adicionarRefeicao(tipo);
    setAddRefeicaoOpen(false);
  };

  // Copy previous day (with confirmation)
  const [confirmarCopiaOpen, setConfirmarCopiaOpen] = useState(false);
  const [snapshotAntesDeCopiar, setSnapshotAntesDeCopiar] = useState<Refeicao[] | null>(null);

  const handleCopiarDiaAnterior = () => {
    const dataAnterior = navegarData(dataSelecionada, -1);
    const diarioAnterior = diarios.find((d) => d.id === dataAnterior);
    if (!diarioAnterior || diarioAnterior.refeicoes.every((r) => r.itens.length === 0)) {
      setSnackMsg('Nenhuma refeição encontrada no dia anterior.');
      return;
    }
    setConfirmarCopiaOpen(true);
  };

  const confirmarCopia = () => {
    setConfirmarCopiaOpen(false);
    const dataAnterior = navegarData(dataSelecionada, -1);
    const diarioAnterior = diarios.find((d) => d.id === dataAnterior);
    if (!diarioAnterior) return;

    // Salvar snapshot para desfazer
    setSnapshotAntesDeCopiar(diario.refeicoes.map((r) => ({ ...r, itens: [...r.itens] })));

    for (const ref of diarioAnterior.refeicoes) {
      if (!diario.refeicoes.some((r) => r.tipo === ref.tipo)) {
        adicionarRefeicao(ref.tipo);
      }
      for (const item of ref.itens) {
        adicionarItem(ref.tipo, { alimento: item.alimento, quantidade: item.quantidade });
      }
    }
    setSnackMsg('Refeições copiadas! Toque em DESFAZER para reverter.');
  };

  const desfazerCopia = () => {
    if (!snapshotAntesDeCopiar) return;
    // Remover todas as refeições atuais e restaurar o snapshot
    for (const ref of diario.refeicoes) {
      for (const item of ref.itens) {
        removerItem(ref.tipo, item.id);
      }
    }
    // Remover refeições extras que foram criadas
    for (const ref of diario.refeicoes) {
      if (!snapshotAntesDeCopiar.some((r) => r.tipo === ref.tipo)) {
        removerRefeicao(ref.tipo);
      }
    }
    // Re-adicionar itens do snapshot
    for (const ref of snapshotAntesDeCopiar) {
      if (!diario.refeicoes.some((r) => r.tipo === ref.tipo)) {
        adicionarRefeicao(ref.tipo);
      }
      for (const item of ref.itens) {
        adicionarItem(ref.tipo, { alimento: item.alimento, quantidade: item.quantidade });
      }
    }
    setSnapshotAntesDeCopiar(null);
    setSnackMsg('Cópia desfeita!');
  };

  const aguaPct = Math.min(((diario.aguaML || 0) / (metas.agua || 2500)) * 100, 100);
  const tiposExistentes = diario.refeicoes.map((r) => r.tipo);
  const refeicoesFaltantes = ALL_REFEICOES.filter((t) => !tiposExistentes.includes(t));

  // Calorie balance
  const metaCaloriasDia = diario.metaCalorias || metas.calorias;
  const restante = Math.max(0, metaCaloriasDia - totais.calorias);
  const overLimit = totais.calorias > metaCaloriasDia;

  return (
    <Box sx={{ pt: 1, pb: 10 }}>
      {carregando && uid && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
          <LinearProgress sx={{ height: 2 }} />
        </Box>
      )}
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" sx={{ fontSize: '1.8rem' }}>REFEIÇÃO</Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={handleCopiarDiaAnterior} sx={{ bgcolor: 'action.hover', border: 1, borderColor: 'divider' }} title="Copiar dia anterior">
            <Copy size={16} />
          </IconButton>
          <IconButton size="small" onClick={() => setWizardOpen(true)} sx={{ bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}>
            <Calculator size={18} />
          </IconButton>
        </Box>
      </Box>

      {/* Date nav */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5, gap: 1 }}>
        <IconButton size="small" onClick={() => setData(navegarData(dataSelecionada, -1))}>
          <ChevronLeft size={20} />
        </IconButton>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{
            minWidth: 120, textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontSize: '0.9rem',
          }}
        >
          {formatarData(dataSelecionada)}
        </Typography>
        <IconButton size="small" onClick={() => setData(navegarData(dataSelecionada, 1))}>
          <ChevronRight size={20} />
        </IconButton>
      </Box>

      {/* Dashboard: Ring + Macros */}
      <Card sx={{ mb: 2, position: 'relative' }}>
        <CardContent sx={{ pb: '12px !important' }}>
          <IconButton
            size="small"
            onClick={() => setMetasOpen(true)}
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            <Pencil size={14} />
          </IconButton>

          <CalorieRing consumido={totais.calorias} meta={metaCaloriasDia} />

          {/* Summary */}
          <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
            <SummaryItem label="Consumido" value={totais.calorias} />
            <SummaryItem label="Meta" value={metaCaloriasDia} />
            <SummaryItem label="Restante" value={restante} highlight={!overLimit} warn={overLimit} />
          </Box>

          {/* Macro bars */}
          <Box sx={{ display: 'flex', gap: 1.5, mt: 2.5 }}>
            <MacroBar label="Proteína" valor={totais.proteinas} meta={metas.proteinas} cor={corProteina} />
            <MacroBar label="Carboidrato" valor={totais.carboidratos} meta={metas.carboidratos} cor={corCarbo} />
            <MacroBar label="Gordura" valor={totais.gorduras} meta={metas.gorduras} cor={corGordura} />
          </Box>
        </CardContent>
      </Card>

      {/* Water Tracker */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: '12px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Droplets size={18} style={{ color: '#3B82F6', marginRight: 8 }} />
            <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>Água</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
              {((diario.aguaML || 0) / 1000).toFixed(1)}L / {((metas.agua || 2500) / 1000).toFixed(1)}L
            </Typography>
            <IconButton size="small" onClick={() => setAguaEditOpen(true)}>
              <Pencil size={14} />
            </IconButton>
          </Box>
          <LinearProgress
            variant="determinate" value={aguaPct}
            sx={{
              height: 8, borderRadius: 4, mb: 1.5,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': { bgcolor: '#3B82F6', borderRadius: 4 },
            }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" onClick={() => adicionarAgua(250)} sx={{ flex: 1, fontSize: '0.7rem' }}>
              +250ml
            </Button>
            <Button size="small" variant="outlined" onClick={() => adicionarAgua(500)} sx={{ flex: 1, fontSize: '0.7rem' }}>
              +500ml
            </Button>
            <Button
              size="small" variant="outlined"
              onClick={() => adicionarAgua(-250)}
              disabled={(diario.aguaML || 0) < 250}
              sx={{ flex: 0.5, fontSize: '0.7rem', minWidth: 0 }}
            >
              <Minus size={14} />
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Meal sections */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {diario.refeicoes.map((refeicao) => (
          <RefeicaoCard
            key={refeicao.tipo}
            refeicao={refeicao}
            expandido={expandido === refeicao.tipo}
            onToggle={() => setExpandido(expandido === refeicao.tipo ? null : refeicao.tipo)}
            onAdicionar={() => abrirPicker(refeicao.tipo)}
            onQuickAdd={() => { setQuickAddTipo(refeicao.tipo); setQuickAddOpen(true); }}
            onRemoverItem={(itemId) => removerItem(refeicao.tipo, itemId)}
            onRemoverRefeicao={() => removerRefeicao(refeicao.tipo)}
            metas={metas}
          />
        ))}
      </Box>

      <Button
        fullWidth variant="outlined" startIcon={<Plus size={18} />}
        onClick={() => {
          if (refeicoesFaltantes.length === 1) handleAddRefeicao(refeicoesFaltantes[0]);
          else setAddRefeicaoOpen(true);
        }}
        disabled={refeicoesFaltantes.length === 0}
        sx={{ mt: 2, borderStyle: 'dashed', py: 1.5, borderColor: 'divider' }}
      >
        Adicionar Refeição
      </Button>

      {/* Daily totals footer */}
      <Card sx={{ mt: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha('#fff', 0.02) : alpha('#000', 0.015) }}>
        <CardContent sx={{ pb: '12px !important' }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.8rem', mb: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Resumo do Dia
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <TotalRow label="Calorias" value={`${totais.calorias}`} unit="kcal" meta={`${metaCaloriasDia}`} color={overLimit ? '#EF4444' : undefined} />
            <TotalRow label="Proteína" value={`${totais.proteinas.toFixed(1)}`} unit="g" meta={`${metas.proteinas}`} color={corProteina} />
            <TotalRow label="Carboidrato" value={`${totais.carboidratos.toFixed(1)}`} unit="g" meta={`${metas.carboidratos}`} color={corCarbo} />
            <TotalRow label="Gordura" value={`${totais.gorduras.toFixed(1)}`} unit="g" meta={`${metas.gorduras}`} color={corGordura} />
          </Box>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={addRefeicaoOpen} onClose={() => setAddRefeicaoOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nova Refeição</DialogTitle>
        <List>
          {refeicoesFaltantes.map((tipo: TipoRefeicao) => {
            const Icon = REFEICAO_ICONS[tipo];
            return (
              <ListItemButton key={tipo} onClick={() => handleAddRefeicao(tipo)}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: '8px',
                  background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5,
                }}>
                  <Icon size={16} color="#000" />
                </Box>
                <ListItemText primary={REFEICAO_LABELS[tipo]} />
              </ListItemButton>
            );
          })}
        </List>
      </Dialog>

      {pickerOpen && (
        <Suspense fallback={null}>
          <AlimentoPicker open={pickerOpen} onClose={() => setPickerOpen(false)} tipoRefeicao={pickerTipo} />
        </Suspense>
      )}
      <MetasDialog open={metasOpen} onClose={() => setMetasOpen(false)} metas={metas} onSalvar={atualizarMetas} />
      <AguaEditDialog open={aguaEditOpen} onClose={() => setAguaEditOpen(false)} meta={metas.agua || 2500} onSalvar={(agua) => atualizarMetas({ ...metas, agua })} />
      <QuickAddDialog
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onAdd={(cal, nome) => {
          adicionarItem(quickAddTipo, {
            alimento: { id: `quick-${Date.now()}`, nome, porcao: 1, unidade: 'unidade', calorias: cal, proteinas: 0, carboidratos: 0, gorduras: 0 },
            quantidade: 1,
          });
          setQuickAddOpen(false);
          setSnackMsg(`${cal} kcal adicionado!`);
        }}
      />
      {wizardOpen && (
        <Suspense fallback={null}>
          <MetasWizard open={wizardOpen} onClose={() => setWizardOpen(false)} perfilInicial={perfil} onSalvar={handleWizardSalvar} />
        </Suspense>
      )}

      {/* Confirmação de cópia */}
      <Dialog open={confirmarCopiaOpen} onClose={() => setConfirmarCopiaOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Copiar dia anterior?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Todas as refeições e alimentos do dia anterior serão adicionados ao dia atual. Você poderá desfazer essa ação.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmarCopiaOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={confirmarCopia}>Copiar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackMsg}
        autoHideDuration={snapshotAntesDeCopiar ? 6000 : 3000}
        onClose={() => { setSnackMsg(''); if (!snackMsg.includes('desfeita')) setSnapshotAntesDeCopiar(null); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSnackMsg('')}
          sx={{ width: '100%' }}
          action={
            snapshotAntesDeCopiar ? (
              <Button color="inherit" size="small" onClick={desfazerCopia} sx={{ fontWeight: 700 }}>
                DESFAZER
              </Button>
            ) : undefined
          }
        >
          {snackMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/* ── Total Row ──────────────────────────── */
function TotalRow({ label, value, unit, meta, color }: { label: string; value: string; unit: string; meta: string; color?: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{label}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.3 }}>
        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.85rem', color: color || 'text.primary' }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>/ {meta} {unit}</Typography>
      </Box>
    </Box>
  );
}

/* ── Summary Item ────────────────────────── */
function SummaryItem({ label, value, highlight, warn }: { label: string; value: number; highlight?: boolean; warn?: boolean }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2} sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={highlight || warn ? 700 : 600}
        color={warn ? 'error.main' : highlight ? 'primary.main' : 'text.primary'}
        sx={{ fontSize: '1rem' }}
      >
        {value}
        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.3, fontSize: '0.6rem' }}>
          kcal
        </Typography>
      </Typography>
    </Box>
  );
}

/* ── Refeição Card ─────────────────────────── */
function RefeicaoCard({
  refeicao, expandido, onToggle, onAdicionar, onQuickAdd, onRemoverItem, onRemoverRefeicao, metas: _metas,
}: {
  refeicao: Refeicao;
  expandido: boolean;
  onToggle: () => void;
  onAdicionar: () => void;
  onQuickAdd: () => void;
  onRemoverItem: (id: string) => void;
  onRemoverRefeicao: () => void;
  metas: MetasDieta;
}) {
  const macros = calcularMacrosRefeicao(refeicao);
  const deleteItem = useConfirmDelete();
  const deleteRefeicao = useConfirmDelete();
  const Icon = REFEICAO_ICONS[refeicao.tipo];

  return (
    <Card>
      <CardContent sx={{ pb: '8px !important', px: 2 }}>
        <Box onClick={onToggle} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mb: expandido ? 1 : 0 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '10px',
            background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5,
          }}>
            <Icon size={18} color="#000" />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
              {REFEICAO_LABELS[refeicao.tipo]}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {macros.calorias} kcal · {refeicao.itens.length} {refeicao.itens.length === 1 ? 'item' : 'itens'}
            </Typography>
          </Box>
          {expandido ? <ChevronUp size={18} style={{ opacity: 0.4 }} /> : <ChevronDown size={18} style={{ opacity: 0.4 }} />}
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteRefeicao.requestDelete(); }} sx={{ ml: 0.5 }}>
            <Trash2 size={14} />
          </IconButton>
        </Box>

        <Collapse in={expandido}>
          {/* Macro summary for this meal */}
          {refeicao.itens.length > 0 && (
            <Box sx={{
              display: 'flex', gap: 2, py: 1, px: 1.5, mb: 1,
              borderRadius: '8px',
              bgcolor: (theme) => theme.palette.mode === 'dark' ? alpha('#fff', 0.02) : alpha('#000', 0.015),
            }}>
              <MiniMacro label="P" value={macros.proteinas} cor="#16A34A" />
              <MiniMacro label="C" value={macros.carboidratos} cor="#FF6B2C" />
              <MiniMacro label="G" value={macros.gorduras} cor="#7C3AED" />
              <Box sx={{ ml: 'auto' }}>
                <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.82rem' }}>{macros.calorias}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', ml: 0.3 }}>kcal</Typography>
              </Box>
            </Box>
          )}

          {refeicao.itens.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1.5, textAlign: 'center' }}>
              Nenhum alimento adicionado
            </Typography>
          ) : (
            refeicao.itens.map((item) => {
              const m = calcularMacrosItem(item);
              return (
                <Box
                  key={item.id}
                  sx={{
                    display: 'flex', alignItems: 'center', py: 0.75,
                    borderBottom: 1, borderColor: 'divider',
                    '&:last-of-type': { borderBottom: 0 },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={500} noWrap sx={{ fontSize: '0.85rem' }}>
                      {item.alimento.nome}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        {item.alimento.unidade === 'g'
                          ? `${Math.round(item.quantidade * item.alimento.porcao)}g`
                          : `${item.quantidade}x ${item.alimento.porcao}${item.alimento.unidade}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>·</Typography>
                      <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.65rem' }}>{m.calorias} kcal</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                        P:{m.proteinas}g C:{m.carboidratos}g G:{m.gorduras}g
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={() => deleteItem.requestDelete(item.id)}>
                    <Trash2 size={14} />
                  </IconButton>
                </Box>
              );
            })
          )}

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button
              size="small"
              fullWidth
              startIcon={<Plus size={14} />}
              onClick={onAdicionar}
              sx={{ py: 1, fontSize: '0.75rem', border: '1px dashed', borderColor: 'divider', flex: 1 }}
            >
              Alimento
            </Button>
            <Button
              size="small"
              startIcon={<Zap size={14} />}
              onClick={onQuickAdd}
              sx={{ py: 1, fontSize: '0.75rem', border: '1px dashed', borderColor: 'divider', minWidth: 'auto', px: 2 }}
            >
              Rápido
            </Button>
          </Box>
        </Collapse>
      </CardContent>

      <ConfirmDeleteDialog
        open={deleteRefeicao.open}
        loading={deleteRefeicao.loading}
        title="Excluir refeição?"
        message="Tem certeza que deseja excluir esta refeição e todos os alimentos?"
        onClose={deleteRefeicao.cancel}
        onConfirm={() => deleteRefeicao.confirmDelete(async () => { onRemoverRefeicao(); })}
      />
      <ConfirmDeleteDialog
        open={deleteItem.open}
        loading={deleteItem.loading}
        title="Excluir alimento?"
        message="Tem certeza que deseja remover este alimento da refeição?"
        onClose={deleteItem.cancel}
        onConfirm={() => deleteItem.confirmDelete(async () => { onRemoverItem(deleteItem.payload); })}
      />
    </Card>
  );
}

/* ── Mini Macro ────────────────────────── */
function MiniMacro({ label, value, cor }: { label: string; value: number; cor: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: cor }} />
      <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem' }}>
        {label}: {value.toFixed(0)}g
      </Typography>
    </Box>
  );
}

/* ── Macro Bar ──────────────────────────── */
function MacroBar({ label, valor, meta, cor }: { label: string; valor: number; meta: number; cor: string }) {
  const pct = Math.min((valor / meta) * 100, 100);
  const over = valor > meta;
  return (
    <Box sx={{ flex: 1, textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2} sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700} sx={{ color: over ? '#EF4444' : 'text.primary' }}>
        {valor.toFixed(0)}g
      </Typography>
      <LinearProgress
        variant="determinate" value={pct}
        sx={{
          height: 4, borderRadius: 3, mt: 0.5,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: over ? '#EF4444' : cor, borderRadius: 3 },
        }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
        / {meta}g
      </Typography>
    </Box>
  );
}

/* ── Quick Add Dialog ──────────────────── */
function QuickAddDialog({
  open, onClose, onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (cal: number, nome: string) => void;
}) {
  const [cal, setCal] = useState('');
  const [nome, setNome] = useState('');

  const handleAdd = () => {
    const c = Number(cal);
    if (c > 0) {
      onAdd(c, nome.trim() || `Adição rápida (${c} kcal)`);
      setCal('');
      setNome('');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth TransitionProps={{ onEnter: () => { setCal(''); setNome(''); } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Zap size={20} color="#FF6B2C" /> Adição Rápida
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
          Adicione calorias rapidamente sem buscar um alimento.
        </Typography>
        <TextField
          label="Calorias (kcal)"
          type="number"
          value={cal}
          onChange={(e) => setCal(e.target.value)}
          size="small"
          autoFocus
          slotProps={{ htmlInput: { min: 1, inputMode: 'numeric' } }}
        />
        <TextField
          label="Descrição (opcional)"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          size="small"
          placeholder="Ex: Lanchinho da tarde"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleAdd} disabled={!cal || Number(cal) <= 0}>Adicionar</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Metas Dialog ──────────────────────── */
function MetasDialog({
  open, onClose, metas, onSalvar,
}: {
  open: boolean;
  onClose: () => void;
  metas: MetasDieta;
  onSalvar: (m: MetasDieta) => void;
}) {
  const [form, setForm] = useState<MetasDieta>(metas);
  const handleOpen = () => setForm(metas);
  const handleSalvar = () => { onSalvar(form); onClose(); };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth TransitionProps={{ onEnter: handleOpen }}>
      <DialogTitle>Editar Metas</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        <TextField label="Calorias (kcal)" type="number" value={form.calorias} onChange={(e) => setForm({ ...form, calorias: Number(e.target.value) || 0 })} size="small" slotProps={{ htmlInput: { min: 0, inputMode: 'numeric' } }} />
        <TextField label="Proteínas (g)" type="number" value={form.proteinas} onChange={(e) => setForm({ ...form, proteinas: Number(e.target.value) || 0 })} size="small" slotProps={{ htmlInput: { min: 0, inputMode: 'numeric' } }} />
        <TextField label="Carboidratos (g)" type="number" value={form.carboidratos} onChange={(e) => setForm({ ...form, carboidratos: Number(e.target.value) || 0 })} size="small" slotProps={{ htmlInput: { min: 0, inputMode: 'numeric' } }} />
        <TextField label="Gorduras (g)" type="number" value={form.gorduras} onChange={(e) => setForm({ ...form, gorduras: Number(e.target.value) || 0 })} size="small" slotProps={{ htmlInput: { min: 0, inputMode: 'numeric' } }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSalvar}>Salvar</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Água Edit Dialog ──────────────────── */
function AguaEditDialog({
  open, onClose, meta, onSalvar,
}: {
  open: boolean;
  onClose: () => void;
  meta: number;
  onSalvar: (ml: number) => void;
}) {
  const [valor, setValor] = useState(meta);
  const handleOpen = () => setValor(meta);
  const handleSalvar = () => { onSalvar(valor); onClose(); };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth TransitionProps={{ onEnter: handleOpen }}>
      <DialogTitle>Meta de Água</DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        <TextField
          label="Meta diária (ml)" type="number" value={valor}
          onChange={(e) => setValor(Number(e.target.value) || 0)}
          size="small" fullWidth
          slotProps={{ htmlInput: { min: 0, step: 250, inputMode: 'numeric' } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSalvar}>Salvar</Button>
      </DialogActions>
    </Dialog>
  );
}
