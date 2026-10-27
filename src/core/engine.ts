// The progression engine. Every function takes a state and returns a new one;
// dates are passed in so the rules are deterministic and testable.
import * as B from './balance'
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from './achievements'
import { levelInfo, statLevel } from './levels'
import { applyWorkout, BOSS_BY_ID, createRaid, type RaidHit } from './raids'
import { canGuardStreak, earnedMilestones, questBonusPct, SHADOW, SHADOW_BY_ID, shadowForBoss, shadowLevel, trainShadows, workoutBonusPct } from './shadows'
import { addDays, daysBetween, range, weekday, weekStart } from './dates'
import { EXERCISE_BY_ID } from './exercises'
import { isTrainingDay } from './plan'
import { DAILY_TYPES, generateDailyQuests, penaltyQuest, waterAmount, waterGlasses } from './quests'
import type {
  Assessment, Ceremony, DateKey, GameState, LogEntry, PersonalRecord, Profile, Quest, RankId, StatId, WorkoutInput, WorkoutLog,
} from './types'

const clone = <T,>(x: T): T => structuredClone(x)

// ---------- Levels and ranks ----------

export { levelInfo, statLevel, type LevelInfo } from './levels'

export function statRank(level: number): RankId {
  if (level >= 70) return 'S'
  if (level >= 50) return 'A'
  if (level >= 35) return 'B'
  if (level >= 20) return 'C'
  if (level >= 10) return 'D'
  return 'E'
}

export const STAT_IDS: StatId[] = ['strength', 'endurance', 'agility', 'vitality', 'discipline', 'recovery']

export function powerRating(s: GameState): number {
  const statSum = STAT_IDS.reduce((m, id) => m + statLevel(s.stats[id]), 0)
  return statSum * 10 + B.RANKS.indexOf(s.rank) * 150 + levelInfo(s.xp).level * 5
}

export function nextRank(r: RankId): Exclude<RankId, 'E'> | null {
  const i = B.RANKS.indexOf(r)
  return i < B.RANKS.length - 1 ? (B.RANKS[i + 1] as Exclude<RankId, 'E'>) : null
}

export interface PromotionStatus {
  next: Exclude<RankId, 'E'>
  xp: { have: number; need: number }
  weeks: { have: number; need: number }
  prs: { have: number; need: number }
  trialUnlocked: boolean
}

export function promotionStatus(s: GameState): PromotionStatus | null {
  const next = nextRank(s.rank)
  if (!next) return null
  const req = B.PROMOTION[next]
  return {
    next,
    xp: { have: s.xp, need: B.RANK_XP[next] },
    weeks: { have: s.activeWeeksAtRank, need: req.activeWeeks },
    prs: { have: s.prCount, need: req.prs },
    trialUnlocked: s.quests.some((q) => q.type === 'trial' && q.status === 'active'),
  }
}

export function demotionDaysLeft(s: GameState, today: DateKey): number | null {
  if (!s.demotionWarningStart) return null
  return Math.max(0, B.DEMOTION_WARNING_DAYS - daysBetween(s.demotionWarningStart, today))
}

// ---------- Internal helpers (mutate a draft) ----------

function nextId(s: GameState, prefix: string): string {
  s.seq += 1
  return `${prefix}${s.seq}`
}

function log(s: GameState, date: DateKey, now: string, text: string, tone: LogEntry['tone'] = 'info') {
  s.log.unshift({ id: nextId(s, 'l'), date, at: now, text, tone })
  if (s.log.length > 300) s.log.length = 300
}

function ceremony(s: GameState, c: Ceremony) {
  const last = s.ceremonies[s.ceremonies.length - 1]
  // Merge back-to-back level changes and penalties so a catch-up doesn't stack dozens of screens.
  if (last && last.kind === c.kind) {
    if ((c.kind === 'levelUp' || c.kind === 'levelDown') && (last.kind === 'levelUp' || last.kind === 'levelDown')) {
      last.to = c.to
      return
    }
    if (c.kind === 'penalty' && last.kind === 'penalty') {
      last.lost += c.lost
      last.reason = c.reason
      return
    }
  }
  s.ceremonies.push(c)
}

function addStat(s: GameState, stat: StatId, n: number) {
  if (n > 0) s.stats[stat] += Math.round(n)
}

function afterXpChange(s: GameState, date: DateKey, now: string, prevLevel: number) {
  const lv = levelInfo(s.xp).level
  if (lv > prevLevel) {
    ceremony(s, { kind: 'levelUp', from: prevLevel, to: lv })
    log(s, date, now, `[SYSTEM] Level up. Level ${prevLevel} → ${lv}.`, 'gain')
  } else if (lv < prevLevel) {
    ceremony(s, { kind: 'levelDown', from: prevLevel, to: lv })
    log(s, date, now, `[SYSTEM] Level decreased. Level ${prevLevel} → ${lv}.`, 'loss')
  }
  if (s.demotionWarningStart && s.xp >= B.RANK_XP[s.rank]) {
    s.demotionWarningStart = null
    log(s, date, now, `[SYSTEM] Demotion Warning lifted. ${s.rank}-Rank status secured.`, 'rare')
    unlock(s, 'survived_warning', date, now)
  }
  checkTrial(s, date, now)
}

