import { useEffect, useState } from 'react'
import { dismissCeremony } from './core/engine'
import { useAccount, useGame, type SyncStatus } from './store'
import { cloudEnabled, type Account } from './cloud'
import { Login } from './screens/Login'
import { TermsConsent } from './screens/Legal'
import { Corners } from './ui/components'
import { nowIso } from './store'
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
  const [tab, setTab] = useState<Tab>('system')
  const [toast, setToast] = useState<string | null>(null)

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
      <main className="relative z-10 px-4 pb-28 pt-5">
        {tab === 'system' && <SystemTab s={state} update={update} goTraining={() => setTab('training')} />}
        {tab === 'training' && <TrainingTab s={state} update={update} onLogged={(m) => { setToast(`[Training recorded. ${m}]`); setTab('system') }} />}
        {tab === 'nutrition' && <NutritionTab s={state} />}
        {tab === 'progress' && <ProgressTab s={state} />}
        {tab === 'hunter' && <HunterTab s={state} update={update} commit={commit} account={account} wipe={wipe} />}
      </main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-sky-200/30 bg-[#020617]/90 shadow-[0_-8px_24px_rgba(37,99,235,.18)] backdrop-blur" aria-label="Main">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
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
      {ceremony && ceremony.kind !== 'questClear' && <CeremonyOverlay c={ceremony} onClose={() => update(dismissCeremony)} />}
    </div>
  )
}
