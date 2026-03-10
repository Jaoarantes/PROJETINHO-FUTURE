import type { PerfilCorporal, NivelAtividade, MetasDieta } from '../types/dieta';

// Fatores NEAT (atividade diária sem exercícios)
const NEAT_FATORES: Record<NivelAtividade, number> = {
    sedentario: 1.2,
    leve: 1.375,
    moderado: 1.55,
    bastante_ativo: 1.725,
    extremamente_ativo: 1.9,
};

// Calorias extras por sessão de musculação (baseado em intensidade)
const MUSCULACAO_CAL: Record<string, number> = {
    leve: 3,        // kcal/min
    moderado: 5,
    intenso: 7,
    insano: 9,
};

// Calorias extras por sessão de cardio
const CARDIO_CAL: Record<string, number> = {
    leve: 5,
    moderada: 8,
    intensa: 12,
};

/**
 * Calcula TMB via Mifflin-St Jeor
 * Se houver gordura corporal, usa Katch-McArdle (mais preciso)
 */
export function calcularTMB(perfil: PerfilCorporal): number {
    const { sexo, peso, altura, idade, gorduraCorporal } = perfil;

    // Katch-McArdle se tiver % gordura
    if (gorduraCorporal && gorduraCorporal > 0) {
        const massaMagra = peso * (1 - gorduraCorporal / 100);
        return Math.round(370 + 21.6 * massaMagra);
    }

    // Mifflin-St Jeor
    const base = 10 * peso + 6.25 * altura - 5 * idade;
    return Math.round(sexo === 'masculino' ? base + 5 : base - 161);
}

/**
 * Calcula TDEE considerando NEAT + exercícios
 * Modelo Hipertrofia.org: NEAT base + calorias de musculação + calorias de cardio
 */
export function calcularTDEE(perfil: PerfilCorporal): number {
    const tmb = calcularTMB(perfil);
    let tdee = tmb * NEAT_FATORES[perfil.nivelAtividade];

    // Adicionar gasto com musculação (distribuído na semana)
    if (perfil.fazMusculacao && perfil.musculacaoDias > 0) {
        const calPorSessao = MUSCULACAO_CAL[perfil.musculacaoIntensidade] * perfil.musculacaoDuracao;
        tdee += (calPorSessao * perfil.musculacaoDias) / 7;
    }

    // Adicionar gasto com cardio
    if (perfil.fazCardio && perfil.cardioDias > 0) {
        const calPorSessao = CARDIO_CAL[perfil.cardioIntensidade] * perfil.cardioDuracao;
        tdee += (calPorSessao * perfil.cardioDias) / 7;
    }

    return Math.round(tdee);
}

/**
 * Gera metas baseado no modelo Hipertrofia.org
 *
 * 1 kg de gordura ≈ 7700 kcal
 * Então metaSemanal (kg) × 7700 / 7 = déficit/superávit diário
 */
export function calcularMetasPersonalizadas(perfil: PerfilCorporal): MetasDieta {
    const tdee = calcularTDEE(perfil);

    let calorias: number;
    const ajusteDiario = Math.round((perfil.metaSemanal * 7700) / 7);

    switch (perfil.objetivo) {
        case 'perder':
            calorias = tdee - ajusteDiario;
            break;
        case 'ganhar':
            calorias = tdee + ajusteDiario;
            break;
        default:
            calorias = tdee;
    }

    // Mínimo seguro
    calorias = Math.max(calorias, 1200);

    // Macros por g/kg (modelo Hipertrofia.org)
    const proteinas = Math.round(perfil.peso * perfil.proteinaGKg);
    const gorduras = Math.round(perfil.peso * perfil.gorduraGKg);

    const calProteinas = proteinas * 4;
    const calGorduras = gorduras * 9;
    const calRestante = calorias - calProteinas - calGorduras;
    const carboidratos = Math.max(Math.round(calRestante / 4), 50);

    return {
        calorias: Math.round(calorias),
        proteinas,
        carboidratos,
        gorduras,
        agua: 2500,
    };
}
