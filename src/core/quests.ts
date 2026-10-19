import { QUEST_XP, RANKS, RECOVERY_QUEST_XP } from './balance'
import { addDays, daysBetween, range, weekStart } from './dates'
import { isTrainingDay, planDayFor } from './plan'
import type { DateKey, GameState, Quest, RankId } from './types'

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function base(d: DateKey, slug: string, q: Omit<Quest, 'id' | 'date' | 'progress' | 'status' | 'expires'> & { expires?: DateKey | null }): Quest {
  return { id: `${d}-${slug}`, date: d, expires: d, progress: 0, status: 'active', ...q }
}

function bestReps(s: GameState, ids: string[], fallback: number): number {
  return Math.max(fallback, ...ids.map((id) => s.records[id]?.reps ?? 0))
}

/** Rank letter for a quest: the hunter's rank, nudged up for a bigger ask. */
function difficulty(rank: RankId, bump = 0): RankId {
  return RANKS[clamp(RANKS.indexOf(rank) + bump, 0, RANKS.length - 1)]
}

export function generateDailyQuests(s: GameState, d: DateKey): Quest[] {
  const p = s.profile
  const a = s.assessment
  const ri = RANKS.indexOf(s.rank)
  const out: Quest[] = []
  const plan = planDayFor(p, a, d)
  const training = isTrainingDay(p, d) && plan

  if (training) {
    out.push(base(d, 'main', {
      type: 'main', measure: 'workout',
      title: "Complete Today's Training",
      description: `${plan.title}: ${plan.focus}. The System has prepared your training.`,
      objective: "Log today's planned workout",
      difficulty: difficulty(s.rank, 1), minutes: plan.estMinutes, stat: 'discipline',
      xp: QUEST_XP[difficulty(s.rank, 1)], target: 1, unit: 'workout',
      bonus: { text: 'Finish every set and record your effort', target: 1, done: false },
    }))

    // Strength side quest rotates daily between three movements.
    const rot = Math.abs(daysBetween('2024-01-01', d)) % 3
    if (rot === 0) {
      const easy = a.pushups < 5
      const ids = easy ? ['incline-pushup'] : ['pushup', 'incline-pushup']
      const target = clamp(Math.round(bestReps(s, ids, easy ? 8 : a.pushups) * (1.5 + 0.1 * ri)), 5, 150)
      out.push(base(d, 'side', {
        type: 'side', measure: 'count',
        title: easy ? 'Incline Push-ups' : 'Push-ups',
        description: 'Spread them across the day in as many sets as you need. Clean reps only.',
        objective: `Complete ${target} ${easy ? 'incline push-ups' : 'push-ups'}`,
        difficulty: difficulty(s.rank), minutes: 5, stat: 'strength', xp: QUEST_XP[difficulty(s.rank)],
        target, unit: 'reps', exerciseIds: ids,
        bonus: { text: `Reach ${Math.round(target * 1.5)} reps`, target: Math.round(target * 1.5), done: false },
      }))
    } else if (rot === 1) {
      const target = clamp(Math.round(bestReps(s, ['bw-squat'], a.pushups * 2 + 10) * (1.2 + 0.1 * ri)), 15, 200)
      out.push(base(d, 'side', {
        type: 'side', measure: 'count',
        title: 'Bodyweight Squats',
        description: 'Full range, chest up. Split into sets however you like.',
        objective: `Complete ${target} squats`,
        difficulty: difficulty(s.rank), minutes: 5, stat: 'strength', xp: QUEST_XP[difficulty(s.rank)],
        target, unit: 'reps', exerciseIds: ['bw-squat', 'box-squat'],
        bonus: { text: `Reach ${Math.round(target * 1.5)} reps`, target: Math.round(target * 1.5), done: false },
      }))
    } else {
      const plank = Math.max(a.plankSeconds, s.records['plank']?.seconds ?? 0, 15)
      const target = clamp(Math.round(plank * (2 + 0.2 * ri)), 30, 300)
      out.push(base(d, 'side', {
        type: 'side', measure: 'count',
        title: 'Plank Hold',
        description: 'Total plank time across the day. Stop a set when your form breaks.',
        objective: `Hold a plank for ${target} seconds total`,
        difficulty: difficulty(s.rank), minutes: 5, stat: 'endurance', xp: QUEST_XP[difficulty(s.rank)],
        target, unit: 'sec', exerciseIds: ['plank', 'knee-plank', 'side-plank'],
        bonus: { text: `Reach ${Math.round(target * 1.5)} seconds`, target: Math.round(target * 1.5), done: false },
      }))
    }

    const walk = clamp(10 + 5 * (a.cardioLevel - 1) + 5 * ri, 10, 40)
    out.push(base(d, 'cardio', {
      type: 'side', measure: 'minutes',
      title: 'Movement Patrol',
      description: 'A walk, jog, bike or any steady cardio.',
      objective: `Move for ${walk} minutes`,
      difficulty: difficulty(s.rank), minutes: walk, stat: 'endurance', xp: QUEST_XP[difficulty(s.rank)],
      target: walk, unit: 'min', exerciseIds: ['brisk-walk', 'jog', 'bike', 'jumping-jacks'],
      bonus: { text: `Keep going to ${Math.round(walk * 1.5)} minutes`, target: Math.round(walk * 1.5), done: false },
    }))
  } else {
    out.push(base(d, 'recovery', {
      type: 'recovery', measure: 'minutes',
      title: 'Recovery Protocol',
      description: 'Rest day. Recovery is part of the plan and counts as participation.',
      objective: 'Complete 10 minutes of mobility or a light walk',
      difficulty: 'E', minutes: 10, stat: 'recovery', xp: RECOVERY_QUEST_XP,
      target: 10, unit: 'min', exerciseIds: ['mobility-flow', 'single-leg-balance', 'brisk-walk'],
    }))
  }

  out.push(base(d, 'water', {
    type: 'habit', measure: 'count',
    title: 'Hydration',
    description: 'Drink water regularly through the day. Tap once per glass.',
    objective: 'Drink 6 glasses of water',
    difficulty: 'E', minutes: 0, stat: 'vitality', xp: QUEST_XP.E, target: 6, unit: 'glasses',
  }))

  if (p.bedtime) {
    out.push(base(d, 'sleep', {
      type: 'sleep', measure: 'check',
      title: 'Lights Out',
      description: `Start your wind-down routine by ${p.bedtime}. Screens down, lights low.`,
      objective: 'Begin your bedtime routine on time',
      difficulty: 'E', minutes: 15, stat: 'recovery', xp: QUEST_XP.E, target: 1, unit: '',
    }))
  }

  // Weekly objective: issued on the first open of each week.
  const ws = weekStart(d)
  const hasWeekly = s.quests.some((q) => q.type === 'weekly' && q.date >= ws)
  if (!hasWeekly) {
    const end = addDays(ws, 6)
    const remaining = range(d, end).filter((k) => isTrainingDay(p, k)).length
    if (remaining > 0) {
      out.push(base(d, 'weekly', {
        type: 'weekly', measure: 'weeklyWorkouts', expires: end,
        title: 'Weekly Objective',
        description: 'Complete your planned sessions this week.',
        objective: `Complete ${remaining} planned session${remaining > 1 ? 's' : ''} by Sunday`,
        difficulty: difficulty(s.rank, 1), minutes: 0, stat: 'discipline',
        xp: Math.min(200, 100 + 25 * remaining), target: remaining, unit: 'sessions',
      }))
    }
  }
  return out
}

export function penaltyQuest(d: DateKey, penaltyId: string, lost: number): Quest {
  return base(d, `penalty-${penaltyId}`, {
    type: 'penalty', measure: 'workout',
    title: 'Penalty Quest',
    description: `Planned training was missed and ${lost} XP was lost. Complete this today to recover most of it.`,
    objective: 'Log any session of 15 minutes or more today',
    difficulty: 'E', minutes: 15, stat: 'discipline', xp: 0, target: 1, unit: 'session',
    minMinutes: 15, penaltyId,
  })
}

export const DAILY_TYPES: Quest['type'][] = ['main', 'side', 'habit', 'recovery', 'sleep']

