import { EXERCISE_BY_ID } from './exercises'
import { levelInfo, statLevel } from './levels'
import type { GameState, StatId, WorkoutLog } from './types'

export type AchievementCategory = 'Training' | 'Streaks' | 'Records' | 'Strength' | 'Level & Rank' | 'Discipline' | 'Explorer'

export interface AchievementDef {
  id: string
  name: string
  description: string
  category: AchievementCategory
  rare?: boolean
  title?: string
  test: (s: GameState) => boolean
}

const promotedTo = (s: GameState, r: string) => s.rankHistory.some((h) => h.kind === 'promotion' && h.rank === r)

// ---------- Derived totals (all from the workout log) ----------
const doneSets = (w: WorkoutLog) => w.exercises.flatMap((e) => e.sets.filter((x) => x.done).map((x) => ({ e, x })))
const totalSets = (s: GameState) => s.workouts.reduce((m, w) => m + doneSets(w).length, 0)
const totalMinutes = (s: GameState) => s.workouts.reduce((m, w) => m + (w.durationMin || 0), 0)
const repsWhere = (s: GameState, f: (id: string) => boolean) =>
  s.workouts.reduce((m, w) => m + doneSets(w).filter(({ e }) => f(e.exerciseId)).reduce((n, { x }) => n + (x.reps ?? 0), 0), 0)
const cardioMinutes = (s: GameState) =>
  s.workouts.reduce((m, w) => m + doneSets(w).filter(({ e }) => EXERCISE_BY_ID[e.exerciseId]?.pattern === 'cardio').reduce((n, { x }) => n + (x.seconds ?? 0) / 60, 0), 0)
const volumeKg = (s: GameState) => s.workouts.reduce((m, w) => m + doneSets(w).reduce((n, { x }) => n + (x.weightKg ?? 0) * (x.reps ?? 0), 0), 0)
const uniqueExercises = (s: GameState) => new Set(s.workouts.flatMap((w) => doneSets(w).map(({ e }) => e.exerciseId))).size
const bestSetReps = (s: GameState, ids: string[]) =>
  Math.max(0, ...s.workouts.flatMap((w) => doneSets(w).filter(({ e }) => ids.includes(e.exerciseId)).map(({ x }) => x.reps ?? 0)))
const bestWeight = (s: GameState, ids: string[]) => Math.max(0, ...ids.map((id) => s.records[id]?.weightKg ?? 0))
const bestSeconds = (s: GameState, ids: string[]) => Math.max(0, ...ids.map((id) => s.records[id]?.seconds ?? 0))
const hourOf = (iso: string) => new Date(iso).getHours()
const isWeekend = (date: string) => { const d = new Date(`${date}T12:00:00`).getDay(); return d === 0 || d === 6 }
const level = (s: GameState) => levelInfo(s.xp).level
const statLv = (s: GameState, id: StatId) => statLevel(s.stats[id])
const STATS: StatId[] = ['strength', 'endurance', 'agility', 'vitality', 'discipline', 'recovery']
const latestBodyKg = (s: GameState) => s.bodyWeights?.[s.bodyWeights.length - 1]?.kg ?? 0
/** A workout logged after at least `gap` days without one. */
const cameBack = (s: GameState, gap: number) => {
  const dates = [...new Set(s.workouts.map((w) => w.date))].sort()
  for (let i = 1; i < dates.length; i++) if ((Date.parse(dates[i]) - Date.parse(dates[i - 1])) / 86_400_000 >= gap) return true
  return false
}

const PULLUPS = ['pullup', 'chinup', 'neutral-pullup']
const PUSHUPS = ['pushup', 'incline-pushup', 'wide-pushup', 'decline-pushup', 'diamond-pushup', 'archer-pushup']
const SQUATS = ['bw-squat', 'box-squat', 'goblet-squat', 'back-squat', 'front-squat', 'jump-squat', 'db-sumo-squat', 'hack-squat']
const BENCH = ['bench-press', 'incline-bench', 'close-grip-bench']
const SQUAT_BAR = ['back-squat', 'front-squat']
const DEADLIFT = ['deadlift', 'trap-bar-deadlift']

