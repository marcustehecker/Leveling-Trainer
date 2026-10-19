import { get, set, del } from 'idb-keyval'
import { useCallback, useEffect, useRef, useState } from 'react'
import { advanceTo } from './core/engine'
import { toKey } from './core/dates'
import type { DateKey, GameState } from './core/types'

const KEY = 'the-system:state'

/** `?date=YYYY-MM-DD` lets you preview another day (for testing streaks and penalties). */
function override(): DateKey | null {
  const v = new URLSearchParams(location.search).get('date')
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}

export function todayKey(): DateKey {
  return override() ?? toKey(new Date())
}

export function nowIso(): string {
  const o = override()
  if (!o) return new Date().toISOString()
  const t = new Date()
  const [y, m, d] = o.split('-').map(Number)
  t.setFullYear(y, m - 1, d)
  return t.toISOString()
}

export async function loadState(): Promise<GameState | null> {
  try {
    return ((await get(KEY)) as GameState | undefined) ?? null
  } catch {
    return null
  }
}

export async function saveState(s: GameState | null) {
  try {
    if (s) await set(KEY, s)
    else await del(KEY)
  } catch (e) {
    console.error('Save failed', e)
  }
}

export function useGame() {
  const [state, setStateRaw] = useState<GameState | null>(null)
  const [ready, setReady] = useState(false)
  const ref = useRef<GameState | null>(null)

  const commit = useCallback((s: GameState | null) => {
    ref.current = s
    setStateRaw(s)
    void saveState(s)
  }, [])

  useEffect(() => {
    void navigator.storage?.persist?.().catch(() => {})
    loadState().then((s) => {
      commit(s ? advanceTo(s, todayKey(), nowIso()) : null)
      setReady(true)
    })
    // Day rollover while the app stays open in the background.
    const onVis = () => {
      if (document.visibilityState === 'visible' && ref.current) {
        const next = advanceTo(ref.current, todayKey(), nowIso())
        if (next !== ref.current) commit(next)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    const t = setInterval(onVis, 60_000)
    return () => { document.removeEventListener('visibilitychange', onVis); clearInterval(t) }
  }, [commit])

  const update = useCallback((fn: (s: GameState) => GameState) => {
    if (ref.current) commit(fn(ref.current))
  }, [commit])

  return { state, ready, commit, update }
}

export function exportBackup(s: GameState) {
  const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `the-system-backup-${todayKey()}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export async function readBackup(file: File): Promise<GameState> {
  const s = JSON.parse(await file.text()) as GameState
  if (s?.version !== 1 || !s.profile || typeof s.xp !== 'number') throw new Error('Not a SYSTEM backup file.')
  return s
}

export const KG_PER_LB = 0.45359237
export const toDisplayWeight = (kg: number, units: 'metric' | 'imperial') =>
  units === 'imperial' ? Math.round((kg / KG_PER_LB) * 10) / 10 : Math.round(kg * 10) / 10
export const fromDisplayWeight = (v: number, units: 'metric' | 'imperial') => (units === 'imperial' ? v * KG_PER_LB : v)
export const weightUnit = (units: 'metric' | 'imperial') => (units === 'imperial' ? 'lb' : 'kg')
