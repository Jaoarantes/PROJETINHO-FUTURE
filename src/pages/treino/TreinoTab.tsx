import { lazy, Suspense, useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardActionArea, CardContent,
  IconButton, Fab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Button, Chip, Menu, MenuItem,
  CircularProgress, Tabs, Tab, Collapse, Divider, Drawer, Snackbar, Alert,
} from '@mui/material';
import { Trash2, Dumbbell, Pencil, Plus, ChevronRight, Footprints, Waves, Clock, Calendar, Flame, Gauge, CircleEllipsis, Share2 } from 'lucide-react';
const StravaRouteMap = lazy(() => import('../../components/treino/StravaRouteMap'));
const ReorderableWorkoutList = lazy(() => import('../../components/treino/ReorderableWorkoutList'));
const ShareWorkoutModal = lazy(() => import('../../components/treino/ShareWorkoutModal'));
import ConfirmDeleteDialog from '../../components/ConfirmDeleteDialog';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import { useTreinoStore } from '../../store/treinoStore';
import { useAuthContext } from '../../contexts/AuthContext';
import type { EtapaCorrida, TipoSessao, SessaoTreino, RegistroTreino } from '../../types/treino';
import { TIPO_SESSAO_LABELS, TIPO_SERIE_CORES } from '../../types/treino';
import { calcularCaloriasTreino } from '../../utils/calorieCalculator';
import type { TipoSerie } from '../../types/treino';
import {
  TIPO_CORES,
  TIPO_PLACEHOLDERS,
  agruparHistoricoPorData,
  agruparPorTipo,
  diasSemana,
  formatarPace,
  formatarSegundos,
  ordenarTreinos,
} from './treinoTabUtils';

const TIPO_ICONS: Record<TipoSessao, typeof Dumbbell> = {
  musculacao: Dumbbell,
  corrida: Footprints,
  natacao: Waves,
  outro: CircleEllipsis,
};

