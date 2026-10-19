import type { GameState } from './types'

export interface AchievementDef {
  id: string
  name: string
  description: string
  rare?: boolean
  title?: string
  test: (s: GameState) => boolean
}

const promotedTo = (s: GameState, r: string) => s.rankHistory.some((h) => h.kind === 'promotion' && h.rank === r)

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_quest', name: 'Player Awakened', description: 'Complete your first quest.', test: (s) => s.quests.some((q) => q.status === 'done') },
  { id: 'first_workout', name: 'First Dungeon', description: 'Log your first workout.', test: (s) => s.workouts.length >= 1 },
  { id: 'daily_clear', name: 'Daily Quest Cleared', description: 'Clear every daily quest in one day.', test: (s) => s.dailyClear.length >= 1 },
  { id: 'streak_7', name: 'Seven Days', description: 'Reach a 7-day streak.', title: 'Persistent', test: (s) => s.bestStreak >= 7 },
  { id: 'streak_30', name: 'Unbroken', description: 'Reach a 30-day streak.', rare: true, title: 'Iron Will', test: (s) => s.bestStreak >= 30 },
  { id: 'first_pr', name: 'Limit Broken', description: 'Set your first personal record.', test: (s) => s.prCount >= 1 },
  { id: 'pr_10', name: 'Breaking Through', description: 'Set 10 personal records.', title: 'Limit Breaker', test: (s) => s.prCount >= 10 },
  { id: 'workouts_10', name: 'Regular', description: 'Log 10 workouts.', test: (s) => s.workouts.length >= 10 },
  { id: 'workouts_50', name: 'Dungeon Veteran', description: 'Log 50 workouts.', rare: true, title: 'Veteran', test: (s) => s.workouts.length >= 50 },
  { id: 'penalty_cleared', name: 'Escaped the Penalty Zone', description: 'Complete a Penalty Quest in time.', test: (s) => s.penalties.some((p) => p.refunded) },
  { id: 'survived_warning', name: 'The One Who Returned', description: 'Recover from a Demotion Warning.', rare: true, title: 'The One Who Returned', test: () => false },
  { id: 'rank_D', name: 'D-Rank Hunter', description: 'Clear the D-Rank Trial.', title: 'D-Rank Hunter', test: (s) => promotedTo(s, 'D') },
  { id: 'rank_C', name: 'C-Rank Hunter', description: 'Clear the C-Rank Trial.', title: 'C-Rank Hunter', test: (s) => promotedTo(s, 'C') },
  { id: 'rank_B', name: 'B-Rank Hunter', description: 'Clear the B-Rank Trial.', rare: true, title: 'B-Rank Hunter', test: (s) => promotedTo(s, 'B') },
  { id: 'rank_A', name: 'A-Rank Hunter', description: 'Clear the A-Rank Trial.', rare: true, title: 'A-Rank Hunter', test: (s) => promotedTo(s, 'A') },
  { id: 'rank_S', name: 'S-Rank Hunter', description: 'Clear the S-Rank Trial.', rare: true, title: 'Monarch of Iron', test: (s) => promotedTo(s, 'S') },
]

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]))
