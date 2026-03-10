/**
 * Gera URL de GIF animado para exercícios.
 * Usa a API pública do MuscleWiki / ExerciseDB.
 * Fallback: gera uma URL de busca no Google Images como placeholder.
 */

// Mapeamento dos exercícios padrão para IDs do ExerciseDB (API gratuita)
// Fonte: https://exercisedb.io / https://api.exercisedb.io
const EXERCISE_GIF_MAP: Record<number, string> = {
    // Peito
    1001: '0025', // Supino Reto
    1002: '0027', // Supino Inclinado
    1004: '0289', // Supino Reto com Halteres
    1005: '0291', // Supino Inclinado com Halteres
    1006: '0326', // Crucifixo Reto
    1008: '0160', // Crossover
    1010: '0662', // Flexão de Braço
    // Costas
    2001: '0150', // Puxada Frontal
    2003: '0027', // Remada Curvada
    2004: '0293', // Remada Unilateral
    2007: '0032', // Levantamento Terra
    2008: '0651', // Barra Fixa Pronada
    // Ombros
    3001: '0085', // Desenvolvimento Militar
    3002: '0274', // Desenvolvimento Halteres
    3003: '0277', // Elevação Lateral
    // Bíceps
    4001: '0023', // Rosca Direta
    4002: '0271', // Rosca Alternada
    4003: '0284', // Rosca Martelo
    // Tríceps
    5001: '0860', // Tríceps Pulley
    5002: '0035', // Tríceps Testa
    // Pernas
    6001: '0043', // Agachamento
    6002: '0564', // Leg Press
    6003: '0588', // Extensora
    6007: '0032', // Stiff
};

/**
 * Retorna a URL do GIF para um exercício.
 * Se o exercício tiver gifUrl definido, usa esse.
 * Caso contrário, tenta o mapeamento ExerciseDB.
 * Como fallback, retorna undefined (sem GIF).
 */
export function getExerciseGifUrl(exercicioId: number, gifUrlOverride?: string): string | undefined {
    if (gifUrlOverride) return gifUrlOverride;

    const dbId = EXERCISE_GIF_MAP[exercicioId];
    if (dbId) {
        return `https://v2.exercisedb.io/image/${dbId}`;
    }

    return undefined;
}
