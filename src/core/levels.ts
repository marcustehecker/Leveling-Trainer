import * as B from './balance'
import type { RankId } from './types'

export interface LevelInfo {
  level: number
  band: RankId
  /** XP into the current level. */
  into: number
  /** XP the current level spans. */
  span: number
  /** Total XP at which the next level starts. */
  nextAt: number
}

export function levelInfo(xp: number): LevelInfo {
  let bi = 0
  for (let i = 0; i < B.RANKS.length; i++) if (xp >= B.RANK_XP[B.RANKS[i]]) bi = i
  const band = B.RANKS[bi]
  const per = B.XP_PER_LEVEL[band]
  const offset = xp - B.RANK_XP[band]
  let sub = Math.floor(offset / per)
  if (band !== 'S') sub = Math.min(sub, B.LEVELS_PER_RANK - 1)
  const into = offset - sub * per
  return { level: bi * B.LEVELS_PER_RANK + sub + 1, band, into, span: per, nextAt: xp - into + per }
}

export function statLevel(statXp: number): number {
  return Math.floor(Math.sqrt(statXp / 25)) + 1
}
