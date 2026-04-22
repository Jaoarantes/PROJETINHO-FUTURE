import type { RegistroTreino } from '../types/treino';

export type MedalType = 'ouro' | 'prata' | 'bronze';

export interface MedalhaPR {
  tipo: MedalType;
  categoria: 'musculacao_carga' | 'musculacao_1rm' | 'corrida_distancia' | 'corrida_pace';
  label: string;
  valorFormatado: string;
  posicaoRanking: number;
}

export interface ResultadoPRs {
  medalhas: MedalhaPR[];
  xpBonus: number;
}

// ── Epley 1RM estimate ──────────────────────────────────────────────────────
function epley1RM(peso: number, reps: number): number {
  if (reps === 1) return peso;
  return peso * (1 + reps / 30);
}

function medalPorPosicao(pos: number): MedalType | null {
  if (pos === 1) return 'ouro';
  if (pos <= 3) return 'prata';
  if (pos <= 10) return 'bronze';
  return null;
}

// ── Pace helpers ─────────────────────────────────────────────────────────────
function paceSegPorKm(distanciaKm: number, duracaoSegundos: number): number {
  if (distanciaKm <= 0) return Infinity;
  return duracaoSegundos / distanciaKm;
}

function formatPaceStr(segPorKm: number): string {
  if (!isFinite(segPorKm) || segPorKm <= 0) return '—';
  const min = Math.floor(segPorKm / 60);
  const sec = Math.round(segPorKm % 60);
  return `${min}:${sec.toString().padStart(2, '0')}/km`;
}

// ── Musculação PR detection ──────────────────────────────────────────────────
function detectarPRsMusculacao(
  novoRegistro: RegistroTreino,
  historicoAnterior: RegistroTreino[],
): MedalhaPR[] {
  const medalhas: MedalhaPR[] = [];

  // Agrupa o histórico anterior por exercício: lista de todos os valores
  const cargasHistorico = new Map<string, number[]>();
  const oneRMHistorico = new Map<string, number[]>();

  for (const reg of historicoAnterior) {
    if (reg.tipo !== 'musculacao' && reg.tipo !== 'outro') continue;
    for (const ex of reg.exercicios) {
      const nome = ex.exercicio.nome;
      let cargaMax = 0;
      let oneRMMax = 0;
      for (const serie of ex.series) {
        if (!serie.concluida) continue;
        const peso = serie.peso ?? 0;
        const reps = serie.repeticoes ?? 0;
        if (peso > 0) {
          cargaMax = Math.max(cargaMax, peso);
          oneRMMax = Math.max(oneRMMax, epley1RM(peso, reps));
        }
      }
      if (cargaMax > 0) {
        if (!cargasHistorico.has(nome)) cargasHistorico.set(nome, []);
        cargasHistorico.get(nome)!.push(cargaMax);
        if (!oneRMHistorico.has(nome)) oneRMHistorico.set(nome, []);
        oneRMHistorico.get(nome)!.push(oneRMMax);
      }
    }
  }

  // Verifica cada exercício do novo treino
  const exerciciosVistos = new Set<string>();
  for (const ex of novoRegistro.exercicios) {
    const nome = ex.exercicio.nome;
    if (exerciciosVistos.has(nome)) continue;
    exerciciosVistos.add(nome);

    let novaCargaMax = 0;
    let novoOneRM = 0;
    for (const serie of ex.series) {
      if (!serie.concluida) continue;
      const peso = serie.peso ?? 0;
      const reps = serie.repeticoes ?? 0;
      if (peso > 0) {
        novaCargaMax = Math.max(novaCargaMax, peso);
        novoOneRM = Math.max(novoOneRM, epley1RM(peso, reps));
      }
    }
    if (novaCargaMax === 0) continue;

    // Carga máxima
    const historicoCargas = cargasHistorico.get(nome) ?? [];
    const todasCargas = [...historicoCargas, novaCargaMax].sort((a, b) => b - a);
    const posCarga = todasCargas.indexOf(novaCargaMax) + 1;
    const medalCarga = medalPorPosicao(posCarga);
    if (medalCarga) {
      medalhas.push({
        tipo: medalCarga,
        categoria: 'musculacao_carga',
        label: `${nome} — Carga máxima`,
        valorFormatado: `${novaCargaMax}kg`,
        posicaoRanking: posCarga,
      });
    }

    // 1RM estimado (só mostra se for diferente da carga simples, i.e. reps > 1)
    const historicoOneRM = oneRMHistorico.get(nome) ?? [];
    const todosOneRM = [...historicoOneRM, novoOneRM].sort((a, b) => b - a);
    const posOneRM = todosOneRM.indexOf(novoOneRM) + 1;
    const medalOneRM = medalPorPosicao(posOneRM);
    // Só adiciona 1RM se for melhor que a carga direta (ex: 5×80kg > 100kg direto)
    if (medalOneRM && Math.round(novoOneRM) > novaCargaMax) {
      medalhas.push({
        tipo: medalOneRM,
        categoria: 'musculacao_1rm',
        label: `${nome} — 1RM estimado`,
        valorFormatado: `~${Math.round(novoOneRM)}kg`,
        posicaoRanking: posOneRM,
      });
    }
  }

  return medalhas;
}