function gainXp(s: GameState, date: DateKey, now: string, amount: number, reason: string, uncapped = false): number {
  const used = s.dailyXp[date] ?? 0
  const actual = Math.max(0, Math.round(uncapped ? amount : Math.min(amount, B.DAILY_XP_CAP - used)))
  if (!uncapped) s.dailyXp[date] = used + actual
  const prev = levelInfo(s.xp).level
  s.xp += actual
  s.lifetimeXp += actual
  s.xpLog.unshift({ id: nextId(s, 'x'), date, amount: actual, kind: 'gain', reason: actual < amount ? `${reason} (daily cap)` : reason })
  if (s.xpLog.length > 600) s.xpLog.length = 600
  afterXpChange(s, date, now, prev)
  return actual
}

function loseXp(s: GameState, date: DateKey, now: string, amount: number, reason: string): number {
  const actual = Math.min(s.xp, Math.round(amount))
  const prev = levelInfo(s.xp).level
  s.xp -= actual
  s.xpLog.unshift({ id: nextId(s, 'x'), date, amount: -actual, kind: 'loss', reason })
  afterXpChange(s, date, now, prev)
  return actual
}

function refundXp(s: GameState, date: DateKey, now: string, amount: number, reason: string) {
  const prev = levelInfo(s.xp).level
  s.xp += amount
  s.xpLog.unshift({ id: nextId(s, 'x'), date, amount, kind: 'refund', reason })
  afterXpChange(s, date, now, prev)
}

function unlock(s: GameState, id: string, date: DateKey, now: string) {
  if (s.achievements[id]) return
  s.achievements[id] = date
  ceremony(s, { kind: 'achievement', id })
  log(s, date, now, `[SYSTEM] Achievement unlocked: ${ACHIEVEMENT_BY_ID[id]?.name ?? id}.`, 'rare')
}

function checkAchievements(s: GameState, date: DateKey, now: string) {
  for (const sh of earnedMilestones(s)) arise(s, sh.id, date, now)
  for (const a of ACHIEVEMENTS) if (!s.achievements[a.id] && a.test(s)) unlock(s, a.id, date, now)
}

/** A shadow joins the army. */
function arise(s: GameState, id: string, date: DateKey, now: string) {
  const army = (s.shadows ??= {})
  if (army[id]) return
  army[id] = { since: date, xp: 0 }
  ceremony(s, { kind: 'arise', shadowId: id })
  log(s, date, now, `[SYSTEM] ARISE. ${SHADOW_BY_ID[id]?.name ?? id} has joined your Shadow Army.`, 'rare')
}

function checkTrial(s: GameState, date: DateKey, now: string) {
  const st = promotionStatus(s)
  if (!st || st.trialUnlocked) return
  if (st.xp.have < st.xp.need || st.weeks.have < st.weeks.need || st.prs.have < st.prs.need) return
  s.quests.push({
    id: `trial-${st.next}-${s.seq + 1}`, date, expires: null, type: 'trial', measure: 'workout',
    title: `${st.next}-Rank Trial`,
    description: 'Your growth has been recognized. Prove it. Rank advancement awaits.',
    objective: 'Log a full workout (4+ sets) with every set completed and effort recorded',
    difficulty: st.next, minutes: 45, stat: 'discipline', xp: B.TRIAL_XP, target: 1, progress: 0,
    unit: 'trial', status: 'active', trialRank: st.next,
  })
  s.seq += 1
  ceremony(s, { kind: 'trialUnlocked', rank: st.next })
  log(s, date, now, `[SYSTEM] ${st.next}-Rank Trial unlocked.`, 'rare')
}

function promote(s: GameState, rank: RankId, date: DateKey, now: string) {
  s.rank = rank
  s.rankHistory.push({ date, rank, kind: 'promotion' })
  s.activeWeeksAtRank = 0
  s.demotionWarningStart = null
  ceremony(s, { kind: 'rankUp', rank })
  log(s, date, now, `[SYSTEM] Rank advancement confirmed. You are now ${rank}-Rank.`, 'rare')
}

function checkDemotion(s: GameState, d: DateKey, now: string) {
  if (s.rank === 'E') return
  const thr = B.RANK_XP[s.rank]
  if (s.xp >= thr) return
  if (!s.demotionWarningStart) {
    s.demotionWarningStart = d
    ceremony(s, { kind: 'warning', rank: s.rank, daysLeft: B.DEMOTION_WARNING_DAYS })
    log(s, d, now, `[SYSTEM] Demotion Warning. XP is below the ${s.rank}-Rank threshold. ${B.DEMOTION_WARNING_DAYS} days to recover.`, 'loss')
    return
  }
  if (daysBetween(s.demotionWarningStart, d) < B.DEMOTION_WARNING_DAYS) return
  const from = s.rank as Exclude<RankId, 'E'>
  const to = B.RANKS[B.RANKS.indexOf(from) - 1]
  s.rank = to
  s.rankHistory.push({ date: d, rank: to, kind: 'demotion' })
  s.activeWeeksAtRank = Math.ceil(B.PROMOTION[from].activeWeeks / 2)
  s.quests = s.quests.filter((q) => !(q.type === 'trial' && q.status === 'active'))
  s.demotionWarningStart = to !== 'E' && s.xp < B.RANK_XP[to] ? d : null
  ceremony(s, { kind: 'demotion', from, to })
  log(s, d, now, `[SYSTEM] Rank demoted. ${from} → ${to}. Clear the ${from}-Rank Trial again to return.`, 'loss')
}

