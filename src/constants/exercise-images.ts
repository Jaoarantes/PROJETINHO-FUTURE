// Mapeamento de exercícios padrão para imagens do free-exercise-db (GitHub)
// Base URL: https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

// Mapa: ID do exercício → pasta no repositório
const IMAGE_MAP: Record<number, string> = {
  // ─── PEITO ─────────────────────────────────
  1001: 'Barbell_Bench_Press_-_Medium_Grip',
  1002: 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  1003: 'Decline_Barbell_Bench_Press',
  1004: 'Dumbbell_Bench_Press',
  1005: 'Incline_Dumbbell_Press',
  1006: 'Dumbbell_Flyes',
  1007: 'Incline_Dumbbell_Flyes',
  1008: 'Cable_Crossover',
  1009: 'Butterfly',
  1010: 'Pushups',
  1011: 'Dips_-_Chest_Version',
  1012: 'Bent-Arm_Dumbbell_Pullover',
  1013: 'Decline_Dumbbell_Bench_Press',
  1014: 'Cable_Crossover',
  1015: 'Pushups',
  1016: 'Pushups_-_Close_Triceps_Position',

  // ─── COSTAS ────────────────────────────────
  2001: 'Wide-Grip_Lat_Pulldown',
  2002: 'Close-Grip_Front_Lat_Pulldown',
  2003: 'Bent_Over_Barbell_Row',
  2004: 'One-Arm_Dumbbell_Row',
  2005: 'Seated_Cable_Rows',
  2006: 'Bent_Over_Two-Arm_Long_Bar_Row',
  2007: 'Barbell_Deadlift',
  2008: 'Pullups',
  2009: 'Chin-Up',
  2010: 'Hyperextensions_(Back_Extensions)',
  2011: 'Wide-Grip_Lat_Pulldown',
  2012: 'One-Arm_Dumbbell_Row',
  2013: 'Bent_Over_Two-Dumbbell_Row',
  2014: 'Seated_Cable_Rows',
  2015: 'Close-Grip_Front_Lat_Pulldown',

  // ─── OMBROS ────────────────────────────────
  3001: 'Barbell_Shoulder_Press',
  3002: 'Dumbbell_Shoulder_Press',
  3003: 'Side_Lateral_Raise',
  3004: 'Front_Dumbbell_Raise',
  3005: 'Side_Lateral_Raise',
  3006: 'Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench',
  3007: 'Barbell_Shrug',
  3008: 'Barbell_Shrug',
  3009: 'Face_Pull',
  3010: 'Arnold_Dumbbell_Press',
  3011: 'Front_Dumbbell_Raise',
  3012: 'Barbell_Shoulder_Press',
  3013: 'Side_Lateral_Raise',

  // ─── BÍCEPS ────────────────────────────────
  4001: 'Barbell_Curl',
  4002: 'Alternate_Hammer_Curl',
  4003: 'Alternate_Hammer_Curl',
  4004: 'Concentration_Curls',
  4005: 'Barbell_Curl',
  4006: 'Preacher_Curl',
  4007: 'Alternate_Incline_Dumbbell_Curl',
  4008: 'Reverse_Barbell_Curl',
  4009: 'Barbell_Curl',
  4010: 'Preacher_Curl',
  4011: 'Barbell_Curl',
  4012: 'Cable_Hammer_Curls_-_Rope_Attachment',

  // ─── TRÍCEPS ───────────────────────────────
  5001: 'Triceps_Pushdown',
  5002: 'Lying_Triceps_Press',
  5003: 'Standing_Dumbbell_Triceps_Extension',
  5004: 'Tricep_Dumbbell_Kickback',
  5005: 'Dips_-_Triceps_Version',
  5006: 'Bench_Dips',
  5007: 'Triceps_Pushdown_-_Rope_Attachment',
  5008: 'Close-Grip_Barbell_Bench_Press',
  5009: 'Lying_Triceps_Press',
  5010: 'Lying_Triceps_Press',
  5011: 'Lying_Triceps_Press',
  5012: 'Standing_Dumbbell_Triceps_Extension',
  5013: 'Tricep_Dumbbell_Kickback',
  5014: 'Triceps_Pushdown',

  // ─── PERNAS ────────────────────────────────
  6001: 'Barbell_Full_Squat',
  6002: 'Leg_Press',
  6003: 'Leg_Extensions',
  6004: 'Lying_Leg_Curls',
  6005: 'Barbell_Hack_Squat',
  6006: 'Dumbbell_Lunges',
  6007: 'Stiff-Legged_Barbell_Deadlift',
  6008: 'Goblet_Squat',
  6009: 'Barbell_Walking_Lunge',
  6010: 'Barbell_Lunge',
  6011: 'Thigh_Adductor',
  6012: 'Thigh_Abductor',
  6013: 'Sumo_Deadlift',
  6014: 'Leg_Press',
  6015: 'Front_Barbell_Squat',
  6016: 'Stiff-Legged_Barbell_Deadlift',
  6017: 'Stiff-Legged_Dumbbell_Deadlift',
  6018: 'Standing_Leg_Curl',
  6019: 'Smith_Machine_Squat',
  6020: 'Leg_Extensions',

  // ─── PANTURRILHA ───────────────────────────
  7001: 'Standing_Calf_Raises',
  7002: 'Seated_Calf_Raise',
  7003: 'Calf_Press_On_The_Leg_Press_Machine',
  7004: 'Standing_Calf_Raises',
  7005: 'Smith_Machine_Calf_Raise',

  // ─── GLÚTEOS ───────────────────────────────
  8001: 'Barbell_Hip_Thrust',
  8002: 'Barbell_Glute_Bridge',
  8005: 'Barbell_Walking_Lunge',
  8007: 'Barbell_Hip_Thrust',

  // ─── ABDÔMEN ───────────────────────────────
  9001: 'Crunches',
  9002: 'Cable_Crunch',
  9003: 'Hanging_Leg_Raise',
  9004: 'Plank',
  9005: 'Russian_Twist',
  9008: 'Ab_Roller',
  9009: 'Air_Bike',

  // ─── ANTEBRAÇO ─────────────────────────────
  10001: 'Palms-Down_Wrist_Curl_Over_A_Bench',
  10002: 'Palms-Up_Wrist_Curl_Over_A_Bench',

  // ─── CARDIO ────────────────────────────────
  11002: 'Bicycling,_Stationary',
  11005: 'Rope_Jumping',
  11006: 'Burpee',
};

export function getExerciseImageUrl(exerciseId: number): string | undefined {
  const folder = IMAGE_MAP[exerciseId];
  if (!folder) return undefined;
  return `${BASE}/${folder}/0.jpg`;
}

export function getExerciseImageUrls(exerciseId: number): [string, string] | undefined {
  const folder = IMAGE_MAP[exerciseId];
  if (!folder) return undefined;
  return [
    `${BASE}/${folder}/0.jpg`,
    `${BASE}/${folder}/1.jpg`,
  ];
}
