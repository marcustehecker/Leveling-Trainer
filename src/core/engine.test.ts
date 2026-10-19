import { describe, expect, it } from 'vitest'
import * as B from './balance'
import { addDays } from './dates'
import {
  advanceTo, createGame, levelInfo, logWorkout, progressQuest, promotionStatus, questsFor, statLevel, toggleSickDay,
} from './engine'
import { generatePlan } from './plan'
import type { Assessment, GameState, Profile, WorkoutInput } from './types'

const MON = '2026-10-19'
const TUE = addDays(MON, 1)
const WED = addDays(MON, 2)
const at = (d: string, h = 18) => `${d}T${String(h).padStart(2, '0')}:00:00.000Z`

const profile: Profile = {
  name: 'Jin', ageRange: '18-29', units: 'metric', experience: 'novice', goals: ['strength'],
  equipment: ['dumbbells'], trainingDays: [1, 3, 5], sessionMinutes: 45, diet: { preferences: '', allergies: '' },
}
const assessment: Assessment = { pushups: 12, plankSeconds: 40, cardioLevel: 3, mobilityLevel: 2 }

const start = () => createGame(profile, assessment, MON, at(MON, 8))

function workout(sets = 6, extra: Partial<WorkoutInput> = {}): WorkoutInput {
  return {
    title: 'Full Body A', durationMin: 40, rpe: 7,
    exercises: [{ exerciseId: 'goblet-squat', name: 'Goblet Squat', sets: Array.from({ length: sets }, () => ({ reps: 10, weightKg: 12, done: true })) }],
    ...extra,
  }
}

function log(s: GameState, d: string, w = workout(), h = 18) {
  const r = logWorkout(s, w, d, at(d, h))
  if (!r.result.ok) throw new Error(r.result.reason)
  return r.state
}

describe('levels', () => {
  it('maps XP to levels within rank bands', () => {
    expect(levelInfo(0).level).toBe(1)
    expect(levelInfo(249).level).toBe(1)
    expect(levelInfo(250).level).toBe(2)
    expect(levelInfo(2499).level).toBe(10)
    expect(levelInfo(2500)).toMatchObject({ level: 11, band: 'D' })
    expect(levelInfo(48000)).toMatchObject({ level: 51, band: 'S' })
    expect(levelInfo(48000 + 3000 * 20).level).toBe(71)
  })
  it('stat levels grow with the square root of stat XP', () => {
    expect(statLevel(0)).toBe(1)
    expect(statLevel(25)).toBe(2)
    expect(statLevel(2500)).toBe(11)
  })
})

describe('onboarding', () => {
  it('starts every hunter at E with stats from the assessment and quests issued', () => {
    const s = start()
    expect(s.rank).toBe('E')
    expect(s.xp).toBe(0)
    expect(s.stats.strength).toBeGreaterThan(s.stats.discipline)
    const q = questsFor(s, MON)
    expect(q.find((x) => x.type === 'main')).toBeTruthy()
    expect(q.find((x) => x.type === 'weekly')?.target).toBe(3)
  })
  it('issues a recovery quest on rest days instead of training', () => {
    const s = advanceTo(log(start(), MON), TUE, at(TUE, 8))
    const q = questsFor(s, TUE)
    expect(q.some((x) => x.type === 'main')).toBe(false)
    expect(q.some((x) => x.type === 'recovery')).toBe(true)
  })
  it('builds a plan with one day per training weekday using owned equipment', () => {
    const plan = generatePlan(profile, assessment)
    expect(Object.keys(plan).map(Number).sort()).toEqual([1, 3, 5])
    expect(plan[1].title).toBe('Full Body A')
    expect(plan[3].title).toBe('Full Body B')
    expect(plan[1].exercises.map((e) => e.exerciseId)).not.toContain('back-squat')
  })
})

