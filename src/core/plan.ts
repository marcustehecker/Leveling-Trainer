import { EXERCISES, EXERCISE_BY_ID, hasEquipment, type Exercise, type Pattern } from './exercises'
import type { Assessment, DateKey, Profile, WorkoutType } from './types'
import { weekday } from './dates'

export interface PlannedExercise {
  exerciseId: string
  /** Stable id for this slot, used to remember the player's swap. */
  slot?: string
  sets: number
  /** Rep range for reps-based exercises. */
  reps?: [number, number]
  /** Target seconds per set for timed exercises. */
  seconds?: number
  restSec: number
}

export interface PlanDay {
  id: string
  title: string
  focus: string
  warmup: string[]
  exercises: PlannedExercise[]
  cooldown: string[]
  estMinutes: number
}

interface Template {
  id: string
  title: string
  focus: string
  patterns: Pattern[]
}

const T: Record<string, Template> = {
  fullA: { id: 'fullA', title: 'Full Body A', focus: 'Squat, push, pull', patterns: ['squat', 'push', 'pull', 'hinge', 'core', 'cardio'] },
  fullB: { id: 'fullB', title: 'Full Body B', focus: 'Lunge, press, pull-down', patterns: ['lunge', 'vpush', 'vpull', 'hinge', 'core', 'mobility'] },
  upper: { id: 'upper', title: 'Upper Body', focus: 'Push and pull', patterns: ['push', 'pull', 'vpush', 'vpull', 'biceps', 'triceps'] },
  lower: { id: 'lower', title: 'Lower Body', focus: 'Legs and hips', patterns: ['squat', 'hinge', 'lunge', 'calves', 'core', 'mobility'] },
  push: { id: 'push', title: 'Push', focus: 'Chest, shoulders, triceps', patterns: ['push', 'vpush', 'triceps', 'push', 'delts', 'triceps'] },
  pull: { id: 'pull', title: 'Pull', focus: 'Back and biceps', patterns: ['vpull', 'pull', 'biceps', 'pull', 'biceps', 'core'] },
  legs: { id: 'legs', title: 'Legs', focus: 'Quads, hamstrings, glutes', patterns: ['squat', 'lunge', 'hinge', 'calves', 'core', 'mobility'] },
  cardio: { id: 'cardio', title: 'Cardio', focus: 'Conditioning and core', patterns: ['cardio', 'core', 'cardio', 'mobility', 'core', 'cardio'] },
}

export const WORKOUT_TYPES: { v: WorkoutType; label: string }[] = [
  { v: 'auto', label: 'Auto' }, { v: 'push', label: 'Push' }, { v: 'pull', label: 'Pull' }, { v: 'lower', label: 'Lower Body' },
  { v: 'upper', label: 'Upper Body' }, { v: 'full', label: 'Full Body' }, { v: 'cardio', label: 'Cardio' },
]
const CHOSEN: Record<Exclude<WorkoutType, 'auto' | 'full'>, Template> = { push: T.push, pull: T.pull, lower: T.lower, upper: T.upper, cardio: T.cardio }

export const WARMUP = ['3 min easy cardio (march, jacks or bike)', 'Arm circles ×10 each way', 'Hip circles ×10 each way', '1 light practice set of the first exercise']
export const COOLDOWN = ['2 min easy walk', 'Hamstring, quad and chest stretch, 30 s each', 'Slow breathing for 1 min']

function templatesFor(daysPerWeek: number): Template[] {
  if (daysPerWeek <= 3) return [T.fullA, T.fullB]
  if (daysPerWeek === 4) return [T.upper, T.lower]
  return [T.push, T.pull, T.legs]
}

function exerciseCount(minutes: number): number {
  if (minutes <= 20) return 3
  if (minutes <= 30) return 4
  if (minutes <= 45) return 5
  return 6
}

function maxLevel(p: Profile): number {
  if (p.ageRange === '13-15') return 1
  if (p.experience === 'none' || p.experience === 'novice') return 1
  if (p.experience === 'intermediate') return 2
  return 3
}

/** Pick the best exercise for a pattern given equipment, experience and assessment. */
export function pickExercise(pattern: Pattern, p: Profile, a: Assessment, variant = 0, avoid: Set<string> = new Set()): Exercise {
  const lvl = maxLevel(p)
  let pool = EXERCISES.filter((e) => e.pattern === pattern && hasEquipment(e, p.equipment) && e.level <= lvl)
  if (pattern === 'push' && a.pushups < 5) pool = pool.filter((e) => e.id === 'incline-pushup' || e.weighted)
  if (pattern === 'core' && a.plankSeconds < 20) pool = pool.filter((e) => e.id !== 'plank' && e.id !== 'side-plank')
  if (pattern === 'cardio' && a.cardioLevel <= 2) pool = pool.filter((e) => e.id !== 'jog')
  if (pool.length === 0) pool = EXERCISES.filter((e) => e.pattern === pattern && e.equipment.includes('none'))
  // Prefer loadable movements when equipment exists, then harder variations.
  pool.sort((x, y) => Number(y.weighted) - Number(x.weighted) || y.level - x.level)
  // Repeated patterns in one day get a different movement when one exists.
  const fresh = pool.filter((e) => !avoid.has(e.id))
  if (fresh.length) pool = fresh
  const top = pool.filter((e) => e.weighted === pool[0].weighted)
  return top[variant % top.length]
}