// ── Corrida PR detection ─────────────────────────────────────────────────────
interface CorridaEntry {
  distanciaKm: number;
  duracaoSegundos: number;
  pace: number; // s/km
}

function extrairCorridaEntry(reg: RegistroTreino): CorridaEntry | null {
  if (reg.tipo !== 'corrida') return null;

  let distanciaKm = 0;
  let duracaoSeg = reg.duracaoTotalSegundos ?? 0;

  if (reg.corrida?.etapas?.length) {
    for (const etapa of reg.corrida.etapas) {
      distanciaKm += etapa.distanciaKm ?? 0;
      if (etapa.duracaoSegundos) duracaoSeg = Math.max(duracaoSeg, etapa.duracaoSegundos);
    }
  }

  // Dados do Strava têm precedência
  if (reg.stravaData?.distance) {
    distanciaKm = reg.stravaData.distance / 1000;
    duracaoSeg = reg.stravaData.movingTime ?? duracaoSeg;
  }

  if (distanciaKm < 0.5 || duracaoSeg < 60) return null;

  return {
    distanciaKm,
    duracaoSegundos: duracaoSeg,
    pace: paceSegPorKm(distanciaKm, duracaoSeg),
  };
}

const PACE_BUCKETS: { label: string; minKm: number }[] = [
  { label: 'Pace geral', minKm: 1 },
  { label: 'Pace 5km', minKm: 5 },
  { label: 'Pace 10km', minKm: 10 },
  { label: 'Pace meia maratona', minKm: 21.0975 },
  { label: 'Pace maratona', minKm: 42.195 },
];

function detectarPRsCorrida(
  novoRegistro: RegistroTreino,
  historicoAnterior: RegistroTreino[],
): MedalhaPR[] {
  const medalhas: MedalhaPR[] = [];
  const novoEntry = extrairCorridaEntry(novoRegistro);
  if (!novoEntry) return [];

  const historicoEntries: CorridaEntry[] = historicoAnterior
    .map(extrairCorridaEntry)
    .filter((e): e is CorridaEntry => e !== null);

  // Maior distância
  const todasDistancias = [...historicoEntries.map((e) => e.distanciaKm), novoEntry.distanciaKm]
    .sort((a, b) => b - a);
  const posDistancia = todasDistancias.indexOf(novoEntry.distanciaKm) + 1;
  const medalDistancia = medalPorPosicao(posDistancia);
  if (medalDistancia) {
    medalhas.push({
      tipo: medalDistancia,
      categoria: 'corrida_distancia',
      label: 'Maior distância',
      valorFormatado: `${novoEntry.distanciaKm.toFixed(2)}km`,
      posicaoRanking: posDistancia,
    });
  }

  // Pace por bucket (menor pace = mais rápido = melhor)
  for (const bucket of PACE_BUCKETS) {
    if (novoEntry.distanciaKm < bucket.minKm) continue;

    const historicoNoBucket = historicoEntries
      .filter((e) => e.distanciaKm >= bucket.minKm)
      .map((e) => e.pace);

    const todosPaces = [...historicoNoBucket, novoEntry.pace].sort((a, b) => a - b); // menor = melhor
    const posPace = todosPaces.indexOf(novoEntry.pace) + 1;
    const medalPace = medalPorPosicao(posPace);
    if (medalPace) {
      medalhas.push({
        tipo: medalPace,
        categoria: 'corrida_pace',
        label: bucket.label,
        valorFormatado: formatPaceStr(novoEntry.pace),
        posicaoRanking: posPace,
      });
    }
  }

  return medalhas;
}