describe('workout XP and anti-farming', () => {
  it('awards base + per set + planned + effort bonus and completes the main quest', () => {
    const r = logWorkout(start(), workout(6), MON, at(MON))
    expect(r.result).toMatchObject({ ok: true })
    // 60 + 6*4 + 20 planned + 5 rpe = 109 workout, + main quest XP
    const main = r.state.quests.find((q) => q.type === 'main')!
    expect(main.status).toBe('done')
    expect(main.verification).toBe('Logged')
    expect(r.result.ok && r.result.xp).toBe(109)
  })
  it('caps workout XP at the maximum', () => {
    const r = logWorkout(start(), workout(40, { rpe: undefined }), MON, at(MON))
    expect(r.result.ok && r.result.xp).toBe(B.WORKOUT_MAX_XP + B.PLANNED_WORKOUT_BONUS)
  })
  it('rejects duplicates and empty or implausible logs', () => {
    const s = log(start(), MON)
    expect(logWorkout(s, workout(), MON, at(MON)).result.ok).toBe(false)
    expect(logWorkout(start(), workout(0), MON, at(MON)).result.ok).toBe(false)
    const bad = workout(1)
    bad.exercises[0].sets[0].reps = 500
    expect(logWorkout(start(), bad, MON, at(MON)).result.ok).toBe(false)
  })
  it('halves the second workout of the day and zeroes the third', () => {
    let s = log(start(), MON, workout(5), 10)
    const second = logWorkout(s, workout(4), MON, at(MON, 14))
    expect(second.result.ok && second.result.xp).toBe(Math.round((60 + 16 + 5) * 0.5))
    s = second.state
    const third = logWorkout(s, workout(3), MON, at(MON, 20))
    expect(third.result.ok && third.result.xp).toBe(0)
  })
  it('enforces the daily XP cap', () => {
    let s = start()
    s = { ...s, dailyXp: { [MON]: B.DAILY_XP_CAP - 10 } }
    const r = logWorkout(s, workout(), MON, at(MON))
    expect(r.result.ok && r.result.xp).toBe(10)
  })
  it('detects personal records only against a previous best', () => {
    let s = log(start(), MON)
    expect(s.prCount).toBe(0)
    const heavier = workout(3)
    heavier.exercises[0].sets[0].weightKg = 14
    const r = logWorkout(advanceTo(s, WED, at(WED, 8)), heavier, WED, at(WED))
    expect(r.result.ok && r.result.prs).toEqual(['Goblet Squat'])
    expect(r.state.prCount).toBe(1)
  })
  it('advances count quests from logged sets and manual taps', () => {
    let s = start()
    const water = questsFor(s, MON).find((q) => q.title === 'Hydration')!
    for (let i = 0; i < 6; i++) s = progressQuest(s, water.id, 1, MON, at(MON))
    expect(s.quests.find((q) => q.id === water.id)!.status).toBe('done')
    expect(s.quests.find((q) => q.id === water.id)!.verification).toBe('Self-reported')
  })
})

describe('XP loss', () => {
  function withXp(xp: number): GameState {
    const s = start()
    return { ...s, xp, lifetimeXp: xp }
  }
  it('loses XP for a missed planned day and issues a Penalty Quest that refunds 75%', () => {
    let s = withXp(1000)
    s = log(s, MON) // Monday trained
    const before = s.xp
    s = advanceTo(s, addDays(WED, 1), at(addDays(WED, 1), 8)) // Wednesday missed
    expect(s.xp).toBe(before - B.MISS_LOSS[0])
    const pq = questsFor(s, addDays(WED, 1)).find((q) => q.type === 'penalty')!
    expect(pq).toBeTruthy()
    const afterPenalty = s.xp
    s = log(s, addDays(WED, 1), workout(3, { durationMin: 20 }))
    expect(s.quests.find((q) => q.id === pq.id)!.status).toBe('done')
    expect(s.xpLog.some((e) => e.kind === 'refund' && e.amount === 45)).toBe(true)
    expect(s.xp).toBeGreaterThan(afterPenalty + 45)
    expect(s.lifetimeXp).toBeGreaterThanOrEqual(1000)
  })
  it('escalates consecutive misses and never goes below zero', () => {
    let s = withXp(1000)
    s = log(s, MON)
    s = advanceTo(s, addDays(MON, 7), at(addDays(MON, 7), 8)) // missed Wed and Fri
    const losses = s.xpLog.filter((e) => e.reason === 'Missed planned training').map((e) => e.amount)
    expect(losses).toEqual([-90, -60])
    const broke = advanceTo(withXp(30), addDays(MON, 3), at(addDays(MON, 3), 8))
    expect(broke.xp).toBe(0)
  })
  it('applies inactivity decay after the grace period on rest days only', () => {
    let s = withXp(1000)
    s = { ...s, profile: { ...s.profile, trainingDays: [1] } }
    s = log(s, MON)
    s = advanceTo(s, addDays(MON, 7), at(addDays(MON, 7), 8)) // Tue–Sun idle = 6 rest days
    const inactivity = s.xpLog.filter((e) => e.reason === 'Inactivity')
    expect(inactivity.length).toBe(3) // days 4, 5, 6 of inactivity
  })
  it('never costs XP on a sick day', () => {
    let s = withXp(1000)
    s = advanceTo(s, WED, at(WED, 8))
    const before = s.xp
    s = toggleSickDay(s, WED, at(WED, 9)).state
    s = advanceTo(s, addDays(WED, 1), at(addDays(WED, 1), 8))
    expect(s.xp).toBe(before)
  })
  it('limits sick days to 4 per 30 days', () => {
    let s = start()
    for (let i = 0; i < 4; i++) s = toggleSickDay(s, addDays(MON, i), at(MON)).state
    expect(toggleSickDay(s, addDays(MON, 4), at(MON)).error).toBeTruthy()
  })
})

