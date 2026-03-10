import { useState } from 'react';
import {
    Dialog,
    Box,
    Typography,
    TextField,
    Button,
    ToggleButtonGroup,
    ToggleButton,
    MenuItem,
    Switch,
    FormControlLabel,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { Target, ArrowRight, Sparkles } from 'lucide-react';
import type { PerfilCorporal, NivelAtividade, ObjetivoPeso, MetasDieta, IntensidadeTreino, IntensidadeCardio } from '../../types/dieta';
import { ATIVIDADE_LABELS, OBJETIVO_LABELS } from '../../types/dieta';
import { calcularMetasPersonalizadas, calcularTDEE } from '../../utils/goalCalculator';

interface Props {
    open: boolean;
    onClose: () => void;
    perfilInicial?: PerfilCorporal | null;
    onSalvar: (perfil: PerfilCorporal, metas: MetasDieta) => void;
}

const STEPS = ['Dados Básicos', 'Atividade Diária', 'Exercícios', 'Objetivo', 'Macros'];

const DEFAULT_PERFIL: PerfilCorporal = {
    sexo: 'masculino',
    idade: 25,
    peso: 75,
    altura: 175,
    nivelAtividade: 'moderado',
    fazMusculacao: true,
    musculacaoDias: 5,
    musculacaoDuracao: 60,
    musculacaoIntensidade: 'moderado',
    fazCardio: false,
    cardioDias: 3,
    cardioDuracao: 30,
    cardioIntensidade: 'moderada',
    objetivo: 'manter',
    metaSemanal: 0.5,
    proteinaGKg: 2.0,
    gorduraGKg: 0.8,
};

/** Merge saved profile with defaults so new fields never become undefined */
function mergeWithDefaults(saved?: PerfilCorporal | null): PerfilCorporal {
    if (!saved) return { ...DEFAULT_PERFIL };
    return { ...DEFAULT_PERFIL, ...saved };
}

export default function MetasWizard({ open, onClose, perfilInicial, onSalvar }: Props) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [step, setStep] = useState(0);
    const [perfil, setPerfil] = useState<PerfilCorporal>(() => mergeWithDefaults(perfilInicial));
    const [usarGordura, setUsarGordura] = useState(!!perfilInicial?.gorduraCorporal);

    const metas = calcularMetasPersonalizadas(perfil);
    const tdee = calcularTDEE(perfil);

    const handleSalvar = () => { onSalvar(perfil, metas); onClose(); };
    const handleClose = () => { setStep(0); onClose(); };

    const canNext = () => {
        if (step === 0) return perfil.idade > 0 && perfil.peso > 0 && perfil.altura > 0;
        return true;
    };

    const update = (partial: Partial<PerfilCorporal>) => setPerfil({ ...perfil, ...partial });
    const numChange = (field: keyof PerfilCorporal) => (e: React.ChangeEvent<HTMLInputElement>) =>
        update({ [field]: Number(e.target.value) || 0 } as Partial<PerfilCorporal>);

    return (
        <Dialog open={open} onClose={handleClose} fullScreen={isMobile} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4 } }}>
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, minHeight: isMobile ? '100vh' : 'auto', overflow: 'auto' }}>
                {/* Header */}
                <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: 'primary.main', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                        <Target size={24} color="#000" />
                    </Box>
                    <Typography variant="h6" fontWeight={700}>Calcular Metas</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Passo {step + 1} de {STEPS.length} — {STEPS[step]}
                    </Typography>
                </Box>

                {/* Step indicator */}
                <Box sx={{ display: 'flex', gap: 0.5, mx: 'auto' }}>
                    {STEPS.map((_, i) => (
                        <Box key={i} sx={{ width: 28, height: 3, borderRadius: 2, bgcolor: i <= step ? 'primary.main' : 'action.hover', transition: 'background 0.3s' }} />
                    ))}
                </Box>

                {/* ── Step 0: Dados Básicos ── */}
                {step === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">Gênero</Typography>
                        <ToggleButtonGroup value={perfil.sexo} exclusive onChange={(_, v) => { if (v) update({ sexo: v }); }} fullWidth size="small">
                            <ToggleButton value="masculino">Masculino</ToggleButton>
                            <ToggleButton value="feminino">Feminino</ToggleButton>
                        </ToggleButtonGroup>

                        <TextField label="Idade" type="number" value={perfil.idade || ''} onChange={numChange('idade')} size="small" slotProps={{ htmlInput: { min: 10, max: 100, inputMode: 'numeric' } }} />
                        <TextField label="Peso (kg)" type="number" value={perfil.peso || ''} onChange={numChange('peso')} size="small" slotProps={{ htmlInput: { min: 30, max: 300, step: 0.1, inputMode: 'decimal' } }} />
                        <TextField label="Altura (cm)" type="number" value={perfil.altura || ''} onChange={numChange('altura')} size="small" slotProps={{ htmlInput: { min: 100, max: 250, inputMode: 'numeric' } }} />

                        <FormControlLabel
                            control={<Switch checked={usarGordura} onChange={(_, checked) => { setUsarGordura(checked); if (!checked) update({ gorduraCorporal: undefined }); }} size="small" />}
                            label={<Typography variant="body2">Sabe seu % de gordura corporal?</Typography>}
                        />
                        {usarGordura && (
                            <TextField label="Gordura Corporal (%)" type="number" value={perfil.gorduraCorporal ?? ''} onChange={numChange('gorduraCorporal')} size="small" slotProps={{ htmlInput: { min: 3, max: 60, inputMode: 'numeric' } }} />
                        )}
                    </Box>
                )}

                {/* ── Step 1: Atividade Diária (NEAT) ── */}
                {step === 1 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            Nível de atividade física <strong>NÃO incluindo exercícios</strong>:
                        </Typography>
                        <TextField
                            select
                            value={perfil.nivelAtividade}
                            onChange={(e) => update({ nivelAtividade: e.target.value as NivelAtividade })}
                            size="small"
                        >
                            {(Object.entries(ATIVIDADE_LABELS) as [NivelAtividade, string][]).map(([key, label]) => (
                                <MenuItem key={key} value={key}>{label}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                )}

                {/* ── Step 2: Exercícios ── */}
                {step === 2 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Musculação */}
                        <FormControlLabel
                            control={<Switch checked={perfil.fazMusculacao} onChange={(_, checked) => update({ fazMusculacao: checked })} size="small" />}
                            label={<Typography variant="body2" fontWeight={600}>Você faz musculação?</Typography>}
                        />
                        {perfil.fazMusculacao && (
                            <Box sx={{ pl: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                <TextField label="Dias por semana" type="number" value={perfil.musculacaoDias || ''} onChange={numChange('musculacaoDias')} size="small" slotProps={{ htmlInput: { min: 1, max: 7, inputMode: 'numeric' } }} />
                                <TextField label="Duração por treino (min)" type="number" value={perfil.musculacaoDuracao || ''} onChange={numChange('musculacaoDuracao')} size="small" slotProps={{ htmlInput: { min: 15, max: 240, inputMode: 'numeric' } }} />
                                <TextField select label="Intensidade" value={perfil.musculacaoIntensidade} onChange={(e) => update({ musculacaoIntensidade: e.target.value as IntensidadeTreino })} size="small">
                                    <MenuItem value="leve">Leve</MenuItem>
                                    <MenuItem value="moderado">Moderado</MenuItem>
                                    <MenuItem value="intenso">Intenso</MenuItem>
                                    <MenuItem value="insano">Insano</MenuItem>
                                </TextField>
                            </Box>
                        )}

                        {/* Cardio */}
                        <FormControlLabel
                            control={<Switch checked={perfil.fazCardio} onChange={(_, checked) => update({ fazCardio: checked })} size="small" />}
                            label={<Typography variant="body2" fontWeight={600}>Você faz cardio?</Typography>}
                        />
                        {perfil.fazCardio && (
                            <Box sx={{ pl: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                <TextField label="Dias por semana" type="number" value={perfil.cardioDias || ''} onChange={numChange('cardioDias')} size="small" slotProps={{ htmlInput: { min: 1, max: 7, inputMode: 'numeric' } }} />
                                <TextField label="Duração (min)" type="number" value={perfil.cardioDuracao || ''} onChange={numChange('cardioDuracao')} size="small" slotProps={{ htmlInput: { min: 5, max: 180, inputMode: 'numeric' } }} />
                                <TextField select label="Intensidade" value={perfil.cardioIntensidade} onChange={(e) => update({ cardioIntensidade: e.target.value as IntensidadeCardio })} size="small">
                                    <MenuItem value="leve">Leve</MenuItem>
                                    <MenuItem value="moderada">Moderada</MenuItem>
                                    <MenuItem value="intensa">Intensa</MenuItem>
                                </TextField>
                            </Box>
                        )}
                    </Box>
                )}

                {/* ── Step 3: Objetivo ── */}
                {step === 3 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <ToggleButtonGroup
                            value={perfil.objetivo}
                            exclusive
                            onChange={(_, v) => { if (v) update({ objetivo: v }); }}
                            fullWidth
                            size="small"
                            orientation="vertical"
                        >
                            {(Object.entries(OBJETIVO_LABELS) as [ObjetivoPeso, string][]).map(([key, label]) => (
                                <ToggleButton key={key} value={key} sx={{ justifyContent: 'flex-start', textTransform: 'none' }}>{label}</ToggleButton>
                            ))}
                        </ToggleButtonGroup>

                        {perfil.objetivo !== 'manter' && (
                            <>
                                <Typography variant="body2" color="text.secondary">
                                    Meta de {perfil.objetivo === 'perder' ? 'perda' : 'ganho'} semanal:
                                </Typography>
                                <ToggleButtonGroup
                                    value={perfil.metaSemanal}
                                    exclusive
                                    onChange={(_, v) => { if (v !== null) update({ metaSemanal: v }); }}
                                    fullWidth
                                    size="small"
                                >
                                    <ToggleButton value={0.25}>0.25 kg</ToggleButton>
                                    <ToggleButton value={0.5}>0.5 kg</ToggleButton>
                                    <ToggleButton value={0.75}>0.75 kg</ToggleButton>
                                </ToggleButtonGroup>
                            </>
                        )}

                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Seu gasto diário (TDEE)</Typography>
                            <Typography variant="h5" fontWeight={700} color="primary.main">{tdee} kcal</Typography>
                        </Box>
                    </Box>
                )}

                {/* ── Step 4: Macros + Resultado ── */}
                {step === 4 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">Distribuição de macros (g/kg de peso):</Typography>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary">Proteína (g/kg)</Typography>
                                <ToggleButtonGroup value={perfil.proteinaGKg} exclusive onChange={(_, v) => { if (v !== null) update({ proteinaGKg: v }); }} fullWidth size="small">
                                    <ToggleButton value={1.6}>1.6</ToggleButton>
                                    <ToggleButton value={1.8}>1.8</ToggleButton>
                                    <ToggleButton value={2.0}>2.0</ToggleButton>
                                </ToggleButtonGroup>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary">Gordura (g/kg)</Typography>
                                <ToggleButtonGroup value={perfil.gorduraGKg} exclusive onChange={(_, v) => { if (v !== null) update({ gorduraGKg: v }); }} fullWidth size="small">
                                    <ToggleButton value={0.5}>0.5</ToggleButton>
                                    <ToggleButton value={0.8}>0.8</ToggleButton>
                                    <ToggleButton value={1.0}>1.0</ToggleButton>
                                </ToggleButtonGroup>
                            </Box>
                        </Box>

                        {/* Results */}
                        <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'action.hover', textAlign: 'center', mt: 1 }}>
                            <Sparkles size={20} style={{ color: '#F97316', marginBottom: 4 }} />
                            <Typography variant="h4" fontWeight={700} color="primary.main">
                                {metas.calorias} kcal
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Meta diária recomendada</Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <ResultCard label="Proteína" value={`${metas.proteinas}g`} color="#22C55E" />
                            <ResultCard label="Carb" value={`${metas.carboidratos}g`} color="#F97316" />
                            <ResultCard label="Gordura" value={`${metas.gorduras}g`} color="#A855F7" />
                        </Box>

                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                            Prot: {perfil.proteinaGKg}g/kg · Gord: {perfil.gorduraGKg}g/kg · Carb: restante
                        </Typography>
                    </Box>
                )}

                {/* Navigation */}
                <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                    {step > 0 && (
                        <Button variant="outlined" onClick={() => setStep(step - 1)} sx={{ flex: 1 }}>Voltar</Button>
                    )}
                    {step < STEPS.length - 1 ? (
                        <Button variant="contained" onClick={() => setStep(step + 1)} disabled={!canNext()} endIcon={<ArrowRight size={18} />} sx={{ flex: 1 }}>
                            Próximo
                        </Button>
                    ) : (
                        <Button variant="contained" onClick={handleSalvar} sx={{ flex: 1 }}>Aplicar Metas</Button>
                    )}
                </Box>
                {step === 0 && (
                    <Button variant="text" size="small" onClick={handleClose} sx={{ alignSelf: 'center' }}>Cancelar</Button>
                )}
            </Box>
        </Dialog>
    );
}

function ResultCard({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <Box sx={{ flex: 1, textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: 'action.hover', borderLeft: `3px solid ${color}` }}>
            <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
            <Typography variant="body1" fontWeight={700}>{value}</Typography>
        </Box>
    );
}
