import { describe, expect, it } from 'vitest'
import { generatePlan } from './plan'
import { EXERCISE_BY_ID, hasEquipment } from './exercises'
import type { Equipment, Experience, Profile } from './types'

const kits: Equipment[][] = [['none'], ['dumbbells'], ['bands'], ['pullupBar'], ['gym'], ['dumbbells', 'pullupBar']]
const exps: Experience[] = ['none', 'novice', 'intermediate', 'advanced']

describe('plan generator', () => {
  it('produces a valid plan for every equipment, experience and schedule combination', () => {
    for (const equipment of kits) for (const experience of exps) for (let n = 2; n <= 6; n++) for (const sessionMinutes of [20, 30, 45, 60]) {
      const p: Profile = {
        name: 'x', ageRange: '18-29', units: 'metric', experience, goals: ['general'], equipment,
        trainingDays: [1, 2, 3, 4, 5, 6].slice(0, n), sessionMinutes, diet: { preferences: '', allergies: '' },
      }
      const plan = generatePlan(p, { pushups: 3, plankSeconds: 10, cardioLevel: 1, mobilityLevel: 1 })
      expect(Object.keys(plan).length).toBe(n)
      for (const day of Object.values(plan)) {
        expect(day.exercises.length).toBeGreaterThanOrEqual(3)
        for (const e of day.exercises) {
          const ex = EXERCISE_BY_ID[e.exerciseId]
          expect(ex, e.exerciseId).toBeTruthy()
          expect(hasEquipment(ex, equipment)).toBe(true)
        }
      }
    }
  })
  it('keeps 13–15 year olds on beginner-level movements', () => {
    const p: Profile = {
      name: 'x', ageRange: '13-15', units: 'metric', experience: 'advanced', goals: ['strength'], equipment: ['gym'],
      trainingDays: [1, 3, 5], sessionMinutes: 60, diet: { preferences: '', allergies: '' },
    }
    const plan = generatePlan(p, { pushups: 20, plankSeconds: 60, cardioLevel: 4, mobilityLevel: 3 })
    for (const d of Object.values(plan)) for (const e of d.exercises) expect(EXERCISE_BY_ID[e.exerciseId].level).toBe(1)
  })
  it('follows a custom routine: separate push and pull, cardio day, lower body on Sunday', () => {
    const p: Profile = {
      name: 'x', ageRange: '18-29', units: 'metric', experience: 'intermediate', goals: ['strength'], equipment: ['dumbbells', 'pullupBar'],
      trainingDays: [1, 3, 5, 0], sessionMinutes: 45, diet: { preferences: '', allergies: '' },
      routine: { 1: 'push', 3: 'pull', 5: 'cardio', 0: 'lower' },
    }
    const plan = generatePlan(p, { pushups: 15, plankSeconds: 45, cardioLevel: 3, mobilityLevel: 3 })
    expect([plan[1].title, plan[3].title, plan[5].title, plan[0].title]).toEqual(['Push', 'Pull', 'Cardio', 'Lower Body'])
    const patterns = (wd: number) => plan[wd].exercises.map((e) => EXERCISE_BY_ID[e.exerciseId].pattern)
    for (const legs of ['squat', 'lunge', 'hinge']) {
      expect(patterns(1)).not.toContain(legs)
      expect(patterns(3)).not.toContain(legs)
      expect(patterns(5)).not.toContain(legs)
    }
    expect(patterns(1).filter((x) => x === 'pull' || x === 'vpull')).toHaveLength(0)
    expect(patterns(3).filter((x) => x === 'push' || x === 'vpush')).toHaveLength(0)
    expect(patterns(5)[0]).toBe('cardio')
    expect(plan[5].exercises[0].seconds).toBeGreaterThanOrEqual(20 * 60)
    const ids = plan[1].exercises.map((e) => e.exerciseId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
