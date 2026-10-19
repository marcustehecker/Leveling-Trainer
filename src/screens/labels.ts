import type { StatId } from '../core/types'

export const STAT_LABEL: Record<StatId, string> = {
  strength: 'Strength', endurance: 'Endurance', agility: 'Agility', vitality: 'Vitality', discipline: 'Discipline', recovery: 'Recovery',
}

export const STAT_ABBR: Record<StatId, string> = {
  strength: 'STR', endurance: 'END', agility: 'AGI', vitality: 'VIT', discipline: 'DIS', recovery: 'REC',
}

export const STAT_COLOR: Record<StatId, string> = {
  strength: '#f87171', endurance: '#fbbf24', agility: '#34d399', vitality: '#22d3ee', discipline: '#818cf8', recovery: '#c084fc',
}

export const STAT_DESC: Record<StatId, string> = {
  strength: 'Resistance training sets and strength records.',
  endurance: 'Cardio minutes and timed holds.',
  agility: 'Mobility, balance and single-leg work.',
  vitality: 'Daily habits like hydration and movement.',
  discipline: 'Completing what you planned.',
  recovery: 'Rest-day protocols and sleep routine.',
}
