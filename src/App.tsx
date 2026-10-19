import { useEffect, useState } from 'react'
import { dismissCeremony } from './core/engine'
import { useGame } from './store'
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

export default function App() {
  const { state, ready, commit, update } = useGame()
  const [tab, setTab] = useState<Tab>('system')
  const [toast, setToast] = useState<string | null>(null)

  const ceremony = state?.ceremonies[0]
  // Quest clears are a light toast, not a full-screen notification.
  useEffect(() => {
    if (ceremony?.kind === 'questClear') {
      setToast(`[SYSTEM] Quest complete: ${ceremony.title}${ceremony.xp ? ` +${ceremony.xp} XP` : ''}`)
      update(dismissCeremony)
    }
  }, [ceremony, update])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => { window.scrollTo(0, 0) }, [tab])

  if (!ready) return <div className="flex h-full items-center justify-center"><span className="sys-title anim-flicker text-glow">[SYSTEM] Loading…</span></div>
  if (!state) return <Onboarding onDone={(s) => { commit(s); setTab('system') }} />

  return (
    <div className="mx-auto min-h-full max-w-md">
      <header className="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-edge/60 bg-void/90 px-4 pb-3 backdrop-blur">
        <span className="sys-title glow-text text-lg text-glow">The System</span>
        <span className="sys-title text-xs text-mute">{TABS.find((t) => t.id === tab)?.label}</span>
      </header>
      <main className="px-4 pb-28 pt-4">
        {tab === 'system' && <SystemTab s={state} update={update} goTraining={() => setTab('training')} />}
        {tab === 'training' && <TrainingTab s={state} update={update} onLogged={(m) => { setToast(`[SYSTEM] Training recorded. ${m}`); setTab('system') }} />}
        {tab === 'nutrition' && <NutritionTab s={state} />}
        {tab === 'progress' && <ProgressTab s={state} />}
        {tab === 'hunter' && <HunterTab s={state} update={update} commit={commit} />}
      </main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-edge bg-void/95 backdrop-blur" aria-label="Main">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
              className={`flex h-14 flex-col items-center justify-center gap-1 ${tab === t.id ? 'text-glow' : 'text-mute'}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                style={tab === t.id ? { filter: 'drop-shadow(0 0 6px rgba(34,211,238,.8))' } : undefined}><path d={t.icon} /></svg>
              <span className="sys-title text-[10px]">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4" role="status">
          <div className="sys-panel anim-rise max-w-sm px-4 py-3 text-sm text-ink">{toast}</div>
        </div>
      )}
      {ceremony && ceremony.kind !== 'questClear' && <CeremonyOverlay c={ceremony} onClose={() => update(dismissCeremony)} />}
    </div>
  )
}
