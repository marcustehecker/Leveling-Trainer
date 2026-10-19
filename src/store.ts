import { get, set, del } from 'idb-keyval'
import { useCallback, useEffect, useRef, useState } from 'react'
import { advanceTo } from './core/engine'
import { toKey } from './core/dates'
import type { DateKey, GameState } from './core/types'
import { cloudEnabled, pullState, pushState, watchAccount, type Account } from './cloud'

const LEGACY_KEY = 'the-system:state'
const keyFor = (uid: string | null) => (uid ? `the-system:state:${uid}` : LEGACY_KEY)

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

async function loadLocal(key: string): Promise<GameState | null> {
  try { return ((await get(key)) as GameState | undefined) ?? null } catch { return null }
}

async function saveLocal(key: string, s: GameState | null) {
  try { if (s) await set(key, s); else await del(key) } catch (e) { console.error('Save failed', e) }
}

export type SyncStatus = 'local' | 'synced' | 'saving' | 'offline'
export type AuthState = { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; account: Account }

/** Tracks the signed-in Google account (or reports local-only mode when cloud isn't configured). */
export function useAccount(): AuthState {
  const [auth, setAuth] = useState<AuthState>(cloudEnabled ? { status: 'loading' } : { status: 'signedOut' })
  useEffect(() => {
    if (!cloudEnabled) return
    let unsub: (() => void) | undefined
    let cancelled = false
    watchAccount((a) => setAuth(a ? { status: 'signedIn', account: a } : { status: 'signedOut' }))
      .then((u) => { if (cancelled) u(); else unsub = u })
      .catch(() => setAuth({ status: 'signedOut' }))
    return () => { cancelled = true; unsub?.() }
  }, [])
  return auth
}

/**
 * Game state for one player. With a uid, progress is cached on the device and
 * mirrored to the cloud; the newest copy wins when both exist.
 */
export function useGame(uid: string | null) {
  const [state, setStateRaw] = useState<GameState | null>(null)
  const [ready, setReady] = useState(false)
  const [sync, setSync] = useState<SyncStatus>(uid ? 'saving' : 'local')
  const ref = useRef<GameState | null>(null)
  const dirty = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const push = useCallback(async () => {
    if (!uid || !dirty.current) return
    setSync('saving')
    try {
      await pushState(uid, ref.current)
      dirty.current = false
      setSync('synced')
    } catch {
      setSync('offline')
    }
  }, [uid])

  const commit = useCallback((s: GameState | null, touch = true) => {
    if (s && touch) s = { ...s, updatedAt: Date.now() }
    ref.current = s
    setStateRaw(s)
    void saveLocal(keyFor(uid), s)
    if (uid) {
      dirty.current = true
      clearTimeout(timer.current)
      timer.current = setTimeout(() => void push(), 1500)
    }
  }, [uid, push])

  useEffect(() => {
    let cancelled = false
    setReady(false)
    ;(async () => {
      let local = await loadLocal(keyFor(uid))
      // First sign-in on a device that already has progress: adopt it.
      if (uid && !local) local = await loadLocal(LEGACY_KEY)
      let chosen = local
      if (uid) {
        try {
          const remote = await pullState(uid)
          if (remote && (!local || (remote.updatedAt ?? 0) >= (local.updatedAt ?? 0))) chosen = remote
          dirty.current = chosen !== remote
          setSync(dirty.current ? 'saving' : 'synced')
        } catch {
          dirty.current = !!local
          setSync('offline')
        }
      }
      if (cancelled) return
      const advanced = chosen ? advanceTo(chosen, todayKey(), nowIso()) : null
      ref.current = advanced
      setStateRaw(advanced)
      void saveLocal(keyFor(uid), advanced)
      if (uid && advanced && (dirty.current || advanced !== chosen)) { dirty.current = true; void push() }
      setReady(true)
    })()
    return () => { cancelled = true }
  }, [uid, push])

  useEffect(() => {
    void navigator.storage?.persist?.().catch(() => {})
    const onVis = () => {
      if (document.visibilityState === 'hidden') { void push(); return }
      if (ref.current) {
        const next = advanceTo(ref.current, todayKey(), nowIso())
        if (next !== ref.current) commit(next)
      }
    }
    const onOnline = () => void push()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', onOnline)
    const t = setInterval(onVis, 60_000)
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('online', onOnline); clearInterval(t) }
  }, [commit, push])

  const update = useCallback((fn: (s: GameState) => GameState) => {
    if (!ref.current) return
    const next = fn(ref.current)
    if (next !== ref.current) commit(next)
  }, [commit])

  /** Stop syncing and erase this device's copy (used before deleting the account). */
  const wipe = useCallback(async () => {
    clearTimeout(timer.current)
    dirty.current = false
    ref.current = null
    await saveLocal(keyFor(uid), null)
    await saveLocal(LEGACY_KEY, null)
  }, [uid])

  return { state, ready, commit, update, sync, wipe }
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