type Def = Omit<AchievementDef, 'category'>
const group = (category: AchievementCategory, defs: Def[]): AchievementDef[] => defs.map((d) => ({ ...d, category }))

export const ACHIEVEMENTS: AchievementDef[] = [
  ...group('Training', [
    { id: 'first_quest', name: 'Player Awakened', description: 'Complete your first quest.', test: (s) => s.quests.some((q) => q.status === 'done') },
    { id: 'first_workout', name: 'First Dungeon', description: 'Log your first workout.', test: (s) => s.workouts.length >= 1 },
    { id: 'workouts_5', name: 'Rookie Hunter', description: 'Log 5 workouts.', test: (s) => s.workouts.length >= 5 },
    { id: 'workouts_10', name: 'Regular', description: 'Log 10 workouts.', test: (s) => s.workouts.length >= 10 },
    { id: 'workouts_25', name: 'Gate Crawler', description: 'Log 25 workouts.', title: 'Gate Crawler', test: (s) => s.workouts.length >= 25 },
    { id: 'workouts_50', name: 'Dungeon Veteran', description: 'Log 50 workouts.', rare: true, title: 'Veteran', test: (s) => s.workouts.length >= 50 },
    { id: 'workouts_100', name: 'Centurion', description: 'Log 100 workouts.', rare: true, title: 'Centurion', test: (s) => s.workouts.length >= 100 },
    { id: 'workouts_200', name: 'Dungeon Lord', description: 'Log 200 workouts.', rare: true, title: 'Dungeon Lord', test: (s) => s.workouts.length >= 200 },
    { id: 'workouts_365', name: 'Year of the Hunter', description: 'Log 365 workouts.', rare: true, title: 'Eternal Hunter', test: (s) => s.workouts.length >= 365 },
    { id: 'sets_100', name: 'Hundred Sets', description: 'Complete 100 sets.', test: (s) => totalSets(s) >= 100 },
    { id: 'sets_500', name: 'Iron Body', description: 'Complete 500 sets.', title: 'Iron Body', test: (s) => totalSets(s) >= 500 },
    { id: 'sets_1000', name: 'Thousand Sets', description: 'Complete 1,000 sets.', rare: true, title: 'Steel Body', test: (s) => totalSets(s) >= 1000 },
    { id: 'minutes_600', name: 'Ten Hours', description: 'Train for 10 hours in total.', test: (s) => totalMinutes(s) >= 600 },
    { id: 'minutes_3000', name: 'Fifty Hours', description: 'Train for 50 hours in total.', rare: true, title: 'Grinder', test: (s) => totalMinutes(s) >= 3000 },
    { id: 'minutes_6000', name: 'Hundred Hours', description: 'Train for 100 hours in total.', rare: true, title: 'Tireless', test: (s) => totalMinutes(s) >= 6000 },
    { id: 'long_session', name: 'Marathon Session', description: 'Log a single session of 90 minutes or more.', test: (s) => s.workouts.some((w) => w.durationMin >= 90) },
    { id: 'early_riser', name: 'Early Riser', description: 'Log a workout before 7 AM.', title: 'Early Riser', test: (s) => s.workouts.some((w) => hourOf(w.loggedAt) < 7) },
    { id: 'night_hunter', name: 'Night Hunter', description: 'Log a workout after 9 PM.', title: 'Night Hunter', test: (s) => s.workouts.some((w) => hourOf(w.loggedAt) >= 21) },
    { id: 'weekend_10', name: 'Weekend Warrior', description: 'Log 10 workouts on weekends.', title: 'Weekend Warrior', test: (s) => s.workouts.filter((w) => isWeekend(w.date)).length >= 10 },
    { id: 'cardio_300', name: 'Endurance Runner', description: 'Do 300 minutes of cardio.', test: (s) => cardioMinutes(s) >= 300 },
    { id: 'cardio_1000', name: 'Marathon Soul', description: 'Do 1,000 minutes of cardio.', rare: true, title: 'Marathon Soul', test: (s) => cardioMinutes(s) >= 1000 },
  ]),
  ...group('Streaks', [
    { id: 'streak_3', name: 'Warming Up', description: 'Reach a 3-day streak.', test: (s) => s.bestStreak >= 3 },
    { id: 'streak_7', name: 'Seven Days', description: 'Reach a 7-day streak.', title: 'Persistent', test: (s) => s.bestStreak >= 7 },
    { id: 'streak_14', name: 'Wolf Slayer', description: 'Reach a 14-day streak.', title: 'Wolf Slayer', test: (s) => s.bestStreak >= 14 },
    { id: 'streak_30', name: 'Unbroken', description: 'Reach a 30-day streak.', rare: true, title: 'Iron Will', test: (s) => s.bestStreak >= 30 },
    { id: 'streak_60', name: 'Unstoppable', description: 'Reach a 60-day streak.', rare: true, title: 'Unstoppable', test: (s) => s.bestStreak >= 60 },
    { id: 'streak_100', name: 'Hundred Days', description: 'Reach a 100-day streak.', rare: true, title: 'The Unyielding', test: (s) => s.bestStreak >= 100 },
    { id: 'daily_clear', name: 'Daily Quest Cleared', description: 'Clear every daily quest in one day.', test: (s) => s.dailyClear.length >= 1 },
    { id: 'daily_clear_7', name: 'Diligent', description: 'Clear all daily quests on 7 days.', title: 'Diligent', test: (s) => s.dailyClear.length >= 7 },
    { id: 'daily_clear_30', name: 'The Disciplined', description: 'Clear all daily quests on 30 days.', rare: true, title: 'The Disciplined', test: (s) => s.dailyClear.length >= 30 },
    { id: 'daily_clear_100', name: 'Quest Master', description: 'Clear all daily quests on 100 days.', rare: true, title: 'Quest Master', test: (s) => s.dailyClear.length >= 100 },
  ]),
  ...group('Records', [
    { id: 'first_pr', name: 'Limit Broken', description: 'Set your first personal record.', test: (s) => s.prCount >= 1 },
    { id: 'pr_10', name: 'Breaking Through', description: 'Set 10 personal records.', title: 'Limit Breaker', test: (s) => s.prCount >= 10 },
    { id: 'pr_25', name: 'Limit Shatterer', description: 'Set 25 personal records.', title: 'Limit Shatterer', test: (s) => s.prCount >= 25 },
    { id: 'pr_50', name: 'Beyond Limits', description: 'Set 50 personal records.', rare: true, title: 'Beyond Limits', test: (s) => s.prCount >= 50 },
    { id: 'pr_100', name: 'Breaker of Chains', description: 'Set 100 personal records.', rare: true, title: 'Breaker of Chains', test: (s) => s.prCount >= 100 },
    { id: 'pr_day_3', name: 'Power Surge', description: 'Set 3 records in one workout.', title: 'Surging', test: (s) => s.workouts.some((w) => w.prs.length >= 3) },
  ]),
  ...group('Strength', [
    { id: 'first_pullup', name: 'First Pull-up', description: 'Log a full pull-up or chin-up.', test: (s) => bestSetReps(s, PULLUPS) >= 1 },
    { id: 'pullup_10', name: 'Bar Master', description: '10 pull-ups or chin-ups in one set.', rare: true, title: 'Bar Master', test: (s) => bestSetReps(s, PULLUPS) >= 10 },
    { id: 'pushup_20', name: 'Twenty Push-ups', description: '20 push-ups in one set.', test: (s) => bestSetReps(s, ['pushup', 'wide-pushup', 'decline-pushup']) >= 20 },
    { id: 'pushup_50', name: 'Push-up Machine', description: '50 push-ups in one set.', rare: true, title: 'Push-up Machine', test: (s) => bestSetReps(s, ['pushup', 'wide-pushup', 'decline-pushup']) >= 50 },
    { id: 'pushups_1000', name: 'Thousand Push-ups', description: 'Do 1,000 push-ups in total.', title: 'Relentless', test: (s) => repsWhere(s, (id) => PUSHUPS.includes(id)) >= 1000 },
    { id: 'squats_1000', name: 'Leg Day Devotee', description: 'Do 1,000 squats in total.', title: 'Leg Day Devotee', test: (s) => repsWhere(s, (id) => SQUATS.includes(id)) >= 1000 },
    { id: 'plank_60', name: 'Iron Core', description: 'Hold a plank for 60 seconds.', test: (s) => bestSeconds(s, ['plank']) >= 60 },
    { id: 'plank_120', name: 'Unshakable', description: 'Hold a plank for 2 minutes.', title: 'Unshakable', test: (s) => bestSeconds(s, ['plank']) >= 120 },
    { id: 'dips_10', name: 'Dip Specialist', description: '10 bar dips in one set.', test: (s) => bestSetReps(s, ['dip', 'weighted-dip']) >= 10 },
    { id: 'bench_60', name: 'One Plate Bench', description: 'Bench press 60 kg / 135 lb.', title: 'Plate Pusher', test: (s) => bestWeight(s, BENCH) >= 60 },
    { id: 'bench_100', name: 'Heavy Presser', description: 'Bench press 100 kg / 225 lb.', rare: true, title: 'Heavy Presser', test: (s) => bestWeight(s, BENCH) >= 100 },
    { id: 'squat_100', name: 'Two Plate Squat', description: 'Squat 100 kg / 225 lb.', rare: true, title: 'Pillar', test: (s) => bestWeight(s, SQUAT_BAR) >= 100 },
    { id: 'deadlift_140', name: 'Titan', description: 'Deadlift 140 kg / 315 lb.', rare: true, title: 'Titan', test: (s) => bestWeight(s, DEADLIFT) >= 140 },
    { id: 'bench_bodyweight', name: 'Bodyweight Bench', description: 'Bench press your own body weight.', rare: true, title: 'Strongman', test: (s) => latestBodyKg(s) > 0 && bestWeight(s, BENCH) >= latestBodyKg(s) },
    { id: 'volume_10t', name: 'Ten Tons', description: 'Lift 10,000 kg in total (weight × reps).', test: (s) => volumeKg(s) >= 10_000 },
    { id: 'volume_100t', name: 'Mountain Mover', description: 'Lift 100,000 kg in total.', rare: true, title: 'Mountain Mover', test: (s) => volumeKg(s) >= 100_000 },
  ]),
  ...group('Level & Rank', [
    { id: 'level_5', name: 'Level 5', description: 'Reach level 5.', test: (s) => level(s) >= 5 },
    { id: 'level_10', name: 'Awakened', description: 'Reach level 10.', title: 'Awakened', test: (s) => level(s) >= 10 },
    { id: 'level_20', name: 'Level 20', description: 'Reach level 20.', test: (s) => level(s) >= 20 },
    { id: 'level_30', name: 'Elite', description: 'Reach level 30.', rare: true, title: 'Elite', test: (s) => level(s) >= 30 },
    { id: 'level_50', name: 'Ascendant', description: 'Reach level 50.', rare: true, title: 'Ascendant', test: (s) => level(s) >= 50 },
    { id: 'xp_1000', name: 'First Thousand', description: 'Earn 1,000 lifetime XP.', test: (s) => s.lifetimeXp >= 1000 },
    { id: 'xp_10000', name: 'Ten Thousand', description: 'Earn 10,000 lifetime XP.', rare: true, test: (s) => s.lifetimeXp >= 10_000 },
    { id: 'xp_25000', name: 'Legend in the Making', description: 'Earn 25,000 lifetime XP.', rare: true, title: 'Living Legend', test: (s) => s.lifetimeXp >= 25_000 },
    { id: 'stat_10', name: 'Specialist', description: 'Raise any stat to level 10.', title: 'Specialist', test: (s) => STATS.some((id) => statLv(s, id) >= 10) },
    { id: 'stats_all_5', name: 'All-Rounder', description: 'Raise every stat to level 5.', title: 'All-Rounder', test: (s) => STATS.every((id) => statLv(s, id) >= 5) },
    { id: 'strength_20', name: 'Brute Force', description: 'Raise Strength to level 20.', rare: true, title: 'Brute', test: (s) => statLv(s, 'strength') >= 20 },
    { id: 'endurance_20', name: 'Bottomless Stamina', description: 'Raise Endurance to level 20.', rare: true, title: 'Bottomless', test: (s) => statLv(s, 'endurance') >= 20 },
    { id: 'rank_D', name: 'D-Rank Hunter', description: 'Clear the D-Rank Trial.', title: 'D-Rank Hunter', test: (s) => promotedTo(s, 'D') },
    { id: 'rank_C', name: 'C-Rank Hunter', description: 'Clear the C-Rank Trial.', title: 'C-Rank Hunter', test: (s) => promotedTo(s, 'C') },
    { id: 'rank_B', name: 'B-Rank Hunter', description: 'Clear the B-Rank Trial.', rare: true, title: 'B-Rank Hunter', test: (s) => promotedTo(s, 'B') },
    { id: 'rank_A', name: 'A-Rank Hunter', description: 'Clear the A-Rank Trial.', rare: true, title: 'A-Rank Hunter', test: (s) => promotedTo(s, 'A') },
    { id: 'rank_S', name: 'S-Rank Hunter', description: 'Clear the S-Rank Trial.', rare: true, title: 'Monarch of Iron', test: (s) => promotedTo(s, 'S') },
  ]),
  ...group('Discipline', [
    { id: 'penalty_cleared', name: 'Escaped the Penalty Zone', description: 'Complete a Penalty Quest in time.', test: (s) => s.penalties.some((p) => p.refunded) },
    { id: 'penalty_5', name: 'Penalty Survivor', description: 'Complete 5 Penalty Quests in time.', title: 'Survivor', test: (s) => s.penalties.filter((p) => p.refunded).length >= 5 },
    { id: 'survived_warning', name: 'The One Who Returned', description: 'Recover from a Demotion Warning.', rare: true, title: 'The One Who Returned', test: () => false },
    { id: 'comeback', name: 'Second Awakening', description: 'Train again after a 7-day break.', title: 'Reawakened', test: (s) => cameBack(s, 7) },
    { id: 'rested', name: 'Rest Is Training', description: 'Take a sick day instead of training through it.', test: (s) => s.sickDays.length >= 1 },
    { id: 'rpe_10', name: 'Self-Aware', description: 'Rate the effort of 10 workouts.', test: (s) => s.workouts.filter((w) => w.rpe).length >= 10 },
    { id: 'body_5', name: 'On the Scale', description: 'Log your body weight 5 times.', test: (s) => (s.bodyWeights?.length ?? 0) >= 5 },
    { id: 'body_30', name: 'Data Hunter', description: 'Log your body weight 30 times.', title: 'Analyst', test: (s) => (s.bodyWeights?.length ?? 0) >= 30 },
  ]),
  ...group('Explorer', [
    { id: 'unique_10', name: 'Explorer', description: 'Try 10 different exercises.', test: (s) => uniqueExercises(s) >= 10 },
    { id: 'unique_30', name: 'Arsenal', description: 'Try 30 different exercises.', title: 'Weapon Master', test: (s) => uniqueExercises(s) >= 30 },
    { id: 'unique_60', name: 'Master of Arms', description: 'Try 60 different exercises.', rare: true, title: 'Master of Arms', test: (s) => uniqueExercises(s) >= 60 },
    { id: 'all_patterns', name: 'Complete Hunter', description: 'Log a squat, hinge, push, pull, lunge, core and cardio exercise.', title: 'Complete Hunter',
      test: (s) => { const p = new Set(s.workouts.flatMap((w) => doneSets(w).map(({ e }) => EXERCISE_BY_ID[e.exerciseId]?.pattern))); return ['squat', 'hinge', 'push', 'pull', 'lunge', 'core', 'cardio'].every((x) => p.has(x as never)) } },
    { id: 'titles_5', name: 'Collector', description: 'Earn 5 titles.', title: 'Collector', test: (s) => ACHIEVEMENTS.filter((a) => a.title && a.id !== 'titles_5' && s.achievements[a.id]).length >= 5 },
  ]),
]

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]))
export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = ['Training', 'Streaks', 'Records', 'Strength', 'Level & Rank', 'Discipline', 'Explorer']