// ── Public API ───────────────────────────────────────────────────────────────
export function detectarPRsRegistro(
  novoRegistro: RegistroTreino,
  historicoAnterior: RegistroTreino[],
): ResultadoPRs {
  let medalhas: MedalhaPR[] = [];

  if (novoRegistro.tipo === 'musculacao' || novoRegistro.tipo === 'outro') {
    medalhas = detectarPRsMusculacao(novoRegistro, historicoAnterior);
  } else if (novoRegistro.tipo === 'corrida') {
    medalhas = detectarPRsCorrida(novoRegistro, historicoAnterior);
  }

  // Deduplica: se um exercício ganhou ouro em carga e prata em 1RM, mantém ambas
  // mas evita duplicatas exatas de label+categoria
  const vistas = new Set<string>();
  medalhas = medalhas.filter((m) => {
    const key = `${m.categoria}::${m.label}`;
    if (vistas.has(key)) return false;
    vistas.add(key);
    return true;
  });

  const xpBonus = medalhas.reduce((sum, m) => {
    if (m.tipo === 'ouro') return sum + 50;
    if (m.tipo === 'prata') return sum + 25;
    return sum + 10;
  }, 0);

  return { medalhas, xpBonus };
}

// ── LocalStorage cache ───────────────────────────────────────────────────────
const LS_KEY = 'valere_prs';

export interface PRCache {
  musculacao: Record<string, { cargaMax: number; oneRM: number; registroId: string; data: string }>;
  corrida: {
    distanciaMax?: { valor: number; registroId: string; data: string };
    paceGeral?: { valor: number; registroId: string; data: string };
  };
}

export function carregarPRCache(uid: string): PRCache {
  try {
    const raw = localStorage.getItem(`${LS_KEY}_${uid}`);
    return raw ? JSON.parse(raw) : { musculacao: {}, corrida: {} };
  } catch {
    return { musculacao: {}, corrida: {} };
  }
}

export function salvarPRCache(uid: string, cache: PRCache) {
  try {
    localStorage.setItem(`${LS_KEY}_${uid}`, JSON.stringify(cache));
  } catch { /* noop */ }
}

// ── All-time PRs (para Histórico e Dashboard) ────────────────────────────────

export interface RankedPR {
  tipo: MedalType;
  registroId: string;
  valor: number;
  valorFormatado: string;
  data: string;
}

export interface ExercicioRankings {
  nomeExercicio: string;
  rankings: RankedPR[]; // até 10 entradas ordenadas
}

export interface CategoriaCorridaRankings {
  key: string;
  label: string;
  rankings: RankedPR[];
}

export interface AllTimePRs {
  musculacao: Map<string, ExercicioRankings>;
  corrida: CategoriaCorridaRankings[];
  registrosComOuro: Set<string>;
  registrosComPrata: Set<string>;
  registrosComBronze: Set<string>;
  registrosComPR: Set<string>;
}

const CORRIDA_BUCKETS: { key: string; label: string; minKm: number }[] = [
  { key: 'dist',         label: 'Maior distância',  minKm: 0.5 },
  { key: 'pace_geral',   label: 'Melhor pace',       minKm: 1 },
  { key: 'pace_5km',     label: 'Pace 5km',          minKm: 5 },
  { key: 'pace_10km',    label: 'Pace 10km',         minKm: 10 },
  { key: 'pace_meia',    label: 'Meia maratona',     minKm: 21.0975 },
  { key: 'pace_maratona',label: 'Maratona',          minKm: 42.195 },
];

function buildRankings(
  entries: { registroId: string; valor: number; data: string }[],
  formatVal: (v: number) => string,
  ascending = false,
): RankedPR[] {
  const sorted = [...entries].sort((a, b) => ascending ? a.valor - b.valor : b.valor - a.valor);
  const result: RankedPR[] = [];
  for (let i = 0; i < Math.min(sorted.length, 10); i++) {
    const tipo = medalPorPosicao(i + 1);
    if (!tipo) break;
    result.push({
      tipo,
      registroId: sorted[i].registroId,
      valor: sorted[i].valor,
      valorFormatado: formatVal(sorted[i].valor),
      data: sorted[i].data,
    });
  }
  return result;
}

