import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { advanceTo, createGame, logWorkout } from './engine'
import { questBonusPct, shadowLevel, workoutBonusPct } from './shadows'
import type { GameState, Profile, WorkoutInput } from './types'

const MON = '2026-10-19'
const at = (d: string, h = 10) => `${d}T${String(h).padStart(2, '0')}:00:00.000Z`
const profile: Profile = {
  name: 'Jin', ageRange: '18-29', units: 'metric', experience: 'novice', goals: ['strength'],
  equipment: ['dumbbells'], trainingDays: [1, 3, 5], sessionMinutes: 45, diet: { preferences: '', allergies: '' },
}
const start = () => advanceTo(createGame(profile, { pushups: 20, plankSeconds: 40, cardioLevel: 3, mobilityLevel: 2 }, MON, at(MON, 8)), MON, at(MON, 8))
const pushups = (sets = 3): WorkoutInput => ({ title: 'Push', durationMin: 30, exercises: [{ exerciseId: 'pushup', name: 'Push-up', sets: Array.from({ length: sets }, () => ({ reps: 20, done: true })) }] })

describe('shadow army', () => {
  it('raises the boss shadow when a raid is cleared', () => {
    let s: GameState = { ...start(), raids: [{ week: MON, bossId: 'venom-serpent', target: 60, progress: 0, byDay: {}, lastCountedAt: null, status: 'active', xp: 250 }] }
    for (const d of [MON, addDays(MON, 1), addDays(MON, 2)]) s = logWorkout(advanceTo(s, d, at(d, 9)), pushups(), d, at(d)).state
    expect(s.shadows?.kasaka).toBeTruthy()
    expect(s.ceremonies.some((c) => c.kind === 'arise' && c.shadowId === 'kasaka')).toBe(true)
    expect(s.achievements.shadow_1).toBeTruthy()
  })

  it('gives matching workouts a bonus and levels the shadow', () => {
    const base = start()
    const s: GameState = { ...base, shadows: { kasaka: { since: MON, xp: 0 }, iron: { since: MON, xp: 0 } } }
    expect(workoutBonusPct(s, pushups())).toBe(5)
    expect(workoutBonusPct(s, { ...pushups(), exercises: [{ exerciseId: 'plank', name: 'Plank', sets: [{ seconds: 30, done: true }] }] })).toBe(0)
    expect(questBonusPct(s)).toBe(5)
    const plain = logWorkout(base, pushups(), MON, at(MON)).result
    const boosted = logWorkout(s, pushups(), MON, at(MON))
    expect(boosted.result.ok && plain.ok && boosted.result.xp).toBeGreaterThan(plain.ok ? plain.xp : 0)
    expect(boosted.state.shadows!.kasaka.xp).toBe(15)
    expect(shadowLevel(4000)).toBe(10)
  })

  it('raises milestone shadows and Igris guards a missed day once a month', () => {
    let s: GameState = { ...start(), rank: 'C', streak: 12, bestStreak: 12, lastClosedDate: MON }
    s = logWorkout(s, pushups(), MON, at(MON)).state
    expect(s.shadows?.iron && s.shadows?.igris).toBeTruthy()
    // Wednesday is a planned day with no workout: Igris saves the streak.
    s = advanceTo(s, addDays(MON, 3), at(addDays(MON, 3), 8))
    expect(s.streak).toBeGreaterThan(0)
    expect(s.shadowGuardUsed).toBe(addDays(MON, 2))
    // Friday is missed too: the guard is used up, so the streak resets.
    s = advanceTo(s, addDays(MON, 5), at(addDays(MON, 5), 8))
    expect(s.streak).toBe(0)
  })
})

describe('late logging', () => {
  it("logs yesterday's forgotten workout, refunds the penalty and restores the streak", async () => {
    const { lateLogDays, logLateWorkout } = await import('./engine')
    // Train Monday, then miss Wednesday (planned).
    let s = logWorkout(start(), pushups(), MON, at(MON)).state
    const wed = addDays(MON, 2), thu = addDays(MON, 3)
    s = advanceTo(s, thu, at(thu, 8))
    const streakAfterMiss = s.streak
    const xpAfterMiss = s.xp
    const pen = s.penalties.find((p) => p.date === wed)!
    expect(pen.lost).toBeGreaterThan(0)
    expect(s.quests.some((q) => q.id === pen.questId)).toBe(true)
    expect(lateLogDays(s, thu)).toEqual([wed, addDays(MON, 1)])

    expect(logLateWorkout(s, { ...pushups(), durationMin: 5 }, wed, thu, at(thu)).result.ok).toBe(false)
    const r = logLateWorkout(s, pushups(), wed, thu, at(thu))
    expect(r.result.ok).toBe(true)
    const t = r.state
    expect(t.workouts[0].date).toBe(wed)
    expect(t.workouts[0].late).toBe(true)
    expect(t.xp).toBeGreaterThan(xpAfterMiss + pen.lost)
    expect(t.quests.some((q) => q.id === pen.questId)).toBe(false)
    expect(t.streak).toBeGreaterThan(streakAfterMiss)
    expect(lateLogDays(t, thu)).toEqual([addDays(MON, 1)])
    expect(logLateWorkout(t, pushups(), wed, thu, at(thu)).result.ok).toBe(false)
    // Just after midnight the missed day is two days back and can still be logged.
    const fri = addDays(MON, 4)
    const u = advanceTo(s, fri, at(fri, 0))
    expect(lateLogDays(u, fri)).toContain(wed)
    expect(logLateWorkout(u, pushups(), wed, fri, at(fri, 0)).result.ok).toBe(true)
  })
})

