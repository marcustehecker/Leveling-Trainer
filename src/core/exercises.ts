import type { Equipment, StatId } from './types'

export type Pattern = 'squat' | 'hinge' | 'push' | 'vpush' | 'pull' | 'vpull' | 'lunge' | 'delts' | 'biceps' | 'triceps' | 'calves' | 'core' | 'cardio' | 'mobility'

export interface Exercise {
  id: string
  name: string
  pattern: Pattern
  stat: Extract<StatId, 'strength' | 'endurance' | 'agility'>
  /** reps-based or timed (seconds). */
  kind: 'reps' | 'time'
  /** Needs ANY one of these. 'none' means bodyweight. */
  equipment: Equipment[]
  /** 1 beginner, 2 intermediate, 3 advanced. */
  level: 1 | 2 | 3
  weighted: boolean
  cues: string[]
  /** Easier alternative. */
  easier?: string
}

export const EXERCISES: Exercise[] = [
  // Squat
  { id: 'bw-squat', name: 'Bodyweight Squat', pattern: 'squat', stat: 'strength', kind: 'reps', equipment: ['none'], level: 1, weighted: false,
    cues: ['Feet shoulder-width, toes slightly out', 'Sit hips back and down, chest up', 'Knees track over toes', 'Drive through the whole foot to stand'], easier: 'box-squat' },
  { id: 'box-squat', name: 'Box Squat to Chair', pattern: 'squat', stat: 'strength', kind: 'reps', equipment: ['none'], level: 1, weighted: false,
    cues: ['Stand in front of a sturdy chair', 'Sit back until you lightly touch it', 'Stand without rocking forward'] },
  { id: 'goblet-squat', name: 'Goblet Squat', pattern: 'squat', stat: 'strength', kind: 'reps', equipment: ['dumbbells', 'gym'], level: 1, weighted: true,
    cues: ['Hold one dumbbell at your chest', 'Elbows inside knees at the bottom', 'Keep the weight close and your torso tall'], easier: 'bw-squat' },
  { id: 'back-squat', name: 'Barbell Back Squat', pattern: 'squat', stat: 'strength', kind: 'reps', equipment: ['gym'], level: 2, weighted: true,
    cues: ['Bar on upper back, hands just outside shoulders', 'Brace your core before each rep', 'Squat to at least parallel with a neutral spine', 'Use safety pins'], easier: 'goblet-squat' },
  // Hinge
  { id: 'glute-bridge', name: 'Glute Bridge', pattern: 'hinge', stat: 'strength', kind: 'reps', equipment: ['none'], level: 1, weighted: false,
    cues: ['Lie on your back, knees bent, feet flat', 'Squeeze glutes to lift hips', 'Pause at the top, ribs down'] },
  { id: 'db-rdl', name: 'Dumbbell Romanian Deadlift', pattern: 'hinge', stat: 'strength', kind: 'reps', equipment: ['dumbbells', 'gym'], level: 1, weighted: true,
    cues: ['Soft knees, push hips back', 'Dumbbells slide down your thighs', 'Stop when you feel a hamstring stretch, back flat'], easier: 'glute-bridge' },
  { id: 'band-pull-through', name: 'Band Pull-Through', pattern: 'hinge', stat: 'strength', kind: 'reps', equipment: ['bands'], level: 1, weighted: false,
    cues: ['Anchor band low behind you', 'Hinge at the hips, arms between legs', 'Snap hips forward and squeeze glutes'], easier: 'glute-bridge' },
  { id: 'deadlift', name: 'Barbell Deadlift', pattern: 'hinge', stat: 'strength', kind: 'reps', equipment: ['gym'], level: 2, weighted: true,
    cues: ['Bar over mid-foot', 'Brace, pull slack out of the bar', 'Push the floor away, bar stays close', 'Lock out with glutes, not by leaning back'], easier: 'db-rdl' },
  // Horizontal push
  { id: 'incline-pushup', name: 'Incline Push-up', pattern: 'push', stat: 'strength', kind: 'reps', equipment: ['none'], level: 1, weighted: false,
    cues: ['Hands on a bench or counter', 'Body in a straight line', 'Lower chest to the edge, elbows about 45°'] },
  { id: 'pushup', name: 'Push-up', pattern: 'push', stat: 'strength', kind: 'reps', equipment: ['none'], level: 1, weighted: false,
    cues: ['Hands under shoulders, body straight', 'Lower until chest is a fist from the floor', 'Elbows about 45° from your body', 'Press the floor away'], easier: 'incline-pushup' },
  { id: 'db-bench', name: 'Dumbbell Bench Press', pattern: 'push', stat: 'strength', kind: 'reps', equipment: ['dumbbells', 'gym'], level: 1, weighted: true,
    cues: ['Shoulder blades pinched back', 'Lower to chest level with control', 'Press up and slightly in'], easier: 'pushup' },
  { id: 'bench-press', name: 'Barbell Bench Press', pattern: 'push', stat: 'strength', kind: 'reps', equipment: ['gym'], level: 2, weighted: true,
    cues: ['Eyes under the bar, feet planted', 'Lower to lower chest', 'Use a spotter or safety arms'], easier: 'db-bench' },
  // Vertical push
  { id: 'pike-pushup', name: 'Pike Push-up', pattern: 'vpush', stat: 'strength', kind: 'reps', equipment: ['none'], level: 2, weighted: false,
    cues: ['Hips high in an inverted V', 'Lower head toward the floor between hands', 'Press back up'], easier: 'incline-pushup' },
  { id: 'db-ohp', name: 'Dumbbell Overhead Press', pattern: 'vpush', stat: 'strength', kind: 'reps', equipment: ['dumbbells', 'gym'], level: 1, weighted: true,
    cues: ['Brace core, squeeze glutes', 'Press straight up, biceps by ears', "Don't arch your lower back"] },
  { id: 'band-ohp', name: 'Band Overhead Press', pattern: 'vpush', stat: 'strength', kind: 'reps', equipment: ['bands'], level: 1, weighted: false,
    cues: ['Stand on the band', 'Press overhead, ribs down', 'Lower slowly'] },
  // Horizontal pull
  { id: 'table-row', name: 'Table Row', pattern: 'pull', stat: 'strength', kind: 'reps', equipment: ['none'], level: 1, weighted: false,
    cues: ['Lie under a sturdy table, grip the edge', 'Body straight, pull chest to the table', 'Only use a table that will not tip'] },
  { id: 'db-row', name: 'One-Arm Dumbbell Row', pattern: 'pull', stat: 'strength', kind: 'reps', equipment: ['dumbbells', 'gym'], level: 1, weighted: true,
    cues: ['Hand and knee on a bench, back flat', 'Pull the dumbbell toward your hip', 'Lower under control'] },
  { id: 'band-row', name: 'Band Row', pattern: 'pull', stat: 'strength', kind: 'reps', equipment: ['bands'], level: 1, weighted: false,
    cues: ['Anchor band at chest height', 'Pull elbows back, squeeze shoulder blades', 'Return slowly'] },
  { id: 'cable-row', name: 'Seated Cable Row', pattern: 'pull', stat: 'strength', kind: 'reps', equipment: ['gym'], level: 1, weighted: true,
    cues: ['Tall posture', 'Pull handle to your stomach', "Don't lean back to cheat the weight"] },
  // Vertical pull
  { id: 'lat-pulldown', name: 'Lat Pulldown', pattern: 'vpull', stat: 'strength', kind: 'reps', equipment: ['gym'], level: 1, weighted: true,
    cues: ['Grip just outside shoulders', 'Pull the bar to upper chest', 'Lead with elbows down and back'] },
  { id: 'negative-pullup', name: 'Negative Pull-up', pattern: 'vpull', stat: 'strength', kind: 'reps', equipment: ['pullupBar'], level: 1, weighted: false,
    cues: ['Jump or step to the top position', 'Lower yourself over 3–5 seconds', 'Reset and repeat'] },
  { id: 'pullup', name: 'Pull-up', pattern: 'vpull', stat: 'strength', kind: 'reps', equipment: ['pullupBar', 'gym'], level: 2, weighted: false,
    cues: ['Start from a dead hang', 'Pull until chin clears the bar', 'Lower all the way down'], easier: 'negative-pullup' },
  { id: 'db-pullover', name: 'Dumbbell Pullover', pattern: 'vpull', stat: 'strength', kind: 'reps', equipment: ['dumbbells', 'gym'], level: 1, weighted: true,
    cues: ['Lie across a bench or on the floor, one dumbbell held over your chest', 'Lower it behind your head with slightly bent elbows', 'Pull it back over your chest using your lats'], easier: 'prone-ytw' },
  { id: 'prone-ytw', name: 'Prone Y-T-W Raise', pattern: 'vpull', stat: 'strength', kind: 'reps', equipment: ['none'], level: 1, weighted: false,
    cues: ['Lie face down, forehead on a towel', 'Lift arms into a Y, then T, then W shape', 'Squeeze shoulder blades; one Y-T-W cycle is one rep'] },
  { id: 'band-pulldown', name: 'Band Lat Pulldown', pattern: 'vpull', stat: 'strength', kind: 'reps', equipment: ['bands'], level: 1, weighted: false,
    cues: ['Anchor band high', 'Pull elbows down to your ribs', 'Control the return'] },
  // Lunge
  { id: 'reverse-lunge', name: 'Reverse Lunge', pattern: 'lunge', stat: 'agility', kind: 'reps', equipment: ['none'], level: 1, weighted: false,
    cues: ['Step back, lower back knee toward the floor', 'Front knee over mid-foot', 'Push through the front heel. Reps are per leg'], easier: 'split-squat-hold' },
  { id: 'split-squat-hold', name: 'Split Squat (supported)', pattern: 'lunge', stat: 'agility', kind: 'reps', equipment: ['none'], level: 1, weighted: false,
    cues: ['Hold a wall or chair for balance', 'Lower straight down', 'Reps are per leg'] },
  { id: 'db-lunge', name: 'Dumbbell Walking Lunge', pattern: 'lunge', stat: 'agility', kind: 'reps', equipment: ['dumbbells', 'gym'], level: 2, weighted: true,
    cues: ['Dumbbells at sides, tall posture', 'Long, controlled steps', 'Reps are per leg'], easier: 'reverse-lunge' },
  // Core
  { id: 'plank', name: 'Plank', pattern: 'core', stat: 'endurance', kind: 'time', equipment: ['none'], level: 1, weighted: false,
    cues: ['Forearms under shoulders', 'Squeeze glutes, ribs down', 'Straight line from head to heels'], easier: 'knee-plank' },
  { id: 'knee-plank', name: 'Knee Plank', pattern: 'core', stat: 'endurance', kind: 'time', equipment: ['none'], level: 1, weighted: false,
    cues: ['Same as plank, knees on the floor', 'Straight line from head to knees'] },
  { id: 'dead-bug', name: 'Dead Bug', pattern: 'core', stat: 'agility', kind: 'reps', equipment: ['none'], level: 1, weighted: false,
    cues: ['Lower back pressed into the floor', 'Extend opposite arm and leg slowly', 'Reps are per side'] },
  { id: 'side-plank', name: 'Side Plank', pattern: 'core', stat: 'endurance', kind: 'time', equipment: ['none'], level: 2, weighted: false,
    cues: ['Elbow under shoulder', 'Hips lifted in a straight line', 'Time is per side'], easier: 'knee-plank' },
  // Cardio
  { id: 'brisk-walk', name: 'Brisk Walk', pattern: 'cardio', stat: 'endurance', kind: 'time', equipment: ['none'], level: 1, weighted: false,
    cues: ['A pace where you can talk but not sing', 'Swing your arms, stand tall'] },
  { id: 'jog', name: 'Easy Jog', pattern: 'cardio', stat: 'endurance', kind: 'time', equipment: ['none'], level: 2, weighted: false,
    cues: ['Conversational pace', 'Short, quick steps', 'Walk breaks are fine'], easier: 'brisk-walk' },
  { id: 'bike', name: 'Stationary Bike', pattern: 'cardio', stat: 'endurance', kind: 'time', equipment: ['gym'], level: 1, weighted: false,
    cues: ['Seat at hip height', 'Steady, moderate effort'] },
  { id: 'jumping-jacks', name: 'Jumping Jacks', pattern: 'cardio', stat: 'endurance', kind: 'time', equipment: ['none'], level: 1, weighted: false,
    cues: ['Land softly on the balls of your feet', 'Step-jacks are the low-impact option'] },
  // Mobility
  { id: 'mobility-flow', name: 'Full-Body Mobility Flow', pattern: 'mobility', stat: 'agility', kind: 'time', equipment: ['none'], level: 1, weighted: false,
    cues: ['Cat-cow ×8', "World's greatest stretch ×5 per side", 'Hip circles ×10 each way', 'Arm circles ×10 each way', 'Move slowly, never into pain'] },
  { id: 'single-leg-balance', name: 'Single-Leg Balance', pattern: 'mobility', stat: 'agility', kind: 'time', equipment: ['none'], level: 1, weighted: false,
    cues: ['Stand on one foot near a wall', 'Soft knee, eyes forward', 'Time is per leg'] },
]

