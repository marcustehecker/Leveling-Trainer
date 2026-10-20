import { useEffect, useRef, useState } from 'react'
import { dismissCeremony } from './core/engine'
import { useAccount, useGame, type SyncStatus } from './store'
import { cloudEnabled, type Account } from './cloud'
import { Login } from './screens/Login'
import { TermsConsent } from './screens/Legal'
import { Corners } from './ui/components'
import { nowIso, todayKey } from './store'
import { play } from './sfx'
import { BootScreen, bootDue } from './ui/BootScreen'
import { FLAME_TIERS, FlameTierUp, flameTierIndex } from './ui/StreakFlame'
import { Onboarding } from './screens/Onboarding'
import { SystemTab } from './screens/SystemTab'
import { TrainingTab } from './screens/TrainingTab'
import { NutritionTab } from './screens/NutritionTab'
import { ProgressTab } from './screens/ProgressTab'
import { HunterTab } from './screens/HunterTab'
import { CeremonyOverlay } from './ui/CeremonyOverlay'

type Tab = 'system' | 'training' | 'nutrition' | 'progress' | 'hunter'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'system', label: 'System', icon: 'M12 2 21 7v10l-9 5-9-5V7z M12 8v8 M8 12h8' },
  { id: 'training', label: 'Training', icon: 'M3 10v4 M6 7v10 M18 7v10 M21 10v4 M6 12h12' },
  { id: 'nutrition', label: 'Nutrition', icon: 'M12 21c-4 0-7-3-7-8 0-3 2-6 7-6s7 3 7 6c0 5-3 8-7 8z M12 7c0-2 1-4 3-4' },
  { id: 'progress', label: 'Progress', icon: 'M3 20h18 M6 16l4-5 3 3 5-7' },
  { id: 'hunter', label: 'Hunter', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c1-4 4-6 8-6s7 2 8 6' },
]

function Particles() {
  const dots = Array.from({ length: 18 }, (_, i) => ({
    left: `${(i * 53) % 100}%`, delay: `${(i * 1.7) % 12}s`, dur: `${10 + ((i * 7) % 9)}s`, size: i % 3 === 0 ? 3 : 2,
  }))
  return <div className="particles" aria-hidden>{dots.map((d, i) => <i key={i} style={{ left: d.left, animationDelay: d.delay, animationDuration: d.dur, width: d.size, height: d.size }} />)}</div>
}

const SYNC_LABEL: Record<SyncStatus, string> = { local: 'On device', synced: 'Synced', saving: 'Saving…', offline: 'Offline' }

export default function App() {
  const auth = useAccount()
  if (auth.status === 'loading') return <><Particles /><Splash /></>
  if (cloudEnabled && auth.status === 'signedOut') return <><Particles /><Login /></>
  const account = auth.status === 'signedIn' ? auth.account : null
  return <Game key={account?.uid ?? 'local'} account={account} />
}

function Splash() {
  return <div className="flex h-full items-center justify-center"><span className="sys-title glow-text anim-flicker text-white">[System loading…]</span></div>
}