function workoutsOn(s: GameState, d: DateKey) {
  return s.workouts.filter((w) => w.date === d)
}

function wasActive(s: GameState, d: DateKey) {
  return workoutsOn(s, d).length > 0 || s.quests.some((q) => q.completedOn === d)
}

// ---------- Day processing ----------

function closeDay(s: GameState, d: DateKey, now: string) {
  // Registration day never counts as a miss.
  const planned = isTrainingDay(s.profile, d) && d !== s.createdDate
  const sick = s.sickDays.includes(d)
  const trained = workoutsOn(s, d).length > 0
  const active = wasActive(s, d)

  for (const q of s.quests) if (q.status === 'active' && q.expires && q.expires <= d) q.status = 'failed'

  if (planned && !trained && !sick) {
    const loss = B.MISS_LOSS[Math.min(s.missStreak, B.MISS_LOSS.length - 1)]
    s.missStreak += 1
    const lost = loseXp(s, d, now, loss, 'Missed planned training')
    const pid = nextId(s, 'p')
    const q = penaltyQuest(addDays(d, 1), pid, lost)
    s.penalties.push({ id: pid, date: d, lost, refunded: false, questId: q.id, streakBefore: s.streak })
    if (lost > 0) s.quests.push(q)
    ceremony(s, { kind: 'penalty', lost, reason: 'Planned training was not completed.' })
    log(s, d, now, `[SYSTEM] Planned training was not completed. ${lost} XP lost. Penalty Quest issued.`, 'loss')
  } else if (planned && trained) {
    s.missStreak = 0
  }

  if (active) s.inactiveStreak = 0
  else if (!sick) {
    s.inactiveStreak += 1
    if (!planned && s.inactiveStreak > B.INACTIVITY_GRACE_DAYS) {
      const lost = loseXp(s, d, now, B.INACTIVITY_LOSS, 'Inactivity')
      if (lost > 0) {
        ceremony(s, { kind: 'penalty', lost, reason: 'No activity has been recorded for several days.' })
        log(s, d, now, `[SYSTEM] Inactivity detected. ${lost} XP lost.`, 'loss')
      }
    }
  }

  if (planned && !trained && !sick) {
    if (s.streak > 0 && canGuardStreak(s, d)) {
      s.shadowGuardUsed = d
      log(s, d, now, `[SYSTEM] Igris guarded your ${s.streak} day streak. He can do this again in ${SHADOW.GUARD_DAYS} days.`, 'rare')
    } else s.streak = 0
  } else if (!active && !sick && s.inactiveStreak > B.INACTIVITY_GRACE_DAYS) s.streak = 0
  else s.streak += 1
  s.bestStreak = Math.max(s.bestStreak, s.streak)

  if (weekday(d) === 0) {
    const days = range(weekStart(d), d).filter((k) => (k > s.createdDate || workoutsOn(s, k).length > 0) && k >= s.createdDate && isTrainingDay(s.profile, k) && !s.sickDays.includes(k))
    const done = days.filter((k) => workoutsOn(s, k).length > 0).length
    if (days.length > 0 && done / days.length >= B.ACTIVE_WEEK_RATIO) {
      s.activeWeeksAtRank += 1
      log(s, d, now, `[SYSTEM] Active week recorded (${done}/${days.length} planned sessions).`, 'gain')
      checkTrial(s, d, now)
    }
  }

  checkDemotion(s, d, now)
  s.xpHistory.push({ date: d, xp: s.xp })
  if (s.xpHistory.length > 800) s.xpHistory.shift()
  s.statHistory = [...(s.statHistory ?? []), { date: d, stats: { ...s.stats } }].slice(-400)
  checkAchievements(s, d, now)
}

function generateFor(s: GameState, d: DateKey) {
  if (s.questsGeneratedFor.includes(d)) return
  const existing = new Set(s.quests.map((q) => q.id))
  for (const q of generateDailyQuests(s, d)) if (!existing.has(q.id)) s.quests.push(q)
  s.questsGeneratedFor.push(d)
  if (s.questsGeneratedFor.length > 60) s.questsGeneratedFor.shift()
  // Keep storage bounded: drop finished daily quests older than 90 days.
  const cutoff = addDays(d, -90)
  s.quests = s.quests.filter((q) => q.status === 'active' || q.date >= cutoff)
}

// ---------- Public API ----------

