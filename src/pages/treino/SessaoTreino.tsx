import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, IconButton, Button, Card, CardContent,
  TextField, Chip, MenuItem as SelectItem, Snackbar, Alert, Menu, MenuItem,
} from '@mui/material';
import { MinusCircle, ArrowLeft, Trash2, Plus, PlusCircle, Footprints, Waves, CheckCircle, Timer } from 'lucide-react';
import { useTreinoStore } from '../../store/treinoStore';
import ExercicioPicker from '../../components/treino/ExercicioPicker';
import TimerDescanso from '../../components/treino/TimerDescanso';
import type { TipoCorridaTreino, EstiloNatacao, TipoSerie } from '../../types/treino';
import {
  TIPO_SESSAO_LABELS, TIPO_CORRIDA_LABELS, ESTILO_NATACAO_LABELS,
  TIPO_SERIE_LABELS, TIPO_SERIE_CORES,
  calcularDistanciaCorrida, calcularDuracaoCorrida,
  calcularDistanciaNatacao, calcularDuracaoNatacao,
} from '../../types/treino';

export default function SessaoTreino() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useTreinoStore();
  const { sessoes, concluirTreino } = store;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const sessao = sessoes.find((s) => s.id === id);

  if (!sessao) {
    return (
      <Box sx={{ pt: 2, textAlign: 'center' }}>
        <Typography>Treino não encontrado</Typography>
        <Button onClick={() => navigate('/treino')} sx={{ mt: 2 }}>Voltar</Button>
      </Box>
    );
  }

  const tipo = sessao.tipo || 'musculacao';

  return (
    <Box sx={{ pt: 1, pb: 10 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate('/treino')} sx={{ mr: 1, ml: -1 }}>
          <ArrowLeft size={22} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontSize: '1.4rem', lineHeight: 1.2 }}>
            {sessao.nome}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
            <Chip label={TIPO_SESSAO_LABELS[tipo]} size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
            {sessao.diaSemana && (
              <Typography variant="caption" color="primary.main" fontWeight={600}>
                {sessao.diaSemana}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* Render based on type */}
      {tipo === 'musculacao' && (
        <MusculacaoView sessao={sessao} store={store} pickerOpen={pickerOpen} setPickerOpen={setPickerOpen} onAbrirTimer={() => setTimerOpen(true)} />
      )}
      {tipo === 'corrida' && <CorridaView sessaoId={sessao.id} corrida={sessao.corrida} store={store} />}
      {tipo === 'natacao' && <NatacaoView sessaoId={sessao.id} natacao={sessao.natacao} store={store} />}

      {/* Botão Concluir Treino */}
      <Button
        variant="contained"
        color="success"
        fullWidth
        startIcon={<CheckCircle size={20} />}
        onClick={() => { concluirTreino(sessao.id); setSnackOpen(true); }}
        sx={{ mt: 3, py: 1.5, fontWeight: 700, fontSize: '0.95rem', borderRadius: 3 }}
      >
        Concluir Treino
      </Button>

      {/* Snackbar de sucesso */}
      <Snackbar open={snackOpen} autoHideDuration={3000} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackOpen(false)} severity="success" variant="filled" sx={{ width: '100%' }}>
          Treino concluído e salvo no histórico! 🌟
        </Alert>
      </Snackbar>

      {/* Timer de descanso (só musculação) */}
      {tipo === 'musculacao' && (
        <TimerDescanso open={timerOpen} onClose={() => setTimerOpen(false)} />
      )}
    </Box>
  );
}

