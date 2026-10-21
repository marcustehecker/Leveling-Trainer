// Shadow Army: the System tab panel and the full army gallery.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { canGuardStreak, describeBonus, describeSource, SHADOW, SHADOWS, shadowLevel } from '../core/shadows'
import type { GameState } from '../core/types'
import { todayKey } from '../store'
import { Btn, Corners, Panel } from './components'
import { ShadowSilhouette } from './Cutscene'

export function ShadowArmyPanel({ s }: { s: GameState }) {
  const [open, setOpen] = useState(false)
  const army = s.shadows ?? {}
  const owned = SHADOWS.filter((x) => army[x.id])
  return (
    <Panel title="Shadow Army">
      <div className="flex items-center justify-center gap-1 py-1">
        {owned.length === 0
          ? SHADOWS.slice(0, 5).map((x) => <ShadowSilhouette key={x.id} icon={x.icon} size={30} locked />)
          : owned.slice(-6).map((x) => <ShadowSilhouette key={x.id} icon={x.icon} size={34} />)}
      </div>
      <p className="mt-2 text-center text-sm text-sky-100">
        {owned.length === 0 ? '[No shadows yet. Defeat a Dungeon Raid boss to raise your first.]' : `[${owned.length} of ${SHADOWS.length} shadows command your army.]`}
      </p>
      <Btn className="mt-3 w-full" variant="rare" onClick={() => setOpen(true)}>Open Army</Btn>
      {open && <ArmySheet s={s} onClose={() => setOpen(false)} />}
    </Panel>
  )
}

function ArmySheet({ s, onClose }: { s: GameState; onClose: () => void }) {
  const army = s.shadows ?? {}
  const today = todayKey()
  const [sel, setSel] = useState<string | null>(null)
  const pick = SHADOWS.find((x) => x.id === sel)
  useEffect(() => { if (sel) document.getElementById('shadow-detail')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [sel])
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#03010c]/95 backdrop-blur" role="dialog" aria-modal="true" aria-label="Shadow Army">
      <div className="safe-top safe-bottom mx-auto max-w-md px-4 pb-8">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#03010c]/90 py-3 backdrop-blur">
          <span className="sys-title glow-text text-lg text-violet-100">Shadow Army</span>
          <Btn variant="ghost" sfx="back" onClick={onClose}>Close</Btn>
        </div>
        <p className="mb-4 text-center text-xs text-mute">Shadows rise from Dungeon Raid bosses and milestones. They level up as you train what they're tied to, and their bonuses grow with them.</p>
        <div className="grid grid-cols-3 gap-2.5">
          {SHADOWS.map((x, i) => {
            const st = army[x.id]
            return (
              <button key={x.id} type="button" data-sfx="select" onClick={() => setSel(x.id)}
                className={`anim-rise flex flex-col items-center rounded border px-1 pb-2 pt-3 ${st ? 'border-violet-400/40 bg-violet-950/30 shadow-[0_0_14px_rgba(124,58,237,.25)]' : 'border-slate-800 bg-slate-950/40'}`}
                style={{ animationDelay: `${i * 40}ms` }}>
                <ShadowSilhouette icon={x.icon} size={44} locked={!st} />
                <span className={`mt-2 text-xs ${st ? 'text-white' : 'text-mute'}`}>{st ? x.name : '???'}</span>
                <span className="sys-title text-[9px] text-violet-300">{st ? `Lv ${shadowLevel(st.xp)} · ${x.grade}` : x.grade}</span>
              </button>
            )
          })}
        </div>
        {pick && (
          <div id="shadow-detail" className="sys-panel rare anim-open mt-5 px-4 pb-4 pt-4 text-center" key={pick.id}>
            <Corners />
            <ShadowSilhouette icon={pick.icon} size={80} locked={!army[pick.id]} />
            <div className="sys-title glow-text mt-2 text-xl text-white">{army[pick.id] ? pick.name : 'Unknown Shadow'}</div>
            <div className="sys-title text-[10px] text-violet-300">{pick.grade}-Grade</div>
            {army[pick.id] ? (
              <>
                <p className="mt-2 text-sm text-sky-100">{pick.lore}</p>
                <p className="mt-2 text-sm text-violet-200">{describeBonus(pick, army[pick.id].xp)}</p>
                <LevelBar xp={army[pick.id].xp} />
                {pick.bonus.kind === 'guard' && <p className="mt-2 text-xs text-mute">{canGuardStreak(s, today) ? 'Ready to guard your streak.' : `Guard used on ${s.shadowGuardUsed}. Recharging.`}</p>}
                <p className="mt-2 text-[11px] text-mute">Joined {army[pick.id].since}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-mute">To unlock: {describeSource(pick)}.</p>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

function LevelBar({ xp }: { xp: number }) {
  const lv = shadowLevel(xp)
  if (lv >= SHADOW.MAX_LEVEL) return <p className="mt-2 sys-title text-xs text-violet-200">Max level</p>
  const from = 40 * (lv - 1) ** 2
  const to = 40 * lv ** 2
  return (
    <div className="mt-3 text-left">
      <div className="mb-1 flex justify-between text-[10px] text-mute"><span className="sys-title">Lv {lv}</span><span>{xp - from} / {to - from} shadow XP</span></div>
      <div className="h-1.5 overflow-hidden rounded bg-violet-950"><div className="h-full bg-gradient-to-r from-violet-700 to-violet-300" style={{ width: `${((xp - from) / (to - from)) * 100}%` }} /></div>
    </div>
  )
}
