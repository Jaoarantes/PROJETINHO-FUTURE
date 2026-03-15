// GIFs animados do ExerciseDB (boneco 3D com músculos destacados)
// URL: https://static.exercisedb.dev/media/{id}.gif

const BASE = 'https://static.exercisedb.dev/media';

const GIF_MAP: Record<number, string> = {
  // ─── PEITO ─────────────────────────────────
  1001: 'EIeI8Vf',   // Supino Reto com Barra → barbell bench press
  1002: '3TZduzM',   // Supino Inclinado com Barra → barbell incline bench press
  1003: 'GrO65fd',   // Supino Declinado com Barra → barbell decline bench press
  1004: 'SpYC0Kp',   // Supino Reto com Halteres → dumbbell bench press
  1005: 'ns0SIbU',   // Supino Inclinado com Halteres → dumbbell incline bench press
  1006: 'yz9nUhF',   // Crucifixo Reto com Halteres → dumbbell fly
  1007: 'Gw2HFvW',   // Crucifixo Inclinado com Halteres → dumbbell incline fly
  1008: '0CXGHya',   // Crossover no Cabo → cable cross-over
  1009: 'v3xmPAR',   // Pec Deck (Voador) → lever seated fly
  1010: 'x6KpKpq',   // Flexão de Braço → push-up
  1011: '9WTm7dq',   // Mergulho em Paralelas (Peito) → chest dip
  1012: '9XjtHvS',   // Pullover com Halter → dumbbell pullover
  1013: 'DwhEmmE',   // Supino Declinado com Halteres → dumbbell decline bench press
  1014: '0CXGHya',   // Crucifixo no Cabo (Polia) → cable cross-over
  1015: 'x6KpKpq',   // Flexão Inclinada → push-up
  1016: 'x6KpKpq',   // Flexão de Braço Fechada → close-grip push-up

  // ─── COSTAS ────────────────────────────────
  2001: 'LEprlgG',   // Puxada Frontal na Polia → lat pulldown
  2002: '4LoWllp',   // Puxada Pegada Fechada → close grip pulldown
  2003: 'eZyBC3j',   // Remada Curvada com Barra → barbell bent over row
  2004: 'C0MA9bC',   // Remada Unilateral com Halter → one arm dumbbell row
  2005: 'fUBheHs',   // Remada na Polia Baixa → cable seated row
  2006: 'aaXr7ld',   // Remada Cavalinho (T-Bar) → t-bar row
  2007: 'ila4NZS',   // Levantamento Terra → barbell deadlift
  2008: 'uTBt1HV',   // Barra Fixa (Pronada) → pull-up
  2009: 'T2mxWqc',   // Barra Fixa (Supinada) → chin-up
  2010: 'zkgRrbK',   // Hiperextensão Lombar → hyperextension
  2011: 'LEprlgG',   // Puxada no Pulley Alto → lat pulldown
  2012: 'C0MA9bC',   // Serrote com Halter → one arm dumbbell row
  2013: 'BJ0Hz5L',   // Remada Curvada com Halteres → dumbbell bent over row
  2014: 'fUBheHs',   // Remada na Máquina → cable seated row
  2015: '4LoWllp',   // Puxada Pegada Neutra → close grip pulldown

  // ─── OMBROS ────────────────────────────────
  3001: 'kTbSH9h',   // Desenvolvimento Militar → barbell overhead press
  3002: 'znQUdHY',   // Desenvolvimento com Halteres → dumbbell shoulder press
  3003: 'DsgkuIt',   // Elevação Lateral → dumbbell lateral raise
  3004: '3eGE2JC',   // Elevação Frontal → dumbbell front raise
  3005: 'DsgkuIt',   // Elevação Lateral na Polia → lateral raise
  3006: '8DiFDVA',   // Crucifixo Inverso → dumbbell rear fly
  3007: 'dG7tG5y',   // Encolhimento com Barra → barbell shrug
  3008: 'NJzBsGJ',   // Encolhimento com Halteres → dumbbell shrug
  3009: 'SpsOSXk',   // Face Pull → cable rear pulldown
  3010: 'Xy4jlWA',   // Desenvolvimento Arnold → arnold press
  3011: '3eGE2JC',   // Elevação Frontal com Barra → front raise
  3012: 'kTbSH9h',   // Desenvolvimento no Smith → overhead press
  3013: 'DsgkuIt',   // Elevação Lateral na Máquina → lateral raise

  // ─── BÍCEPS ────────────────────────────────
  4001: 'aee2Fcj',   // Rosca Direta com Barra → barbell curl
  4002: 'NbVPDMW',   // Rosca Alternada → dumbbell curl
  4003: 'slDvUAU',   // Rosca Martelo → hammer curl
  4004: 'gvsWLQw',   // Rosca Concentrada → concentration curl
  4005: 'HPlPoQA',   // Rosca no Cabo → cable curl
  4006: 'qOgPVf6',   // Rosca Scott → preacher curl
  4007: 'F3xgbjF',   // Rosca Inclinada → incline dumbbell curl
  4008: 'xNrS20v',   // Rosca Inversa → reverse barbell curl
  4009: 'aee2Fcj',   // Rosca com Barra EZ → barbell curl
  4010: 'qOgPVf6',   // Rosca Scott com Halteres → preacher curl
  4011: 'aee2Fcj',   // Rosca 21 → barbell curl
  4012: 'HPlPoQA',   // Rosca Martelo na Polia → cable hammer curl rope

  // ─── TRÍCEPS ───────────────────────────────
  5001: 'gAwDzB3',   // Tríceps Pulley → cable pushdown v-bar
  5002: 'h8LFzo9',   // Tríceps Testa → skull crusher
  5003: '2IxROQ1',   // Tríceps Francês → overhead extension
  5004: 'Gi2BXfK',   // Tríceps Coice → kickback
  5005: 'X6C6i5Y',   // Mergulho (Tríceps) → triceps dip
  5006: 'DQ0cqkT',   // Tríceps no Banco → bench dip
  5007: 'dU605di',   // Tríceps Corda → rope pushdown
  5008: 'J6Dx1Mu',   // Supino Fechado → close grip bench press
  5009: 'h8LFzo9',   // Tríceps Testa Halteres → skull crusher
  5010: 'h8LFzo9',   // Tríceps Testa Polia → skull crusher
  5011: 'h8LFzo9',   // Tríceps Francês Barra EZ → skull crusher
  5012: '2IxROQ1',   // Tríceps Francês Polia → overhead extension
  5013: 'Gi2BXfK',   // Tríceps Coice Polia → kickback
  5014: 'gAwDzB3',   // Tríceps Pulley V Bar → cable pushdown

  // ─── PERNAS ────────────────────────────────
  6001: 'qXTaZnJ',   // Agachamento Livre → barbell full squat
  6002: '10Z2DXU',   // Leg Press 45° → sled leg press
  6003: 'my33uHU',   // Extensão de Joelhos → leg extension
  6004: 'Zg3XY7P',   // Flexão de Joelhos → seated leg curl
  6005: '5VCj6iH',   // Agachamento Hack → hack squat
  6006: 'RRWFUcw',   // Avanço com Halteres → dumbbell lunge
  6007: 'hrVQWvE',   // Stiff com Barra → stiff leg deadlift
  6008: 'yn8yg1r',   // Agachamento Goblet → goblet squat
  6009: 'IZVHb27',   // Passada com Barra → walking lunge
  6010: 'HUEqZ1y',   // Agachamento Búlgaro → split squat
  6011: 'oHsrypV',   // Cadeira Adutora → hip adduction
  6012: 'CHpahtl',   // Cadeira Abdutora → hip abduction
  6013: 'KgI0tqW',   // Agachamento Sumô → sumo deadlift
  6014: '10Z2DXU',   // Leg Press Unilateral → leg press
  6015: 'zG0zs85',   // Agachamento Frontal → front squat
  6016: 'hrVQWvE',   // Stiff Unilateral → stiff leg deadlift
  6017: 'hrVQWvE',   // Stiff com Halteres → stiff leg deadlift
  6018: 'Zg3XY7P',   // Flexão em Pé → leg curl
  6019: 'NNoHCEA',   // Agachamento Smith → smith squat
  6020: 'my33uHU',   // Extensora Unilateral → leg extension

  // ─── PANTURRILHA ───────────────────────────
  7001: '8ozhUIZ',   // Panturrilha em Pé → standing calf raise
  7002: 'bOOdeyc',   // Panturrilha Sentado → seated calf raise
  7003: 'ykHcWme',   // Panturrilha Leg Press → calf press
  7004: '8ozhUIZ',   // Panturrilha Unilateral → standing calf raise
  7005: '8ozhUIZ',   // Panturrilha Smith → standing calf raise

  // ─── GLÚTEOS ───────────────────────────────
  8001: 'qKBpF7I',   // Hip Thrust → glute bridge
  8002: 'u0cNiij',   // Elevação Pélvica → low glute bridge
  8003: 'Kpajagk',   // Glúteo no Cabo → cable hip extension
  8004: 'KgI0tqW',   // Agachamento Sumô Halter → sumo deadlift
  8005: 'IZVHb27',   // Avanço Passada Longa → walking lunge
  8007: 'qKBpF7I',   // Hip Thrust Halter → glute bridge
  8008: 'Kpajagk',   // Glúteo 4 Apoios Polia → cable hip extension
  8009: 'CHpahtl',   // Abdução Quadril Cabo → hip abduction

  // ─── ABDÔMEN ───────────────────────────────
  9001: 'TFqbd8t',   // Abdominal Crunch → crunch
  9002: 'WW95auq',   // Abdominal no Cabo → cable crunch
  9003: 'I3tsCnC',   // Elevação de Pernas → hanging leg raise
  9004: 'VBAWRPG',   // Prancha → plank
  9005: 'XVDdcoj',   // Oblíquo Russo → russian twist
  9006: 'RJgzwny',   // Mountain Climber → mountain climber
  9007: 'I3tsCnC',   // Abdominal Infra → hanging leg raise
  9008: 'NAgVB3t',   // Roda Abdominal → ab wheel
  9009: 'tZkGYZ9',   // Abdominal Bicicleta → bicycle crunch
  9010: 'TFqbd8t',   // Crunch Reverso → crunch

  // ─── ANTEBRAÇO ─────────────────────────────
  10001: '82LxxkW',  // Rosca de Pulso → wrist curl
  10002: 'BLCvwr2',  // Rosca Pulso Inversa → reverse wrist curl
  10003: 'qPEzJjA',  // Farmer Walk → farmer walk

  // ─── CARDIO ────────────────────────────────
  11005: 'e1e76I2',  // Corda de Pular → jump rope
  11006: 'dK9394r',  // Burpee → burpee
  11007: 'UHJlbu3',  // Kettlebell Swing → kettlebell swing
};

export function getExerciseImageUrl(exerciseId: number): string | undefined {
  const id = GIF_MAP[exerciseId];
  if (!id) return undefined;
  return `${BASE}/${id}.gif`;
}

export function getExerciseImageUrls(exerciseId: number): [string] | undefined {
  const url = getExerciseImageUrl(exerciseId);
  if (!url) return undefined;
  return [url];
}