describe('ranks', () => {
  function dRank(xp: number): GameState {
    const s = start()
    return { ...s, xp, lifetimeXp: xp, rank: 'D', rankHistory: [...s.rankHistory, { date: MON, rank: 'D', kind: 'promotion' }] }
  }
  it('starts a 7-day Demotion Warning, then demotes if XP stays below the threshold', () => {
    let s = dRank(2520)
    s = advanceTo(s, addDays(WED, 1), at(addDays(WED, 1), 8)) // miss Wed (registration Monday exempt)
    expect(s.xp).toBeLessThan(B.RANK_XP.D)
    expect(s.demotionWarningStart).toBe(WED)
    s = advanceTo(s, addDays(WED, 7), at(addDays(WED, 7), 8))
    expect(s.rank).toBe('D')
    s = advanceTo(s, addDays(WED, 8), at(addDays(WED, 8), 8))
    expect(s.rank).toBe('E')
    expect(s.rankHistory.at(-1)).toMatchObject({ kind: 'demotion', rank: 'E' })
    expect(s.ceremonies.some((c) => c.kind === 'demotion')).toBe(true)
  })
  it('lifts the warning when XP recovers in time', () => {
    let s = dRank(2520)
    s = advanceTo(s, addDays(WED, 1), at(addDays(WED, 1), 8))
    expect(s.demotionWarningStart).toBe(WED)
    s = log(s, addDays(WED, 1), workout(3, { durationMin: 20 }))
    expect(s.demotionWarningStart).toBeNull()
    expect(s.achievements['survived_warning']).toBeTruthy()
  })
  it('requires XP, active weeks, PRs and a Trial before promotion', () => {
    let s = start()
    s = { ...s, xp: 2600, lifetimeXp: 2600, prCount: 1 }
    s = advanceTo(s, TUE, at(TUE, 8))
    expect(promotionStatus(s)?.trialUnlocked).toBe(false) // no active weeks yet
    s = { ...s, activeWeeksAtRank: 2 }
    s = advanceTo({ ...s, questsGeneratedFor: [] }, TUE, at(TUE, 8))
    expect(promotionStatus(s)?.trialUnlocked).toBe(true)
    expect(s.rank).toBe('E')
    const trial = s.quests.find((q) => q.type === 'trial')!
    const partial = workout(5)
    partial.exercises[0].sets[4].done = false
    s = log(s, TUE, partial, 9)
    expect(s.rank).toBe('E')
    s = log(s, TUE, workout(4), 12)
    expect(s.quests.find((q) => q.id === trial.id)!.status).toBe('done')
    expect(s.rank).toBe('D')
    expect(s.ceremonies.some((c) => c.kind === 'rankUp' && c.rank === 'D')).toBe(true)
  })
  it('counts an active week when 75% of planned sessions are done', () => {
    let s = start()
    s = log(s, MON)
    s = advanceTo(s, WED, at(WED, 8)); s = log(s, WED)
    const fri = addDays(MON, 4)
    s = advanceTo(s, fri, at(fri, 8)); s = log(s, fri)
    s = advanceTo(s, addDays(MON, 7), at(addDays(MON, 7), 8))
    expect(s.activeWeeksAtRank).toBe(1)
    expect(s.streak).toBe(7)
  })
})