function Game({ account }: { account: Account | null }) {
  const { state, ready, commit, update, sync, wipe } = useGame(account?.uid ?? null)
  const [tab, setTabRaw] = useState<Tab>('system')
  const [dir, setDir] = useState<'r' | 'l'>('r')
  const setTab = (t: Tab) => setTabRaw((cur) => {
    setDir(TABS.findIndex((x) => x.id === t) >= TABS.findIndex((x) => x.id === cur) ? 'r' : 'l')
    return t
  })
  const [toast, setToast] = useState<string | null>(null)
  const uid = account?.uid ?? 'local'
  const [booting, setBooting] = useState(() => bootDue(uid, todayKey()))
  const [flameUp, setFlameUp] = useState<number | null>(null)
  const pull = usePullToRefresh(!booting && flameUp === null && !state?.ceremonies.length)

  // Celebrate each new streak flame tier once.
  const streak = state?.streak
  useEffect(() => {
    if (streak === undefined) return
    const key = `the-system:flame:${uid}`
    const tier = flameTierIndex(streak)
    let seen = -1
    try { seen = Number(localStorage.getItem(key) ?? -1) } catch { return }
    if (seen < 0 || tier < seen) { try { localStorage.setItem(key, String(tier)) } catch { /* ignore */ } return }
    if (tier > seen) {
      try { localStorage.setItem(key, String(tier)) } catch { /* ignore */ }
      setFlameUp(tier)
    }
  }, [streak, uid])

  const ceremony = state?.ceremonies[0]
  // Quest clears are a light toast, not a full-screen notification.
  useEffect(() => {
    if (ceremony?.kind === 'questClear') {
      setToast(`[Quest complete: ${ceremony.title}${ceremony.xp ? ` · +${ceremony.xp} EXP` : ''}]`)
      update(dismissCeremony)
    }
  }, [ceremony, update])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => { window.scrollTo(0, 0) }, [tab])

  if (!ready) return <><Particles /><Splash /></>
  if (!state) return <><Particles /><div className="relative z-10 h-full"><Onboarding defaultName={account?.name?.split(' ')[0] ?? ''} onDone={(s) => { commit(s); setTab('system') }} /></div></>

  if (!state.profile.acceptedTermsAt) {
    return (
      <><Particles />
        <div className="safe-top safe-bottom relative z-10 mx-auto flex min-h-full max-w-md items-center px-4">
          <div className="sys-panel anim-open w-full px-5 pb-6 pt-0">
            <Corners />
            <header className="relative -mt-3.5 mb-4 flex justify-center"><h2 className="sys-plaque sys-title glow-text text-sm text-white">System Terms</h2></header>
            <p className="mb-4 text-center text-sm text-glow">[The System has been updated. Confirm the following to continue.]</p>
            <TermsConsent cta="Continue" onAccept={() => update((x) => ({ ...x, profile: { ...x.profile, acceptedTermsAt: nowIso() } }))} />
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="relative mx-auto min-h-full max-w-md">
      <Particles />
      <header className="safe-top sticky top-0 z-20 flex items-center justify-between border-b border-sky-200/25 bg-[#020617]/85 px-4 pb-3 backdrop-blur">
        <span className="sys-title glow-text text-lg text-white">The System</span>
        <span className="sys-title flex items-center gap-2 text-[10px] text-mute">
          <span className={`h-1.5 w-1.5 rounded-full ${sync === 'synced' ? 'bg-ok shadow-[0_0_6px_#6ee7b7]' : sync === 'offline' ? 'bg-danger' : sync === 'saving' ? 'bg-sys anim-flicker' : 'bg-mute'}`} />
          {SYNC_LABEL[sync]}
        </span>
      </header>
      <PullIndicator {...pull} />
      <main key={tab} className={`stagger relative z-10 px-4 pb-28 pt-5 tab-${dir}`} style={pull.dist ? { transform: `translateY(${pull.dist}px)`, transition: 'none' } : { transition: 'transform 250ms' }}>
        {tab === 'system' && <SystemTab s={state} update={update} goTraining={() => setTab('training')} />}
        {tab === 'training' && <TrainingTab s={state} update={update} onLogged={(m) => { setToast(`[Training recorded. ${m}]`); setTab('system') }} />}
        {tab === 'nutrition' && <NutritionTab s={state} />}
        {tab === 'progress' && <ProgressTab s={state} update={update} />}
        {tab === 'hunter' && <HunterTab s={state} update={update} commit={commit} account={account} wipe={wipe} />}
      </main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-sky-200/30 bg-[#020617]/90 shadow-[0_-8px_24px_rgba(37,99,235,.18)] backdrop-blur" aria-label="Main">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map((t) => (
            <button key={t.id} data-sfx="tab" onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
              className={`relative flex h-14 flex-col items-center justify-center gap-1 ${tab === t.id ? 'text-white' : 'text-mute'}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                style={tab === t.id ? { filter: 'drop-shadow(0 0 6px rgba(96,165,250,1))' } : undefined}><path d={t.icon} /></svg>
              <span className="sys-title text-[10px]">{t.label}</span>
              {tab === t.id && <span className="absolute top-0 h-0.5 w-8 bg-sky-200 shadow-[0_0_10px_#60a5fa]" />}
            </button>
          ))}
        </div>
      </nav>
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4" role="status">
          <div className="sys-panel anim-open max-w-sm px-4 py-3 text-center text-sm text-white">{toast}</div>
        </div>
      )}
      {booting && state.profile.acceptedTermsAt && <BootScreen s={state} uid={uid} today={todayKey()} onDone={() => setBooting(false)} />}
      {!booting && flameUp !== null && <FlameTierUp tier={FLAME_TIERS[flameUp]} streak={state.streak} onClose={() => setFlameUp(null)} />}
      {!booting && flameUp === null && ceremony && ceremony.kind !== 'questClear' && <CeremonyOverlay c={ceremony} units={state.profile.units} onClose={() => update(dismissCeremony)} />}
    </div>
  )
}

const PULL_TRIGGER = 70

/** Pull down at the top of a screen to reload the app (fetches updates and cloud saves). */
function usePullToRefresh(enabled: boolean) {
  const [dist, setDist] = useState(0)
  const [loading, setLoading] = useState(false)
  const start = useRef<number | null>(null)
  const ready = useRef(false)
  useEffect(() => {
    if (!enabled) return
    const down = (e: TouchEvent) => { start.current = window.scrollY <= 0 ? e.touches[0].clientY : null }
    const move = (e: TouchEvent) => {
      if (start.current === null) return
      const dy = e.touches[0].clientY - start.current
      if (dy <= 0 || window.scrollY > 0) { setDist(0); return }
      const d = Math.min(110, dy * 0.45)
      if (d >= PULL_TRIGGER && !ready.current) play('select')
      ready.current = d >= PULL_TRIGGER
      setDist(d)
    }
    const up = () => {
      if (ready.current) {
        setLoading(true); setDist(PULL_TRIGGER); play('next')
        setTimeout(() => window.location.reload(), 450)
      } else setDist(0)
      start.current = null; ready.current = false
    }
    window.addEventListener('touchstart', down, { passive: true })
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', up)
    return () => { window.removeEventListener('touchstart', down); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up) }
  }, [enabled])
  return { dist, loading }
}

function PullIndicator({ dist, loading }: { dist: number; loading: boolean }) {
  if (!dist && !loading) return null
  const ready = dist >= PULL_TRIGGER
  return (
    <div className={`ptr flex flex-col items-center ${ready ? 'ready' : ''} ${loading ? 'loading' : ''}`} style={{ top: `calc(env(safe-area-inset-top) + 52px + ${dist / 3}px)`, opacity: Math.min(1, dist / 40) }}>
      <svg className="ptr-icon text-sky-200" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: loading ? undefined : `rotate(${dist * 3}deg)` }}>
        <path d="M21 12a9 9 0 1 1-3-6.7 M21 4v5h-5" />
      </svg>
      <span className="sys-title mt-1 text-[10px] text-glow">{loading ? 'Syncing…' : ready ? 'Release to sync' : 'Pull to sync'}</span>
    </div>
  )
}