export function computeAllTimePRs(historico: RegistroTreino[]): AllTimePRs {
  // ── Musculação: uma entrada por (exercício × treino), sem exigir concluida ──
  const exEntries = new Map<string, Map<string, number>>(); // nome → registroId → cargaMax

  for (const reg of historico) {
    if (reg.tipo !== 'musculacao' && reg.tipo !== 'outro') continue;
    for (const ex of reg.exercicios) {
      const nome = ex.exercicio.nome;
      let cargaMax = 0;
      for (const serie of ex.series) {
        // Não exige concluida — histórico antigo pode não ter o flag
        cargaMax = Math.max(cargaMax, serie.peso ?? 0);
      }
      if (cargaMax === 0) continue;
      if (!exEntries.has(nome)) exEntries.set(nome, new Map());
      const byReg = exEntries.get(nome)!;
      byReg.set(reg.id, Math.max(byReg.get(reg.id) ?? 0, cargaMax));
    }
  }

  const musculacao = new Map<string, ExercicioRankings>();
  for (const [nome, byReg] of exEntries) {
    const entries = Array.from(byReg.entries()).map(([registroId, valor]) => {
      const reg = historico.find((r) => r.id === registroId);
      return { registroId, valor, data: reg?.concluidoEm ?? '' };
    });
    const rankings = buildRankings(entries, (v) => `${v}kg`);
    if (rankings.length > 0) musculacao.set(nome, { nomeExercicio: nome, rankings });
  }

  // ── Corrida: uma entrada por treino por categoria ───────────────────────────
  const distEntries = new Map<string, number>(); // registroId → distanciaKm
  const paceEntries = new Map<string, Map<string, number>>(); // key → registroId → pace

  for (const reg of historico) {
    const entry = extrairCorridaEntry(reg);
    if (!entry) continue;
    distEntries.set(reg.id, Math.max(distEntries.get(reg.id) ?? 0, entry.distanciaKm));
    for (const b of CORRIDA_BUCKETS) {
      if (b.key === 'dist' || entry.distanciaKm < b.minKm) continue;
      if (!paceEntries.has(b.key)) paceEntries.set(b.key, new Map());
      const byReg = paceEntries.get(b.key)!;
      // pace menor = melhor, guarda o menor
      const cur = byReg.get(reg.id);
      if (cur === undefined || entry.pace < cur) byReg.set(reg.id, entry.pace);
    }
  }

  const corrida: CategoriaCorridaRankings[] = [];

  if (distEntries.size > 0) {
    const entries = Array.from(distEntries.entries()).map(([registroId, valor]) => {
      const reg = historico.find((r) => r.id === registroId);
      return { registroId, valor, data: reg?.concluidoEm ?? '' };
    });
    const rankings = buildRankings(entries, (v) => `${v.toFixed(2)}km`);
    if (rankings.length > 0) corrida.push({ key: 'dist', label: 'Maior distância', rankings });
  }

  for (const b of CORRIDA_BUCKETS) {
    if (b.key === 'dist') continue;
    const byReg = paceEntries.get(b.key);
    if (!byReg || byReg.size === 0) continue;
    const entries = Array.from(byReg.entries()).map(([registroId, valor]) => {
      const reg = historico.find((r) => r.id === registroId);
      return { registroId, valor, data: reg?.concluidoEm ?? '' };
    });
    const rankings = buildRankings(entries, formatPaceStr, true); // ascending = menor pace = melhor
    if (rankings.length > 0) corrida.push({ key: b.key, label: b.label, rankings });
  }

  // ── Sets de registros por tipo de medalha ───────────────────────────────────
  const registrosComOuro  = new Set<string>();
  const registrosComPrata = new Set<string>();
  const registrosComBronze = new Set<string>();

  const addToSets = (tipo: MedalType, id: string) => {
    if (tipo === 'ouro')   registrosComOuro.add(id);
    if (tipo === 'prata')  registrosComPrata.add(id);
    if (tipo === 'bronze') registrosComBronze.add(id);
  };

  for (const ex of musculacao.values()) ex.rankings.forEach((r) => addToSets(r.tipo, r.registroId));
  for (const cat of corrida) cat.rankings.forEach((r) => addToSets(r.tipo, r.registroId));

  const registrosComPR = new Set<string>([...registrosComOuro, ...registrosComPrata, ...registrosComBronze]);

  return { musculacao, corrida, registrosComOuro, registrosComPrata, registrosComBronze, registrosComPR };
}
