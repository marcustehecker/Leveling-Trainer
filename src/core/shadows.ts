// Shadow Army: shadows rise from defeated raid bosses and big milestones. Each
// gives a small bonus that grows as the player trains what the shadow is tied to.
import { RANKS } from './balance'
import { EXERCISE_BY_ID, type Pattern } from './exercises'
import type { DateKey, GameState, RankId, WorkoutInput } from './types'

export type ShadowBonus =
  | { kind: 'workout'; pct: number; patterns?: Pattern[] }
  | { kind: 'quest'; pct: number }
  | { kind: 'all'; pct: number }
  | { kind: 'guard' }

export type ShadowSource = { boss: string } | { rank: RankId } | { streak: number }

export interface Shadow {
  id: string
  name: string
  grade: 'Soldier' | 'Elite' | 'Knight' | 'Commander' | 'Marshal'
  icon: string
  lore: string
  source: ShadowSource
  bonus: ShadowBonus
}

export interface ShadowState { since: DateKey; xp: number }

export const SHADOWS: Shadow[] = [
  { id: 'kasaka', name: 'Kasaka', grade: 'Elite', icon: '🐍', lore: 'The venom serpent, now coiled at your side.', source: { boss: 'venom-serpent' }, bonus: { kind: 'workout', pct: 5, patterns: ['push', 'vpush', 'triceps'] } },
  { id: 'frost-bear', name: 'Frost Bear', grade: 'Elite', icon: '🐻‍❄️', lore: 'It once guarded the frozen gate. Now it runs with you.', source: { boss: 'frost-bears' }, bonus: { kind: 'workout', pct: 5, patterns: ['cardio'] } },
  { id: 'crimson-knight', name: 'Crimson Knight', grade: 'Knight', icon: '🏇', lore: 'The knight of the castle stairs kneels before you.', source: { boss: 'red-knight' }, bonus: { kind: 'workout', pct: 5, patterns: ['squat', 'lunge', 'hinge', 'calves'] } },
  { id: 'cerberus', name: 'Cerberus', grade: 'Elite', icon: '🐕', lore: 'Three heads, one master.', source: { boss: 'gatekeeper' }, bonus: { kind: 'workout', pct: 5, patterns: ['pull', 'vpull', 'biceps'] } },
  { id: 'ant-soldier', name: 'Ant Soldier', grade: 'Soldier', icon: '🐜', lore: 'One of the endless swarm. It never stops working.', source: { boss: 'ant-swarm' }, bonus: { kind: 'workout', pct: 2 } },
  { id: 'golem', name: 'Stone Golem', grade: 'Knight', icon: '🗿', lore: 'Solid rock, bound to your will.', source: { boss: 'stone-golem' }, bonus: { kind: 'workout', pct: 3 } },
  { id: 'wraith', name: 'Wraith', grade: 'Elite', icon: '👻', lore: 'It fed on weak cores. Yours is not weak.', source: { boss: 'shadow-wraith' }, bonus: { kind: 'workout', pct: 5, patterns: ['core'] } },
  { id: 'iron', name: 'Iron', grade: 'Knight', icon: '🛡️', lore: 'A heavy-armored knight. Loud, loyal and stubborn.', source: { rank: 'D' }, bonus: { kind: 'quest', pct: 5 } },
  { id: 'igris', name: 'Igris', grade: 'Commander', icon: '🤺', lore: 'The Blood-Red Commander. Once a month, he guards your streak when you miss a planned day.', source: { rank: 'C' }, bonus: { kind: 'guard' } },
  { id: 'tank', name: 'Tank', grade: 'Elite', icon: '🐻', lore: 'A giant bear who refuses to break. Earned with a 30 day streak.', source: { streak: 30 }, bonus: { kind: 'all', pct: 3 } },
  { id: 'tusk', name: 'Tusk', grade: 'Commander', icon: '🧌', lore: 'A high orc shaman who fuels your daily discipline.', source: { rank: 'B' }, bonus: { kind: 'quest', pct: 8 } },
  { id: 'beru', name: 'Beru', grade: 'Marshal', icon: '🦗', lore: 'The Ant King. Earned with a 100 day streak.', source: { streak: 100 }, bonus: { kind: 'all', pct: 5 } },
  { id: 'bellion', name: 'Bellion', grade: 'Marshal', icon: '👑', lore: 'Grand Marshal of the army. Only an S-Rank Hunter commands him.', source: { rank: 'S' }, bonus: { kind: 'all', pct: 6 } },
]
export const SHADOW_BY_ID: Record<string, Shadow> = Object.fromEntries(SHADOWS.map((x) => [x.id, x]))

export const SHADOW = {
  MAX_LEVEL: 10,
  /** Shadow XP per completed set the shadow is tied to (shadows tied to everything get less). */
  XP_PER_SET: 5,
  XP_PER_SET_GENERAL: 2,
  /** Shadow XP when its boss is defeated again. */
  REPEAT_BOSS_XP: 200,
  /** Most extra XP all shadows together can add, in percent. */
  MAX_TOTAL_PCT: 40,
  GUARD_DAYS: 30,
}

