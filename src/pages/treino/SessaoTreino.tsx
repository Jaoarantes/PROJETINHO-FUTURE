import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, IconButton, Button, Card, CardContent,
    TextField, Chip, MenuItem as SelectItem, Snackbar, Alert, Menu, MenuItem,
    CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { MinusCircle, ArrowLeft, Trash2, Plus, PlusCircle, Footprints, Waves, CheckCircle, Play, Navigation, MapPin, Pause, Square, Share2, X, Send, GripVertical } from 'lucide-react';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    PointerSensor,
    TouchSensor,
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
import { useTreinoStore } from '../../store/treinoStore';
import ConfirmDeleteDialog from '../../components/ConfirmDeleteDialog';
import { useConfirmDelete } from '../../hooks/useConfirmDelete';
import { useFeedStore } from '../../store/feedStore';
import { useAuthContext } from '../../contexts/AuthContext';
import ExercicioPicker from '../../components/treino/ExercicioPicker';
import PhotoUploader from '../../components/feed/PhotoUploader';
import { useGPSTracker } from '../../hooks/useGPSTracker';
import { formatPace } from '../../utils/geoUtils';
import { uploadFeedPhoto, compressImage } from '../../services/feedService';
import { calcularVolumeSessao } from '../../types/treino';
import type { TipoCorridaTreino, EstiloNatacao, TipoSerie, RegistroTreino } from '../../types/treino';
import {
    TIPO_SESSAO_LABELS, TIPO_CORRIDA_LABELS, ESTILO_NATACAO_LABELS,
    TIPO_SERIE_LABELS, TIPO_SERIE_CORES,
    calcularDistanciaNatacao, calcularDuracaoNatacao,
} from '../../types/treino';

