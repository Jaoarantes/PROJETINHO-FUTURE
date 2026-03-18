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
  8003: 'Kpajagk',   // Glúteo no Cabo (Kickback) → cable standing hip extension
  8004: 'HsvHqgf',   // Agachamento Sumô com Halter → dumbbell squat
  8005: 'RRWFUcw',   // Avanço com Passada Longa → dumbbell lunge
  8006: 'OPqShYN',   // Glúteo na Máquina → lever hip extension v. 2
  8007: 'qKBpF7I',   // Hip Thrust com Halter → barbell glute bridge
  8008: 'Kpajagk',   // Glúteo 4 Apoios na Polia → cable standing hip extension
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

  // ─── PEITO (adicionais) ──────────────────
  1017: 'trqKQv2',  // Supino no Smith → smith bench press
  1018: 'T0yTjgW',  // Chest Press na Máquina → lever chest press
  1019: '5v7KYld',  // Supino Inclinado no Smith → smith incline bench press
  1020: 'xXm4nYq',  // Crucifixo Declinado com Halteres → dumbbell decline fly
  1021: 'J6Dx1Mu',  // Supino Reto Pegada Fechada → barbell close-grip bench press
  1022: 'tBWXbIT',  // Crucifixo no Cabo Inclinado → cable incline fly
  1023: 'I1OBLnn',  // Svend Press → weighted svend press
  1024: '7w6i0vE',  // Floor Press com Halteres → kettlebell alternating press on floor
  1025: 'vsVoPHt',  // Chest Press Declinado → lever decline chest press
  1026: '7xI5MXA',  // Cable Chest Press → cable bench press

  // ─── COSTAS (adicionais) ─────────────────
  2016: 'r0z6xzQ',  // Pendlay Row → barbell pendlay row
  2017: 'bZGHsAZ',  // Remada Inversa → inverted row
  2018: 'x69MAlq',  // Pulldown com Braço Reto → cable straight arm pulldown
  2019: '4f8RXP8',  // Remada no Cabo V-Bar → cable standing row v-bar
  2020: 'U5INZY6',  // Puxada Unilateral → cable one arm pulldown
  2021: 'SzX3uzM',  // Remada Curvada Supinada → barbell reverse grip bent over row
  2022: 'nZZZy9m',  // Remada High Row → lever high row
  2023: 'ZX9UZmj',  // Remada no Smith → smith bent over row
  2024: 'yJUHKTn',  // Muscle Up → muscle up
  2025: '4U7iLb5',  // Pullover na Máquina → lever pullover

  // ─── OMBROS (adicionais) ─────────────────
  3014: 'ainizkb',  // Remada Alta com Barra → dumbbell upright row
  3015: 'ainizkb',  // Remada Alta com Halteres → dumbbell upright row
  3016: 'u2X71Np',  // Elevação Frontal no Cabo → cable front raise
  3017: 'PzQanLE',  // Desenvolvimento no Cabo → cable shoulder press
  3018: '67n3r98',  // Desenvolvimento na Máquina → lever shoulder press
  3019: 'hxyTtWj',  // Elevação Lateral Sentado → dumbbell seated lateral raise
  3020: 'myfUsKf',  // Crucifixo Inverso Máquina → lever seated reverse fly
  3021: 'goJ6ezq',  // Elevação Lateral Unilateral → cable lateral raise
  3022: 'vmwLyCg',  // W Press → dumbbell w-press
  3023: 'RJa4tCo',  // Battle Ropes → battling ropes

  // ─── BÍCEPS (adicionais) ─────────────────
  4013: '2kattbR',  // Rosca Spider → ez barbell spider curl
  4014: 'dXz8zjF',  // Rosca Drag → cable drag curl
  4015: 'Qyk5J3p',  // Rosca Martelo Cross-Body → dumbbell cross body hammer curl
  4016: 'kXaIn5A',  // Rosca Zottman → dumbbell zottman curl
  4017: 'q6y3OhV',  // Rosca na Máquina → lever bicep curl
  4018: 'rZ80Gbp',  // Rosca Concentrada no Cabo → cable seated one arm concentration curl
  4019: 'IGtBdNT',  // Rosca Martelo Sentado → dumbbell seated hammer curl
  4020: 'NdIb5Z1',  // Rosca Pegada Larga → barbell standing wide-grip curl

  // ─── TRÍCEPS (adicionais) ────────────────
  5015: '5uFK1xr',  // Tríceps Francês Sentado → barbell seated overhead triceps extension
  5016: 'BRImeP8',  // Tríceps Mergulho Máquina → lever seated dip
  5017: 'Ser9eQp',  // Tríceps Extensão Máquina → lever triceps extension
  5018: 'ThKP69G',  // Tríceps Pulley Reverso → cable reverse grip triceps pushdown
  5019: 'qRZ5S1N',  // Tríceps Unilateral Cabo → cable one arm tricep pushdown
  5020: '6MfS53i',  // Tríceps Testa Alternado → dumbbell lying single extension
  5021: 'soIB2rj',  // Flexão Diamante → diamond push-up

  // ─── PERNAS (adicionais) ─────────────────
  6021: 'bTpEUcm',  // Agachamento Low Bar → barbell low bar squat
  6022: 'aXtJhlg',  // Step-Up com Halteres → dumbbell step-up
  6023: 'GWoKnIm',  // Agachamento Cossaco → weighted cossack squats
  6024: '10Z2DXU',  // Leg Press Horizontal → sled 45° leg press
  6025: 'SSsBDwB',  // Avanço Reverso → dumbbell rear lunge
  6026: 'Qa55kX1',  // Hack Machine → sled hack squat
  6027: 'o6LqKKP',  // Levantamento Terra Romeno → traditional barbell romanian deadlift
  6028: 'Vvwjz6N',  // Flexão Nórdica → glute-ham raise (closest to nordic curl)
  6029: 'xdYPUtE',  // Sissy Squat → sissy squat
  6030: '10Z2DXU',  // Prensa de Pernas → sled 45° leg press
  6031: 'TDYiji6',  // Agachamento com Salto → jump squat v. 2
  6032: 'py1HSzx',  // Passada Lateral → barbell lateral lunge

  // ─── PANTURRILHA (adicionais) ────────────
  7006: 'LmaFNZS',  // Donkey Calf Raise → weighted donkey calf raise
  7007: 'yl2IYyy',  // Panturrilha no Cabo → cable standing calf raise
  7008: '2ORFMoR',  // Panturrilha no Hack → hack calf raise
  7009: '6HmFgmx',  // Tibialis Raise → standing calf raise on staircase

  // ─── GLÚTEOS (adicionais) ────────────────
  8010: 'qKBpF7I',  // Hip Thrust Máquina → barbell glute bridge
  8011: 'OM46QHm',  // Cable Pull Through → cable pull through (with rope)
  8012: 'u0cNiij',  // Ponte de Glúteos → low glute bridge on floor
  8013: 'dzz6BiV',  // Agachamento Sumô com Barra → smith sumo squat
  8014: 'OPqShYN',  // Kickback na Máquina → lever hip extension v. 2
  8015: 'OrETs32',  // Reverse Hyper → reverse hyper on flat bench

  // ─── ABDÔMEN (adicionais) ────────────────
  9012: 'fhZQPlV',  // Woodchop no Cabo → cable twist (up-down)
  9013: 'WhuFnR7',  // Elevação Pernas Deitado → lying leg raise flat bench
  9014: 'iny3m5y',  // Dead Bug → dead bug
  9015: '9pa4H5m',  // Pallof Press → band horizontal pallof press
  9016: 'BMMolZ3',  // V-Up → tuck crunch
  9017: 'Kzg30R7',  // Crunch no Cabo em Pé → band standing crunch
  9018: 'QLL2gdc',  // Abdominal Declinado → decline sit-up
  9019: 'NAgVB3t',  // Ab Wheel → wheel rollerout
  9020: '03lzqwk',  // Elevação Joelhos Suspenso → assisted hanging knee raise
  9021: 'yRpV5TC',  // Prancha Toque no Ombro → shoulder tap

  // ─── ANTEBRAÇO (adicionais) ──────────────
  10004: '2dImyQ8',  // Rosca de Pulso com Halteres → dumbbell seated palms up wrist curl
  10005: 'lBDjFxJ',  // Dead Hang → pull-up (hanging)
  10006: 'bd5b860',  // Wrist Roller → wrist rollerer
  10007: 'mKwcrHn',  // Gripper → lever gripper hands
  10008: 'LrV4s90',  // Rosca de Pulso no Cabo → cable wrist curl

  // ─── TRAPÉZIO ────────────────────────────
  12001: 'dG7tG5y',  // Encolhimento por Trás → barbell shrug (similar)
  12002: 'OUQ0ZyW',  // Encolhimento no Smith → smith shrug
  12003: 'SpsOSXk',  // Face Pull → cable rear pulldown
  12004: 'NJzBsGJ',  // Encolhimento Inclinado → dumbbell shrug (similar)

  // ─── CARDIO (adicionais) ─────────────────
  11008: 'iPm26QU',  // Box Jump → box jump (down with stabilization)
  11009: 'RJgzwny',  // Mountain Climber → mountain climber
  11010: '1g5bPpA',  // Jumping Jack → jack jump
  11011: '0Yz8WdV',  // Bear Crawl → bear crawl
  11012: 'rjtuP6X',  // Stair Climber → walk elliptical
  11013: 'oLrKqDH',  // Sprint → run
  11014: 'J9zIWig',  // High Knees → walking high knees lunge
  11015: '0JtKWum',  // Dumbbell Burpee → dumbbell burpee
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