export default function TreinoTab() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const uid = user?.id || '';
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

  const [searchParams, setSearchParams] = useSearchParams();
  const [tabIndex, setTabIndex] = useState(() => searchParams.get('tab') === 'historico' ? 1 : 0);

  // React to URL param changes (e.g. navigating from SessaoTreino after finishing)
  useEffect(() => {
    if (searchParams.get('tab') === 'historico') {
      setTabIndex(1);
      // Clean up the URL param
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
  const [tipoCustom, setTipoCustom] = useState('');
  const [diaSelecionado, setDiaSelecionado] = useState<string | undefined>();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuSessaoId, setMenuSessaoId] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareSessao, setShareSessao] = useState<SessaoTreino | null>(null);
  const [expandedReg, setExpandedReg] = useState<string | null>(null);
  const [historicoLimit, setHistoricoLimit] = useState(7);
  const [editRegOpen, setEditRegOpen] = useState(false);
  const [editRegData, setEditRegData] = useState<RegistroTreino | null>(null);
  const [editRegSaving, setEditRegSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackSeverity, setFeedbackSeverity] = useState<'success' | 'error'>('success');
  const atualizarRegistro = useTreinoStore((s) => s.atualizarRegistro);
  const deleteSessao = useConfirmDelete();
  const deleteRegistro = useConfirmDelete();

  const handleOpenEditReg = (reg: RegistroTreino) => {
    setEditRegData(JSON.parse(JSON.stringify(reg)));
    setEditRegOpen(true);
  };

  const handleSaveEditReg = async () => {
    if (!editRegData) return;
    setEditRegSaving(true);
    try {
      await atualizarRegistro(editRegData);
      setEditRegOpen(false);
      setEditRegData(null);
      setFeedbackSeverity('success');
      setFeedbackMsg('Registro atualizado com sucesso.');
    } catch (err) {
      console.error('Erro ao atualizar registro:', err);
      setFeedbackSeverity('error');
      setFeedbackMsg('Erro ao salvar alterações. Verifique sua conexão e tente novamente.');
    } finally {
      setEditRegSaving(false);
    }
  };

  const handleEditPeso = (exIdx: number, serieIdx: number, valor: string) => {
    if (!editRegData) return;
    const updated = { ...editRegData, exercicios: [...editRegData.exercicios] };
    updated.exercicios[exIdx] = { ...updated.exercicios[exIdx], series: [...updated.exercicios[exIdx].series] };
    updated.exercicios[exIdx].series[serieIdx] = { ...updated.exercicios[exIdx].series[serieIdx], peso: valor === '' ? 0 : Number(valor) };
    setEditRegData(updated);
  };

  const handleEditReps = (exIdx: number, serieIdx: number, valor: string) => {
    if (!editRegData) return;
    const updated = { ...editRegData, exercicios: [...editRegData.exercicios] };
    updated.exercicios[exIdx] = { ...updated.exercicios[exIdx], series: [...updated.exercicios[exIdx].series] };
    updated.exercicios[exIdx].series[serieIdx] = { ...updated.exercicios[exIdx].series[serieIdx], repeticoes: valor === '' ? 0 : Number(valor) };
    setEditRegData(updated);
  };

  // Agrupamento + ordenação
  const sessoesAgrupadas = useMemo(() => {
    const grupos = agruparPorTipo(sessoes);
    return {
      musculacao: ordenarTreinos(grupos.musculacao),
      corrida: ordenarTreinos(grupos.corrida),
      natacao: ordenarTreinos(grupos.natacao),
      outro: ordenarTreinos(grupos.outro),
    };
  }, [sessoes]);

  const handleCriar = () => {
    if (!nome.trim()) return;
    if (tipoSessao === 'outro' && !tipoCustom.trim()) return;
    const newId = criarSessao(nome.trim(), tipoSessao, diaSelecionado, tipoCustom.trim() || undefined);
    setNome('');
    setTipoSessao('musculacao');
    setTipoCustom('');
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

  const handleNavigate = useCallback((id: string) => navigate(`/treino/${id}`), [navigate]);

  const handleMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>, id: string) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuSessaoId(id);
  }, []);

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

  const handleCompartilhar = () => {
    setMenuAnchor(null);
    const sessao = sessoes.find((s) => s.id === menuSessaoId);
    if (sessao) {
      setShareSessao(sessao);
      setShareModalOpen(true);
    }
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
              <Suspense fallback={<Box sx={{ minHeight: 180 }} />}>
                <ReorderableWorkoutList
                  sessoes={sessoes}
                  sessoesAgrupadas={sessoesAgrupadas}
                  treinoAtivoId={treinoAtivo?.sessaoId}
                  onNavigate={handleNavigate}
                  onMenuOpen={handleMenuOpen}
                  onIniciar={iniciarTreino}
                  onReorder={reordenarSessoes}
                />
              </Suspense>
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
              {agruparHistoricoPorData(historico.slice(0, historicoLimit)).map((grupo) => (
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
                                  <Chip label={tipo === 'outro' && reg.tipoCustom ? reg.tipoCustom : TIPO_SESSAO_LABELS[tipo]} size="small" sx={{ height: 16, fontSize: '0.55rem' }} />
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
                              {/* Data e Hora completas e Calorias da sessão */}
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Calendar size={14} style={{ opacity: 0.5 }} />
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                                    {horaStr}
                                  </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Flame size={14} color="#FF6B2C" />
                                  <Typography variant="body2" fontWeight={600} sx={{ color: '#FF6B2C', fontSize: '0.82rem' }}>
                                    {Math.round(Number(reg.calorias) || calcularCaloriasTreino(reg))} kcal
                                  </Typography>
                                </Box>
                              </Box>


                              {/* Exercícios de musculação */}
                              {tipo === 'musculacao' && reg.exercicios.length > 0 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -0.5, mb: -0.5 }}>
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEditReg(reg); }} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                                      <Pencil size={14} />
                                    </IconButton>
                                  </Box>
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
                                      const distTotal = (reg.corrida?.etapas || []).reduce((acc: number, et: EtapaCorrida) => acc + (et.distanciaKm || 0), 0);
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

                              {/* Todos os dados do Strava ficam dentro do botão "Ver mais detalhes" */}

                              {/* Botão ver detalhes completos */}
                              {reg.stravaData && (
                                <Button
                                  variant="outlined"
                                  fullWidth
                                  onClick={(e) => { e.stopPropagation(); navigate(`/atividade/${reg.id}`); }}
                                  sx={{
                                    mt: 1.5,
                                    py: 1,
                                    borderColor: 'rgba(252, 76, 2, 0.4)',
                                    color: '#FC4C02',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    '&:hover': { borderColor: '#FC4C02', bgcolor: 'rgba(252, 76, 2, 0.08)' },
                                  }}
                                >
                                  Ver mais detalhes
                                </Button>
                              )}

                            </Box>
                          </Collapse>
                        </Card>
                      );
                    })}
                  </Box>
                </Box>
              ))}
              {historico.length > historicoLimit && (
                <Button
                  fullWidth
                  onClick={() => setHistoricoLimit(prev => prev + 20)}
                  sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}
                >
                  Carregar mais ({historico.length - historicoLimit} restantes)
                </Button>
              )}
            </Box>
          )}
        </>
      )}

      {/* Context menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={handleEditar}>
          <Pencil size={18} style={{ marginRight: 10 }} /> Renomear
        </MenuItem>
        <MenuItem onClick={handleCompartilhar}>
          <Share2 size={18} style={{ marginRight: 10 }} /> Compartilhar
        </MenuItem>
        <MenuItem onClick={handleDeletar} sx={{ color: 'error.main' }}>
          <Trash2 size={18} style={{ marginRight: 10 }} /> Excluir
        </MenuItem>
      </Menu>

      {/* Modal compartilhar treino */}
      {shareModalOpen && (
        <Suspense fallback={null}>
          <ShareWorkoutModal
            open={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            sessao={shareSessao}
            userId={uid}
          />
        </Suspense>
      )}

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
          <Typography fontWeight={700}>{tipoSessao === 'outro' ? 'Novo Treino Personalizado' : `Novo Treino de ${TIPO_SESSAO_LABELS[tipoSessao]}`}</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {tipoSessao === 'outro' && (
            <TextField
              autoFocus label="Tipo de treino"
              placeholder="Ex: Bicicleta, Cardio, Yoga..."
              fullWidth value={tipoCustom} onChange={(e) => setTipoCustom(e.target.value)}
              sx={{ mb: 2, mt: 1 }}
            />
          )}
          <TextField
            autoFocus={tipoSessao !== 'outro'} label="Nome do treino"
            placeholder={TIPO_PLACEHOLDERS[tipoSessao]}
            fullWidth value={nome} onChange={(e) => setNome(e.target.value)}
            sx={{ mb: 2, ...(tipoSessao !== 'outro' && { mt: 1 }) }}
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
          <Button onClick={handleCriar} variant="contained" disabled={!nome.trim() || (tipoSessao === 'outro' && !tipoCustom.trim())}>Criar</Button>
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
                  setTipoCustom('');
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

      {/* Modal editar cargas do histórico */}
      <Dialog
        open={editRegOpen}
        onClose={() => { setEditRegOpen(false); setEditRegData(null); }}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3, maxHeight: '80vh' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem', pb: 0.5 }}>Editar Cargas</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {editRegData && editRegData.exercicios.map((ex, exIdx) => (
            <Box key={ex.id} sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}>{ex.exercicio.nome}</Typography>
              {ex.series.map((s, sIdx) => (
                <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary', minWidth: 20 }}>S{sIdx + 1}</Typography>
                  <TextField
                    size="small"
                    label="Peso (kg)"
                    type="number"
                    value={s.peso || ''}
                    onChange={(e) => handleEditPeso(exIdx, sIdx, e.target.value)}
                    sx={{ flex: 1 }}
                    inputProps={{ min: 0, step: 0.5, inputMode: 'decimal' }}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>×</Typography>
                  <TextField
                    size="small"
                    label="Reps"
                    type="number"
                    value={s.repeticoes || ''}
                    onChange={(e) => handleEditReps(exIdx, sIdx, e.target.value)}
                    sx={{ flex: 0.7 }}
                    inputProps={{ min: 0, inputMode: 'numeric' }}
                  />
                </Box>
              ))}
              {exIdx < editRegData.exercicios.length - 1 && <Divider sx={{ mt: 1.5 }} />}
            </Box>
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setEditRegOpen(false); setEditRegData(null); }} color="inherit">Cancelar</Button>
          <Button
            onClick={handleSaveEditReg}
            variant="contained"
            disabled={editRegSaving}
            sx={{ fontWeight: 700, bgcolor: '#FF6B00', '&:hover': { bgcolor: '#E65C00' } }}
          >
            {editRegSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!feedbackMsg}
        autoHideDuration={feedbackSeverity === 'error' ? 6000 : 3000}
        onClose={() => setFeedbackMsg('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setFeedbackMsg('')}
          severity={feedbackSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {feedbackMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