function formatTimer(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function SessaoTreino() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const store = useTreinoStore();
    const { sessoes, concluirTreino, treinoAtivo, carregando } = store;
    const criarPost = useFeedStore((s) => s.criarPost);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [snackOpen, setSnackOpen] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [salvando, setSalvando] = useState(false);
    const [erroMsg, setErroMsg] = useState('');
    // Share dialog
    const [shareOpen, setShareOpen] = useState(false);
    const [shareRegistro, setShareRegistro] = useState<RegistroTreino | null>(null);
    const [shareTexto, setShareTexto] = useState('');
    const [sharePhotos, setSharePhotos] = useState<File[]>([]);
    const [sharePosting, setSharePosting] = useState(false);
    const [confirmConcluir, setConfirmConcluir] = useState(false);
    const sessao = sessoes.find((s) => s.id === id);

    const isAtivo = treinoAtivo?.sessaoId === id;

    // Timer do treino ativo (pausa corretamente)
    useEffect(() => {
        if (!isAtivo || !treinoAtivo) { setElapsed(0); return; }
        const calcElapsed = () => {
            const pausado = treinoAtivo.tempoPausadoTotal || 0;
            if (treinoAtivo.pausadoEm) {
                // Quando pausado, congela o tempo
                return Math.floor((treinoAtivo.pausadoEm - treinoAtivo.iniciadoEm - pausado) / 1000);
            }
            return Math.floor((Date.now() - treinoAtivo.iniciadoEm - pausado) / 1000);
        };
        setElapsed(calcElapsed());
        if (treinoAtivo.pausadoEm) return; // Não atualiza enquanto pausado
        const interval = setInterval(() => setElapsed(calcElapsed()), 1000);
        return () => clearInterval(interval);
    }, [isAtivo, treinoAtivo]);

    if (carregando) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', pt: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!sessao) {
        return (
            <Box sx={{ pt: 2, textAlign: 'center' }}>
                <Typography>Treino não encontrado</Typography>
                <Button onClick={() => navigate('/treino')} sx={{ mt: 2 }}>Voltar</Button>
            </Box>
        );
    }

    const tipo = sessao.tipo || 'musculacao';

    const handleConcluir = async (gpsDistancia?: number) => {
        if (!sessao) return;
        setSalvando(true);
        setErroMsg('');
        try {
            const registro = await concluirTreino(sessao.id, { distanciaKm: gpsDistancia });
            setSnackOpen(true);
            if (registro) {
                setShareRegistro(registro);
                setShareOpen(true);
            } else {
                navigate('/treino');
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('switch-treino-tab', { detail: 1 }));
                }, 100);
            }
        } catch (err) {
            console.error('[SessaoTreino] Erro ao concluir treino:', err);
            setErroMsg('Erro ao salvar o treino. Verifique sua conexão e tente novamente.');
        } finally {
            setSalvando(false);
        }
    };

    const handleShareSkip = () => {
        setShareOpen(false);
        setShareRegistro(null);
        navigate('/treino');
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('switch-treino-tab', { detail: 1 }));
        }, 100);
    };

    const handleSharePost = async () => {
        if (!shareRegistro || !user?.id) return;
        setSharePosting(true);
        try {
            const fotoUrls: string[] = [];
            for (const photo of sharePhotos) {
                const compressed = await compressImage(photo);
                const url = await uploadFeedPhoto(user.id, compressed);
                fotoUrls.push(url);
            }

            const gruposMusculares = [...new Set(shareRegistro.exercicios.map((e) => e.exercicio.grupoMuscular))];
            await criarPost(user.id, {
                id: crypto.randomUUID(),
                registroId: shareRegistro.id,
                tipoTreino: shareRegistro.tipo,
                nomeTreino: shareRegistro.nome,
                duracaoSegundos: shareRegistro.duracaoTotalSegundos || null,
                resumo: {
                    exerciciosCount: shareRegistro.exercicios.length,
                    volumeTotal: calcularVolumeSessao(shareRegistro.exercicios),
                    distanciaKm: shareRegistro.corrida?.etapas?.reduce((s, e) => s + (e.distanciaKm ?? 0), 0),
                    duracaoMin: shareRegistro.duracaoTotalSegundos ? Math.round(shareRegistro.duracaoTotalSegundos / 60) : undefined,
                    gruposMusculares,
                    exercicios: shareRegistro.exercicios.map((e) => ({
                        nome: e.exercicio.nome,
                        sets: e.series.length,
                        exercicioId: e.exercicio.id,
                        series: e.series.map((s: any) => ({ reps: s.repeticoes ?? 0, peso: s.peso, tipo: s.tipo || 'normal' })),
                    })),
                },
                texto: shareTexto.trim() || null,
                fotoUrls,
            });
            setShareOpen(false);
            navigate('/feed');
        } catch (err) {
            console.error('Erro ao compartilhar:', err);
            setErroMsg('Erro ao compartilhar. Tente novamente.');
        } finally {
            setSharePosting(false);
        }
    };

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
                        <Chip label={tipo === 'outro' && sessao.tipoCustom ? sessao.tipoCustom : TIPO_SESSAO_LABELS[tipo]} size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                        {sessao.diaSemana && (
                            <Typography variant="caption" color="primary.main" fontWeight={600}>
                                {sessao.diaSemana}
                            </Typography>
                        )}
                        {isAtivo && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, ml: 0.5 }}>
                                <Play size={12} fill="#FF6B2C" color="#FF6B2C" />
                                <Typography
                                    sx={{
                                        
                                        color: 'primary.main',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    {formatTimer(elapsed)}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>

            {/* Render based on type */}
            {(tipo === 'musculacao' || tipo === 'outro') && (
                <MusculacaoView sessao={sessao} store={store} pickerOpen={pickerOpen} setPickerOpen={setPickerOpen} />
            )}
            {tipo === 'corrida' && <CorridaView sessaoId={sessao.id} corrida={sessao.corrida} store={store} isAtivo={isAtivo} onConcluir={(dist) => handleConcluir(dist)} salvando={salvando} />}
            {tipo === 'natacao' && <NatacaoView sessaoId={sessao.id} natacao={sessao.natacao} store={store} />}

            {/* Botão Concluir Treino (Apenas Musculação/Natação, Corrida conclui pelo card) */}
            {tipo !== 'corrida' && (
                <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    disabled={salvando}
                    startIcon={salvando ? <CircularProgress size={20} color="inherit" /> : <CheckCircle size={20} />}
                    onClick={() => setConfirmConcluir(true)}
                    sx={{ mt: 3, py: 1.5, fontWeight: 700, fontSize: '0.95rem', borderRadius: 1.5 }}
                >
                    {salvando ? 'Salvando...' : 'Concluir Treino'}
                </Button>
            )}

            {/* Confirmation Dialog - Concluir Treino */}
            <Dialog open={confirmConcluir} onClose={() => setConfirmConcluir(false)} PaperProps={{ sx: { borderRadius: 3, px: 1 } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>Concluir treino?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">O treino será salvo no histórico.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmConcluir(false)} color="inherit">Cancelar</Button>
                    <Button onClick={() => { setConfirmConcluir(false); handleConcluir(); }} variant="contained" color="success" sx={{ fontWeight: 700 }}>Confirmar</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar de sucesso */}
            <Snackbar open={snackOpen} autoHideDuration={3000} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setSnackOpen(false)} severity="success" variant="filled" sx={{ width: '100%' }}>
                    Treino concluído e salvo no histórico!
                </Alert>
            </Snackbar>

            {/* Snackbar de erro */}
            <Snackbar open={!!erroMsg} autoHideDuration={6000} onClose={() => setErroMsg('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setErroMsg('')} severity="error" variant="filled" sx={{ width: '100%' }}>
                    {erroMsg}
                </Alert>
            </Snackbar>

            {/* Share Dialog */}
            <Dialog
                open={shareOpen}
                onClose={handleShareSkip}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: '24px', mx: 2, p: 0 } }}
            >
                <Box sx={{ p: 3 }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
                        <Box sx={{
                            width: 44, height: 44, borderRadius: '14px',
                            background: 'linear-gradient(135deg, rgba(255,107,44,0.15) 0%, rgba(255,107,44,0.05) 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5,
                        }}>
                            <Share2 size={22} color="#FF6B2C" />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.1rem' }}>
                                Compartilhar treino?
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Mostre seu progresso para a comunidade
                            </Typography>
                        </Box>
                        <IconButton onClick={handleShareSkip} size="small">
                            <X size={20} />
                        </IconButton>
                    </Box>

                    {/* Workout Summary */}
                    {shareRegistro && (
                        <Box sx={{
                            p: 2, mb: 2, borderRadius: '14px',
                            background: (theme) => theme.palette.mode === 'dark'
                                ? `linear-gradient(135deg, ${alpha('#FF6B2C', 0.08)} 0%, ${alpha('#FF6B2C', 0.02)} 100%)`
                                : `linear-gradient(135deg, ${alpha('#FF6B2C', 0.05)} 0%, ${alpha('#FF6B2C', 0.01)} 100%)`,
                            border: '1px solid',
                            borderColor: alpha('#FF6B2C', 0.12),
                        }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                                {shareRegistro.nome}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {shareRegistro.duracaoTotalSegundos && (
                                    <Chip label={`${Math.round(shareRegistro.duracaoTotalSegundos / 60)}min`} size="small" sx={{ height: 22, fontSize: '0.7rem' }} />
                                )}
                                {shareRegistro.exercicios.length > 0 && (
                                    <Chip label={`${shareRegistro.exercicios.length} exerc.`} size="small" sx={{ height: 22, fontSize: '0.7rem' }} />
                                )}
                            </Box>
                        </Box>
                    )}

                    {/* Caption */}
                    <TextField
                        multiline
                        minRows={2}
                        maxRows={4}
                        fullWidth
                        placeholder="Conte como foi o treino..."
                        value={shareTexto}
                        onChange={(e) => setShareTexto(e.target.value)}
                        slotProps={{ htmlInput: { maxLength: 300 } }}
                        sx={{ mb: 2 }}
                    />

                    {/* Photos */}
                    <Box sx={{ mb: 2.5 }}>
                        <PhotoUploader
                            photos={sharePhotos}
                            onAdd={(f) => setSharePhotos((prev) => [...prev, ...f].slice(0, 3))}
                            onRemove={(i) => setSharePhotos((prev) => prev.filter((_, idx) => idx !== i))}
                        />
                    </Box>

                    {/* Buttons */}
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={handleShareSkip}
                            sx={{ py: 1.3, borderRadius: '12px' }}
                        >
                            Pular
                        </Button>
                        <Button
                            variant="contained"
                            fullWidth
                            disabled={sharePosting}
                            onClick={handleSharePost}
                            startIcon={sharePosting ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
                            sx={{ py: 1.3, borderRadius: '12px' }}
                        >
                            {sharePosting ? 'Publicando...' : 'Compartilhar'}
                        </Button>
                    </Box>
                </Box>
            </Dialog>

        </Box>
    );
}

/* ── Sortable Exercise Card ────────── */
function SortableExerciseCard({ exTreino, isOverlay, children }: {
    exTreino: { id: string };
    isOverlay?: boolean;
    children: (dragHandleProps: Record<string, unknown>) => React.ReactNode;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: exTreino.id, disabled: isOverlay });

    const style = isOverlay ? {
        opacity: 1,
        cursor: 'grabbing',
        zIndex: 2000,
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
    } : {
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 250ms cubic-bezier(0.25, 1, 0.5, 1)',
        opacity: isDragging ? 0.4 : 1,
        position: 'relative' as const,
    };

    return (
        <Card ref={setNodeRef} style={style} sx={{
            ...(isDragging && !isOverlay && { visibility: 'hidden' }),
        }}>
            {children({ ...attributes, ...listeners })}
        </Card>
    );
}

/* ── Musculação View ────────────────── */
function MusculacaoView({ sessao, store, pickerOpen, setPickerOpen }: {
    sessao: ReturnType<typeof useTreinoStore.getState>['sessoes'][0];
    store: ReturnType<typeof useTreinoStore.getState>;
    pickerOpen: boolean;
    setPickerOpen: (v: boolean) => void;
}) {
    const { removerExercicio, atualizarSerie, adicionarSerie, removerSerie, reordenarExercicios } = store;
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [menuTarget, setMenuTarget] = useState<{ sessaoId: string; exId: string; serieId: string } | null>(null);
    const [activeExId, setActiveExId] = useState<string | null>(null);
    const deleteExercicio = useConfirmDelete();
    const deleteSerie = useConfirmDelete();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { delay: 150, tolerance: 5 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 150, tolerance: 5 },
        })
    );

    const exercicioIds = useMemo(() => sessao.exercicios.map(ex => ex.id), [sessao.exercicios]);
    const activeExTreino = useMemo(() => sessao.exercicios.find(ex => ex.id === activeExId), [sessao.exercicios, activeExId]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveExId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveExId(null);
        if (over && active.id !== over.id) {
            const oldIndex = sessao.exercicios.findIndex(ex => ex.id === active.id);
            const newIndex = sessao.exercicios.findIndex(ex => ex.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                reordenarExercicios(sessao.id, arrayMove(sessao.exercicios, oldIndex, newIndex));
            }
        }
    };

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

    const renderExerciseContent = (exTreino: typeof sessao.exercicios[0], dragHandleProps: Record<string, unknown>) => (
        <CardContent sx={{ pb: '12px !important', px: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box
                    {...dragHandleProps}
                    sx={{
                        mr: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'grab',
                        touchAction: 'none',
                        '&:active': { cursor: 'grabbing' },
                        opacity: 0.3,
                        '&:hover': { opacity: 0.7 },
                    }}
                >
                    <GripVertical size={18} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ fontSize: '0.95rem' }}>{exTreino.exercicio.nome}</Typography>
                    <Chip label={exTreino.exercicio.grupoMuscular} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem', mt: 0.2 }} />
                </Box>
                <IconButton size="small" color="error" onClick={() => deleteExercicio.requestDelete({ sessaoId: sessao.id, exId: exTreino.id })}>
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
                            value={serie.repeticoes || ''}
                            onChange={(e) => atualizarSerie(sessao.id, exTreino.id, serie.id, { repeticoes: e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0 })}
                            sx={{ flex: 1, mx: 0.5, '& input': { textAlign: 'center', py: 0.8, fontSize: '0.85rem' }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            slotProps={{ htmlInput: { min: 0, inputMode: 'numeric' } }}
                            placeholder="0"
                        />
                        <IconButton size="small" onClick={() => deleteSerie.requestDelete({ sessaoId: sessao.id, exId: exTreino.id, serieId: serie.id })} disabled={exTreino.series.length <= 1} sx={{ width: 32 }}>
                            <MinusCircle size={18} />
                        </IconButton>
                    </Box>
                );
            })}

            <Button size="small" startIcon={<PlusCircle size={18} />} onClick={() => adicionarSerie(sessao.id, exTreino.id)} sx={{ mt: 0.5, fontSize: '0.8rem' }}>
                Adicionar série
            </Button>
        </CardContent>
    );

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
                <Box sx={{ textAlign: 'center', mt: 6, mb: 4, p: 4, borderRadius: 1.5, border: 1, borderStyle: 'dashed', borderColor: 'divider' }}>
                    <Typography color="text.secondary" sx={{ mb: 0.5 }} fontWeight={500}>Nenhum exercício adicionado</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>Adicione exercícios ao seu treino</Typography>
                </Box>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={exercicioIds} strategy={verticalListSortingStrategy}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                            {sessao.exercicios.map((exTreino) => (
                                <SortableExerciseCard key={exTreino.id} exTreino={exTreino}>
                                    {(dragHandleProps) => renderExerciseContent(exTreino, dragHandleProps)}
                                </SortableExerciseCard>
                            ))}
                        </Box>
                    </SortableContext>
                    <DragOverlay>
                        {activeExTreino ? (
                            <Card sx={{ boxShadow: '0 8px 30px rgba(0,0,0,0.2)', transform: 'scale(1.02)' }}>
                                {renderExerciseContent(activeExTreino, {})}
                            </Card>
                        ) : null}
                    </DragOverlay>
                </DndContext>
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
            </Box>

            <ExercicioPicker open={pickerOpen} onClose={() => setPickerOpen(false)} sessaoId={sessao.id} />

            <ConfirmDeleteDialog
                open={deleteExercicio.open}
                loading={deleteExercicio.loading}
                title="Excluir exercício?"
                message="Tem certeza que deseja remover este exercício do treino?"
                onClose={deleteExercicio.cancel}
                onConfirm={() => deleteExercicio.confirmDelete(async () => {
                    const p = deleteExercicio.payload;
                    removerExercicio(p.sessaoId, p.exId);
                })}
            />
            <ConfirmDeleteDialog
                open={deleteSerie.open}
                loading={deleteSerie.loading}
                title="Excluir série?"
                message="Tem certeza que deseja remover esta série?"
                onClose={deleteSerie.cancel}
                onConfirm={() => deleteSerie.confirmDelete(async () => {
                    const p = deleteSerie.payload;
                    removerSerie(p.sessaoId, p.exId, p.serieId);
                })}
            />
        </>
    );
}