export function createGame(profile: Profile, assessment: Assessment, today: DateKey, now: string): GameState {
  const expBonus = { none: 0, novice: 100, intermediate: 300, advanced: 600 }[profile.experience]
  const s: GameState = {
    version: 1, profile, assessment, createdDate: today, lastClosedDate: addDays(today, -1),
    questsGeneratedFor: [], xp: 0, lifetimeXp: 0, rank: 'E',
    rankHistory: [{ date: today, rank: 'E', kind: 'start' }],
    demotionWarningStart: null, activeWeeksAtRank: 0,
    stats: {
      strength: assessment.pushups * 15 + expBonus,
      endurance: assessment.cardioLevel * 60 + assessment.plankSeconds * 2,
      agility: assessment.mobilityLevel * 60,
      vitality: 50,
      discipline: 0,
      recovery: 50,
    },
    quests: [], workouts: [], xpLog: [], xpHistory: [{ date: today, xp: 0 }], dailyXp: {}, dailyClear: [],
    records: {
      [assessment.pushups >= 5 ? 'pushup' : 'incline-pushup']: { reps: assessment.pushups, weightKg: 0, seconds: 0, date: today },
      plank: { reps: 0, weightKg: 0, seconds: assessment.plankSeconds, date: today },
    },
    prCount: 0, sickDays: [], missStreak: 0, inactiveStreak: 0, streak: 0, bestStreak: 0,
    penalties: [], achievements: {}, equippedTitle: null, log: [], ceremonies: [], seq: 0,
    bodyWeights: profile.weightKg ? [{ date: today, kg: Math.round(profile.weightKg * 10) / 10 }] : [],
  }
  log(s, today, now, `[SYSTEM] Player registration complete. Welcome, ${profile.name}. Rank assigned: E.`, 'rare')
  generateFor(s, today)
  return s
}

/** Close every day before `today` that hasn't been closed, then issue today's quests. */
export function advanceTo(s0: GameState, today: DateKey, now: string): GameState {
  if (s0.lastClosedDate >= addDays(today, -1) && s0.questsGeneratedFor.includes(today) && s0.raids?.some((r) => r.week === weekStart(today))) return s0
  const s = clone(s0)
  for (let d = addDays(s.lastClosedDate, 1); d < today; d = addDays(d, 1)) {
    closeDay(s, d, now)
    s.lastClosedDate = d
  }
  generateFor(s, today)
  checkTrial(s, today, now)
  openRaid(s, today, now)
  return s
}

/** Expire last week's raid and open this week's. Raids never cost XP. */
function openRaid(s: GameState, today: DateKey, now: string) {
  const week = weekStart(today)
  const raids = (s.raids ??= [])
  for (const r of raids) {
    if (r.status === 'active' && r.week < week) {
      r.status = 'failed'
      log(s, today, now, `[SYSTEM] The ${BOSS_BY_ID[r.bossId]?.name ?? 'raid'} gate closed. Raid failed. No XP lost.`, 'info')
    }
  }
  if (raids.some((r) => r.week === week)) return
  const daysLeft = 7 - daysBetween(week, today)
  const r = createRaid(week, s.profile, s.rank, daysLeft, raids[raids.length - 1]?.bossId)
  raids.push(r)
  if (raids.length > 60) raids.splice(0, raids.length - 60)
  ceremony(s, { kind: 'raidOpen', bossId: r.bossId, target: r.target })
  log(s, today, now, `[SYSTEM] A Dungeon Gate has opened: ${BOSS_BY_ID[r.bossId].name}. Clear it by Sunday.`, 'rare')
}

export function currentRaid(s: GameState, today: DateKey) {
  return s.raids?.find((r) => r.week === weekStart(today)) ?? null
}

export function questsFor(s: GameState, today: DateKey): Quest[] {
  return s.quests.filter((q) =>
    (q.status === 'active' && q.date <= today && (q.expires === null || q.expires >= today)) ||
    (q.status === 'done' && q.completedOn === today) ||
    (q.type === 'weekly' && q.date >= weekStart(today)),
  )
}

function completeQuest(s: GameState, q: Quest, today: DateKey, now: string, verification: Quest['verification']) {
  q.status = 'done'
  q.completedOn = today
  q.verification = verification
  q.progress = Math.max(q.progress, q.target)
  let xp = 0
  if (q.type === 'penalty' && q.penaltyId) {
    const p = s.penalties.find((x) => x.id === q.penaltyId)
    if (p && !p.refunded) {
      p.refunded = true
      const amt = Math.round(p.lost * B.PENALTY_REFUND_RATIO)
      refundXp(s, today, now, amt, 'Penalty Quest cleared')
      xp = amt
      log(s, today, now, `[SYSTEM] Penalty Quest cleared. ${amt} XP restored.`, 'gain')
    }
  } else if (q.type !== 'trial') {
    xp = gainXp(s, today, now, Math.round(q.xp * (1 + questBonusPct(s) / 100)), q.title)
    log(s, today, now, `[SYSTEM] Quest complete: ${q.title}. +${xp} XP.`, 'gain')
  }
  addStat(s, q.stat, q.stat === 'recovery' ? q.xp : q.xp / 2)
  addStat(s, 'discipline', B.STAT_XP.disciplinePerQuest)
  ceremony(s, { kind: 'questClear', title: q.title, xp })
  checkDailyClear(s, today, now)
}