/* ── Musculação View ────────────────── */
function MusculacaoView({ sessao, store, pickerOpen, setPickerOpen, onAbrirTimer }: {
  sessao: ReturnType<typeof useTreinoStore.getState>['sessoes'][0];
  store: ReturnType<typeof useTreinoStore.getState>;
  pickerOpen: boolean;
  setPickerOpen: (v: boolean) => void;
  onAbrirTimer: () => void;
}) {
  const { removerExercicio, atualizarSerie, adicionarSerie, removerSerie } = store;
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTarget, setMenuTarget] = useState<{ sessaoId: string; exId: string; serieId: string } | null>(null);

  const handleSerieClick = (e: React.MouseEvent<HTMLElement>, sessaoId: string, exId: string, serieId: string) => {
    setMenuAnchor(e.currentTarget);
    setMenuTarget({ sessaoId, exId, serieId });
  };

  const handleTipoSelect = (tipo: TipoSerie) => {
    if (menuTarget) {
      atualizarSerie(menuTarget.sessaoId, menuTarget.exId, menuTarget.serieId, { tipo });
    }
    setMenuAnchor(null);
    setMenuTarget(null);
  };

  return (
    <>
      {/* Stats bar */}
      {sessao.exercicios.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2.5, p: 1.5, borderRadius: 2, bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Exercícios</Typography>
            <Typography variant="body2" fontWeight={700}>{sessao.exercicios.length}</Typography>
          </Box>
          <Box sx={{ width: '1px', bgcolor: 'divider' }} />
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Séries</Typography>
            <Typography variant="body2" fontWeight={700}>{sessao.exercicios.reduce((acc, ex) => acc + ex.series.length, 0)}</Typography>
          </Box>
        </Box>
      )}

      {sessao.exercicios.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 6, mb: 4, p: 4, borderRadius: 3, border: 1, borderStyle: 'dashed', borderColor: 'divider' }}>
          <Typography color="text.secondary" sx={{ mb: 0.5 }} fontWeight={500}>Nenhum exercício adicionado</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>Adicione exercícios ao seu treino</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
          {sessao.exercicios.map((exTreino) => (
            <Card key={exTreino.id}>
              <CardContent sx={{ pb: '12px !important', px: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ fontSize: '0.95rem' }}>{exTreino.exercicio.nome}</Typography>
                    <Chip label={exTreino.exercicio.grupoMuscular} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem', mt: 0.2 }} />
                  </Box>
                  <IconButton size="small" color="error" onClick={() => removerExercicio(sessao.id, exTreino.id)}>
                    <Trash2 size={16} />
                  </IconButton>
                </Box>

                {/* Legenda de cores */}
                <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                  {(Object.entries(TIPO_SERIE_LABELS) as [TipoSerie, string][]).map(([key, label]) => (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: TIPO_SERIE_CORES[key] }} />
                      <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.secondary' }}>{label}</Typography>
                    </Box>
                  ))}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5, mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ width: 36, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Série</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KG</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reps</Typography>
                  <Box sx={{ width: 32 }} />
                </Box>

                {exTreino.series.map((serie, idx) => {
                  const tipoSerie = serie.tipo || 'normal';
                  const cor = TIPO_SERIE_CORES[tipoSerie];
                  return (
                    <Box key={serie.id} sx={{
                      display: 'flex', alignItems: 'center', px: 0.5, py: 0.4, borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}>
                      <Box
                        onClick={(e) => handleSerieClick(e, sessao.id, exTreino.id, serie.id)}
                        sx={{
                          width: 28, height: 28, borderRadius: '6px',
                          bgcolor: cor, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                          mr: 0.5,
                          transition: 'transform 0.1s',
                          '&:active': { transform: 'scale(0.9)' },
                        }}
                      >
                        {idx + 1}
                      </Box>
                      <TextField
                        size="small" type="number" placeholder="—"
                        value={serie.peso ?? ''}
                        onChange={(e) => atualizarSerie(sessao.id, exTreino.id, serie.id, { peso: e.target.value ? Number(e.target.value) : undefined })}
                        sx={{ flex: 1, mx: 0.5, '& input': { textAlign: 'center', py: 0.8, fontSize: '0.85rem' }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        slotProps={{ htmlInput: { min: 0, step: 0.5, inputMode: 'decimal' } }}
                      />
                      <TextField
                        size="small" type="number"
                        value={serie.repeticoes}
                        onChange={(e) => atualizarSerie(sessao.id, exTreino.id, serie.id, { repeticoes: Number(e.target.value) || 0 })}
                        sx={{ flex: 1, mx: 0.5, '& input': { textAlign: 'center', py: 0.8, fontSize: '0.85rem' }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        slotProps={{ htmlInput: { min: 0, inputMode: 'numeric' } }}
                      />
                      <IconButton size="small" onClick={() => removerSerie(sessao.id, exTreino.id, serie.id)} disabled={exTreino.series.length <= 1} sx={{ width: 32 }}>
                        <MinusCircle size={18} />
                      </IconButton>
                    </Box>
                  );
                })}

                <Button size="small" startIcon={<PlusCircle size={18} />} onClick={() => adicionarSerie(sessao.id, exTreino.id)} sx={{ mt: 0.5, fontSize: '0.8rem' }}>
                  Adicionar série
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Menu de tipo de série */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => { setMenuAnchor(null); setMenuTarget(null); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {(Object.entries(TIPO_SERIE_LABELS) as [TipoSerie, string][]).map(([key, label]) => (
          <MenuItem key={key} onClick={() => handleTipoSelect(key)} sx={{ gap: 1, fontSize: '0.85rem' }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: TIPO_SERIE_CORES[key] }} />
            {label}
          </MenuItem>
        ))}
      </Menu>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined" fullWidth startIcon={<Plus size={20} />}
          onClick={() => setPickerOpen(true)}
          sx={{ py: 1.5, borderStyle: 'dashed', borderColor: 'divider', flex: 1 }}
        >
          Adicionar Exercício
        </Button>
        <Button
          variant="outlined"
          onClick={onAbrirTimer}
          startIcon={<Timer size={20} />}
          sx={{ py: 1.5, borderStyle: 'dashed', borderColor: 'divider', px: 2, whiteSpace: 'nowrap' }}
        >
          Descanso
        </Button>
      </Box>

      <ExercicioPicker open={pickerOpen} onClose={() => setPickerOpen(false)} sessaoId={sessao.id} />
    </>
  );
}

/* ── Corrida View ────────────────── */
function CorridaView({ sessaoId, corrida, store }: {
  sessaoId: string;
  corrida: ReturnType<typeof useTreinoStore.getState>['sessoes'][0]['corrida'];
  store: ReturnType<typeof useTreinoStore.getState>;
}) {
  const { adicionarEtapaCorrida, removerEtapaCorrida, atualizarEtapaCorrida } = store;
  const etapas = corrida?.etapas ?? [];
  const distTotal = calcularDistanciaCorrida(etapas);
  const durTotal = calcularDuracaoCorrida(etapas);

  return (
    <>
      {/* Stats */}
      {etapas.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2.5, p: 1.5, borderRadius: 2, bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Distância</Typography>
            <Typography variant="body2" fontWeight={700}>{distTotal > 0 ? `${distTotal.toFixed(1)} km` : '—'}</Typography>
          </Box>
          <Box sx={{ width: '1px', bgcolor: 'divider' }} />
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Duração</Typography>
            <Typography variant="body2" fontWeight={700}>{durTotal > 0 ? `${durTotal} min` : '—'}</Typography>
          </Box>
          <Box sx={{ width: '1px', bgcolor: 'divider' }} />
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Etapas</Typography>
            <Typography variant="body2" fontWeight={700}>{etapas.length}</Typography>
          </Box>
        </Box>
      )}

      {/* Etapas */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
        {etapas.map((etapa, idx) => (
          <Card key={etapa.id}>
            <CardContent sx={{ pb: '12px !important', px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: '8px',
                  background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5,
                }}>
                  <Footprints size={16} color="#000" />
                </Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>Etapa {idx + 1}</Typography>
                <IconButton size="small" color="error" onClick={() => removerEtapaCorrida(sessaoId, etapa.id)} disabled={etapas.length <= 1}>
                  <Trash2 size={14} />
                </IconButton>
              </Box>

              {/* Tipo */}
              <TextField
                select size="small" fullWidth label="Intensidade"
                value={etapa.tipo || 'moderado'}
                onChange={(e) => atualizarEtapaCorrida(sessaoId, etapa.id, { tipo: e.target.value as TipoCorridaTreino })}
                sx={{ mb: 1.5 }}
              >
                {(Object.entries(TIPO_CORRIDA_LABELS) as [TipoCorridaTreino, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </TextField>

              {/* Distância + Duração */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small" type="number" label="Distância (km)" fullWidth
                  value={etapa.distanciaKm ?? ''}
                  onChange={(e) => atualizarEtapaCorrida(sessaoId, etapa.id, { distanciaKm: e.target.value ? Number(e.target.value) : undefined })}
                  slotProps={{ htmlInput: { min: 0, step: 0.1, inputMode: 'decimal' } }}
                />
                <TextField
                  size="small" type="number" label="Duração (min)" fullWidth
                  value={etapa.duracaoMin ?? ''}
                  onChange={(e) => atualizarEtapaCorrida(sessaoId, etapa.id, { duracaoMin: e.target.value ? Number(e.target.value) : undefined })}
                  slotProps={{ htmlInput: { min: 0, inputMode: 'numeric' } }}
                />
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Button
        variant="outlined" fullWidth startIcon={<Plus size={20} />}
        onClick={() => adicionarEtapaCorrida(sessaoId)}
        sx={{ py: 1.5, borderStyle: 'dashed', borderColor: 'divider' }}
      >
        Adicionar Etapa
      </Button>
    </>
  );
}

/* ── Natação View ────────────────── */
function NatacaoView({ sessaoId, natacao, store }: {
  sessaoId: string;
  natacao: ReturnType<typeof useTreinoStore.getState>['sessoes'][0]['natacao'];
  store: ReturnType<typeof useTreinoStore.getState>;
}) {
  const { adicionarEtapaNatacao, removerEtapaNatacao, atualizarEtapaNatacao } = store;
  const etapas = natacao?.etapas ?? [];
  const distTotal = calcularDistanciaNatacao(etapas);
  const durTotal = calcularDuracaoNatacao(etapas);

  return (
    <>
      {/* Stats */}
      {etapas.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2.5, p: 1.5, borderRadius: 2, bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Distância</Typography>
            <Typography variant="body2" fontWeight={700}>{distTotal > 0 ? `${distTotal} m` : '—'}</Typography>
          </Box>
          <Box sx={{ width: '1px', bgcolor: 'divider' }} />
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Duração</Typography>
            <Typography variant="body2" fontWeight={700}>{durTotal > 0 ? `${durTotal} min` : '—'}</Typography>
          </Box>
          <Box sx={{ width: '1px', bgcolor: 'divider' }} />
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Etapas</Typography>
            <Typography variant="body2" fontWeight={700}>{etapas.length}</Typography>
          </Box>
        </Box>
      )}

      {/* Etapas */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
        {etapas.map((etapa, idx) => (
          <Card key={etapa.id}>
            <CardContent sx={{ pb: '12px !important', px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: '8px',
                  background: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5,
                }}>
                  <Waves size={16} color="#000" />
                </Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>Etapa {idx + 1}</Typography>
                <IconButton size="small" color="error" onClick={() => removerEtapaNatacao(sessaoId, etapa.id)} disabled={etapas.length <= 1}>
                  <Trash2 size={14} />
                </IconButton>
              </Box>

              {/* Estilo */}
              <TextField
                select size="small" fullWidth label="Estilo"
                value={etapa.estilo || 'crawl'}
                onChange={(e) => atualizarEtapaNatacao(sessaoId, etapa.id, { estilo: e.target.value as EstiloNatacao })}
                sx={{ mb: 1.5 }}
              >
                {(Object.entries(ESTILO_NATACAO_LABELS) as [EstiloNatacao, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </TextField>

              {/* Distância + Duração */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small" type="number" label="Distância (m)" fullWidth
                  value={etapa.distanciaM ?? ''}
                  onChange={(e) => atualizarEtapaNatacao(sessaoId, etapa.id, { distanciaM: e.target.value ? Number(e.target.value) : undefined })}
                  slotProps={{ htmlInput: { min: 0, step: 25, inputMode: 'numeric' } }}
                />
                <TextField
                  size="small" type="number" label="Duração (min)" fullWidth
                  value={etapa.duracaoMin ?? ''}
                  onChange={(e) => atualizarEtapaNatacao(sessaoId, etapa.id, { duracaoMin: e.target.value ? Number(e.target.value) : undefined })}
                  slotProps={{ htmlInput: { min: 0, inputMode: 'numeric' } }}
                />
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Button
        variant="outlined" fullWidth startIcon={<Plus size={20} />}
        onClick={() => adicionarEtapaNatacao(sessaoId)}
        sx={{ py: 1.5, borderStyle: 'dashed', borderColor: 'divider' }}
      >
        Adicionar Etapa
      </Button>
    </>
  );
}
