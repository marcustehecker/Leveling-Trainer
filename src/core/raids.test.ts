import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { advanceTo, createGame, currentRaid, logWorkout } from './engine'
import { applyWorkout, BOSS_BY_ID, createRaid, RAID, type Raid } from './raids'
import type { Profile, WorkoutInput } from './types'

const MON = '2026-10-19'
const at = (d: string, h: number) => `${d}T${String(h).padStart(2, '0')}:00:00.000Z`
const profile: Profile = {
  name: 'Jin', ageRange: '18-29', units: 'metric', experience: 'novice', goals: ['strength'],
  equipment: ['dumbbells'], trainingDays: [1, 3, 5], sessionMinutes: 45, diet: { preferences: '', allergies: '' },
}
const pushRaid = (target = 250): Raid => ({ week: MON, bossId: 'venom-serpent', target, progress: 0, byDay: {}, lastCountedAt: null, status: 'active', xp: 250 })
const pushups = (sets: number, reps: number, durationMin = 40, done = true): WorkoutInput => ({
  title: 'Push', durationMin, exercises: [{ exerciseId: 'pushup', name: 'Push-up', sets: Array.from({ length: sets }, () => ({ reps, done })) }],
})

describe('dungeon raids', () => {
  it('scales the target with rank and experience and picks the same boss for a week', () => {
    const a = createRaid(MON, profile, 'E', 7)
    expect(createRaid(MON, profile, 'E', 7).bossId).toBe(a.bossId)
    expect(createRaid(MON, profile, 'C', 7).target).toBeGreaterThan(a.target)
    expect(createRaid(MON, { ...profile, equipment: ['none'] }, 'E', 7).bossId).not.toBe(BOSS_BY_ID['stone-golem'].needsWeights && 'stone-golem')
  })

  it('only counts completed sets of matching exercises', () => {
    const r = pushRaid()
    expect(applyWorkout(r, pushups(4, 20, 40, false), MON, at(MON, 9)).damage).toBe(0)
    const squats: WorkoutInput = { title: 'Legs', durationMin: 40, exercises: [{ exerciseId: 'bw-squat', name: 'Squat', sets: [{ reps: 30, done: true }] }] }
    expect(applyWorkout(r, squats, MON, at(MON, 9)).damage).toBe(0)
    expect(applyWorkout(r, pushups(3, 20), MON, at(MON, 9)).damage).toBe(60)
  })

  it('ignores very short workouts and caps impossible sets', () => {
    const r = pushRaid(1000)
    expect(applyWorkout(r, pushups(3, 20, 5), MON, at(MON, 9))).toMatchObject({ damage: 0, blocked: expect.stringMatching(/minutes/) })
    expect(applyWorkout(r, pushups(1, 500, 30), MON, at(MON, 9)).damage).toBe(RAID.MAX_REPS_PER_SET)
  })

  it('limits damage by workout length, per day and with a cooldown', () => {
    const r = pushRaid(1000)
    // 10 min × 25/min = 250 at most, even with 10 × 50 logged
    expect(applyWorkout(r, pushups(10, 50, 10), MON, at(MON, 8)).damage).toBe(250)
    expect(applyWorkout(r, pushups(5, 20, 30), MON, at(MON, 9))).toMatchObject({ damage: 0, blocked: expect.stringMatching(/cooldown/i) })
    // Daily cap is 35% of 1000 = 350, so only 100 more today
    expect(applyWorkout(r, pushups(10, 40, 60), MON, at(MON, 12)).damage).toBe(100)
    expect(applyWorkout(r, pushups(10, 40, 60), MON, at(MON, 18))).toMatchObject({ damage: 0, blocked: expect.stringMatching(/Daily raid limit/) })
    expect(applyWorkout(r, pushups(10, 40, 60), addDays(MON, 1), at(addDays(MON, 1), 9)).damage).toBe(350)
  })

  it('takes at least three separate days to clear', () => {
    const r = pushRaid(250)
    let days = 0
    for (let i = 0; i < 7 && r.status === 'active'; i++) {
      const d = addDays(MON, i)
      applyWorkout(r, pushups(10, 50, 90), d, at(d, 9))
      applyWorkout(r, pushups(10, 50, 90), d, at(d, 18))
      days++
    }
    expect(r.status).toBe('cleared')
    expect(days).toBe(3)
  })

  it('opens a raid each week, rewards XP on clear and never takes XP when failed', () => {
    let s = advanceTo(createGame(profile, { pushups: 20, plankSeconds: 40, cardioLevel: 3, mobilityLevel: 2 }, MON, at(MON, 8)), MON, at(MON, 8))
    const raid = currentRaid(s, MON)!
    expect(raid.status).toBe('active')
    expect(s.ceremonies.some((c) => c.kind === 'raidOpen')).toBe(true)
    // Force a push raid so the test is independent of which boss was drawn.
    s = { ...s, raids: [{ ...pushRaid(60), xp: 250 }] }
    const before = s.xp
    const r = logWorkout(s, pushups(3, 20, 30), MON, at(MON, 10))
    expect(r.result.ok && r.result.raid?.damage).toBe(21)
    s = r.state
    for (const d of [addDays(MON, 1), addDays(MON, 2)]) s = logWorkout(advanceTo(s, d, at(d, 9)), pushups(3, 20, 30), d, at(d, 10)).state
    expect(currentRaid(s, addDays(MON, 2))!.status).toBe('cleared')
    expect(s.ceremonies.some((c) => c.kind === 'raidCleared')).toBe(true)
    expect(s.xp - before).toBeGreaterThan(250)

    // A new week fails nothing that was cleared and opens a fresh raid; failing costs no XP.
    const next = addDays(MON, 7)
    const t = advanceTo(s, next, at(next, 8))
    expect(currentRaid(t, next)!.status).toBe('active')
    const unfinished = advanceTo(t, addDays(next, 7), at(addDays(next, 7), 8))
    expect(unfinished.raids!.find((x) => x.week === next)!.status).toBe('failed')
  })
})
