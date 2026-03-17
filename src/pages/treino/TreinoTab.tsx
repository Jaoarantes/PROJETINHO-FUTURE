import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardActionArea, CardContent,
  IconButton, Fab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Button, Chip, Menu, MenuItem,
  CircularProgress, Tabs, Tab, Collapse, Divider, Drawer,
} from '@mui/material';
import { Trash2, Dumbbell, Pencil, MoreVertical, Plus, ChevronRight, Footprints, Waves, Clock, Calendar, TrendingUp, Zap, Heart, Flame, Play, GripVertical, Gauge } from 'lucide-react';
import { lazy, Suspense } from 'react';
const StravaRouteMap = lazy(() => import('../../components/treino/StravaRouteMap'));
import ConfirmDeleteDialog from '../../components/ConfirmDeleteDialog';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import { useTreinoStore } from '../../store/treinoStore';
import type { TipoSessao, SessaoTreino } from '../../types/treino';
import { TIPO_SESSAO_LABELS, TIPO_SERIE_CORES, calcularDistanciaCorrida, calcularDistanciaNatacao } from '../../types/treino';
import type { TipoSerie } from '../../types/treino';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';

const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

// Formatar m/s para min/km (Pace)
function formatarPace(mps: number): string {
  if (!mps || mps <= 0) return '--:--';
  const minKm = 1000 / (mps * 60);
  const mins = Math.floor(minKm);
  const secs = Math.round((minKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /km`;
}

// Formatar m/s para Pace /100m (Natação)
function formatarPaceNatacao(mps: number): string {
  if (!mps || mps <= 0) return '--:--';
  const segPor100m = 100 / mps;
  const mins = Math.floor(segPor100m / 60);
  const secs = Math.round(segPor100m % 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /100m`;
}

function formatarSegundos(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = Math.round(seg % 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ''}`;
  if (m > 0) return `${m}min${s > 0 ? ` ${s}s` : ''}`;
  return `${s}s`;
}

function formatarDataGrupo(isoString: string): string {
  const data = new Date(isoString);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const mesmodia = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (mesmodia(data, hoje)) return 'Hoje';
  if (mesmodia(data, ontem)) return 'Ontem';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(data);
}

function agruparHistoricoPorData(registros: any[]) {
  const mapa = new Map<string, any[]>();
  const ordemChaves: string[] = [];
  for (const reg of registros) {
    const d = new Date(reg.concluidoEm);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!mapa.has(chave)) { mapa.set(chave, []); ordemChaves.push(chave); }
    mapa.get(chave)!.push(reg);
  }
  return ordemChaves.map((chave) => {
    const regs = mapa.get(chave)!;
    return { chave, label: formatarDataGrupo(regs[0].concluidoEm), registros: regs };
  });
}

const TIPO_ICONS: Record<TipoSessao, typeof Dumbbell> = {
  musculacao: Dumbbell,
  corrida: Footprints,
  natacao: Waves,
};

const TIPO_CORES: Record<TipoSessao, string> = {
  musculacao: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)', // Vermelho
  corrida: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',    // Laranja
  natacao: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',    // Azul
};

const TIPO_PLACEHOLDERS: Record<TipoSessao, string> = {
  musculacao: 'Ex: Treino A — Peito e Tríceps',
  corrida: 'Ex: Corrida matinal',
  natacao: 'Ex: Natação 1km',
};

// Ordena por posição (se existir) senão por dia da semana
function ordenarTreinos(sessoes: SessaoTreino[]): SessaoTreino[] {
  return [...sessoes].sort((a, b) => {
    if (a.posicao !== undefined && b.posicao !== undefined) {
      if (a.posicao !== b.posicao) return a.posicao - b.posicao;
    }
    const ia = a.diaSemana ? diasSemana.indexOf(a.diaSemana) : 99;
    const ib = b.diaSemana ? diasSemana.indexOf(b.diaSemana) : 99;
    return ia - ib;
  });
}

// Agrupa por TipoSessao
function agruparPorTipo(sessoes: SessaoTreino[]): Record<TipoSessao, SessaoTreino[]> {
  const grupos: Record<TipoSessao, SessaoTreino[]> = { musculacao: [], corrida: [], natacao: [] };
  sessoes.forEach((s) => {
    const tipo = s.tipo || 'musculacao';
    if (!grupos[tipo]) grupos[tipo] = [];
    grupos[tipo].push(s);
  });
  return grupos;
}

function getSessaoSubtitle(sessao: SessaoTreino) {
  const tipo = sessao.tipo || 'musculacao';
  if (tipo === 'corrida' && sessao.corrida?.etapas) {
    const dist = calcularDistanciaCorrida(sessao.corrida.etapas);
    const etapas = sessao.corrida.etapas.length;
    return `${dist > 0 ? dist.toFixed(1) + ' km · ' : ''}${etapas} etapa${etapas !== 1 ? 's' : ''}`;
  }
  if (tipo === 'natacao' && sessao.natacao?.etapas) {
    const dist = calcularDistanciaNatacao(sessao.natacao.etapas);
    const etapas = sessao.natacao.etapas.length;
    return `${dist > 0 ? dist + ' m · ' : ''}${etapas} etapa${etapas !== 1 ? 's' : ''}`;
  }
  const count = sessao.exercicios?.length ?? 0;
  return `${count} exercício${count !== 1 ? 's' : ''}`;
}

interface SortableTreinoCardProps {
  sessao: SessaoTreino;
  index: number;
  tipo: TipoSessao;
  isAtivo: boolean;
  onNavigate: (id: string) => void;
  onMenuOpen: (e: React.MouseEvent<HTMLElement>, id: string) => void;
  onIniciar: (id: string) => void;
  isOverlay?: boolean;
  isDragging?: boolean; // Add isDragging prop
}

// Estilo para o overlay de arrastar
const overlayStyle = {
  opacity: 1,
  cursor: 'grabbing',
  zIndex: 2000,
  transform: 'scale(1.02)',
  boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
};

function SortableTreinoCard({ sessao, index, tipo, isAtivo, onNavigate, onMenuOpen, onIniciar, isOverlay, isDragging: propIsDragging }: SortableTreinoCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: dndIsDragging,
  } = useSortable({ id: sessao.id, disabled: isOverlay });

  const isDragging = propIsDragging || dndIsDragging;

  const style = isOverlay ? overlayStyle : {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 0 : 1,
    position: 'relative' as const,
  };

  const Icon = TIPO_ICONS[tipo];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        ...(isAtivo && { borderColor: 'primary.main', borderWidth: 2, borderStyle: 'solid' }),
        ...(isDragging && !isOverlay && { visibility: 'hidden' }),
        ...(isOverlay && { boxShadow: '0 8px 30px rgba(0,0,0,0.2)', transform: 'scale(1.02)' }),
        transition: 'all 0.2s ease',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {/* Drag Handle */}
        <Box
          {...attributes}
          {...listeners}
          sx={{
            p: 1.5,
            pl: 1,
            display: 'flex',
            alignItems: 'center',
            cursor: 'grab',
            touchAction: 'none',
            '&:active': { cursor: 'grabbing' },
            opacity: 0.3,
            '&:hover': { opacity: 0.7 },
          }}
        >
          <GripVertical size={20} />
        </Box>

        <CardActionArea onClick={() => onNavigate(sessao.id)} sx={{ flex: 1 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', py: 1.5, px: 1, pl: 0 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '10px',
              background: TIPO_CORES[tipo],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mr: 1.5, flexShrink: 0,
            }}>
              {tipo === 'musculacao' ? (
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
                  {String.fromCharCode(65 + index)}
                </Typography>
              ) : (
                <Icon size={20} color="#fff" />
              )}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={600} noWrap>{sessao.nome}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {getSessaoSubtitle(sessao)}
                </Typography>
                {sessao.diaSemana && (
                  <>
                    <Typography variant="caption" color="text.secondary">·</Typography>
                    <Typography variant="caption" color="primary.main" fontWeight={600} sx={{ fontSize: '0.7rem' }}>
                      {sessao.diaSemana}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>

            <IconButton size="small" onClick={(e) => onMenuOpen(e, sessao.id)} sx={{ mr: -0.5 }}>
              <MoreVertical size={16} />
            </IconButton>
            <ChevronRight size={16} style={{ opacity: 0.3, marginLeft: 2 }} />
          </CardContent>
        </CardActionArea>
      </Box>

      {/* Começar treino button */}
      {!isAtivo && (
        <Button
          fullWidth
          size="small"
          startIcon={<Play size={16} />}
          onClick={(e) => { e.stopPropagation(); onIniciar(sessao.id); }}
          sx={{
            borderTop: 1,
            borderColor: 'divider',
            borderRadius: 0,
            py: 0.8,
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'primary.main',
            textTransform: 'none',
          }}
        >
          Começar treino
        </Button>
      )}
    </Card>
  );
}

export default function TreinoTab() {
  const navigate = useNavigate();
  const sessoes = useTreinoStore((s) => s.sessoes);
  const historico = useTreinoStore((s) => s.historico);
  const carregando = useTreinoStore((s) => s.carregando);
  const criarSessao = useTreinoStore((s) => s.criarSessao);
  const removerSessao = useTreinoStore((s) => s.removerSessao);
  const renomearSessao = useTreinoStore((s) => s.renomearSessao);
  const reordenarSessoes = useTreinoStore((s) => s.reordenarSessoes);
  const removerRegistro = useTreinoStore((s) => s.removerRegistro);
  const iniciarTreino = useTreinoStore((s) => s.iniciarTreino);
  const treinoAtivo = useTreinoStore((s) => s.treinoAtivo);
  const [tabIndex, setTabIndex] = useState(0);

  // Listen for external tab switch (from ActiveWorkoutBar)
  const handleTabSwitch = useCallback((e: Event) => {
    const idx = (e as CustomEvent).detail;
    setTabIndex(idx);
  }, []);

  useEffect(() => {
    window.addEventListener('switch-treino-tab', handleTabSwitch);
    return () => window.removeEventListener('switch-treino-tab', handleTabSwitch);
  }, [handleTabSwitch]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [nome, setNome] = useState('');
  const [tipoSessao, setTipoSessao] = useState<TipoSessao>('musculacao');
  const [diaSelecionado, setDiaSelecionado] = useState<string | undefined>();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuSessaoId, setMenuSessaoId] = useState('');
  const [expandedReg, setExpandedReg] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const deleteSessao = useConfirmDelete();
  const deleteRegistro = useConfirmDelete();

  // Agrupamento + ordenação
  const sessoesAgrupadas = useMemo(() => {
    const grupos = agruparPorTipo(sessoes);
    return {
      musculacao: ordenarTreinos(grupos.musculacao),
      corrida: ordenarTreinos(grupos.corrida),
      natacao: ordenarTreinos(grupos.natacao),
    };
  }, [sessoes]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null); // Clear activeId when drag ends

    if (over && active.id !== over.id) {
      const activeSessao = sessoes.find(s => s.id === active.id);
      if (!activeSessao) return;

      const tipo = activeSessao.tipo || 'musculacao';
      const currentList = sessoesAgrupadas[tipo];

      const oldIndex = currentList.findIndex((s) => s.id === active.id);
      const newIndex = currentList.findIndex((s) => s.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newList = arrayMove(currentList, oldIndex, newIndex);

      // Mapear de volta para o array global
      const updatedSessoes = sessoes.map((s) => {
        const isTargetType = (s.tipo === tipo || (!s.tipo && tipo === 'musculacao'));
        if (isTargetType) {
          const idx = newList.findIndex((item) => item.id === s.id);
          return { ...s, posicao: idx };
        }
        return s;
      });

      reordenarSessoes(updatedSessoes);
    }
  };

  const activeSessao = useMemo(() => sessoes.find(s => s.id === activeId), [sessoes, activeId]); // Added activeSessao memoization

  const handleCriar = () => {
    if (!nome.trim()) return;
    const newId = criarSessao(nome.trim(), tipoSessao, diaSelecionado);
    setNome('');
    setTipoSessao('musculacao');
    setDiaSelecionado(undefined);
    setDialogOpen(false);

    // Redireciona para escolher exercícios/tipo de treino
    if (newId) {
      navigate(`/treino/${newId}`);
    }
  };

  const handleRenomear = () => {
    if (!nome.trim()) return;
    renomearSessao(editId, nome.trim(), diaSelecionado);
    setNome('');
    setDiaSelecionado(undefined);
    setEditDialogOpen(false);
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, id: string) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuSessaoId(id);
  };

  const handleEditar = () => {
    const sessao = sessoes.find((s) => s.id === menuSessaoId);
    if (sessao) {
      setEditId(sessao.id);
      setNome(sessao.nome);
      setDiaSelecionado(sessao.diaSemana);
      setEditDialogOpen(true);
    }
    setMenuAnchor(null);
  };

  const handleDeletar = () => {
    setMenuAnchor(null);
    deleteSessao.requestDelete(menuSessaoId);
  };

  return (
    <Box sx={{ pt: 2, pb: 10 }}>
      {/* Tabs */}
      <Tabs
        value={tabIndex}
        onChange={(_, v) => setTabIndex(v)}
        variant="fullWidth"
        sx={{
          mb: 2.5,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.9rem' },
          '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
        }}
      >
        <Tab label="Meus Treinos" />
        <Tab label="Histórico" />
      </Tabs>

      {/* ─── ABA MEUS TREINOS ─── */}
      {tabIndex === 0 && (
        <>
          {(() => {
            if (carregando && sessoes.length === 0 && useTreinoStore.getState().uid) {
              return (
                <Box sx={{ textAlign: 'center', mt: 8 }}>
                  <CircularProgress size={32} sx={{ color: 'primary.main' }} />
                </Box>
              );
            }
            if (sessoes.length === 0) {
              return (
                <Box sx={{ textAlign: 'center', mt: 8, p: 4, borderRadius: 1.5, border: 1, borderStyle: 'dashed', borderColor: 'divider' }}>
                  <Dumbbell size={56} style={{ opacity: 0.15, marginBottom: 16 }} />
                  <Typography color="text.secondary" sx={{ mb: 0.5 }} fontWeight={500}>Nenhum treino criado</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>Toque no + para criar seu primeiro treino</Typography>
                </Box>
              );
            }
            return (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {(Object.entries(sessoesAgrupadas) as [TipoSessao, SessaoTreino[]][])
                    .filter(([, list]) => list.length > 0)
                    .map(([tipo, list]) => {
                      const Icon = TIPO_ICONS[tipo];
                      return (
                        <Box key={tipo}>
                          {/* Título da seção (modalidade) */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Icon size={18} />
                            <Typography variant="subtitle1" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                              {TIPO_SESSAO_LABELS[tipo]}
                            </Typography>
                            <Chip label={list.length} size="small" sx={{ height: 20, fontSize: '0.7rem', minWidth: 24 }} />
                          </Box>

                          {/* Cards */}
                          <SortableContext
                            items={list.map((s) => s.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {list.map((sessao, index) => (
                                <SortableTreinoCard
                                  key={sessao.id}
                                  sessao={sessao}
                                  index={index}
                                  tipo={tipo}
                                  isAtivo={treinoAtivo?.sessaoId === sessao.id}
                                  onNavigate={(id) => navigate(`/treino/${id}`)}
                                  onMenuOpen={handleMenuOpen}
                                  onIniciar={iniciarTreino}
                                />
                              ))}
                            </Box>
                          </SortableContext>
                        </Box>
                      );
                    })}
                </Box>
                <DragOverlay>
                  {activeSessao ? (
                    <SortableTreinoCard
                      sessao={activeSessao}
                      index={0}
                      tipo={activeSessao.tipo || 'musculacao'}
                      isAtivo={treinoAtivo?.sessaoId === activeSessao.id}
                      onNavigate={() => { }}
                      onMenuOpen={() => { }}
                      onIniciar={() => { }}
                      isOverlay
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            );
          })()}
        </>
      )}

      {/* ─── ABA HISTÓRICO ─── */}
      {tabIndex === 1 && (
        <>
          {historico.length === 0 ? (
            <Box sx={{ textAlign: 'center', mt: 8, p: 4, borderRadius: 1.5, border: 1, borderStyle: 'dashed', borderColor: 'divider' }}>
              <Clock size={56} style={{ opacity: 0.15, marginBottom: 16 }} />
              <Typography color="text.secondary" sx={{ mb: 0.5 }} fontWeight={500}>Nenhum treino concluído</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
                Conclua um treino para vê-lo aqui
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {agruparHistoricoPorData(historico).map((grupo) => (
                <Box key={grupo.chave}>
                  {/* Date header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Calendar size={15} style={{ opacity: 0.5 }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.82rem', letterSpacing: '0.03em' }}>
                      {grupo.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.6 }}>
                      {grupo.registros.length} {grupo.registros.length === 1 ? 'treino' : 'treinos'}
                    </Typography>
                    <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider', ml: 1 }} />
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {grupo.registros.map((reg) => {
                const tipo = reg.tipo || 'musculacao';
                const Icon = TIPO_ICONS[tipo];
                const data = new Date(reg.concluidoEm);
                const horaStr = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const isExpanded = expandedReg === reg.id;

                return (
                  <Card key={reg.id}>
                    <CardActionArea onClick={() => setExpandedReg(isExpanded ? null : reg.id)}>
                      <CardContent sx={{ display: 'flex', alignItems: 'center', py: 1.5, px: 2 }}>
                        <Box sx={{
                          width: 40, height: 40, borderRadius: '10px',
                          background: TIPO_CORES[tipo],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          mr: 1.5, flexShrink: 0,
                        }}>
                          <Icon size={20} color="#fff" />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" fontWeight={600} noWrap>{reg.nome}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                            <Chip label={TIPO_SESSAO_LABELS[tipo]} size="small" sx={{ height: 16, fontSize: '0.55rem' }} />
                            {reg.duracaoTotalSegundos && (
                              <>
                                <Typography variant="caption" color="text.secondary">·</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  {formatarSegundos(reg.duracaoTotalSegundos)}
                                </Typography>
                              </>
                            )}
                          </Box>
                        </Box>

                        <IconButton
                          size="small" color="error"
                          onClick={(e) => { e.stopPropagation(); deleteRegistro.requestDelete(reg.id); }}
                          sx={{ opacity: 0.5 }}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </CardContent>
                    </CardActionArea>

                    {/* Detalhes expandidos */}
                    <Collapse in={isExpanded}>
                      <Divider />
                      <Box sx={{ px: 2, py: 1.5 }}>
                        {/* Data e Hora completas da sessão */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                          <Calendar size={14} style={{ opacity: 0.5 }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                            {horaStr}
                          </Typography>
                        </Box>

                        {/* Exercícios de musculação */}
                        {tipo === 'musculacao' && reg.exercicios.length > 0 && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {reg.exercicios.map((ex) => (
                              <Box key={ex.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                  <Dumbbell size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
                                  <Typography variant="body2" fontWeight={500} noWrap sx={{ fontSize: '0.82rem', flex: 1 }}>
                                    {ex.exercicio.nome}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', ml: 3 }}>
                                  {ex.series.map((s, idx) => {
                                    const tipoSerie: TipoSerie = (s as { tipo?: TipoSerie }).tipo || 'normal';
                                    const cor = TIPO_SERIE_CORES[tipoSerie];
                                    return (
                                      <Box key={s.id} sx={{
                                        display: 'flex', alignItems: 'center', gap: 0.4,
                                        px: 0.8, py: 0.3, borderRadius: 1,
                                        bgcolor: `${cor}18`,
                                        border: `1px solid ${cor}40`,
                                      }}>
                                        <Box sx={{
                                          width: 16, height: 16, borderRadius: '4px',
                                          bgcolor: cor, color: '#fff',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          fontSize: '0.6rem', fontWeight: 700,
                                        }}>
                                          {idx + 1}
                                        </Box>
                                        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                                          {s.peso ? `${s.peso}kg` : '—'}×{s.repeticoes}
                                        </Typography>
                                      </Box>
                                    );
                                  })}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        )}

                        {tipo === 'musculacao' && reg.exercicios.length === 0 && (
                          <Typography variant="caption" color="text.secondary">Nenhum exercício registrado</Typography>
                        )}

                        {/* Etapas de corrida - PREMIUM VIEW */}
                        {tipo === 'corrida' && (
                          <Box sx={{ mt: 1 }}>
                            {/* Stats Rack similar to Historico.tsx */}
                            <Box sx={{ display: 'flex', gap: 3, mb: 1 }}>
                              {(() => {
                                const distTotal = (reg.corrida?.etapas || []).reduce((acc: number, et: any) => acc + (et.distanciaKm || 0), 0);
                                const paceMedio = (distTotal > 0 && reg.duracaoTotalSegundos)
                                  ? (reg.duracaoTotalSegundos / 60) / distTotal
                                  : 0;

                                return (
                                  <>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Distância</Typography>
                                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                        <Typography variant="h6" fontWeight={800} color="primary.main">{distTotal.toFixed(2)}</Typography>
                                        <Typography variant="caption" fontWeight={700} color="primary.main">km</Typography>
                                      </Box>
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ritmo Médio</Typography>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Gauge size={14} color="#FF6B2C" />
                                        <Typography variant="body2" fontWeight={800}>{formatarPace(1000 / (paceMedio * 60))}</Typography>
                                      </Box>
                                    </Box>
                                    {reg.stravaData && (
                                      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.2, bgcolor: 'rgba(252, 76, 2, 0.1)', borderRadius: 1 }}>
                                        <Typography variant="caption" sx={{ color: '#FC4C02', fontWeight: 900, fontSize: '0.6rem' }}>STRAVA</Typography>
                                      </Box>
                                    )}
                                  </>
                                );
                              })()}
                            </Box>
                          </Box>
                        )}

                        {/* Etapas de natação */}
                        {tipo === 'natacao' && reg.natacao?.etapas && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {reg.natacao.etapas.map((et, i) => (
                              <Typography key={et.id} variant="body2" sx={{ fontSize: '0.82rem' }}>
                                <Waves size={14} style={{ verticalAlign: 'middle', opacity: 0.4, marginRight: 6 }} />
                                Etapa {i + 1}
                                {et.distanciaM ? ` · ${et.distanciaM} m` : ''}
                                {et.duracaoSegundos ? ` · ${formatarSegundos(et.duracaoSegundos)}` : et.duracaoMin ? ` · ${et.duracaoMin} min` : ''}
                                {et.estilo ? ` · ${et.estilo}` : ''}
                              </Typography>
                            ))}
                          </Box>
                        )}

                        {/* Mapa da rota (Strava) */}
                        {reg.stravaData?.summaryPolyline && (
                          <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={20} /></Box>}>
                            <StravaRouteMap polyline={reg.stravaData.summaryPolyline} />
                          </Suspense>
                        )}

                        {/* Dados adicionais do Strava */}
                        {reg.stravaData && (
                          <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1.5, p: 1.5, bgcolor: 'rgba(252, 76, 2, 0.05)', borderRadius: 2, border: '1px solid rgba(252, 76, 2, 0.2)' }}>

                            {/* Corridas/Pedal (Pace e Elevação) */}
                            {tipo === 'corrida' && (
                              <>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Clock size={14} color="#FC4C02" />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem', textTransform: 'uppercase', lineHeight: 1 }}>Pace Médio</Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                                      {formatarPace(reg.stravaData.averageSpeedMps)}
                                    </Typography>
                                  </Box>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Zap size={14} color="#FC4C02" />
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem', textTransform: 'uppercase', lineHeight: 1 }}>Max Pace</Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                                      {formatarPace(reg.stravaData.maxSpeedMps)}
                                    </Typography>
                                  </Box>
                                </Box>

                                {reg.stravaData.elevationGainM > 0 && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <TrendingUp size={14} color="#FC4C02" />
                                    <Box>
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem', textTransform: 'uppercase', lineHeight: 1 }}>Elevação</Typography>
                                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                                        {reg.stravaData.elevationGainM}m
                                      </Typography>
                                    </Box>
                                  </Box>
                                )}
                              </>
                            )}

                            {/* Natação (Ritmo /100m) */}
                            {tipo === 'natacao' && reg.stravaData.averageSpeedMps > 0 && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Clock size={14} color="#FC4C02" />
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem', textTransform: 'uppercase', lineHeight: 1 }}>Ritmo /100m</Typography>
                                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                                    {formatarPaceNatacao(reg.stravaData.averageSpeedMps)}
                                  </Typography>
                                </Box>
                              </Box>
                            )}

                            {/* Genérico: Batimentos e Calorias */}
                            {reg.stravaData.averageHeartrate !== undefined && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Heart size={14} color="#FC4C02" />
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem', textTransform: 'uppercase', lineHeight: 1 }}>FC Média</Typography>
                                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                                    {Math.round(reg.stravaData.averageHeartrate)} bpm
                                  </Typography>
                                </Box>
                              </Box>
                            )}

                            {reg.stravaData.calories !== undefined && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Flame size={14} color="#FC4C02" />
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem', textTransform: 'uppercase', lineHeight: 1 }}>Gasto</Typography>
                                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                                    {reg.stravaData.calories} kcal
                                  </Typography>
                                </Box>
                              </Box>
                            )}

                          </Box>
                        )}

                      </Box>
                    </Collapse>
                  </Card>
                );
              })}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </>
      )}

      {/* Context menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={handleEditar}>
          <Pencil size={18} style={{ marginRight: 10 }} /> Renomear
        </MenuItem>
        <MenuItem onClick={handleDeletar} sx={{ color: 'error.main' }}>
          <Trash2 size={18} style={{ marginRight: 10 }} /> Excluir
        </MenuItem>
      </Menu>

      {/* FAB — only show on "Meus Treinos" tab */}
      {tabIndex === 0 && (
        <Fab
          color="primary"
          onClick={() => setDrawerOpen(true)}
          sx={{
            position: 'fixed',
            bottom: treinoAtivo
              ? 'calc(122px + env(safe-area-inset-bottom, 0px))'
              : 'calc(80px + env(safe-area-inset-bottom, 0px))',
            right: { xs: 20, sm: 'calc(50% - 230px)' },
            zIndex: 999,
            transition: 'bottom 0.3s ease',
          }}
        >
          <Plus />
        </Fab>
      )}

      {/* Create dialog (Nome e Data) */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 1.5 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 28, height: 28, borderRadius: 1.5,
            background: TIPO_CORES[tipoSessao],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {(() => {
              const Icon = TIPO_ICONS[tipoSessao];
              return <Icon size={14} color="#fff" />;
            })()}
          </Box>
          <Typography fontWeight={700}>Novo Treino de {TIPO_SESSAO_LABELS[tipoSessao]}</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus label="Nome do treino"
            placeholder={TIPO_PLACEHOLDERS[tipoSessao]}
            fullWidth value={nome} onChange={(e) => setNome(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Dia da semana (opcional)</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {diasSemana.map((dia) => (
              <Chip
                key={dia} label={dia} size="small"
                onClick={() => setDiaSelecionado(diaSelecionado === dia ? undefined : dia)}
                sx={{
                  ...(diaSelecionado === dia && {
                    bgcolor: '#FF6B2C !important',
                    color: '#fff !important',
                    borderColor: '#FF6B2C !important',
                  }),
                }}
                variant={diaSelecionado === dia ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancelar</Button>
          <Button onClick={handleCriar} variant="contained" disabled={!nome.trim()}>Criar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 1.5 } }}>
        <DialogTitle fontWeight={700}>Editar Treino</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus label="Nome do treino" fullWidth
            value={nome} onChange={(e) => setNome(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Alterar dia da semana</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {diasSemana.map((dia) => (
              <Chip
                key={dia} label={dia} size="small"
                onClick={() => setDiaSelecionado(diaSelecionado === dia ? undefined : dia)}
                sx={{
                  ...(diaSelecionado === dia && {
                    bgcolor: '#FF6B2C !important',
                    color: '#fff !important',
                    borderColor: '#FF6B2C !important',
                  }),
                }}
                variant={diaSelecionado === dia ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit">Cancelar</Button>
          <Button onClick={handleRenomear} variant="contained" disabled={!nome.trim()}>Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Tipo Bottomsheet Drawer */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 3, pb: 5, maxWidth: 500, mx: 'auto' } }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3, textAlign: 'center' }}>
          Qual treino vai adicionar?
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {(Object.entries(TIPO_SESSAO_LABELS) as [TipoSessao, string][]).map(([key, label]) => {
            const Icon = TIPO_ICONS[key];
            return (
              <Button
                key={key}
                variant="outlined"
                color="inherit"
                fullWidth
                startIcon={
                  <Box sx={{
                    width: 36, height: 36, borderRadius: '10px',
                    background: TIPO_CORES[key],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    mr: 1
                  }}>
                    <Icon size={18} color="#fff" />
                  </Box>
                }
                sx={{
                  justifyContent: 'flex-start', py: 1.5, px: 2,
                  borderRadius: 1.5, textTransform: 'none', fontSize: '1.05rem', fontWeight: 600,
                  borderColor: 'divider', color: 'text.primary',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
                onClick={() => {
                  setTipoSessao(key);
                  setDrawerOpen(false);
                  setNome('');
                  setDiaSelecionado(undefined);
                  setTimeout(() => setDialogOpen(true), 250);
                }}
              >
                {label}
                <ChevronRight size={18} style={{ opacity: 0.3, marginLeft: 'auto' }} />
              </Button>
            );
          })}
        </Box>
      </Drawer>

      {/* Confirm delete sessão */}
      <ConfirmDeleteDialog
        open={deleteSessao.open}
        loading={deleteSessao.loading}
        title="Excluir treino?"
        message="Tem certeza que deseja excluir este treino? Esta ação não pode ser desfeita."
        onClose={deleteSessao.cancel}
        onConfirm={() => deleteSessao.confirmDelete(async () => { removerSessao(deleteSessao.payload); })}
      />

      {/* Confirm delete registro */}
      <ConfirmDeleteDialog
        open={deleteRegistro.open}
        loading={deleteRegistro.loading}
        title="Excluir registro?"
        message="Tem certeza que deseja excluir este registro do histórico?"
        onClose={deleteRegistro.cancel}
        onConfirm={() => deleteRegistro.confirmDelete(async () => { removerRegistro(deleteRegistro.payload); })}
      />
    </Box>
  );
}
