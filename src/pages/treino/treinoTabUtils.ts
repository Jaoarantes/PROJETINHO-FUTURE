import type { RegistroTreino, SessaoTreino, TipoSessao } from '../../types/treino';
import { calcularDistanciaCorrida, calcularDistanciaNatacao } from '../../types/treino';

export const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export function formatarPace(mps: number): string {
  if (!mps || mps <= 0) return '--:--';
  const minKm = 1000 / (mps * 60);
  const mins = Math.floor(minKm);
  const secs = Math.round((minKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /km`;
}

export function formatarSegundos(seg: number): string {
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
  const mesmoDia = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (mesmoDia(data, hoje)) return 'Hoje';
  if (mesmoDia(data, ontem)) return 'Ontem';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(data);
}

export function agruparHistoricoPorData(registros: RegistroTreino[]) {
  const mapa = new Map<string, RegistroTreino[]>();
  const ordemChaves: string[] = [];
  for (const reg of registros) {
    const d = new Date(reg.concluidoEm);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!mapa.has(chave)) {
      mapa.set(chave, []);
      ordemChaves.push(chave);
    }
    mapa.get(chave)!.push(reg);
  }
  return ordemChaves.map((chave) => {
    const regs = mapa.get(chave)!;
    return { chave, label: formatarDataGrupo(regs[0].concluidoEm), registros: regs };
  });
}

export const TIPO_CORES: Record<TipoSessao, string> = {
  musculacao: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
  corrida: 'linear-gradient(135deg, #FF6B2C 0%, #E55A1B 100%)',
  natacao: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  outro: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
};

export const TIPO_PLACEHOLDERS: Record<TipoSessao, string> = {
  musculacao: 'Ex: Treino A — Peito e Tríceps',
  corrida: 'Ex: Corrida matinal',
  natacao: 'Ex: Natação 1km',
  outro: 'Ex: Pedal matinal',
};

export function ordenarTreinos(sessoes: SessaoTreino[]): SessaoTreino[] {
  return [...sessoes].sort((a, b) => {
    if (a.posicao !== undefined && b.posicao !== undefined && a.posicao !== b.posicao) {
      return a.posicao - b.posicao;
    }
    const ia = a.diaSemana ? diasSemana.indexOf(a.diaSemana) : 99;
    const ib = b.diaSemana ? diasSemana.indexOf(b.diaSemana) : 99;
    return ia - ib;
  });
}

export function agruparPorTipo(sessoes: SessaoTreino[]): Record<TipoSessao, SessaoTreino[]> {
  const grupos: Record<TipoSessao, SessaoTreino[]> = { musculacao: [], corrida: [], natacao: [], outro: [] };
  sessoes.forEach((s) => {
    const tipo = s.tipo || 'musculacao';
    grupos[tipo].push(s);
  });
  return grupos;
}

export function getSessaoSubtitle(sessao: SessaoTreino) {
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
  const prefix = tipo === 'outro' && sessao.tipoCustom ? `${sessao.tipoCustom} · ` : '';
  return `${prefix}${count} exercício${count !== 1 ? 's' : ''}`;
}
