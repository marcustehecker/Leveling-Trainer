// Dungeon Raids: one weekly boss whose HP only drops from sets logged in real
// workouts. Limits per set, per minute, per day and between sessions mean a raid
// takes several honest sessions and can't be cleared in one sitting.
import { EXERCISE_BY_ID, type Pattern } from './exercises'
import type { DateKey, Profile, RankId, WorkoutInput } from './types'

export type RaidMetric = 'reps' | 'minutes' | 'sets' | 'volume'

export interface Boss {
  id: string
  name: string
  lore: string
  metric: RaidMetric
  patterns: Pattern[]
  /** Base target at E-rank for a novice. */
  base: number
  unit: string
  /** Only offered when the player owns weights. */
  needsWeights?: boolean
}

export const BOSSES: Boss[] = [
  { id: 'venom-serpent', name: 'Kasaka, Venom Serpent', lore: 'A giant serpent coils in the depths. Strike it with pushing power.', metric: 'reps', patterns: ['push', 'vpush', 'triceps'], base: 250, unit: 'push reps' },
  { id: 'frost-bears', name: 'Frost Gate Bears', lore: 'A pack of ice bears guards the frozen gate. Outlast them.', metric: 'minutes', patterns: ['cardio'], base: 75, unit: 'cardio minutes' },
  { id: 'red-knight', name: 'The Crimson Knight', lore: 'An armored knight bars the castle stairs. Your legs must carry you past.', metric: 'reps', patterns: ['squat', 'lunge', 'hinge', 'calves'], base: 350, unit: 'leg reps' },
  { id: 'gatekeeper', name: 'Cerberus, Gatekeeper', lore: 'Three heads, one gate. Pull it open.', metric: 'reps', patterns: ['pull', 'vpull', 'biceps'], base: 200, unit: 'pull reps' },
  { id: 'ant-swarm', name: 'The Endless Swarm', lore: 'Wave after wave. Only volume wins.', metric: 'sets', patterns: [], base: 45, unit: 'sets' },
  { id: 'stone-golem', name: 'Stone Golem', lore: 'A golem of solid rock. Only heavy iron cracks it.', metric: 'volume', patterns: [], base: 5000, unit: 'kg lifted', needsWeights: true },
  { id: 'shadow-wraith', name: 'Shadow Wraith', lore: 'It feeds on weak cores. Harden yours.', metric: 'sets', patterns: ['core'], base: 24, unit: 'core sets' },
]
export const BOSS_BY_ID = Object.fromEntries(BOSSES.map((b) => [b.id, b]))

export const RAID = {
  /** Share of the target that can count on a single day. */
  DAILY_SHARE: 0.35,
  /** Hours between workouts that both count toward the raid. */
  COOLDOWN_HOURS: 3,
  /** A workout shorter than this deals no damage. */
  MIN_MINUTES: 10,
  /** Most reps from one set, most minutes from one cardio set, most reps used for volume. */
  MAX_REPS_PER_SET: 50,
  MAX_CARDIO_MIN_PER_SET: 60,
  MAX_VOLUME_REPS: 30,
  /** Most damage per minute of logged workout time, by metric. */
  PER_MINUTE: { reps: 25, minutes: 1, sets: 0.75, volume: 400 } as Record<RaidMetric, number>,
  XP_BY_RANK: { E: 250, D: 350, C: 450, B: 550, A: 650, S: 800 } as Record<RankId, number>,
}

const RANK_SCALE: Record<RankId, number> = { E: 1, D: 1.3, C: 1.6, B: 2, A: 2.5, S: 3 }
const EXP_SCALE = { none: 0.7, novice: 1, intermediate: 1.2, advanced: 1.4 }