/* ── Corrida View ────────────────── */
function CorridaView({ sessaoId, corrida, store, isAtivo, onConcluir, salvando }: {
    sessaoId: string;
    corrida: ReturnType<typeof useTreinoStore.getState>['sessoes'][0]['corrida'];
    store: ReturnType<typeof useTreinoStore.getState>;
    isAtivo: boolean;
    onConcluir: (dist: number) => void;
    salvando: boolean;
}) {
    const { adicionarEtapaCorrida, removerEtapaCorrida, atualizarEtapaCorrida, pausarTreino, retomarTreino, cancelarTreino, treinoAtivo } = store;
    const etapas = corrida?.etapas ?? [];
    const tracker = useGPSTracker();
    const deleteEtapa = useConfirmDelete();
    const [confirmAction, setConfirmAction] = useState<null | 'pausar' | 'retomar' | 'concluir' | 'cancelar'>(null);

    const confirmLabels: Record<string, { title: string; desc: string }> = {
        pausar: { title: 'Pausar treino?', desc: 'O cronômetro e GPS serão pausados.' },
        retomar: { title: 'Retomar treino?', desc: 'O cronômetro e GPS continuarão.' },
        concluir: { title: 'Concluir treino?', desc: 'O treino será salvo no histórico.' },
        cancelar: { title: 'Parar treino?', desc: 'O treino será descartado e o progresso perdido.' },
    };

    const executeConfirmedAction = () => {
        const action = confirmAction;
        setConfirmAction(null);
        if (action === 'pausar') { pausarTreino(); tracker.pauseTracking(); }
        else if (action === 'retomar') { retomarTreino(); tracker.resumeTracking(); }
        else if (action === 'concluir') { tracker.stopTracking(); onConcluir(tracker.distanceKm); }
        else if (action === 'cancelar') { cancelarTreino(); }
    };

    // Ativar GPS automaticamente se a sessão for iniciada e for corrida
    useEffect(() => {
        if (isAtivo && !tracker.isActive) {
            tracker.startTracking();
        }
    }, [isAtivo]);

    // SE ESTIVER ATIVO: Novo Visual (Dashboard GPS)
    if (isAtivo) {
        return (
            <>
                <Card sx={{
                    mb: 2,
                    bgcolor: 'action.hover',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    boxShadow: 'none'
                }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                            <Navigation size={24} color="#999" style={{ transform: 'rotate(45deg)' }} />
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" fontWeight={800} color="text.primary">Rastreador GPS</Typography>
                                {tracker.accuracy !== null && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{
                                            width: 8, height: 8, borderRadius: '50%',
                                            bgcolor: tracker.accuracy <= 10 ? '#4caf50' : tracker.accuracy <= 30 ? '#ff9800' : '#f44336'
                                        }} />
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                            Precisão: {Math.round(tracker.accuracy)}m
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', mb: 4 }}>
                            <Box sx={{ flex: 1, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: '0.05em' }}>DISTÂNCIA</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', mt: 1 }}>
                                    <Typography variant="h3" fontWeight={800} sx={{ mr: 1 }}>
                                        {tracker.distanceKm.toFixed(2)}
                                    </Typography>
                                    <Typography variant="h6" fontWeight={800} color="text.primary">KM</Typography>
                                </Box>
                            </Box>
                            <Box sx={{ width: '1px', bgcolor: 'divider', my: 1 }} />
                            <Box sx={{ flex: 1, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: '0.05em' }}>PACE ATUAL</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', mt: 1 }}>
                                    <Typography variant="h3" fontWeight={800} sx={{ mr: 1 }}>
                                        {formatPace(tracker.currentPace)}
                                    </Typography>
                                    <Typography variant="h6" fontWeight={800} color="text.primary">/KM</Typography>
                                </Box>
                            </Box>
                        </Box>

                        {tracker.error && <Alert severity="error" sx={{ mb: 2 }}>{tracker.error}</Alert>}

                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                            <Button
                                variant="contained"
                                fullWidth
                                disabled={salvando}
                                startIcon={salvando ? <CircularProgress size={20} color="inherit" /> : (treinoAtivo?.pausadoEm ? <Play size={22} fill="currentColor" /> : <Pause size={22} fill="currentColor" />)}
                                onClick={() => setConfirmAction(treinoAtivo?.pausadoEm ? 'retomar' : 'pausar')}
                                sx={{
                                    bgcolor: '#FFC107',
                                    color: '#000',
                                    py: 2,
                                    borderRadius: 1.5,
                                    fontWeight: 800,
                                    fontSize: '1.1rem',
                                    flex: 1,
                                    minWidth: '120px',
                                    '&:hover': { bgcolor: '#FFB300' },
                                    boxShadow: '0 4px 14px 0 rgba(255, 193, 7, 0.35)',
                                }}
                            >
                                {salvando ? 'SALVANDO...' : (treinoAtivo?.pausadoEm ? 'RETOMAR' : 'PAUSAR')}
                            </Button>

                            <Button
                                variant="contained"
                                fullWidth
                                disabled={salvando}
                                startIcon={salvando ? <CircularProgress size={20} color="inherit" /> : <CheckCircle size={22} />}
                                onClick={() => setConfirmAction('concluir')}
                                sx={{
                                    bgcolor: '#4CAF50',
                                    color: '#fff',
                                    py: 2,
                                    borderRadius: 1.5,
                                    fontWeight: 800,
                                    fontSize: '1.1rem',
                                    flex: 1,
                                    minWidth: '120px',
                                    '&:hover': { bgcolor: '#388E3C' },
                                    boxShadow: '0 4px 14px 0 rgba(76, 175, 80, 0.35)',
                                }}
                            >
                                {salvando ? 'SALVANDO...' : 'CONCLUIR'}
                            </Button>

                            <IconButton
                                onClick={() => setConfirmAction('cancelar')}
                                sx={{
                                    bgcolor: '#F44336',
                                    color: '#fff',
                                    '&:hover': { bgcolor: '#D32F2F' },
                                    borderRadius: 1.5,
                                    px: 2,
                                    height: '56px',
                                    width: '56px',
                                    boxShadow: '0 4px 14px 0 rgba(244, 67, 54, 0.35)',
                                }}
                            >
                                <Square size={24} fill="currentColor" />
                            </IconButton>
                        </Box>
                    </CardContent>
                </Card>

                {/* Animação Pulse */}
                <Box sx={{ display: 'none' }}>
                    <style>
                        {`
              @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
              }
            `}
                    </style>
                </Box>

                {/* Confirmation Dialog */}
                <Dialog open={!!confirmAction} onClose={() => setConfirmAction(null)} PaperProps={{ sx: { borderRadius: 3, px: 1 } }}>
                    <DialogTitle sx={{ fontWeight: 700 }}>{confirmAction && confirmLabels[confirmAction]?.title}</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" color="text.secondary">{confirmAction && confirmLabels[confirmAction]?.desc}</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setConfirmAction(null)} color="inherit">Cancelar</Button>
                        <Button onClick={executeConfirmedAction} variant="contained" color={confirmAction === 'cancelar' ? 'error' : 'primary'} sx={{ fontWeight: 700 }}>Confirmar</Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    }

    // SE NÃO ESTIVER ATIVO: Layout de Edição (Página Antiga)
    return (
        <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                {etapas.map((etapa, idx) => (
                    <Card key={etapa.id} variant="outlined" sx={{ borderRadius: 1.5 }}>
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

                                {/* Botão para importar do GPS */}
                                {tracker.distanceKm > 0 && (
                                    <Button
                                        size="small" variant="text" color="primary" startIcon={<MapPin size={14} />}
                                        onClick={() => atualizarEtapaCorrida(sessaoId, etapa.id, { distanciaKm: Number(tracker.distanceKm.toFixed(2)) })}
                                        sx={{ mr: 1, fontSize: '0.7rem' }}
                                    >
                                        Usar GPS
                                    </Button>
                                )}

                                <IconButton size="small" color="error" onClick={() => deleteEtapa.requestDelete(etapa.id)} disabled={etapas.length <= 1}>
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

            <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                    variant="outlined" fullWidth startIcon={<Plus size={20} />}
                    onClick={() => adicionarEtapaCorrida(sessaoId)}
                    sx={{ py: 1.5, borderStyle: 'dashed', borderColor: 'divider', flex: 1 }}
                >
                    Adicionar Etapa
                </Button>
            </Box>

            <ConfirmDeleteDialog
                open={deleteEtapa.open}
                loading={deleteEtapa.loading}
                title="Excluir etapa?"
                message="Tem certeza que deseja remover esta etapa da corrida?"
                onClose={deleteEtapa.cancel}
                onConfirm={() => deleteEtapa.confirmDelete(async () => {
                    removerEtapaCorrida(sessaoId, deleteEtapa.payload);
                })}
            />
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
    const deleteEtapaN = useConfirmDelete();

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
                                <IconButton size="small" color="error" onClick={() => deleteEtapaN.requestDelete(etapa.id)} disabled={etapas.length <= 1}>
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

            <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                    variant="outlined" fullWidth startIcon={<Plus size={20} />}
                    onClick={() => adicionarEtapaNatacao(sessaoId)}
                    sx={{ py: 1.5, borderStyle: 'dashed', borderColor: 'divider', flex: 1 }}
                >
                    Adicionar Etapa
                </Button>
            </Box>

            <ConfirmDeleteDialog
                open={deleteEtapaN.open}
                loading={deleteEtapaN.loading}
                title="Excluir etapa?"
                message="Tem certeza que deseja remover esta etapa da natação?"
                onClose={deleteEtapaN.cancel}
                onConfirm={() => deleteEtapaN.confirmDelete(async () => {
                    removerEtapaNatacao(sessaoId, deleteEtapaN.payload);
                })}
            />
        </>
    );
}
