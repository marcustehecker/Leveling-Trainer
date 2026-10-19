import { EXERCISES, EXERCISE_BY_ID, hasEquipment, type Exercise, type Pattern } from './exercises'
import type { Assessment, DateKey, Profile } from './types'
import { weekday } from './dates'

export interface PlannedExercise {
  exerciseId: string
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
  upper: { id: 'upper', title: 'Upper Body', focus: 'Push and pull', patterns: ['push', 'pull', 'vpush', 'vpull', 'core', 'cardio'] },
  lower: { id: 'lower', title: 'Lower Body', focus: 'Legs and hips', patterns: ['squat', 'hinge', 'lunge', 'core', 'cardio', 'mobility'] },
  push: { id: 'push', title: 'Push', focus: 'Chest, shoulders, triceps', patterns: ['push', 'vpush', 'squat', 'core', 'cardio', 'mobility'] },
  pull: { id: 'pull', title: 'Pull', focus: 'Back and biceps', patterns: ['pull', 'vpull', 'hinge', 'core', 'cardio', 'mobility'] },
  legs: { id: 'legs', title: 'Legs', focus: 'Quads, hamstrings, glutes', patterns: ['squat', 'lunge', 'hinge', 'core', 'cardio', 'mobility'] },
}

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
export function pickExercise(pattern: Pattern, p: Profile, a: Assessment, variant = 0): Exercise {
  const lvl = maxLevel(p)
  let pool = EXERCISES.filter((e) => e.pattern === pattern && hasEquipment(e, p.equipment) && e.level <= lvl)
  if (pattern === 'push' && a.pushups < 5) pool = pool.filter((e) => e.id === 'incline-pushup' || e.weighted)
  if (pattern === 'core' && a.plankSeconds < 20) pool = pool.filter((e) => e.id !== 'plank' && e.id !== 'side-plank')
  if (pattern === 'cardio' && a.cardioLevel <= 2) pool = pool.filter((e) => e.id !== 'jog')
  if (pool.length === 0) pool = EXERCISES.filter((e) => e.pattern === pattern && e.equipment.includes('none'))
  // Prefer loadable movements when equipment exists, then harder variations.
  pool.sort((x, y) => Number(y.weighted) - Number(x.weighted) || y.level - x.level)
  const top = pool.filter((e) => e.weighted === pool[0].weighted)
  return top[variant % top.length]
}

export function prescription(ex: Exercise, p: Profile, a: Assessment): Omit<PlannedExercise, 'exerciseId'> {
  const sets = { none: 2, novice: 3, intermediate: 3, advanced: 4 }[p.experience]
  if (ex.pattern === 'cardio') return { sets: 1, seconds: (4 + a.cardioLevel * 2) * 60, restSec: 0 }
  if (ex.pattern === 'mobility') return { sets: 1, seconds: 300, restSec: 0 }
  if (ex.kind === 'time') {
    const base = ex.id === 'knee-plank' ? Math.max(20, a.plankSeconds) : a.plankSeconds
    return { sets, seconds: Math.min(60, Math.max(15, Math.round(base * 0.7))), restSec: 60 }
  }
  const compound = ['squat', 'hinge', 'push', 'pull', 'vpull'].includes(ex.pattern) && ex.weighted
  const reps: [number, number] = p.experience === 'advanced' && compound ? [6, 10] : [8, 12]
  return { sets, reps, restSec: compound ? (p.experience === 'advanced' ? 120 : 90) : 60 }
}

/** One plan day per training weekday, cycling through the split's templates. */
export function generatePlan(p: Profile, a: Assessment): Record<number, PlanDay> {
  const days = [...p.trainingDays].sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7)) // Monday first
  const templates = templatesFor(days.length)
  const n = exerciseCount(p.sessionMinutes)
  const out: Record<number, PlanDay> = {}
  days.forEach((wd, i) => {
    const t = templates[i % templates.length]
    const round = Math.floor(i / templates.length)
    const exercises = t.patterns.slice(0, n).map((pattern) => {
      const ex = pickExercise(pattern, p, a, round)
      return { exerciseId: ex.id, ...prescription(ex, p, a) }
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
