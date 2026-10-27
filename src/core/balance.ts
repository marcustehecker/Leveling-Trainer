// Every tunable number in the game lives here (Stage 2 spec, sections 2–5).
import type { RankId } from './types'

export const RANKS: RankId[] = ['E', 'D', 'C', 'B', 'A', 'S']

/** Cumulative XP needed to hold each rank. */
export const RANK_XP: Record<RankId, number> = { E: 0, D: 2500, C: 8000, B: 17000, A: 30000, S: 48000 }

/** XP per level inside each rank's band (10 levels per band, S is open-ended). */
export const XP_PER_LEVEL: Record<RankId, number> = { E: 250, D: 550, C: 900, B: 1300, A: 1800, S: 3000 }

export const LEVELS_PER_RANK = 10

/** Requirements to be promoted INTO a rank. */
export const PROMOTION: Record<Exclude<RankId, 'E'>, { activeWeeks: number; prs: number }> = {
  D: { activeWeeks: 2, prs: 1 },
  C: { activeWeeks: 4, prs: 3 },
  B: { activeWeeks: 6, prs: 6 },
  A: { activeWeeks: 8, prs: 10 },
  S: { activeWeeks: 10, prs: 15 },
}

export const ACTIVE_WEEK_RATIO = 0.75
export const DEMOTION_WARNING_DAYS = 7
/** How many past days a forgotten workout can be logged for. */
export const LATE_LOG_DAYS = 2
/** Shortest workout that can be logged late. */
export const LATE_LOG_MIN_MINUTES = 10
/** Days between body weight updates. */
export const WEIGHT_UPDATE_DAYS = 7

export const WORKOUT_BASE_XP = 60
export const WORKOUT_XP_PER_SET = 4
export const WORKOUT_MAX_XP = 160
export const PLANNED_WORKOUT_BONUS = 20
export const RPE_BONUS = 5
export const PR_XP = 25
export const MAX_REWARDED_PRS = 3
export const REPEAT_WORKOUT_MULTIPLIER = [1, 0.5, 0]

export const QUEST_XP: Record<RankId, number> = { E: 10, D: 15, C: 20, B: 30, A: 40, S: 50 }
export const DAILY_CLEAR_BONUS = 30
export const RECOVERY_QUEST_XP = 20
export const TRIAL_XP = 300
export const BONUS_OBJECTIVE_MULTIPLIER = 0.5

export const DAILY_XP_CAP = 450

/** XP lost for the 1st, 2nd and 3rd+ consecutive missed planned day. */
export const MISS_LOSS = [60, 90, 120]
export const INACTIVITY_GRACE_DAYS = 3
export const INACTIVITY_LOSS = 40
export const PENALTY_REFUND_RATIO = 0.75

export const SICK_DAYS_PER_30 = 4

export const DUPLICATE_WINDOW_MIN = 30
export const MAX_REPS_PER_SET = 100
export const MAX_WEIGHT_KG = 400
export const MAX_SESSION_MIN = 240

/** Stat XP rates. */
export const STAT_XP = {
  strengthPerSet: 3,
  strengthPerPr: 10,
  endurancePerMin: 2,
  agilityPerMin: 3,
  disciplinePerPlannedWorkout: 15,
  disciplinePerQuest: 5,
}
