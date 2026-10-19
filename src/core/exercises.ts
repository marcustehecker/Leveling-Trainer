import type { Equipment, StatId } from './types'

export type Pattern = 'squat' | 'hinge' | 'push' | 'vpush' | 'pull' | 'vpull' | 'lunge' | 'core' | 'cardio' | 'mobility'

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

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))

export function hasEquipment(ex: Exercise, owned: Equipment[]): boolean {
  return ex.equipment.some((e) => e === 'none' || owned.includes(e))
}
