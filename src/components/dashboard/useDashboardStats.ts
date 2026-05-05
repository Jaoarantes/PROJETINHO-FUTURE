import { useMemo } from 'react';
import {
  calcularDistanciaCorrida,
  calcularDistanciaNatacao,
  calcularVolumeExercicio,
  calcularVolumeSessao,
} from '../../types/treino';
import { calcularCaloriasTreino } from '../../utils/calorieCalculator';
import {
  PERIODOS,
  calcPace,
  calcular1RM,
  formatDateLabel,
  getConcluidoDate,
  parseDateLocal,
  startOfWeek,
  toLocalDateStr,
  type PeriodoKey,
} from './dashboardUtils';

export default function useDashboardStats(historicoFiltrado: any[], periodo: PeriodoKey) {
  return useMemo(() => {
    const total = historicoFiltrado.length;
    const musculacao = historicoFiltrado.filter((r) => r.tipo === 'musculacao');
    const corrida = historicoFiltrado.filter((r) => r.tipo === 'corrida');
    const natacao = historicoFiltrado.filter((r) => r.tipo === 'natacao');

    const tempoTotal = historicoFiltrado.reduce((a, r) => a + (r.duracaoTotalSegundos || 0), 0);
    const caloriasTotais = historicoFiltrado.reduce((a, r) => a + Math.round(Number(r.calorias) || calcularCaloriasTreino(r)), 0);

    // Volume por treino e por grupo muscular (stacked)
    const allMuscleGroups = new Set<string>();
    const volumeData = [...musculacao]
      .sort((a, b) => a.concluidoEm.localeCompare(b.concluidoEm))
      .map((r) => {
        const entry: Record<string, any> = {
          label: formatDateLabel(getConcluidoDate(r.concluidoEm)),
          volume: calcularVolumeSessao(r.exercicios),
        };
        // Calcular volume por grupo muscular
        r.exercicios.forEach((ex: any) => {
          const grupo = ex.exercicio.grupoMuscular || 'Outros';
          allMuscleGroups.add(grupo);
          entry[grupo] = (entry[grupo] || 0) + calcularVolumeExercicio(ex.series);
        });
        return entry;
      });
    const volumeMuscleGroups = Array.from(allMuscleGroups);

    // Radar: volume total por grupo muscular
    const volumePorGrupoTotal: Record<string, number> = {};
    volumeData.forEach(d => {
      volumeMuscleGroups.forEach(grupo => {
        volumePorGrupoTotal[grupo] = (volumePorGrupoTotal[grupo] || 0) + (d[grupo] || 0);
      });
    });
    const radarVolumeData = volumeMuscleGroups
      .map(grupo => ({ grupo, volume: Math.round(volumePorGrupoTotal[grupo] || 0) }))
      .filter(d => d.volume > 0)
      .sort((a, b) => b.volume - a.volume);

    const exercicioMap = new Map<string, { nome: string; dados: any[] }>();
    [...musculacao]
      .sort((a, b) => a.concluidoEm.localeCompare(b.concluidoEm))
      .forEach((r) => {
        r.exercicios.forEach((ex: any) => {
          const nome = ex.exercicio.nome;
          if (!exercicioMap.has(nome)) exercicioMap.set(nome, { nome, dados: [] });
          const pesoMax = Math.max(...ex.series.map((s: any) => (s as any).peso ?? 0), 0);
          const repsMax = Math.max(...ex.series.map((s: any) => (s as any).repeticoes ?? 0), 0);
          const vol = calcularVolumeExercicio(ex.series);
          const umRMs = ex.series.map((s: any) => calcular1RM((s as any).peso ?? 0, (s as any).repeticoes ?? 0));
          const melhor1RM = Math.max(...umRMs, 0);

          exercicioMap.get(nome)!.dados.push({
            label: formatDateLabel(getConcluidoDate(r.concluidoEm)),
            dataISO: r.concluidoEm,
            pesoMax,
            repsMax,
            volume: vol,
            series: ex.series.length,
            umRM: Number(melhor1RM.toFixed(1))
          });
        });
      });
    const exercicioEvolucaoFull = Array.from(exercicioMap.values())
      .sort((a, b) => b.dados.length - a.dados.length);

    // Carga máxima por exercício + evolução de carga
    const cargaMaxPorExercicio: Record<string, { nome: string; cargaMax: number; data: string }> = {};
    const cargaEvolucaoPorExercicio: Record<string, { label: string; cargaMax: number }[]> = {};
    let ultimoExercicioFeito = '';
    const musculacaoOrdenada = [...musculacao].sort((a, b) => a.concluidoEm.localeCompare(b.concluidoEm));
    musculacaoOrdenada.forEach(r => {
      r.exercicios.forEach((ex: any) => {
        const nome = ex.exercicio.nome;
        const pesoMax = Math.max(...ex.series.map((s: any) => (s as any).peso ?? 0), 0);
        if (pesoMax <= 0) return;
        if (!cargaMaxPorExercicio[nome] || pesoMax > cargaMaxPorExercicio[nome].cargaMax) {
          cargaMaxPorExercicio[nome] = { nome, cargaMax: pesoMax, data: r.concluidoEm };
        }
        if (!cargaEvolucaoPorExercicio[nome]) cargaEvolucaoPorExercicio[nome] = [];
        cargaEvolucaoPorExercicio[nome].push({
          label: formatDateLabel(getConcluidoDate(r.concluidoEm)),
          cargaMax: pesoMax,
        });
        ultimoExercicioFeito = nome;
      });
    });
    const cargaMaxData = Object.values(cargaMaxPorExercicio)
      .filter(d => d.cargaMax > 0)
      .sort((a, b) => b.cargaMax - a.cargaMax);
    const cargaExercicioNomes = cargaMaxData.map(d => d.nome);

    const paceData = [...corrida]
      .sort((a, b) => a.concluidoEm.localeCompare(b.concluidoEm))
      .map((r) => {
        if (!r.corrida?.etapas) return null;
        const dist = calcularDistanciaCorrida(r.corrida.etapas);
        const durMin = r.corrida.etapas.reduce((a: number, e: any) => a + (e.duracaoMin ?? 0), 0);
        const pace = calcPace(dist, durMin);
        if (!pace || pace > 20) return null;
        return {
          label: formatDateLabel(getConcluidoDate(r.concluidoEm)),
          pace: Number(pace.toFixed(2)),
          distancia: dist,
        };
      })
      .filter(Boolean) as { label: string; pace: number; distancia: number }[];

    const corridaDistData = [...corrida]
      .sort((a, b) => a.concluidoEm.localeCompare(b.concluidoEm))
      .map((r) => {
        if (!r.corrida?.etapas) return null;
        const dist = calcularDistanciaCorrida(r.corrida.etapas);
        if (!dist) return null;
        return { label: formatDateLabel(getConcluidoDate(r.concluidoEm)), distancia: dist };
      })
      .filter(Boolean) as { label: string; distancia: number }[];

    const natacaoData = [...natacao]
      .sort((a, b) => a.concluidoEm.localeCompare(b.concluidoEm))
      .map((r) => {
        if (!r.natacao?.etapas) return null;
        const dist = calcularDistanciaNatacao(r.natacao.etapas);
        if (!dist) return null;
        return { label: formatDateLabel(getConcluidoDate(r.concluidoEm)), distancia: dist };
      })
      .filter(Boolean) as { label: string; distancia: number }[];

    const natacaoPaceData = [...natacao]
      .sort((a, b) => a.concluidoEm.localeCompare(b.concluidoEm))
      .map((r) => {
        if (!r.natacao?.etapas) return null;
        const distM = calcularDistanciaNatacao(r.natacao.etapas);
        const durMin = r.natacao.etapas.reduce((a: number, e: any) => a + (e.duracaoMin ?? 0), 0);
        if (!distM || distM <= 0 || !durMin) return null;
        const pace100m = (durMin / distM) * 100;
        if (pace100m > 20) return null;
        return { label: formatDateLabel(getConcluidoDate(r.concluidoEm)), pace: Number(pace100m.toFixed(2)) };
      })
      .filter(Boolean) as { label: string; pace: number }[];

    const semanasMap = new Map<string, { musculacao: number; corrida: number; natacao: number }>();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const configPeriodo = PERIODOS.find((p) => p.key === periodo)!;
    const numSemanas = Math.min(Math.ceil(configPeriodo.dias / 7), 52);

    for (let i = numSemanas - 1; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - d.getDay() - i * 7);
      const key = toLocalDateStr(d);
      semanasMap.set(key, { musculacao: 0, corrida: 0, natacao: 0 });
    }

    historicoFiltrado.forEach((r) => {
      const d = new Date(r.concluidoEm);
      const sw = startOfWeek(d);
      const key = toLocalDateStr(sw);
      let entry = semanasMap.get(key);
      if (!entry) {
        const sortedKeys = Array.from(semanasMap.keys()).sort();
        const matchingKey = sortedKeys.find(k => {
          const kw = parseDateLocal(k);
          const nextKw = new Date(kw);
          nextKw.setDate(nextKw.getDate() + 7);
          return d >= kw && d < nextKw;
        });
        if (matchingKey) entry = semanasMap.get(matchingKey);
      }
      if (entry) {
        if (r.tipo === 'musculacao') entry.musculacao++;
        else if (r.tipo === 'corrida') entry.corrida++;
        else if (r.tipo === 'natacao') entry.natacao++;
      }
    });

    const frequenciaData = Array.from(semanasMap.entries())
      .map(([date, counts]) => ({ label: formatDateLabel(date), ...counts }));

    const frequenciaFormatada = frequenciaData.map((d, i) => ({
      ...d,
      labelVisible: frequenciaData.length > 12 ? (i % 2 === 0 ? d.label : '') : d.label
    }));

    let melhorVolume = 0;
    let melhorVolumeInfo = { nome: '', data: '' };
    musculacao.forEach(r => {
      const vol = calcularVolumeSessao(r.exercicios);
      if (vol > melhorVolume) {
        melhorVolume = vol;
        melhorVolumeInfo = { nome: r.nome || 'Treino sem nome', data: r.concluidoEm };
      }
    });
    let maiorDistCorrida = 0;
    let maiorDistCorridaInfo = { nome: '', data: '' };
    let melhorPaceCorrida = Infinity;
    let melhorPaceCorridaInfo = { nome: '', data: '', distancia: 0 };
    corrida.forEach(r => {
      if (!r.corrida?.etapas) return;
      const dist = calcularDistanciaCorrida(r.corrida.etapas);
      if (dist > maiorDistCorrida) {
        maiorDistCorrida = dist;
        maiorDistCorridaInfo = { nome: r.nome || 'Corrida', data: r.concluidoEm };
      }
      const durMin = r.corrida.etapas.reduce((a: number, e: any) => a + (e.duracaoMin ?? 0), 0);
      const pace = calcPace(dist, durMin);
      if (pace && pace < melhorPaceCorrida && pace <= 20) {
        melhorPaceCorrida = pace;
        melhorPaceCorridaInfo = { nome: r.nome || 'Corrida', data: r.concluidoEm, distancia: dist };
      }
    });

    let maiorDistNatacao = 0;
    let maiorDistNatacaoInfo = { nome: '', data: '' };
    let melhorPaceNatacao = Infinity;
    let melhorPaceNatacaoInfo = { nome: '', data: '', distancia: 0 };
    natacao.forEach(r => {
      if (!r.natacao?.etapas) return;
      const dist = calcularDistanciaNatacao(r.natacao.etapas);
      if (dist > maiorDistNatacao) {
        maiorDistNatacao = dist;
        maiorDistNatacaoInfo = { nome: r.nome || 'Natação', data: r.concluidoEm };
      }
      const durMin = r.natacao.etapas.reduce((a: number, e: any) => a + (e.duracaoMin ?? 0), 0);
      if (dist > 0 && durMin > 0) {
        const pace100m = (durMin / dist) * 100;
        if (pace100m < melhorPaceNatacao && pace100m <= 20) {
          melhorPaceNatacao = pace100m;
          melhorPaceNatacaoInfo = { nome: r.nome || 'Natação', data: r.concluidoEm, distancia: dist };
        }
      }
    });

    // Streak calculation
    const diasTreinados = new Set(historicoFiltrado.map(r => getConcluidoDate(r.concluidoEm)));
    let streak = 0;
    const hj = new Date();
    hj.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(hj);
      d.setDate(d.getDate() - i);
      if (diasTreinados.has(toLocalDateStr(d))) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // Média de treinos por semana
    const configP = PERIODOS.find((p) => p.key === periodo)!;
    const semanas = Math.max(1, configP.dias / 7);
    const mediaSemanal = total / Math.min(semanas, 52);

    // Muscle distribution data
    const muscleCounts: Record<string, number> = {};
    musculacao.forEach(reg => {
      reg.exercicios?.forEach((ex: any) => {
        if (!ex.exercicio || !ex.series) return;
        const grupo = ex.exercicio.grupoMuscular || 'Outros';
        muscleCounts[grupo] = (muscleCounts[grupo] || 0) + ex.series.length;
      });
    });
    const muscleData = Object.entries(muscleCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Distribuição muscular por semana (stacked bar)
    const muscleWeekMap = new Map<string, Record<string, number>>();
    const allMuscleGroupsWeek = new Set<string>();
    musculacao.forEach(reg => {
      const d = new Date(reg.concluidoEm);
      const sw = startOfWeek(d);
      const weekKey = toLocalDateStr(sw);
      if (!muscleWeekMap.has(weekKey)) muscleWeekMap.set(weekKey, {});
      const weekEntry = muscleWeekMap.get(weekKey)!;
      reg.exercicios?.forEach((ex: any) => {
        if (!ex.exercicio || !ex.series) return;
        const grupo = ex.exercicio.grupoMuscular || 'Outros';
        allMuscleGroupsWeek.add(grupo);
        weekEntry[grupo] = (weekEntry[grupo] || 0) + ex.series.length;
      });
    });
    const muscleWeekData = Array.from(muscleWeekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ label: formatDateLabel(date), ...counts }));
    const muscleWeekGroups = Array.from(allMuscleGroupsWeek);

    return {
      total, musculacao: musculacao.length, corrida: corrida.length, natacao: natacao.length,
      tempoTotal, caloriasTotais, volumeData, volumeMuscleGroups, radarVolumeData, exercicioEvolucaoFull, paceData, corridaDistData,
      natacaoData, natacaoPaceData, frequenciaFormatada, melhorVolume, melhorVolumeInfo,
      maiorDistCorrida, maiorDistCorridaInfo, melhorPaceCorridaInfo,
      maiorDistNatacao, maiorDistNatacaoInfo, melhorPaceNatacaoInfo,
      cargaMaxData, cargaEvolucaoPorExercicio, cargaExercicioNomes, ultimoExercicioFeito,
      temMaisExercicios: exercicioEvolucaoFull.length > 3,
      streak, mediaSemanal, muscleData, topMuscle: muscleData[0]?.name || '—',
      muscleWeekData, muscleWeekGroups,
    };
  }, [historicoFiltrado, periodo]);
}