function maybeBonus(s: GameState, q: Quest, today: DateKey, now: string) {
  if (!q.bonus || q.bonus.done || q.status !== 'done' || q.progress < q.bonus.target) return
  q.bonus.done = true
  const xp = gainXp(s, today, now, Math.round(q.xp * B.BONUS_OBJECTIVE_MULTIPLIER), `${q.title} bonus`)
  log(s, today, now, `[SYSTEM] Bonus objective complete: ${q.title}. +${xp} XP.`, 'gain')
}

function checkDailyClear(s: GameState, today: DateKey, now: string) {
  if (s.dailyClear.includes(today)) return
  const daily = s.quests.filter((q) => q.date === today && DAILY_TYPES.includes(q.type))
  if (daily.length === 0 || daily.some((q) => q.status !== 'done')) return
  s.dailyClear.push(today)
  const xp = gainXp(s, today, now, B.DAILY_CLEAR_BONUS, 'All daily quests cleared')
  log(s, today, now, `[SYSTEM] All daily quests cleared. +${xp} XP.`, 'rare')
}

/** Manual progress on a count/minutes/check quest (self-reported). */
export function progressQuest(s0: GameState, questId: string, amount: number, today: DateKey, now: string): GameState {
  const s = clone(s0)
  const q = s.quests.find((x) => x.id === questId)
  if (!q || q.date > today) return s0
  const open = q.status === 'active' && (q.expires === null || q.expires >= today)
  const bonusOpen = q.status === 'done' && q.completedOn === today && q.bonus && !q.bonus.done
  if (!open && !bonusOpen) return s0
  if (q.measure === 'workout' || q.measure === 'weeklyWorkouts') return s0
  if (q.measure === 'check') {
    if (open) completeQuest(s, q, today, now, 'Self-reported')
  } else {
    q.progress = Math.max(0, q.progress + amount)
    if (open && q.progress >= q.target) completeQuest(s, q, today, now, 'Self-reported')
    maybeBonus(s, q, today, now)
  }
  checkAchievements(s, today, now)
  return s
}

export type LogResult =
  | { ok: true; xp: number; prs: string[]; completed: string[]; raid?: RaidHit & { boss: string; unit: string; left: number } }
  | { ok: false; reason: string }

function signature(w: WorkoutInput) {
  return JSON.stringify(w.exercises.map((e) => [e.exerciseId, e.sets.filter((x) => x.done).map((x) => [x.reps, x.weightKg, x.seconds])]))
}

