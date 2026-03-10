import { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  Button,
  LinearProgress,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Coffee,
  UtensilsCrossed,
  Cookie,
  Moon,
  Droplets,
  Calculator,
  Minus,
  Pencil,
  Apple,
  Dumbbell,
  Sunset,
} from 'lucide-react';
import { useDietaStore } from '../../store/dietaStore';
import AlimentoPicker from '../../components/dieta/AlimentoPicker';
import CalorieRing from '../../components/dieta/CalorieRing';
import MetasWizard from '../../components/dieta/MetasWizard';
import {
  calcularMacrosItem,
  calcularMacrosRefeicao,
  calcularMacrosDia,
  REFEICAO_LABELS,
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

// All possible meal types for "Adicionar Refeição"
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
  const {
    dataSelecionada, setData, getDiarioAtual, removerItem,
    metas, atualizarMetas, adicionarAgua, adicionarRefeicao, removerRefeicao,
    perfil, atualizarPerfil,
  } = useDietaStore();
  const diario = getDiarioAtual();
  const totais = calcularMacrosDia(diario.refeicoes);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTipo, setPickerTipo] = useState<TipoRefeicao>('cafe');
  const [expandido, setExpandido] = useState<TipoRefeicao | null>(null);
  const [metasOpen, setMetasOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [aguaEditOpen, setAguaEditOpen] = useState(false);
  const [addRefeicaoOpen, setAddRefeicaoOpen] = useState(false);

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

  const aguaPct = Math.min(((diario.aguaML || 0) / (metas.agua || 2500)) * 100, 100);
  const tiposExistentes = diario.refeicoes.map((r) => r.tipo);
  const refeicoesFaltantes = ALL_REFEICOES.filter((t) => !tiposExistentes.includes(t));

  return (
    <Box sx={{ pt: 1, pb: 10 }}>
      {/* Header + Date nav */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>Dieta</Typography>
        <IconButton size="small" onClick={() => setWizardOpen(true)}>
          <Calculator size={20} />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5, gap: 1 }}>
        <IconButton size="small" onClick={() => setData(navegarData(dataSelecionada, -1))}>
          <ChevronLeft size={22} />
        </IconButton>
        <Typography variant="body1" fontWeight={600} sx={{ minWidth: 120, textAlign: 'center' }}>
          {formatarData(dataSelecionada)}
        </Typography>
        <IconButton size="small" onClick={() => setData(navegarData(dataSelecionada, 1))}>
          <ChevronRight size={22} />
        </IconButton>
      </Box>

      {/* ─── Dashboard: Calorie Ring + Macro bars ─── */}
      <Card variant="outlined" sx={{ mb: 2, position: 'relative' }}>
        <CardContent sx={{ pb: '12px !important' }}>
          {/* Edit pencil top-right */}
          <IconButton
            size="small"
            onClick={() => setMetasOpen(true)}
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            <Pencil size={14} />
          </IconButton>

          <CalorieRing consumido={totais.calorias} meta={metas.calorias} />

          {/* Summary row below ring */}
          <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1.5 }}>
            <SummaryItem label="Consumido" value={totais.calorias} />
            <SummaryItem label="Meta" value={metas.calorias} />
            <SummaryItem label="Restante" value={Math.max(0, metas.calorias - totais.calorias)} highlight />
          </Box>

          {/* Macro bars */}
          <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
            <MacroBar label="Proteína" valor={totais.proteinas} meta={metas.proteinas} cor="#22C55E" />
            <MacroBar label="Carboidrato" valor={totais.carboidratos} meta={metas.carboidratos} cor="#F97316" />
            <MacroBar label="Gordura" valor={totais.gorduras} meta={metas.gorduras} cor="#A855F7" />
          </Box>
        </CardContent>
      </Card>

      {/* ─── Water Tracker ─── */}
      <Card variant="outlined" sx={{ mb: 2 }}>
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
            variant="determinate"
            value={aguaPct}
            sx={{
              height: 8, borderRadius: 4, mb: 1.5,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': { bgcolor: '#3B82F6', borderRadius: 4 },
            }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" onClick={() => adicionarAgua(250)} sx={{ flex: 1, fontSize: '0.75rem' }}>
              +250ml
            </Button>
            <Button size="small" variant="outlined" onClick={() => adicionarAgua(500)} sx={{ flex: 1, fontSize: '0.75rem' }}>
              +500ml
            </Button>
            <Button size="small" variant="outlined" onClick={() => adicionarAgua(-250)} disabled={(diario.aguaML || 0) < 250} sx={{ flex: 0.6, fontSize: '0.75rem', minWidth: 0 }}>
              <Minus size={14} />
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* ─── Meal sections ─── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {diario.refeicoes.map((refeicao) => (
          <RefeicaoCard
            key={refeicao.tipo}
            refeicao={refeicao}
            expandido={expandido === refeicao.tipo}
            onToggle={() => setExpandido(expandido === refeicao.tipo ? null : refeicao.tipo)}
            onAdicionar={() => abrirPicker(refeicao.tipo)}
            onRemoverItem={(itemId) => removerItem(refeicao.tipo, itemId)}
            onRemoverRefeicao={() => removerRefeicao(refeicao.tipo)}
          />
        ))}
      </Box>

      <Button
        fullWidth
        variant="outlined"
        startIcon={<Plus size={18} />}
        onClick={() => {
          if (refeicoesFaltantes.length === 1) {
            handleAddRefeicao(refeicoesFaltantes[0]);
          } else {
            setAddRefeicaoOpen(true);
          }
        }}
        disabled={refeicoesFaltantes.length === 0}
        sx={{ mt: 2, borderStyle: 'dashed', py: 1.5 }}
      >
        Adicionar Refeição
      </Button>

      {/* Dialog: Pick extra meal type */}
      <Dialog open={addRefeicaoOpen} onClose={() => setAddRefeicaoOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nova Refeição</DialogTitle>
        <List>
          {refeicoesFaltantes.map((tipo: TipoRefeicao) => {
            const Icon = REFEICAO_ICONS[tipo];
            return (
              <ListItemButton key={tipo} onClick={() => handleAddRefeicao(tipo)}>
                <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5 }}>
                  <Icon size={16} color="#000" />
                </Box>
                <ListItemText primary={REFEICAO_LABELS[tipo]} />
              </ListItemButton>
            );
          })}
        </List>
      </Dialog>

      {/* AlimentoPicker */}
      <AlimentoPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        tipoRefeicao={pickerTipo}
      />

      {/* Metas dialog (manual — macros) */}
      <MetasDialog
        open={metasOpen}
        onClose={() => setMetasOpen(false)}
        metas={metas}
        onSalvar={atualizarMetas}
      />

      {/* Água goal edit dialog */}
      <AguaEditDialog
        open={aguaEditOpen}
        onClose={() => setAguaEditOpen(false)}
        meta={metas.agua || 2500}
        onSalvar={(agua) => atualizarMetas({ ...metas, agua })}
      />

      {/* Metas Wizard (calculator) */}
      <MetasWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        perfilInicial={perfil}
        onSalvar={handleWizardSalvar}
      />
    </Box>
  );
}

