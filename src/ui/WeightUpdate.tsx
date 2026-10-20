// Body weight entry, limited to one update a week.
import { useState } from 'react'
import { logBodyWeight, weightLockedUntil } from '../core/engine'
import { isTrainingDay } from '../core/plan'
import { waterAmount, waterGlasses } from '../core/quests'
import type { GameState } from '../core/types'
import { fromDisplayWeight, nowIso, todayKey, toDisplayWeight, weightUnit } from '../store'
import { Btn } from './components'

export function WeightUpdate({ s, update }: { s: GameState; update: (fn: (s: GameState) => GameState) => void }) {
  const units = s.profile.units
  const today = todayKey()
  const [val, setVal] = useState('')
  const locked = weightLockedUntil(s, today)
  const current = s.bodyWeights?.[s.bodyWeights.length - 1]?.kg ?? s.profile.weightKg
  const n = Number(val)
  const ok = val !== '' && Number.isFinite(n) && n > (units === 'imperial' ? 50 : 25) && n < (units === 'imperial' ? 700 : 320)
  const glasses = waterGlasses(current, false)
  const unlock = locked && new Date(`${locked}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-mute">Current weight</span>
        <span className="text-white">{current ? `${toDisplayWeight(current, units)} ${weightUnit(units)}` : 'Not set'}</span>
      </div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="shrink-0 text-mute">Water goal</span>
        <span className="text-right text-white">{glasses} glasses ({waterAmount(glasses, units)}){isTrainingDay(s.profile, today) ? ', +2 today' : ''}</span>
      </div>
      {locked ? (
        <p className="rounded border border-sky-900/50 px-3 py-2 text-center text-xs text-mute">[Weight can be updated once a week. Next update: {unlock}.]</p>
      ) : (
        <div className="flex items-end gap-2">
          <label className="grid flex-1 gap-1 text-xs text-mute">New weight ({weightUnit(units)})
            <input inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} placeholder={current ? String(toDisplayWeight(current, units)) : units === 'imperial' ? 'e.g. 170' : 'e.g. 75'}
              className="h-11 rounded border border-edge bg-panel-2 px-3 text-base text-ink outline-none focus:border-sys" />
          </label>
          <Btn disabled={!ok} sfx="complete" onClick={() => { update((x) => logBodyWeight(x, fromDisplayWeight(n, units), today, nowIso())); setVal('') }}>Update</Btn>
        </div>
      )}
    </div>
  )
}