export interface Raid {
  week: DateKey
  bossId: string
  target: number
  progress: number
  /** Damage counted per day, for the daily cap. */
  byDay: Record<DateKey, number>
  lastCountedAt: string | null
  status: 'active' | 'cleared' | 'failed'
  clearedOn?: DateKey
  xp: number
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
const ownsWeights = (p: Profile) => p.equipment.some((e) => e === 'dumbbells' || e === 'gym')

/** The raid issued for a week. `daysLeft` shrinks the target when it starts mid-week. */
export function createRaid(week: DateKey, p: Profile, rank: RankId, daysLeft: number, previous?: string): Raid {
  const pool = BOSSES.filter((b) => (!b.needsWeights || ownsWeights(p)) && b.id !== previous)
  const boss = pool[hash(week) % pool.length]
  const scale = RANK_SCALE[rank] * EXP_SCALE[p.experience] * Math.min(1, Math.max(3, daysLeft) / 7)
  const round = boss.metric === 'volume' ? 250 : boss.metric === 'reps' ? 10 : 1
  const target = Math.max(round, Math.round((boss.base * scale) / round) * round)
  return { week, bossId: boss.id, target, progress: 0, byDay: {}, lastCountedAt: null, status: 'active', xp: RAID.XP_BY_RANK[rank] }
}

/** Raw damage a workout deals before the session, daily and cooldown limits. */
export function rawDamage(boss: Boss, input: WorkoutInput): number {
  let total = 0
  for (const e of input.exercises) {
    const ex = EXERCISE_BY_ID[e.exerciseId]
    if (!ex || (boss.patterns.length && !boss.patterns.includes(ex.pattern))) continue
    for (const x of e.sets) {
      if (!x.done) continue
      if (boss.metric === 'sets') { if ((x.reps ?? 0) > 0 || (x.seconds ?? 0) > 0) total += 1 }
      else if (boss.metric === 'minutes') total += Math.min(RAID.MAX_CARDIO_MIN_PER_SET, (x.seconds ?? 0) / 60)
      else if (boss.metric === 'reps') total += Math.min(RAID.MAX_REPS_PER_SET, x.reps ?? 0)
      else total += (x.weightKg ?? 0) * Math.min(RAID.MAX_VOLUME_REPS, x.reps ?? 0)
    }
  }
  return total
}

export interface RaidHit { damage: number; blocked?: string; capped?: string; cleared: boolean }

/** Apply a workout to the raid in place and say what happened. */
export function applyWorkout(r: Raid, input: WorkoutInput, today: DateKey, now: string): RaidHit {
  const boss = BOSS_BY_ID[r.bossId]
  if (!boss || r.status !== 'active') return { damage: 0, cleared: false }
  const raw = rawDamage(boss, input)
  if (raw <= 0) return { damage: 0, cleared: false }
  if (input.durationMin < RAID.MIN_MINUTES) return { damage: 0, blocked: `Workouts under ${RAID.MIN_MINUTES} minutes don't count toward raids.`, cleared: false }
  if (r.lastCountedAt) {
    const hours = (Date.parse(now) - Date.parse(r.lastCountedAt)) / 3_600_000
    if (hours < RAID.COOLDOWN_HOURS) {
      const wait = Math.ceil((RAID.COOLDOWN_HOURS - hours) * 60)
      return { damage: 0, blocked: `Raid cooldown: the boss recovers. Your next workout counts in ${wait >= 60 ? `${Math.ceil(wait / 60)} h` : `${wait} min`}.`, cleared: false }
    }
  }
  const dailyCap = Math.ceil(r.target * RAID.DAILY_SHARE)
  const todaySoFar = r.byDay[today] ?? 0
  const limits = [
    { v: raw, why: '' },
    { v: input.durationMin * RAID.PER_MINUTE[boss.metric], why: 'Damage is limited by how long you trained.' },
    { v: dailyCap - todaySoFar, why: `Daily raid limit reached (${dailyCap} ${boss.unit} per day). Come back tomorrow.` },
    { v: r.target - r.progress, why: '' },
  ]
  const lim = limits.reduce((a, b) => (b.v < a.v ? b : a))
  const damage = Math.max(0, Math.floor(lim.v))
  if (damage <= 0) return { damage: 0, blocked: limits[2].why, cleared: false }
  r.progress += damage
  r.byDay[today] = todaySoFar + damage
  r.lastCountedAt = now
  const cleared = r.progress >= r.target
  if (cleared) { r.status = 'cleared'; r.clearedOn = today }
  return { damage, capped: lim.why || undefined, cleared }
}