export function prescription(ex: Exercise, p: Profile, a: Assessment, mainCardio = false): Omit<PlannedExercise, 'exerciseId'> {
  const sets = { none: 2, novice: 3, intermediate: 3, advanced: 4 }[p.experience]
  if (ex.pattern === 'cardio' && mainCardio) return { sets: 1, seconds: Math.max(10, Math.round(p.sessionMinutes * 0.45)) * 60, restSec: 0 }
  if (ex.pattern === 'cardio') return { sets: 1, seconds: (4 + a.cardioLevel * 2) * 60, restSec: 0 }
  if (ex.pattern === 'mobility') return { sets: 1, seconds: 300, restSec: 0 }
  if (ex.kind === 'time') {
    const base = ex.id === 'knee-plank' ? Math.max(20, a.plankSeconds) : a.plankSeconds
    return { sets, seconds: Math.min(60, Math.max(15, Math.round(base * 0.7))), restSec: 60 }
  }
  const compound = ['squat', 'hinge', 'push', 'pull', 'vpull'].includes(ex.pattern) && ex.weighted
  const isolation = ['delts', 'biceps', 'triceps'].includes(ex.pattern)
  const reps: [number, number] = ex.pattern === 'calves' ? [12, 20] : isolation ? [10, 15] : p.experience === 'advanced' && compound ? [6, 10] : [8, 12]
  return { sets, reps, restSec: compound ? (p.experience === 'advanced' ? 120 : 90) : 60 }
}

/** One plan day per training weekday, cycling through the split's templates. */
export function generatePlan(p: Profile, a: Assessment): Record<number, PlanDay> {
  const days = [...p.trainingDays].sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7)) // Monday first
  const templates = templatesFor(days.length)
  const n = exerciseCount(p.sessionMinutes)
  const out: Record<number, PlanDay> = {}
  let fullCount = 0
  days.forEach((wd, i) => {
    const chosen = p.routine?.[wd]
    let t = templates[i % templates.length]
    let round = Math.floor(i / templates.length)
    if (chosen === 'full') { t = [T.fullA, T.fullB][fullCount % 2]; round = Math.floor(fullCount / 2); fullCount++ }
    else if (chosen && chosen !== 'auto') { t = CHOSEN[chosen]; round = 0 }
    const used = new Set<string>()
    const exercises = t.patterns.slice(0, n).map((pattern, j) => {
      const slot = `${wd}:${t.id}:${j}`
      const swapped = p.swaps?.[slot] ? EXERCISE_BY_ID[p.swaps[slot]] : undefined
      const ex = swapped && hasEquipment(swapped, p.equipment) ? swapped : pickExercise(pattern, p, a, round, used)
      used.add(ex.id)
      return { exerciseId: ex.id, slot, ...prescription(ex, p, a, t.id === 'cardio' && j === 0) }
    })
    const work = exercises.reduce((m, e) => m + e.sets * ((e.seconds ?? 40) + e.restSec), 0) / 60
    out[wd] = {
      id: `${t.id}-${wd}`,
      title: t.title,
      focus: t.focus,
      warmup: WARMUP,
      exercises,
      cooldown: COOLDOWN,
      estMinutes: Math.round(work + 8),
    }
  })
  return out
}

export function planDayFor(p: Profile, a: Assessment, date: DateKey): PlanDay | null {
  return generatePlan(p, a)[weekday(date)] ?? null
}

export function isTrainingDay(p: Profile, date: DateKey): boolean {
  return p.trainingDays.includes(weekday(date))
}

export function describeTarget(pe: PlannedExercise): string {
  const ex = EXERCISE_BY_ID[pe.exerciseId]
  if (pe.seconds) {
    const t = pe.seconds >= 120 ? `${Math.round(pe.seconds / 60)} min` : `${pe.seconds} s`
    return pe.sets > 1 ? `${pe.sets} × ${t}` : t
  }
  return `${pe.sets} × ${pe.reps?.[0]}–${pe.reps?.[1]}${ex?.pattern === 'lunge' || ex?.id === 'dead-bug' ? ' / side' : ''}`
}
