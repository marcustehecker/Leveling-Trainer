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
})