type Row = [id: string, name: string, pattern: Pattern, stat: Exercise['stat'], kind: Exercise['kind'], equipment: Equipment[], level: Exercise['level'], weighted: boolean, cues: string[], easier?: string]
const S = 'strength', E = 'endurance', A = 'agility'
const DB: Equipment[] = ['dumbbells', 'gym']
const GYM: Equipment[] = ['gym']
const BW: Equipment[] = ['none']
const BAND: Equipment[] = ['bands']
const BAR: Equipment[] = ['pullupBar', 'gym']

// Expanded library. Order within a pattern matters: earlier entries are picked first at the same level.
const MORE: Row[] = [
  // Chest
  ['wide-pushup', 'Wide Push-up', 'push', S, 'reps', BW, 1, false, ['Hands wider than shoulders', 'Lower chest between your hands', 'Keep your body in one straight line'], 'incline-pushup'],
  ['decline-pushup', 'Decline Push-up', 'push', S, 'reps', BW, 2, false, ['Feet on a bench or step', 'Lower chest toward the floor', 'Hits upper chest and shoulders'], 'pushup'],
  ['archer-pushup', 'Archer Push-up', 'push', S, 'reps', BW, 3, false, ['Very wide hands', 'Shift your weight to one arm as you lower', 'Reps are per side'], 'decline-pushup'],
  ['db-incline-press', 'Incline Dumbbell Press', 'push', S, 'reps', DB, 1, true, ['Bench at 30–45°', 'Lower dumbbells to upper chest', 'Press up and slightly in'], 'pushup'],
  ['db-floor-press', 'Dumbbell Floor Press', 'push', S, 'reps', ['dumbbells'], 1, true, ['Lie on the floor, knees bent', 'Lower until upper arms touch the floor', 'Pause, then press'], 'pushup'],
  ['db-fly', 'Dumbbell Chest Fly', 'push', S, 'reps', DB, 1, true, ['Slight bend in the elbows the whole time', 'Open wide until you feel a chest stretch', 'Hug the weights back together'], 'pushup'],
  ['machine-chest-press', 'Machine Chest Press', 'push', S, 'reps', GYM, 1, true, ['Handles at mid-chest height', 'Press out without locking elbows hard', 'Control the way back'], 'pushup'],
  ['incline-bench', 'Incline Barbell Bench Press', 'push', S, 'reps', GYM, 2, true, ['Bench at about 30°', 'Lower to upper chest', 'Use a spotter or safety arms'], 'db-incline-press'],
  ['dip', 'Parallel Bar Dip', 'push', S, 'reps', GYM, 2, false, ['Lean slightly forward for more chest', 'Lower until upper arms are about parallel', 'Press up without shrugging'], 'assisted-dip'],
  ['assisted-dip', 'Assisted Dip (machine)', 'push', S, 'reps', GYM, 1, true, ['More assistance makes it easier', 'Lower slowly, shoulders down', 'Press to straight arms'], 'bench-dip'],
  ['weighted-dip', 'Weighted Dip', 'push', S, 'reps', GYM, 3, true, ['Add weight with a belt or a dumbbell between feet', 'Same form as a dip', 'Only add load once 12+ clean dips are easy'], 'dip'],
  ['cable-fly', 'Cable Chest Fly', 'push', S, 'reps', GYM, 1, true, ['Step forward, slight forward lean', 'Arc your hands together in front of you', 'Squeeze the chest, return slowly'], 'db-fly'],
  ['pec-deck', 'Pec Deck', 'push', S, 'reps', GYM, 1, true, ['Elbows level with shoulders', 'Bring the pads together', 'Control the stretch'], 'db-fly'],
  ['band-chest-press', 'Band Chest Press', 'push', S, 'reps', BAND, 1, false, ['Anchor band behind you at chest height', 'Press both hands forward', 'Return slowly'], 'pushup'],
  // Shoulder press
  ['seated-db-press', 'Seated Dumbbell Shoulder Press', 'vpush', S, 'reps', DB, 1, true, ['Back against an upright bench', 'Press straight up', 'Lower to ear height'], 'band-ohp'],
  ['machine-shoulder-press', 'Machine Shoulder Press', 'vpush', S, 'reps', GYM, 1, true, ['Handles at shoulder height', 'Press up, ribs down', 'Control the lowering'], 'db-ohp'],
  ['arnold-press', 'Arnold Press', 'vpush', S, 'reps', DB, 2, true, ['Start palms facing you', 'Rotate palms out as you press up', 'Reverse on the way down'], 'db-ohp'],
  ['barbell-ohp', 'Barbell Overhead Press', 'vpush', S, 'reps', GYM, 2, true, ['Bar on front of shoulders', 'Squeeze glutes, press straight up', 'Move your head back, then through'], 'db-ohp'],
  ['landmine-press', 'Landmine Press', 'vpush', S, 'reps', GYM, 2, true, ['One end of a barbell anchored in a corner', 'Press the other end up and forward', 'Reps are per arm'], 'db-ohp'],
  ['wall-hspu', 'Wall Handstand Push-up', 'vpush', S, 'reps', BW, 3, false, ['Kick up to a handstand facing the wall', 'Lower your head to a cushion with control', 'Only with solid pike push-ups first'], 'pike-pushup'],
  // Side, front and rear delts
  ['db-lateral-raise', 'Dumbbell Lateral Raise', 'delts', S, 'reps', DB, 1, true, ['Slight bend in elbows', 'Raise out to the sides to shoulder height', 'Lead with elbows, no swinging'], 'band-lateral-raise'],
  ['cable-lateral-raise', 'Cable Lateral Raise', 'delts', S, 'reps', GYM, 1, true, ['Cable at the lowest setting', 'Raise across and out to shoulder height', 'Reps are per arm'], 'db-lateral-raise'],
  ['db-front-raise', 'Dumbbell Front Raise', 'delts', S, 'reps', DB, 1, true, ['Raise straight in front to eye level', 'Keep your torso still', 'Lower slowly'], 'band-lateral-raise'],
  ['rear-delt-fly', 'Rear Delt Fly', 'delts', S, 'reps', DB, 1, true, ['Hinge forward, back flat', 'Open arms out to the sides', 'Squeeze the backs of your shoulders'], 'band-pull-apart'],
  ['face-pull', 'Cable Face Pull', 'delts', S, 'reps', GYM, 1, true, ['Rope at upper chest height', 'Pull toward your face, elbows high', 'Finish with hands beside your ears'], 'band-pull-apart'],
  ['db-shrug', 'Dumbbell Shrug', 'delts', S, 'reps', DB, 1, true, ['Arms straight, dumbbells at sides', 'Lift shoulders straight up to your ears', 'Pause, then lower'], 'band-lateral-raise'],
  ['band-lateral-raise', 'Band Lateral Raise', 'delts', S, 'reps', BAND, 1, false, ['Stand on the band', 'Raise out to shoulder height', 'Lower slowly'], 'bottle-lateral-raise'],
  ['band-pull-apart', 'Band Pull-Apart', 'delts', S, 'reps', BAND, 1, false, ['Hold a band in front at shoulder height', 'Pull it apart to your chest', 'Squeeze shoulder blades'], 'bottle-lateral-raise'],
  ['bottle-lateral-raise', 'Water Bottle Lateral Raise', 'delts', E, 'reps', BW, 1, false, ['Use full water bottles or light household items', 'Raise out to shoulder height', 'Go slow; higher reps are fine'] ],
  // Triceps
  ['bench-dip', 'Bench Dip', 'triceps', S, 'reps', BW, 1, false, ['Hands on a sturdy chair or bench behind you', 'Bend elbows straight back to about 90°', 'Stop if your shoulders hurt'] ],
  ['diamond-pushup', 'Diamond Push-up', 'triceps', S, 'reps', BW, 2, false, ['Hands together under your chest', 'Elbows brush your ribs', 'Do them from your knees to start'], 'bench-dip'],
  ['db-overhead-extension', 'Overhead Dumbbell Extension', 'triceps', S, 'reps', DB, 1, true, ['Hold one dumbbell overhead with both hands', 'Lower it behind your head', 'Elbows point forward'], 'bench-dip'],
  ['tricep-pushdown', 'Cable Tricep Pushdown', 'triceps', S, 'reps', GYM, 1, true, ['Elbows pinned to your sides', 'Push down to straight arms', 'Only your forearms move'], 'bench-dip'],
  ['skull-crusher', 'Skull Crusher', 'triceps', S, 'reps', DB, 2, true, ['Lie on a bench, weights over your chest', 'Bend elbows to lower toward your forehead', 'Extend back up'], 'db-overhead-extension'],
  ['close-grip-bench', 'Close-Grip Bench Press', 'triceps', S, 'reps', GYM, 2, true, ['Hands shoulder-width', 'Elbows tucked close', 'Use a spotter or safety arms'], 'diamond-pushup'],
  ['db-kickback', 'Dumbbell Kickback', 'triceps', S, 'reps', DB, 1, true, ['Hinge forward, upper arm by your side', 'Straighten your elbow behind you', 'Reps are per arm'], 'bench-dip'],
  ['band-pushdown', 'Band Tricep Pushdown', 'triceps', S, 'reps', BAND, 1, false, ['Anchor band high', 'Elbows at sides, push down', 'Return slowly'], 'bench-dip'],
  // Biceps
  ['db-curl', 'Dumbbell Curl', 'biceps', S, 'reps', DB, 1, true, ['Elbows by your sides', 'Curl up, turning palms to face you', 'Lower all the way'], 'backpack-curl'],
  ['hammer-curl', 'Hammer Curl', 'biceps', S, 'reps', DB, 1, true, ['Palms face each other the whole time', 'Curl without swinging', 'Lower slowly'], 'backpack-curl'],
  ['barbell-curl', 'Barbell Curl', 'biceps', S, 'reps', GYM, 1, true, ['Shoulder-width grip', 'Elbows still at your sides', 'No hip swing'], 'db-curl'],
  ['preacher-curl', 'Preacher Curl', 'biceps', S, 'reps', GYM, 1, true, ['Upper arms flat on the pad', 'Curl up, lower to almost straight', 'Control the bottom'], 'db-curl'],
  ['cable-curl', 'Cable Curl', 'biceps', S, 'reps', GYM, 1, true, ['Cable at the lowest setting', 'Curl to your shoulders', 'Steady tension on the way down'], 'db-curl'],
  ['incline-db-curl', 'Incline Dumbbell Curl', 'biceps', S, 'reps', DB, 2, true, ['Lie back on a 45° bench, arms hanging', 'Curl without moving your upper arms', 'Big stretch at the bottom'], 'db-curl'],
  ['concentration-curl', 'Concentration Curl', 'biceps', S, 'reps', ['dumbbells'], 1, true, ['Seated, elbow against inner thigh', 'Curl slowly and squeeze', 'Reps are per arm'], 'db-curl'],
  ['band-curl', 'Band Curl', 'biceps', S, 'reps', BAND, 1, false, ['Stand on the band', 'Curl to your shoulders', 'Lower slowly'], 'backpack-curl'],
  ['backpack-curl', 'Backpack Curl', 'biceps', S, 'reps', BW, 1, false, ['Load a backpack with books', 'Hold it by the top handle or straps', 'Curl up, lower slowly'] ],
  // Rows and back
  ['chest-supported-row', 'Chest-Supported Dumbbell Row', 'pull', S, 'reps', DB, 1, true, ['Lie face down on an incline bench', 'Row both dumbbells to your ribs', 'No body swing possible'], 'band-row'],
  ['machine-row', 'Machine Row', 'pull', S, 'reps', GYM, 1, true, ['Chest on the pad', 'Pull handles back, squeeze shoulder blades', 'Slow return'], 'band-row'],
  ['inverted-row', 'Inverted Row', 'pull', S, 'reps', GYM, 1, false, ['Bar at hip height in a rack or Smith machine', 'Body straight, pull chest to the bar', 'Bend knees to make it easier'], 'table-row'],
  ['barbell-row', 'Barbell Row', 'pull', S, 'reps', GYM, 2, true, ['Hinge to about 45°, back flat', 'Pull the bar to your lower ribs', 'No jerking'], 'db-row'],
  ['tbar-row', 'T-Bar Row', 'pull', S, 'reps', GYM, 2, true, ['Chest up, back flat', 'Pull the handle to your chest', 'Control the lowering'], 'db-row'],
  ['renegade-row', 'Renegade Row', 'pull', S, 'reps', ['dumbbells'], 2, true, ['High plank on two dumbbells', 'Row one side without twisting your hips', 'Reps are per side'], 'db-row'],
  ['superman-pull', 'Superman Pull', 'pull', S, 'reps', BW, 1, false, ['Lie face down, arms overhead', 'Lift chest and pull elbows down to your ribs', 'Reach back out; that is one rep'] ],
  // Pull-ups and pulldowns
  ['chinup', 'Chin-up', 'vpull', S, 'reps', BAR, 2, false, ['Palms facing you', 'Pull chest toward the bar', 'Full hang at the bottom'], 'negative-pullup'],
  ['neutral-pullup', 'Neutral-Grip Pull-up', 'vpull', S, 'reps', BAR, 2, false, ['Palms facing each other', 'Pull until chin clears', 'Lower all the way'], 'negative-pullup'],
  ['assisted-pullup', 'Assisted Pull-up (machine)', 'vpull', S, 'reps', GYM, 1, true, ['More assistance makes it easier', 'Pull chin over the bar', 'Slow lowering'], 'lat-pulldown'],
  ['close-grip-pulldown', 'Close-Grip Pulldown', 'vpull', S, 'reps', GYM, 1, true, ['V-handle attachment', 'Pull to upper chest', 'Lean back slightly'], 'band-pulldown'],
  ['straight-arm-pulldown', 'Straight-Arm Pulldown', 'vpull', S, 'reps', GYM, 1, true, ['Arms nearly straight', 'Sweep the bar down to your thighs', 'Feel it in your lats'], 'band-pulldown'],
  ['dead-hang', 'Dead Hang', 'vpull', E, 'time', ['pullupBar', 'gym'], 1, false, ['Hang from the bar with straight arms', 'Shoulders slightly engaged', 'Builds grip for pull-ups'] ],
  // Squat and quads
  ['leg-press', 'Leg Press', 'squat', S, 'reps', GYM, 1, true, ['Feet shoulder-width on the platform', 'Lower until knees reach about 90°', "Don't lock knees hard at the top"], 'goblet-squat'],
  ['front-squat', 'Front Squat', 'squat', S, 'reps', GYM, 2, true, ['Bar on the front of your shoulders, elbows high', 'Stay tall as you sit down', 'Use safety pins'], 'goblet-squat'],
  ['hack-squat', 'Hack Squat', 'squat', S, 'reps', GYM, 2, true, ['Back flat on the pad', 'Lower to about parallel', 'Drive through your whole foot'], 'leg-press'],
  ['db-sumo-squat', 'Dumbbell Sumo Squat', 'squat', S, 'reps', DB, 1, true, ['Wide stance, toes out', 'Hold one dumbbell between your legs', 'Sit straight down'], 'bw-squat'],
  ['leg-extension', 'Leg Extension', 'squat', S, 'reps', GYM, 1, true, ['Pad on lower shins', 'Straighten your knees', 'Lower slowly'], 'bw-squat'],
  ['jump-squat', 'Jump Squat', 'squat', A, 'reps', BW, 2, false, ['Squat down, then jump up', 'Land softly and sink into the next rep', 'Stop if your knees complain'], 'bw-squat'],
  ['wall-sit', 'Wall Sit', 'squat', E, 'time', BW, 1, false, ['Back flat against a wall', 'Slide down until knees are near 90°', 'Hold and breathe'], 'box-squat'],
  // Hinge, glutes and hamstrings
  ['db-hip-thrust', 'Dumbbell Hip Thrust', 'hinge', S, 'reps', DB, 1, true, ['Upper back on a bench, dumbbell on hips', 'Drive hips up, squeeze glutes', 'Chin tucked'], 'glute-bridge'],
  ['hip-thrust', 'Barbell Hip Thrust', 'hinge', S, 'reps', GYM, 2, true, ['Pad the bar across your hips', 'Push up until hips are level with knees', 'Pause at the top'], 'db-hip-thrust'],
  ['leg-curl', 'Leg Curl', 'hinge', S, 'reps', GYM, 1, true, ['Pad just above the heels', 'Curl your heels toward your glutes', 'Slow on the way back'], 'glute-bridge'],
  ['back-extension', 'Back Extension', 'hinge', S, 'reps', GYM, 1, false, ['Hips on the pad', 'Lower with a flat back', 'Rise to a straight line, no overarching'], 'glute-bridge'],
  ['db-swing', 'Dumbbell Swing', 'hinge', A, 'reps', DB, 2, true, ['Hold one dumbbell with both hands', 'Hike it back, then snap your hips forward', 'Arms just guide it to chest height'], 'db-rdl'],
  ['trap-bar-deadlift', 'Trap Bar Deadlift', 'hinge', S, 'reps', GYM, 2, true, ['Stand in the middle of the bar', 'Hips down, chest up, push the floor away', 'Stand tall, then lower'], 'db-rdl'],
  ['single-leg-rdl', 'Single-Leg Romanian Deadlift', 'hinge', A, 'reps', BW, 2, false, ['Stand on one leg, soft knee', 'Tip forward as the other leg goes back', 'Reps are per leg'], 'glute-bridge'],
  ['single-leg-bridge', 'Single-Leg Glute Bridge', 'hinge', S, 'reps', BW, 1, false, ['One foot flat, other leg extended', 'Drive hips up through the planted heel', 'Reps are per leg'], 'glute-bridge'],
  // Single leg
  ['bulgarian-split-squat', 'Bulgarian Split Squat', 'lunge', S, 'reps', BW, 2, false, ['Back foot on a bench', 'Lower straight down', 'Reps are per leg'], 'split-squat-hold'],
  ['db-bulgarian', 'Dumbbell Bulgarian Split Squat', 'lunge', S, 'reps', DB, 2, true, ['Back foot on a bench, dumbbells at sides', 'Lower straight down', 'Reps are per leg'], 'bulgarian-split-squat'],
  ['step-up', 'Step-up', 'lunge', A, 'reps', BW, 1, false, ['Sturdy box or step, knee height or lower', 'Push through the top foot to stand', 'Reps are per leg'], 'split-squat-hold'],
  ['db-step-up', 'Dumbbell Step-up', 'lunge', S, 'reps', DB, 1, true, ['Dumbbells at your sides', 'Drive through the top foot', 'Reps are per leg'], 'step-up'],
  ['lateral-lunge', 'Lateral Lunge', 'lunge', A, 'reps', BW, 1, false, ['Step wide to one side', 'Sit into that hip, other leg straight', 'Reps are per side'], 'split-squat-hold'],
  ['forward-lunge', 'Forward Lunge', 'lunge', A, 'reps', BW, 1, false, ['Step forward, lower back knee', 'Push back to standing', 'Reps are per leg'], 'reverse-lunge'],
  ['curtsy-lunge', 'Curtsy Lunge', 'lunge', A, 'reps', BW, 1, false, ['Step one leg behind and across', 'Lower with control', 'Reps are per leg'], 'reverse-lunge'],
  // Calves
  ['calf-raise', 'Calf Raise', 'calves', S, 'reps', BW, 1, false, ['Balls of feet on a step', 'Rise up high, pause', 'Lower heels below the step'] ],
  ['single-leg-calf-raise', 'Single-Leg Calf Raise', 'calves', S, 'reps', BW, 2, false, ['Hold a wall for balance', 'Rise on one foot', 'Reps are per leg'], 'calf-raise'],
  ['db-calf-raise', 'Dumbbell Calf Raise', 'calves', S, 'reps', DB, 1, true, ['Dumbbells at your sides', 'Full stretch, full rise', 'Pause at the top'], 'calf-raise'],
  ['machine-calf-raise', 'Standing Calf Raise Machine', 'calves', S, 'reps', GYM, 1, true, ['Shoulders under the pads', 'Rise high, lower slowly', 'Pause in the stretch'], 'calf-raise'],
  ['seated-calf-raise', 'Seated Calf Raise', 'calves', S, 'reps', GYM, 1, true, ['Pad on lower thighs', 'Rise and squeeze', 'Slow lowering'], 'calf-raise'],
  // Core
  ['crunch', 'Crunch', 'core', E, 'reps', BW, 1, false, ['Knees bent, hands by your ears', 'Curl your ribs toward your hips', "Don't pull on your neck"] ],
  ['bicycle-crunch', 'Bicycle Crunch', 'core', E, 'reps', BW, 1, false, ['Elbow toward the opposite knee', 'Extend the other leg', 'Slow and controlled; reps are per side'], 'crunch'],
  ['leg-raise', 'Lying Leg Raise', 'core', E, 'reps', BW, 1, false, ['Lower back pressed down', 'Raise straight legs to vertical', 'Lower without arching'], 'dead-bug'],
  ['russian-twist', 'Russian Twist', 'core', E, 'reps', BW, 1, false, ['Lean back slightly, chest up', 'Rotate side to side', 'Reps are per side'], 'dead-bug'],
  ['bird-dog', 'Bird Dog', 'core', A, 'reps', BW, 1, false, ['On hands and knees', 'Reach opposite arm and leg long', 'Hips stay level; reps are per side'] ],
  ['hollow-hold', 'Hollow Body Hold', 'core', E, 'time', BW, 2, false, ['Lower back glued to the floor', 'Arms and legs extended just off the ground', 'Bend knees to make it easier'], 'dead-bug'],
  ['v-up', 'V-Up', 'core', E, 'reps', BW, 2, false, ['Lie flat, arms overhead', 'Lift legs and torso to meet in the middle', 'Lower with control'], 'crunch'],
  ['hanging-knee-raise', 'Hanging Knee Raise', 'core', E, 'reps', BAR, 2, false, ['Hang from the bar', 'Bring knees up toward your chest', 'No swinging'], 'leg-raise'],
  ['hanging-leg-raise', 'Hanging Leg Raise', 'core', E, 'reps', BAR, 3, false, ['Hang from the bar', 'Raise straight legs to hip height or higher', 'Slow lowering'], 'hanging-knee-raise'],
  ['cable-crunch', 'Cable Crunch', 'core', S, 'reps', GYM, 1, true, ['Kneel, rope by your head', 'Curl your ribs down toward your hips', 'Hips stay still'], 'crunch'],
  ['ab-wheel', 'Ab Wheel Rollout', 'core', E, 'reps', GYM, 2, false, ['Start on your knees', 'Roll out with a flat back', 'Pull back with your abs'], 'plank'],
  ['pallof-press', 'Pallof Press', 'core', S, 'reps', ['bands', 'gym'], 1, false, ['Band or cable at chest height, stand side-on', 'Press straight out and resist the twist', 'Reps are per side'], 'dead-bug'],
  // Cardio
  ['mountain-climbers', 'Mountain Climbers', 'cardio', E, 'time', BW, 1, false, ['High plank', 'Drive knees toward your chest one at a time', 'Steady rhythm'] ],
  ['high-knees', 'High Knees', 'cardio', E, 'time', BW, 1, false, ['Run in place', 'Knees to hip height', 'Pump your arms'] ],
  ['burpees', 'Burpees', 'cardio', E, 'time', BW, 2, false, ['Squat, jump feet back to a plank', 'Jump feet in and leap up', 'Step back instead of jumping to make it easier'], 'jumping-jacks'],
  ['jump-rope', 'Jump Rope', 'cardio', E, 'time', BW, 1, false, ['Small, quick hops', 'Turn the rope with your wrists', 'No rope? Mimic the motion'] ],
  ['shadow-boxing', 'Shadow Boxing', 'cardio', A, 'time', BW, 1, false, ['Light on your feet', 'Jab, cross, hook combos', 'Keep your hands up'] ],
  ['run-intervals', 'Run Intervals', 'cardio', E, 'time', BW, 2, false, ['1 min fast, 2 min easy, repeat', 'Fast means hard but controlled', 'Walk the easy parts if needed'], 'jog'],
  ['rower', 'Rowing Machine', 'cardio', E, 'time', GYM, 1, false, ['Legs, then hips, then arms', 'Reverse on the way back', 'Steady strokes'] ],
  ['incline-walk', 'Incline Treadmill Walk', 'cardio', E, 'time', GYM, 1, false, ['Incline 8–12%', 'Brisk pace, no holding the rails', 'Great low-impact cardio'] ],
  ['elliptical', 'Elliptical', 'cardio', E, 'time', GYM, 1, false, ['Upright posture', 'Push and pull the handles', 'Moderate, steady effort'] ],
  ['stair-climber', 'Stair Climber', 'cardio', E, 'time', GYM, 2, false, ['Full steps, stand tall', 'Light grip on the rails only', 'Moderate pace'], 'incline-walk'],
  // Mobility
  ['hip-flexor-stretch', 'Hip Flexor Stretch', 'mobility', A, 'time', BW, 1, false, ['Half-kneel, squeeze the back glute', 'Shift forward gently', 'Time is per side'] ],
  ['deep-squat-hold', 'Deep Squat Hold', 'mobility', A, 'time', BW, 1, false, ['Sit into a deep squat, heels down', 'Hold a doorframe if needed', 'Push knees out with elbows'] ],
  ['thoracic-rotation', 'Open Book Rotation', 'mobility', A, 'time', BW, 1, false, ['Lie on your side, knees bent', 'Open your top arm across to the other side', 'Follow your hand with your eyes'] ],
  ['sun-salutation', 'Sun Salutation Flow', 'mobility', A, 'time', BW, 1, false, ['Reach up, fold down, step back to plank', 'Low push-up, cobra, downward dog', 'Step forward and rise; flow slowly'] ],
  ['band-dislocates', 'Band Shoulder Pass-Through', 'mobility', A, 'time', BAND, 1, false, ['Hold a band wide', 'Pass it over your head and behind you', 'Widen your grip if it pinches'] ],
]

EXERCISES.push(...MORE.map(([id, name, pattern, stat, kind, equipment, level, weighted, cues, easier]) =>
  ({ id, name, pattern, stat, kind, equipment, level, weighted, cues, ...(easier ? { easier } : {}) })))

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))

export function hasEquipment(ex: Exercise, owned: Equipment[]): boolean {
  return ex.equipment.some((e) => e === 'none' || owned.includes(e))
}