export function shadowLevel(xp: number) {
  return Math.min(SHADOW.MAX_LEVEL, 1 + Math.floor(Math.sqrt(xp / 40)))
}

/** Bonus percent at a level: the base at level 1, doubled at level 10. */
export function shadowPct(sh: Shadow, xp: number) {
  if (sh.bonus.kind === 'guard') return 0
  return Math.round(sh.bonus.pct * (1 + (shadowLevel(xp) - 1) / 9) * 10) / 10
}

export function describeBonus(sh: Shadow, xp = 0) {
  const b = sh.bonus
  if (b.kind === 'guard') return `Saves your streak once every ${SHADOW.GUARD_DAYS} days`
  const pct = shadowPct(sh, xp)
  if (b.kind === 'quest') return `+${pct}% quest XP`
  if (b.kind === 'all') return `+${pct}% workout and quest XP`
  return b.patterns ? `+${pct}% XP on ${patternLabel(b.patterns)} workouts` : `+${pct}% workout XP`
}

function patternLabel(p: Pattern[]) {
  if (p.includes('cardio')) return 'cardio'
  if (p.includes('core')) return 'core'
  if (p.includes('squat')) return 'leg'
  if (p.includes('pull')) return 'pull'
  return 'push'
}

export function describeSource(sh: Shadow) {
  const src = sh.source
  if ('boss' in src) return 'Defeat its Dungeon Raid boss'
  if ('rank' in src) return `Reach ${src.rank}-Rank`
  return `Reach a ${src.streak} day streak`
}

const donePatterns = (input: WorkoutInput) => input.exercises.flatMap((e) => {
  const ex = EXERCISE_BY_ID[e.exerciseId]
  return ex ? e.sets.filter((x) => x.done).map(() => ex.pattern) : []
})

function matches(sh: Shadow, patterns: Pattern[]) {
  const b = sh.bonus
  if (b.kind === 'all') return patterns.length > 0
  if (b.kind !== 'workout') return false
  return b.patterns ? patterns.some((p) => b.patterns!.includes(p)) : patterns.length > 0
}

/** Extra workout XP percent from the army for this workout. */
export function workoutBonusPct(s: GameState, input: WorkoutInput) {
  const pats = donePatterns(input)
  let pct = 0
  for (const [id, st] of Object.entries(s.shadows ?? {})) {
    const sh = SHADOW_BY_ID[id]
    if (sh && matches(sh, pats)) pct += shadowPct(sh, st.xp)
  }
  return Math.min(SHADOW.MAX_TOTAL_PCT, pct)
}

/** Extra quest XP percent from the army. */
export function questBonusPct(s: GameState) {
  let pct = 0
  for (const [id, st] of Object.entries(s.shadows ?? {})) {
    const sh = SHADOW_BY_ID[id]
    if (sh && (sh.bonus.kind === 'quest' || sh.bonus.kind === 'all')) pct += shadowPct(sh, st.xp)
  }
  return Math.min(SHADOW.MAX_TOTAL_PCT, pct)
}

/** Shadows that train alongside the player gain XP from completed sets. Returns ids that levelled up. */
export function trainShadows(s: GameState, input: WorkoutInput): string[] {
  const pats = donePatterns(input)
  const up: string[] = []
  for (const [id, st] of Object.entries(s.shadows ?? {})) {
    const sh = SHADOW_BY_ID[id]
    if (!sh) continue
    const b = sh.bonus
    const n = b.kind === 'workout' && b.patterns ? pats.filter((p) => b.patterns!.includes(p)).length : pats.length
    const gain = n * (b.kind === 'workout' && b.patterns ? SHADOW.XP_PER_SET : SHADOW.XP_PER_SET_GENERAL)
    const before = shadowLevel(st.xp)
    st.xp += gain
    if (shadowLevel(st.xp) > before) up.push(id)
  }
  return up
}

export function shadowForBoss(bossId: string) {
  return SHADOWS.find((x) => 'boss' in x.source && x.source.boss === bossId)
}

/** Milestone shadows the player qualifies for but doesn't have yet. */
export function earnedMilestones(s: GameState): Shadow[] {
  const reached = (r: RankId) => RANKS.indexOf(s.rank) >= RANKS.indexOf(r) || s.rankHistory.some((h) => h.rank === r)
  return SHADOWS.filter((x) => !s.shadows?.[x.id] && (('rank' in x.source && reached(x.source.rank)) || ('streak' in x.source && s.bestStreak >= x.source.streak)))
}

export function canGuardStreak(s: GameState, d: DateKey) {
  if (!s.shadows?.igris) return false
  if (!s.shadowGuardUsed) return true
  return (Date.parse(d) - Date.parse(s.shadowGuardUsed)) / 86_400_000 >= SHADOW.GUARD_DAYS
}