describe('moving a workout to a missed day', () => {
  it("moves today's workout back to yesterday and cancels yesterday's penalty", async () => {
    const { moveWorkoutToDay } = await import('./engine')
    let s = logWorkout(start(), pushups(), MON, at(MON)).state
    const wed = addDays(MON, 2), thu = addDays(MON, 3)
    s = advanceTo(s, thu, at(thu, 8))
    s = logWorkout(s, pushups(), thu, at(thu)).state
    const id = s.workouts[0].id
    const xp = s.xp
    const pen = s.penalties.find((p) => p.date === wed)!
    const r = moveWorkoutToDay(s, id, wed, thu, at(thu, 11))
    expect(r.error).toBeUndefined()
    expect(r.state.workouts.find((w) => w.id === id)!.date).toBe(wed)
    // Today's workout cleared the Penalty Quest (75% back); moving it returns the rest.
    expect(r.state.xp).toBe(xp + pen.lost - Math.round(pen.lost * 0.75))
    expect(r.state.quests.some((q) => q.id === pen.questId)).toBe(false)
    expect(r.state.streak).toBeGreaterThan(0)
    expect(moveWorkoutToDay(r.state, id, wed, thu, at(thu, 12)).error).toBeTruthy()
  })
})

describe('streak restore after a schedule change', () => {
  it('keeps the streak when a late log follows a routine edit that added training days', async () => {
    const { logLateWorkout, moveWorkoutToDay, updateProfile } = await import('./engine')
    // Three weeks of Mon/Wed/Fri training: the streak grows every day.
    let s = start()
    for (let i = 0; i < 21; i++) {
      const d = addDays(MON, i)
      s = advanceTo(s, d, at(d, 8))
      if ([1, 3, 5].includes(new Date(d + 'T12:00:00Z').getUTCDay())) s = logWorkout(s, pushups(), d, at(d)).state
    }
    // Then the player adds Sunday and Tuesday to the routine (past Sundays/Tuesdays were rest days).
    const today0 = addDays(MON, 21)
    s = advanceTo(s, today0, at(today0, 8))
    s = updateProfile(s, { trainingDays: [0, 1, 2, 3, 5] }, undefined, today0, at(today0, 9))
    s = logWorkout(s, pushups(), today0, at(today0)).state
    const streak = s.streak
    expect(streak).toBeGreaterThanOrEqual(20)
    // Tuesday (now planned) is missed: the streak resets.
    const tue = addDays(today0, 1), wed = addDays(today0, 2)
    s = advanceTo(s, wed, at(wed, 8))
    expect(s.streak).toBe(0)
    // Logging Tuesday late should bring the whole streak back (+ Monday and Tuesday), not stop at an old rest day.
    const late = logLateWorkout(s, pushups(), tue, wed, at(wed))
    expect(late.result.ok).toBe(true)
    expect(late.state.streak).toBe(streak + 2)
    // Same for moving today's workout back to Tuesday.
    const t = logWorkout(s, pushups(), wed, at(wed)).state
    const moved = moveWorkoutToDay(t, t.workouts[0].id, tue, wed, at(wed, 11))
    expect(moved.error).toBeUndefined()
    expect(moved.state.streak).toBe(streak + 2)
  })

  it('fixes a save whose streak was already cut short by the old restore, once', () => {
    let s = start()
    for (let i = 0; i < 14; i++) {
      const d = addDays(MON, i)
      s = advanceTo(s, d, at(d, 8))
      if ([1, 3, 5].includes(new Date(d + 'T12:00:00Z').getUTCDay())) s = logWorkout(s, pushups(), d, at(d)).state
    }
    const today = addDays(MON, 14)
    s = advanceTo(s, today, at(today, 8))
    // A cancelled penalty from 4 days ago with an 8-day streak before it, but the old code left the streak at 2.
    const day = addDays(today, -4)
    const broken: GameState = { ...s, streak: 2, streakRepair: undefined, penalties: [{ id: 'p1', date: day, lost: 10, refunded: true, questId: 'q', streakBefore: 8, cancelled: true }] }
    const fixed = advanceTo(broken, today, at(today, 9))
    expect(fixed.streak).toBe(12)
    expect(fixed.streakRepair).toBe(1)
    // Runs once only, and never lowers a correct streak.
    expect(advanceTo({ ...fixed, streak: 3 }, today, at(today, 10)).streak).toBe(3)
    expect(advanceTo({ ...broken, streak: 20 }, today, at(today, 10)).streak).toBe(20)
  })
})