export function logWorkout(s0: GameState, input: WorkoutInput, today: DateKey, now: string, opts: { late?: boolean } = {}): { state: GameState; result: LogResult } {
  const fail = (reason: string) => ({ state: s0, result: { ok: false as const, reason } })
  if (!(input.durationMin > 0) || input.durationMin > B.MAX_SESSION_MIN) return fail('Session length looks wrong. Enter the minutes you trained.')
  const done = input.exercises.flatMap((e) => e.sets.filter((x) => x.done).map((x) => ({ e, x })))
  if (done.length === 0) return fail('Mark at least one set as done.')
  for (const { x } of done) {
    if ((x.reps ?? 0) > B.MAX_REPS_PER_SET) return fail(`More than ${B.MAX_REPS_PER_SET} reps in one set looks like a typo.`)
    if ((x.weightKg ?? 0) > B.MAX_WEIGHT_KG) return fail('That weight looks like a typo.')
    if ((x.reps ?? 0) < 0 || (x.weightKg ?? 0) < 0 || (x.seconds ?? 0) < 0) return fail('Values cannot be negative.')
  }
  const sig = signature(input)
  const dup = s0.workouts.find((w) => w.date === today && signature(w) === sig &&
    Math.abs(new Date(now).getTime() - new Date(w.loggedAt).getTime()) < B.DUPLICATE_WINDOW_MIN * 60_000)
  if (dup) return fail('This workout was already logged.')

  const s = clone(s0)
  const prior = workoutsOn(s, today).length
  const mult = B.REPEAT_WORKOUT_MULTIPLIER[Math.min(prior, B.REPEAT_WORKOUT_MULTIPLIER.length - 1)]
  const planned = isTrainingDay(s.profile, today) && prior === 0

  // Personal records
  const prs: string[] = []
  const recordItems: { exerciseId: string; before: PersonalRecord; after: PersonalRecord }[] = []
  for (const e of input.exercises) {
    const ex = EXERCISE_BY_ID[e.exerciseId]
    const sets = e.sets.filter((x) => x.done)
    if (!ex || sets.length === 0) continue
    const rec = s.records[e.exerciseId]
    if (ex.kind === 'time') {
      const best = Math.max(...sets.map((x) => x.seconds ?? 0))
      if (rec && best > rec.seconds) { prs.push(ex.name); recordItems.push({ exerciseId: ex.id, before: rec, after: { reps: 0, weightKg: 0, seconds: best, date: today } }) }
      if (!rec || best > rec.seconds) s.records[e.exerciseId] = { reps: 0, weightKg: 0, seconds: best, date: today }
    } else {
      const best = [...sets].sort((a, b) => (b.weightKg ?? 0) - (a.weightKg ?? 0) || (b.reps ?? 0) - (a.reps ?? 0))[0]
      const w = best.weightKg ?? 0
      const r = best.reps ?? 0
      const better = rec ? w > rec.weightKg || (w === rec.weightKg && r > rec.reps) : true
      if (rec && better && r > 0) { prs.push(ex.name); recordItems.push({ exerciseId: ex.id, before: rec, after: { reps: r, weightKg: w, seconds: 0, date: today } }) }
      if (better && r > 0) s.records[e.exerciseId] = { reps: r, weightKg: w, seconds: 0, date: today }
    }
  }

  const base = Math.min(B.WORKOUT_MAX_XP, B.WORKOUT_BASE_XP + B.WORKOUT_XP_PER_SET * done.length)
  const bonus = (planned ? B.PLANNED_WORKOUT_BONUS : 0) + (input.rpe ? B.RPE_BONUS : 0)
  const prXp = Math.min(prs.length, B.MAX_REWARDED_PRS) * B.PR_XP
  const raw = Math.round((base + bonus + prXp) * mult * (1 + workoutBonusPct(s, input) / 100))
  const xp = raw > 0 ? gainXp(s, today, now, raw, prior > 0 ? `Workout (repeat ×${mult})` : 'Workout logged') : 0
  s.prCount += prs.length
  if (recordItems.length) ceremony(s, { kind: 'record', items: recordItems })

  // Stats
  for (const { e, x } of done) {
    const ex = EXERCISE_BY_ID[e.exerciseId]
    if (!ex) continue
    const min = (x.seconds ?? 0) / 60
    if (ex.stat === 'strength') addStat(s, 'strength', B.STAT_XP.strengthPerSet * mult)
    else if (ex.stat === 'endurance') addStat(s, 'endurance', (ex.kind === 'time' ? min * B.STAT_XP.endurancePerMin : 3) * mult)
    else addStat(s, 'agility', (ex.kind === 'time' ? min * B.STAT_XP.agilityPerMin : 3) * mult)
  }
  addStat(s, 'strength', prs.length * B.STAT_XP.strengthPerPr * mult)
  if (planned) addStat(s, 'discipline', B.STAT_XP.disciplinePerPlannedWorkout)

  const w: WorkoutLog = { ...clone(input), id: nextId(s, 'w'), date: today, loggedAt: now, planned, xpAwarded: xp, prs, ...(opts.late ? { late: true } : {}) }
  s.workouts.unshift(w)
  // Bounded so a cloud save stays well under Firestore's 1 MB document limit.
  if (s.workouts.length > 400) s.workouts.length = 400
  log(s, today, now, `[SYSTEM] Training recorded: ${input.title}. +${xp} XP.${prs.length ? ` New record: ${prs.join(', ')}.` : ''}`, 'gain')

  // Quests advanced by this workout
  const completed: string[] = []
  const allDone = input.exercises.every((e) => e.sets.every((x) => x.done))
  for (const q of s.quests) {
    if (q.date > today) continue
    const open = q.status === 'active' && (q.expires === null || q.expires >= today)
    if (q.measure === 'workout' && open) {
      if (q.type === 'trial') {
        if (done.length >= 4 && allDone && input.rpe && q.trialRank) {
          q.status = 'done'; q.completedOn = today; q.verification = 'Logged'; q.progress = 1
          gainXp(s, today, now, B.TRIAL_XP, `${q.trialRank}-Rank Trial cleared`, true)
          completed.push(q.title)
          promote(s, q.trialRank, today, now)
        }
        continue
      }
      if (q.minMinutes && input.durationMin < q.minMinutes) continue
      completeQuest(s, q, today, now, 'Logged')
      completed.push(q.title)
      if (q.bonus && allDone && input.rpe) { q.progress = q.bonus.target; maybeBonus(s, q, today, now) }
    } else if ((q.measure === 'count' || q.measure === 'minutes') && q.exerciseIds && (open || (q.status === 'done' && q.completedOn === today))) {
      let add = 0
      for (const { e, x } of done) {
        if (!q.exerciseIds.includes(e.exerciseId)) continue
        add += q.measure === 'minutes' ? (x.seconds ?? 0) / 60 : q.unit === 'sec' ? (x.seconds ?? 0) : (x.reps ?? 0)
      }
      if (add > 0) {
        q.progress += Math.round(add)
        if (open && q.progress >= q.target) { completeQuest(s, q, today, now, 'Logged'); completed.push(q.title) }
        maybeBonus(s, q, today, now)
      }
    } else if (q.measure === 'weeklyWorkouts' && open && q.expires) {
      const days = range(q.date, q.expires).filter((k) => k <= today && isTrainingDay(s.profile, k) && workoutsOn(s, k).length > 0)
      q.progress = days.length
      if (q.progress >= q.target) { completeQuest(s, q, today, now, 'Logged'); completed.push(q.title) }
    }
  }

  for (const id of trainShadows(s, input)) {
    log(s, today, now, `[SYSTEM] ${SHADOW_BY_ID[id].name} reached shadow level ${shadowLevel(s.shadows![id].xp)}.`, 'gain')
  }

  // Dungeon Raid damage (only from what was actually logged, within the raid limits). Late logs never count.
  if (!opts.late) openRaid(s, today, now)
  const raid = opts.late ? null : currentRaid(s, today)
  let raidHit: (RaidHit & { boss: string; unit: string; left: number }) | undefined
  if (raid && raid.status === 'active') {
    const boss = BOSS_BY_ID[raid.bossId]
    const hit = applyWorkout(raid, input, today, now)
    if (hit.damage > 0 || hit.blocked) raidHit = { ...hit, boss: boss.name, unit: boss.unit, left: Math.max(0, raid.target - raid.progress) }
    if (hit.damage > 0) log(s, today, now, `[SYSTEM] Raid: ${hit.damage} damage to ${boss.name} (${raid.progress}/${raid.target}).`, 'gain')
    if (hit.cleared) {
      const got = gainXp(s, today, now, raid.xp, `Raid cleared: ${boss.name}`, true)
      addStat(s, 'discipline', 40)
      addStat(s, boss.metric === 'minutes' ? 'endurance' : 'strength', 60)
      ceremony(s, { kind: 'raidCleared', bossId: raid.bossId, xp: got })
      log(s, today, now, `[SYSTEM] Raid cleared: ${boss.name} defeated. +${got} XP.`, 'rare')
      const sh = shadowForBoss(raid.bossId)
      if (sh && !s.shadows?.[sh.id]) arise(s, sh.id, today, now)
      else if (sh) {
        s.shadows![sh.id].xp += SHADOW.REPEAT_BOSS_XP
        log(s, today, now, `[SYSTEM] ${sh.name} absorbed the defeated boss and grew stronger.`, 'gain')
      }
    }
  }

  checkAchievements(s, today, now)
  return { state: s, result: { ok: true, xp, prs, completed, raid: raidHit } }
}

