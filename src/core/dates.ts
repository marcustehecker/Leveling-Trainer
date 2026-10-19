import type { DateKey } from './types'

export function toKey(d: Date): DateKey {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromKey(k: DateKey): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d, 12) // noon avoids DST edge cases
}

export function addDays(k: DateKey, n: number): DateKey {
  const d = fromKey(k)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export function weekday(k: DateKey): number {
  return fromKey(k).getDay()
}

export function daysBetween(a: DateKey, b: DateKey): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000)
}

/** Monday of the week containing k. */
export function weekStart(k: DateKey): DateKey {
  const wd = weekday(k)
  return addDays(k, wd === 0 ? -6 : 1 - wd)
}

export function range(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = []
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k)
  return out
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
