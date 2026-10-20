// Streak flame: grows and changes color at each streak milestone.
import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { play } from '../sfx'

export interface FlameTier {
  at: number
  name: string
  /** Outer, middle and core colors. */
  colors: [string, string, string]
  glow: string
  scale: number
  sparks: number
  twin?: boolean
  ring?: boolean
  crown?: boolean
  rays?: boolean
}

export const FLAME_TIERS: FlameTier[] = [
  { at: 0, name: 'Unlit', colors: ['#334155', '#475569', '#94a3b8'], glow: '#64748b', scale: 0.55, sparks: 0 },
  { at: 5, name: 'Spark', colors: ['#c2410c', '#f97316', '#fde68a'], glow: '#f97316', scale: 0.65, sparks: 0 },
  { at: 10, name: 'Kindled', colors: ['#b91c1c', '#f97316', '#fef3c7'], glow: '#fb923c', scale: 0.72, sparks: 2 },
  { at: 25, name: 'Blaze', colors: ['#991b1b', '#ef4444', '#fde047'], glow: '#ef4444', scale: 0.8, sparks: 4 },
  { at: 50, name: 'Inferno', colors: ['#7f1d1d', '#dc2626', '#fef08a'], glow: '#f43f5e', scale: 0.86, sparks: 6, twin: true },
  { at: 75, name: 'Blue Flame', colors: ['#1e3a8a', '#3b82f6', '#e0f2fe'], glow: '#3b82f6', scale: 0.9, sparks: 6, twin: true },
  { at: 100, name: 'Azure Inferno', colors: ['#0c4a6e', '#06b6d4', '#ffffff'], glow: '#22d3ee', scale: 0.94, sparks: 8, twin: true, ring: true },
  { at: 150, name: 'Violet Hellfire', colors: ['#4c1d95', '#a855f7', '#f5d0fe'], glow: '#a855f7', scale: 0.97, sparks: 10, twin: true, ring: true },
  { at: 200, name: 'Shadow Flame', colors: ['#020617', '#6d28d9', '#c4b5fd'], glow: '#7c3aed', scale: 1, sparks: 12, twin: true, ring: true, crown: true },
  { at: 365, name: "Monarch's Flame", colors: ['#b45309', '#facc15', '#ffffff'], glow: '#fbbf24', scale: 1.05, sparks: 14, twin: true, ring: true, crown: true, rays: true },
]

export function flameTierIndex(streak: number) {
  let i = 0
  FLAME_TIERS.forEach((t, j) => { if (streak >= t.at) i = j })
  return i
}

const OUTER = 'M50 6 C58 24 78 34 78 62 C78 82 65 94 50 94 C35 94 22 82 22 62 C22 46 32 40 36 28 C40 38 44 40 46 40 C46 28 44 18 50 6 Z'
const INNER = 'M50 34 C55 46 66 52 66 68 C66 80 59 88 50 88 C41 88 34 80 34 68 C34 58 40 54 43 46 C45 52 48 54 49 54 C49 46 48 40 50 34 Z'
const CORE = 'M50 58 C53 64 58 68 58 76 C58 82 54 86 50 86 C46 86 42 82 42 76 C42 70 47 66 50 58 Z'