/**
 * Days a forgotten workout can still be logged for: the last 2 days, on or after registration,
 * not sick and with nothing logged. Newest first. Two days covers logging just after midnight.
 */
export function lateLogDays(s: GameState, today: DateKey): DateKey[] {
  return Array.from({ length: B.LATE_LOG_DAYS }, (_, i) => addDays(today, -1 - i))
    .filter((d) => d >= s.createdDate && workoutsOn(s, d).length === 0 && !s.sickDays.includes(d))
}

/**
 * Log a workout the player forgot to record on a recent day. It counts for that day, and if
 * missing it caused a penalty, the lost XP comes back in full, the Penalty Quest is cancelled
 * and the streak is restored. Late logs never count toward raids.
 */
export function logLateWorkout(s0: GameState, input: WorkoutInput, day: DateKey, today: DateKey, now: string): { state: GameState; result: LogResult & { restored?: number } } {
  if (!lateLogDays(s0, today).includes(day)) return { state: s0, result: { ok: false, reason: `Only the last ${B.LATE_LOG_DAYS} days can be logged late, and only if nothing was logged that day.` } }
  if (input.durationMin < B.LATE_LOG_MIN_MINUTES) return { state: s0, result: { ok: false, reason: `A late workout needs at least ${B.LATE_LOG_MIN_MINUTES} minutes.` } }
  const r = logWorkout(s0, input, day, now, { late: true })
  if (!r.result.ok) return r
  const restored = cancelPenalty(r.state, day, today, now)
  return { state: r.state, result: restored === null ? r.result : { ...r.result, restored } }
}

/**
 * Move a workout logged today back to a recent missed day (for when it was logged on the wrong
 * day). Only works for a day that has an uncancelled penalty. The workout's XP stays as it was.
 */
export function moveWorkoutToDay(s0: GameState, workoutId: string, day: DateKey, today: DateKey, now: string): { state: GameState; error?: string; restored?: number } {
  const w = s0.workouts.find((x) => x.id === workoutId)
  if (!w || w.date !== today) return { state: s0, error: 'Only a workout logged today can be moved.' }
  if (!lateLogDays(s0, today).includes(day) || !s0.penalties.some((p) => p.date === day && !p.cancelled)) {
    return { state: s0, error: 'That day has no missed training to fix.' }
  }
  const s = clone(s0)
  const mw = s.workouts.find((x) => x.id === workoutId)!
  mw.date = day
  mw.late = true
  mw.planned = isTrainingDay(s.profile, day)
  s.workouts.sort((a, b) => b.date.localeCompare(a.date) || b.loggedAt.localeCompare(a.loggedAt))
  log(s, today, now, `[SYSTEM] ${mw.title} moved to ${day}.`, 'info')
  const restored = cancelPenalty(s, day, today, now) ?? 0
  return { state: s, restored }
}

