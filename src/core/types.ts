export type RankId = 'E' | 'D' | 'C' | 'B' | 'A' | 'S'
export type StatId = 'strength' | 'endurance' | 'agility' | 'vitality' | 'discipline' | 'recovery'
export type DateKey = string // YYYY-MM-DD, local time

export type AgeRange = '13-15' | '16-17' | '18-29' | '30-44' | '45-59' | '60+'
export type Experience = 'none' | 'novice' | 'intermediate' | 'advanced'
export type Goal = 'strength' | 'muscle' | 'endurance' | 'fatloss' | 'mobility' | 'technique' | 'consistency' | 'general'
export type Equipment = 'none' | 'dumbbells' | 'bands' | 'pullupBar' | 'gym'

export interface Profile {
  name: string
  ageRange: AgeRange
  heightCm?: number
  weightKg?: number
  units: 'metric' | 'imperial'
  experience: Experience
  goals: Goal[]
  /** Single goal from saves made before goals became multi-select. */
  goal?: Goal
  equipment: Equipment[]
  /** Weekdays, 0 = Sunday … 6 = Saturday. */
  trainingDays: number[]
  sessionMinutes: number
  diet: { preferences: string; allergies: string }
  bedtime?: string
  /** When the player accepted the safety terms and confirmed they are 13+. */
  acceptedTermsAt?: string
}

export interface Assessment {
  pushups: number
  plankSeconds: number
  /** 1–5 self rating. */
  cardioLevel: number
  /** 1–5 self rating. */
  mobilityLevel: number
}

export type QuestType = 'main' | 'side' | 'habit' | 'recovery' | 'sleep' | 'weekly' | 'penalty' | 'trial'
export type QuestMeasure = 'workout' | 'count' | 'minutes' | 'check' | 'weeklyWorkouts'

export interface Quest {
  id: string
  date: DateKey
  /** Last day it can be completed (inclusive). null = until done. */
  expires: DateKey | null
  type: QuestType
  measure: QuestMeasure
  title: string
  description: string
  objective: string
  difficulty: RankId
  minutes: number
  stat: StatId
  xp: number
  target: number
  progress: number
  unit: string
  /** Logged sets of these exercises advance count/minutes quests. */
  exerciseIds?: string[]
  /** Minimum logged session length for workout quests. */
  minMinutes?: number
  status: 'active' | 'done' | 'failed'
  bonus?: { text: string; target: number; done: boolean }
  verification?: 'Logged' | 'Self-reported'
  penaltyId?: string
  trialRank?: RankId
  completedOn?: DateKey
}

export interface LoggedSet {
  reps?: number
  weightKg?: number
  seconds?: number
  done: boolean
}

export interface LoggedExercise {
  exerciseId: string
  name: string
  sets: LoggedSet[]
}

export interface WorkoutInput {
  title: string
  planDayId?: string
  exercises: LoggedExercise[]
  durationMin: number
  rpe?: number
}

export interface WorkoutLog extends WorkoutInput {
  id: string
  date: DateKey
  loggedAt: string
  planned: boolean
  xpAwarded: number
  prs: string[]
}

export interface XpEvent {
  id: string
  date: DateKey
  amount: number
  kind: 'gain' | 'loss' | 'refund'
  reason: string
}

export interface PersonalRecord {
  weightKg: number
  reps: number
  seconds: number
  date: DateKey
}

export interface Penalty {
  id: string
  date: DateKey
  lost: number
  refunded: boolean
  questId: string
}

export type Ceremony =
  | { kind: 'levelUp'; from: number; to: number }
  | { kind: 'levelDown'; from: number; to: number }
  | { kind: 'rankUp'; rank: RankId }
  | { kind: 'demotion'; from: RankId; to: RankId }
  | { kind: 'warning'; rank: RankId; daysLeft: number }
  | { kind: 'penalty'; lost: number; reason: string }
  | { kind: 'achievement'; id: string }
  | { kind: 'questClear'; title: string; xp: number }
  | { kind: 'trialUnlocked'; rank: RankId }

export interface LogEntry {
  id: string
  date: DateKey
  at: string
  text: string
  tone: 'info' | 'gain' | 'loss' | 'rare'
}

export interface GameState {
  version: 1
  profile: Profile
  assessment: Assessment
  createdDate: DateKey
  /** Last day whose end-of-day rules have run. */
  lastClosedDate: DateKey
  questsGeneratedFor: DateKey[]
  xp: number
  lifetimeXp: number
  rank: RankId
  rankHistory: { date: DateKey; rank: RankId; kind: 'start' | 'promotion' | 'demotion' }[]
  demotionWarningStart: DateKey | null
  activeWeeksAtRank: number
  stats: Record<StatId, number>
  quests: Quest[]
  workouts: WorkoutLog[]
  xpLog: XpEvent[]
  xpHistory: { date: DateKey; xp: number }[]
  dailyXp: Record<DateKey, number>
  dailyClear: DateKey[]
  records: Record<string, PersonalRecord>
  prCount: number
  sickDays: DateKey[]
  missStreak: number
  inactiveStreak: number
  streak: number
  bestStreak: number
  penalties: Penalty[]
  achievements: Record<string, DateKey>
  equippedTitle: string | null
  log: LogEntry[]
  ceremonies: Ceremony[]
  seq: number
  /** Wall-clock ms of the last change; newest copy wins when syncing. */
  updatedAt?: number
}