/** The flame graphic for a tier. */
export function Flame({ tier, size = 48, still }: { tier: FlameTier; size?: number; still?: boolean }) {
  const id = useId().replace(/:/g, '')
  const [o, m, c] = tier.colors
  return (
    <span className={`flame ${still ? 'still' : ''}`} style={{ width: size, height: size, ['--glow' as string]: tier.glow }} aria-hidden>
      {tier.rays && <span className="flame-rays" />}
      {tier.ring && <span className="flame-ring" />}
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ transform: `scale(${tier.scale})` }}>
        <defs>
          <linearGradient id={`fo${id}`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={m} /><stop offset="1" stopColor={o} /></linearGradient>
          <linearGradient id={`fi${id}`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={c} /><stop offset="1" stopColor={m} /></linearGradient>
        </defs>
        {tier.twin && <path d={OUTER} fill={o} opacity=".55" className="flame-twin" />}
        <path d={OUTER} fill={`url(#fo${id})`} className="flame-outer" />
        <path d={INNER} fill={`url(#fi${id})`} className="flame-inner" />
        <path d={CORE} fill={c} className="flame-core" />
        {tier.crown && <path d="M36 14 L40 4 L45 11 L50 1 L55 11 L60 4 L64 14 Z" fill={c} stroke={m} strokeWidth="1.5" className="flame-crown" />}
      </svg>
      {Array.from({ length: still ? 0 : tier.sparks }, (_, i) => (
        <i key={i} className="flame-spark" style={{ left: `${30 + ((i * 37) % 40)}%`, animationDelay: `${(i * 0.37) % 2.2}s`, background: i % 2 ? c : m }} />
      ))}
    </span>
  )
}

/** Streak readout for the Status window. Tap to see every tier. */
export function StreakBadge({ streak, best }: { streak: number; best: number }) {
  const [open, setOpen] = useState(false)
  const i = flameTierIndex(streak)
  const tier = FLAME_TIERS[i]
  const next = FLAME_TIERS[i + 1]
  return (
    <>
      <button type="button" data-sfx="select" onClick={() => setOpen(true)} className="flex flex-col items-center" aria-label={`Streak ${streak} days, ${tier.name}. Show flame tiers`}>
        <span className="flex items-end gap-1">
          <Flame tier={tier} size={30} />
          <span className="sys-title glow-text text-lg text-white">{streak}</span>
        </span>
        <span className="sys-title mt-0.5 text-[10px]" style={{ color: tier.glow }}>{tier.name}</span>
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#01040f]/85 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Streak flames" onClick={() => setOpen(false)}>
          <div className="sys-panel anim-open max-h-[85vh] w-full max-w-sm overflow-y-auto px-5 pb-5 pt-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center">
              <Flame tier={tier} size={96} />
              <div className="sys-title glow-text mt-1 text-xl text-white">{streak} day streak</div>
              <div className="text-xs text-mute">{next ? `${next.at - streak} more day${next.at - streak === 1 ? '' : 's'} to ${next.name}` : 'The highest flame. Keep it burning.'} · Best {best}</div>
            </div>
            <ul className="mt-4 grid gap-1.5">
              {FLAME_TIERS.slice(1).map((t) => {
                const got = streak >= t.at
                return (
                  <li key={t.at} className={`flex items-center gap-3 rounded border px-3 py-1.5 ${got ? 'border-sky-300/30 bg-sky-500/5' : 'border-sky-900/40 opacity-50'}`}>
                    <Flame tier={t} size={30} still={!got} />
                    <span className="flex-1 text-sm" style={{ color: got ? t.glow : undefined }}>{t.name}</span>
                    <span className="sys-title text-xs text-mute">{t.at}{t.at === 365 ? '+' : ''} days</span>
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-center text-[11px] text-mute">Your streak grows every day you train or rest as planned. Missing a planned day resets it. Sick days don't break it.</p>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

/** Full-screen moment when the flame reaches a new tier. */
export function FlameTierUp({ tier, streak, onClose }: { tier: FlameTier; streak: number; onClose: () => void }) {
  useEffect(() => { play('rankup') }, [])
  return createPortal(
    <div className="cs-root fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden" style={{ ['--tint' as string]: tier.glow }} role="dialog" aria-modal="true" aria-label={`${tier.name} reached`} onClick={onClose}>
      <div className="cs-bg absolute inset-0" />
      <div className="cs-flash absolute inset-0" />
      <div className="relative cs-hero"><Flame tier={tier} size={190} /></div>
      <div className="relative cs-sub sys-title mt-2 text-sm text-mute">{streak} day streak</div>
      <div className="relative cs-slam sys-title glow-text mt-1 text-3xl text-white">{tier.name}</div>
      <div className="relative cs-sub-late mt-10 sys-title text-xs text-mute">Tap to continue</div>
    </div>,
    document.body,
  )
}