/** Undo the penalty for a day that turned out to have training. Returns the XP restored, or null if there was none. */
function cancelPenalty(s: GameState, day: DateKey, today: DateKey, now: string): number | null {
  const p = s.penalties.find((x) => x.date === day && !x.cancelled)
  if (!p) return null
  // A cleared Penalty Quest already returned part of the XP; give back the rest.
  const back = p.refunded ? p.lost - Math.round(p.lost * B.PENALTY_REFUND_RATIO) : p.lost
  p.refunded = true
  p.cancelled = true
  if (back > 0) refundXp(s, today, now, back, 'Missed day restored')
  s.quests = s.quests.filter((q) => q.id !== p.questId)
  s.ceremonies = s.ceremonies.filter((c) => !(c.kind === 'penalty' && c.lost === p.lost))
  s.missStreak = Math.max(0, s.missStreak - 1)
  // Rebuild the streak as if the day had been logged on time.
  s.streak = streakBefore(s, today)
  s.bestStreak = Math.max(s.bestStreak, s.streak)
  log(s, today, now, `[SYSTEM] Training found for ${day}. Penalty cancelled: ${back} XP restored and your streak is back to ${s.streak} days.`, 'rare')
  checkAchievements(s, today, now)
  return back
}

/** Streak length up to (not including) day d, counted back over days that would not have broken it. */
function streakBefore(s: GameState, d: DateKey): number {
  let n = 0
  for (let k = addDays(d, -1); k >= s.createdDate; k = addDays(k, -1)) {
    const missed = isTrainingDay(s.profile, k) && k !== s.createdDate && workoutsOn(s, k).length === 0 && !s.sickDays.includes(k)
    if (missed && s.shadowGuardUsed !== k) break
    n++
  }
  return n
}

/** Record today's body weight (kg), replacing an earlier entry from the same day. */
/** Body weight can be updated once every 7 days. Returns the first day it can change again, or null. */
export function weightLockedUntil(s: GameState, today: DateKey): DateKey | null {
  const last = s.bodyWeights?.[s.bodyWeights.length - 1]
  if (!last) return null
  const next = addDays(last.date, B.WEIGHT_UPDATE_DAYS)
  return next > today ? next : null
}

export function logBodyWeight(s0: GameState, kg: number, today: DateKey, now: string): GameState {
  if (weightLockedUntil(s0, today)) return s0
  const s = clone(s0)
  const w = Math.round(kg * 10) / 10
  const list = [...(s.bodyWeights ?? []), { date: today, kg: w }]
  s.bodyWeights = list.slice(-730)
  s.profile = { ...s.profile, weightKg: w }
  // Today's water goal follows the new weight.
  const water = s.quests.find((q) => q.date === today && q.title === 'Hydration' && q.status === 'active')
  if (water) {
    const training = isTrainingDay(s.profile, today)
    water.target = waterGlasses(w, training)
    water.objective = `Drink ${water.target} glasses of water (${waterAmount(water.target, s.profile.units)})`
  }
  checkAchievements(s, today, now)
  return s
}

export function sickDaysUsed(s: GameState, today: DateKey): number {
  const from = addDays(today, -29)
  return s.sickDays.filter((d) => d >= from && d <= today).length
}

export function toggleSickDay(s0: GameState, today: DateKey, now: string): { state: GameState; error?: string } {
  const s = clone(s0)
  if (s.sickDays.includes(today)) {
    s.sickDays = s.sickDays.filter((d) => d !== today)
    log(s, today, now, '[SYSTEM] Sick / injured status removed.')
    return { state: s }
  }
  if (sickDaysUsed(s, today) >= B.SICK_DAYS_PER_30) return { state: s0, error: `You've used ${B.SICK_DAYS_PER_30} sick days in the last 30 days.` }
  s.sickDays.push(today)
  log(s, today, now, '[SYSTEM] Sick / injured status recorded. No XP will be lost today. Rest and recover.')
  return { state: s }
}

/** Apply profile/schedule edits; today's untouched quests are reissued to match. */
export function updateProfile(s0: GameState, patch: Partial<Profile>, assessment: Partial<Assessment> | undefined, today: DateKey, now: string): GameState {
  const s = clone(s0)
  s.profile = { ...s.profile, ...patch }
  if (assessment) s.assessment = { ...s.assessment, ...assessment }
  s.quests = s.quests.filter((q) => !(q.date === today && q.status === 'active' && q.progress === 0 && DAILY_TYPES.includes(q.type)))
  s.questsGeneratedFor = s.questsGeneratedFor.filter((d) => d !== today)
  generateFor(s, today)
  log(s, today, now, '[SYSTEM] Hunter profile updated. Quests recalibrated.')
  return s
}

export function dismissCeremony(s0: GameState): GameState {
  if (s0.ceremonies.length === 0) return s0
  const s = clone(s0)
  s.ceremonies.shift()
  return s
}

export function equipTitle(s0: GameState, title: string | null): GameState {
  const s = clone(s0)
  s.equippedTitle = title
  return s
}

export function availableTitles(s: GameState): string[] {
  return ACHIEVEMENTS.filter((a) => a.title && s.achievements[a.id]).map((a) => a.title!)
}
