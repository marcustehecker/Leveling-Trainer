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
