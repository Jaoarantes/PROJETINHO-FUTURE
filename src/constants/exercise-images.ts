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
  1007: 'ESOd5Pl',   // Crucifixo Inclinado com Halteres → dumbbell incline fly
  1008: '0CXGHya',   // Crossover no Cabo → cable cross-over variation
  1009: 'v3xmPAR',   // Pec Deck (Voador) → lever seated fly
  1010: 'I4hDWkc',   // Flexão de Braço → push-up
  1011: '9WTm7dq',   // Mergulho em Paralelas (Peito) → chest dip
  1012: '9XjtHvS',   // Pullover com Halter → dumbbell pullover
  1013: 'DwhEmmE',   // Supino Declinado com Halteres → dumbbell decline bench press
  1014: 'FVmZVhk',   // Crucifixo no Cabo (Polia) → cable low fly
  1015: 'i5cEhka',   // Flexão Inclinada (pés elevados) → decline push-up
  1016: 'soIB2rj',   // Flexão de Braço Fechada → diamond push-up

  // ─── COSTAS ────────────────────────────────
  2001: 'LEprlgG',   // Puxada Frontal na Polia → cable lat pulldown full range of motion
  2002: 'DptumMx',   // Puxada Pegada Fechada → band close-grip pulldown
  2003: 'eZyBC3j',   // Remada Curvada com Barra → barbell bent over row
  2004: 'C0MA9bC',   // Remada Unilateral com Halter → dumbbell one arm bent-over row
  2005: 'fUBheHs',   // Remada na Polia Baixa → cable seated row
  2006: 'aaXr7ld',   // Remada Cavalinho (T-Bar) → lever t bar row
  2007: 'ila4NZS',   // Levantamento Terra → barbell deadlift
  2008: 'lBDjFxJ',   // Barra Fixa (Pronada) → pull-up
  2009: 'T2mxWqc',   // Barra Fixa (Supinada) → chin-up
  2010: 'zhMwOwE',   // Hiperextensão Lombar → hyperextension
  2011: 'CmEr4pM',   // Puxada no Pulley Alto → cable wide grip rear pulldown behind neck
  2012: 'C0MA9bC',   // Serrote com Halter → dumbbell one arm bent-over row
  2013: 'BJ0Hz5L',   // Remada Curvada com Halteres → dumbbell bent over row
  2014: '7I6LNUG',   // Remada na Máquina → lever seated row
  2015: 'rkg41Fb',   // Puxada Pegada Neutra → twin handle parallel grip lat pulldown

  // ─── OMBROS ────────────────────────────────
  3001: 'Kyd9Rz5',   // Desenvolvimento Militar com Barra → barbell standing wide military press
  3002: 'znQUdHY',   // Desenvolvimento com Halteres → dumbbell seated shoulder press
  3003: 'DsgkuIt',   // Elevação Lateral com Halteres → dumbbell lateral raise
  3004: '3eGE2JC',   // Elevação Frontal com Halteres → dumbbell front raise
  3005: 'goJ6ezq',   // Elevação Lateral na Polia → cable lateral raise
  3006: '8DiFDVA',   // Crucifixo Inverso com Halteres → dumbbell rear fly
  3007: 'dG7tG5y',   // Encolhimento com Barra → barbell shrug
  3008: 'NJzBsGJ',   // Encolhimento com Halteres → dumbbell shrug
  3009: 'SpsOSXk',   // Face Pull na Polia → cable rear pulldown
  3010: 'Xy4jlWA',   // Desenvolvimento Arnold → dumbbell arnold press
  3011: 'b2Uoz54',   // Elevação Frontal com Barra → barbell front raise
  3012: '903mzG8',   // Desenvolvimento no Smith → smith shoulder press
  3013: 'dRTfGZT',   // Elevação Lateral na Máquina → lever lateral raise

  // ─── BÍCEPS ────────────────────────────────
  4001: '25GPyDY',   // Rosca Direta com Barra → barbell curl
  4002: 'BU15nH4',   // Rosca Alternada com Halteres → dumbbell alternate biceps curl
  4003: 'slDvUAU',   // Rosca Martelo com Halteres → dumbbell hammer curl
  4004: 'gvsWLQw',   // Rosca Concentrada → dumbbell concentration curl
  4005: 'G08RZcQ',   // Rosca no Cabo (Polia Baixa) → cable curl
  4006: 'qOgPVf6',   // Rosca Scott com Barra → barbell preacher curl
  4007: 'F3xgbjF',   // Rosca Inclinada com Halteres → dumbbell incline biceps curl
  4008: 'xNrS20v',   // Rosca Inversa com Barra → barbell reverse curl
  4009: '6TG6x2w',   // Rosca Direta com Barra EZ → ez barbell curl
  4010: 'jivWf8n',   // Rosca Scott com Halteres → dumbbell preacher curl
  4011: '25GPyDY',   // Rosca 21 → barbell curl
  4012: 'HPlPoQA',   // Rosca Martelo na Polia (Corda) → cable hammer curl (with rope)

  // ─── TRÍCEPS ───────────────────────────────
  5001: '3ZflifB',   // Tríceps Pulley (Cabo) → cable pushdown
  5002: 'h8LFzo9',   // Tríceps Testa com Barra → barbell lying triceps extension skull crusher
  5003: 'PdmaD0N',   // Tríceps Francês com Halter → dumbbell standing triceps extension
  5004: 'W6PxUkg',   // Tríceps Coice com Halter → dumbbell kickback
  5005: 'X6C6i5Y',   // Mergulho em Paralelas (Tríceps) → triceps dip
  5006: 'DQ0cqkT',   // Tríceps no Banco → three bench dip
  5007: 'dU605di',   // Tríceps Corda no Cabo → cable pushdown (with rope attachment)
  5008: 'J6Dx1Mu',   // Supino Fechado → barbell close-grip bench press
  5009: 'mpKZGWz',   // Tríceps Testa com Halteres → dumbbell lying triceps extension
  5010: 'uxJcFUU',   // Tríceps Testa na Polia → cable lying triceps extension v. 2
  5011: 'iZop9xO',   // Tríceps Francês com Barra EZ → barbell lying triceps extension
  5012: '2IxROQ1',   // Tríceps Francês na Polia → cable overhead triceps extension (rope attachment)
  5013: 'HEJ6DIX',   // Tríceps Coice na Polia → cable kickback
  5014: 'gAwDzB3',   // Tríceps Pulley com V Bar → cable triceps pushdown (v-bar)

  // ─── PERNAS ────────────────────────────────
  6001: 'qXTaZnJ',   // Agachamento Livre com Barra → barbell full squat
  6002: '10Z2DXU',   // Leg Press 45° → sled 45° leg press
  6003: 'my33uHU',   // Extensão de Joelhos → lever leg extension
  6004: '17lJ1kr',   // Flexão de Joelhos → lever lying leg curl
  6005: '5VCj6iH',   // Agachamento Hack → barbell hack squat
  6006: 'RRWFUcw',   // Avanço com Halteres → dumbbell lunge
  6007: 'hrVQWvE',   // Stiff com Barra → barbell straight leg deadlift
  6008: 'yn8yg1r',   // Agachamento Goblet → dumbbell goblet squat
  6009: 'IZVHb27',   // Passada com Barra → walking lunge
  6010: 'HBYyX94',   // Agachamento Búlgaro → barbell split squat v. 2
  6011: 'oHsrypV',   // Cadeira Adutora → lever seated hip adduction
  6012: 'CHpahtl',   // Cadeira Abdutora → lever seated hip abduction
  6013: 'dzz6BiV',   // Agachamento Sumô → smith sumo squat
  6014: 'WWD6FzI',   // Leg Press Unilateral → sled 45 degrees one leg press
  6015: 'zG0zs85',   // Agachamento Frontal com Barra → barbell front squat
  6016: 'gKozT8X',   // Stiff Unilateral com Halter → dumbbell single leg deadlift
  6017: '5eLRITT',   // Stiff com Halteres → dumbbell stiff leg deadlift
  6018: 'C5jncD2',   // Flexão de Joelhos em Pé → standing single leg curl
  6019: 'NNoHCEA',   // Agachamento no Smith → smith full squat
  6020: 'my33uHU',   // Cadeira Extensora Unilateral → lever leg extension

  // ─── PANTURRILHA ───────────────────────────
  7001: '8ozhUIZ',   // Panturrilha em Pé → barbell standing calf raise
  7002: 'bOOdeyc',   // Panturrilha Sentado → lever seated calf raise
  7003: 'ykHcWme',   // Panturrilha no Leg Press → sled calf press on leg press
  7004: '1kB3Wmk',   // Panturrilha Unilateral → dumbbell single leg calf raise
  7005: '6MaEjVA',   // Panturrilha no Smith → smith standing leg calf raise

  // ─── GLÚTEOS ───────────────────────────────
  8001: 'qKBpF7I',   // Hip Thrust com Barra → barbell glute bridge
  8002: 'u0cNiij',   // Elevação Pélvica no Banco → low glute bridge on floor
  8003: 'HEJ6DIX',   // Glúteo no Cabo (Kickback) → cable kickback
  8004: 'HsvHqgf',   // Agachamento Sumô com Halter → dumbbell squat
  8005: 'RRWFUcw',   // Avanço com Passada Longa → dumbbell lunge
  8006: 'OPqShYN',   // Glúteo na Máquina → lever hip extension v. 2
  8007: 'qKBpF7I',   // Hip Thrust com Halter → barbell glute bridge
  8008: 'HEJ6DIX',   // Glúteo 4 Apoios na Polia → cable kickback
  8009: '7WaDzyL',   // Abdução de Quadril no Cabo → side hip abduction

  // ─── ABDÔMEN ───────────────────────────────
  9001: 'TFqbd8t',   // Abdominal Crunch → crunch floor
  9002: 'WW95auq',   // Abdominal no Cabo → cable kneeling crunch
  9003: 'I3tsCnC',   // Elevação de Pernas → hanging leg raise
  9004: 'VBAWRPG',   // Prancha → weighted front plank
  9005: 'XVDdcoj',   // Oblíquo Russo → russian twist
  9006: 'RJgzwny',   // Mountain Climber → mountain climber
  9007: 'nCU1Ekp',   // Abdominal Infra → reverse crunch
  9008: 'NAgVB3t',   // Roda Abdominal → wheel rollerout
  9009: 'tZkGYZ9',   // Abdominal Bicicleta → band bicycle crunch
  9010: 'nCU1Ekp',   // Crunch Reverso → reverse crunch
  9011: '5VXmnV5',   // Prancha Lateral → bodyweight incline side plank

  // ─── ANTEBRAÇO ─────────────────────────────
  10001: '82LxxkW',  // Rosca de Pulso com Barra → barbell wrist curl
  10002: 'LsZkfU6',  // Rosca de Pulso Inversa → barbell reverse wrist curl
  10003: 'qPEzJjA',  // Farmer Walk → farmers walk

  // ─── CARDIO ────────────────────────────────
  11001: 'rjiM4L3',  // Esteira → walking on incline treadmill
  11002: 'H1PESYI',  // Bicicleta Ergométrica → stationary bike run
  11003: 'rjtuP6X',  // Elíptico → walk elliptical cross trainer
  11004: 'vpQaQkH',  // Remo Ergométrico → ski ergometer
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