/* ── Summary Item (below ring) ────────────────────────── */
function SummaryItem({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={highlight ? 700 : 600} color={highlight ? 'primary.main' : 'text.primary'}>
        {value} kcal
      </Typography>
    </Box>
  );
}

/* ── Refeição Card ─────────────────────────────────────── */

function RefeicaoCard({
  refeicao,
  expandido,
  onToggle,
  onAdicionar,
  onRemoverItem,
  onRemoverRefeicao,
}: {
  refeicao: Refeicao;
  expandido: boolean;
  onToggle: () => void;
  onAdicionar: () => void;
  onRemoverItem: (id: string) => void;
  onRemoverRefeicao: () => void;
}) {
  const macros = calcularMacrosRefeicao(refeicao);
  const Icon = REFEICAO_ICONS[refeicao.tipo];

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: '8px !important' }}>
        {/* Header */}
        <Box
          onClick={onToggle}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mb: expandido ? 1 : 0 }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 1.5,
            }}
          >
            <Icon size={18} color="#000" />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {REFEICAO_LABELS[refeicao.tipo]}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {macros.calorias} kcal · {refeicao.itens.length} {refeicao.itens.length === 1 ? 'item' : 'itens'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onAdicionar(); }}>
            <Plus size={20} />
          </IconButton>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onRemoverRefeicao(); }} sx={{ ml: -0.5 }}>
            <Trash2 size={16} />
          </IconButton>
        </Box>

        {/* Items */}
        <Collapse in={expandido}>
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
                    display: 'flex',
                    alignItems: 'center',
                    py: 0.75,
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 0 },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={500} noWrap>
                      {item.alimento.nome}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.quantidade}x {item.alimento.porcao}{item.alimento.unidade} · {m.calorias} kcal
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => onRemoverItem(item.id)}>
                    <Trash2 size={16} />
                  </IconButton>
                </Box>
              );
            })
          )}
          {refeicao.itens.length === 0 && (
            <Button size="small" startIcon={<Plus size={16} />} onClick={onAdicionar} sx={{ mt: 0.5 }}>
              Adicionar alimento
            </Button>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
}

/* ── Macro Bar ──────────────────────────────────────────── */

function MacroBar({ label, valor, meta, cor }: { label: string; valor: number; meta: number; cor: string }) {
  const pct = Math.min((valor / meta) * 100, 100);
  return (
    <Box sx={{ flex: 1, textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {valor.toFixed(0)}g
      </Typography>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 5,
          borderRadius: 3,
          mt: 0.5,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: cor, borderRadius: 3 },
        }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
        / {meta}g
      </Typography>
    </Box>
  );
}

/* ── Metas Dialog (Manual — Macros Only) ──────────────── */

function MetasDialog({
  open,
  onClose,
  metas,
  onSalvar,
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

/* ── Água Edit Dialog ──────────────────────────────────── */

function AguaEditDialog({
  open,
  onClose,
  meta,
  onSalvar,
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
          label="Meta diária (ml)"
          type="number"
          value={valor}
          onChange={(e) => setValor(Number(e.target.value) || 0)}
          size="small"
          fullWidth
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
