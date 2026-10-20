// Streak flame: grows and changes color at each streak milestone.
import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { play } from '../sfx'

export interface FlameTier {
  at: number
  name: string
  /** Dark edge, body, bright inner and core colors. */
  colors: [string, string, string, string]
  glow: string
  /** Number of flame tongues and how wide and tall the fire spreads (0 to 1). */
  tongues: number
  spread: number
  height: number
  embers: number
  shards?: boolean
  ring?: 'faint' | 'bright'
  smoke?: boolean
  star?: boolean
}

// Order follows Marcus's reference sheet, read left to right, top to bottom.
export const FLAME_TIERS: FlameTier[] = [
  { at: 0, name: 'Unlit', colors: ['#1e293b', '#334155', '#64748b', '#cbd5e1'], glow: '#64748b', tongues: 3, spread: 0.32, height: 0.55, embers: 0 },
  { at: 5, name: 'Spark', colors: ['#9a3412', '#f97316', '#fbbf24', '#fff7d6'], glow: '#f97316', tongues: 3, spread: 0.36, height: 0.68, embers: 2 },
  { at: 10, name: 'Kindled', colors: ['#991b1b', '#f4511e', '#fb923c', '#fff1c2'], glow: '#fb6a1e', tongues: 5, spread: 0.5, height: 0.78, embers: 4 },
  { at: 25, name: 'Blaze', colors: ['#7f1d1d', '#e8341c', '#fb7a2c', '#ffe9a8'], glow: '#ef4423', tongues: 7, spread: 0.66, height: 0.92, embers: 7 },
  { at: 50, name: 'Emerald Flame', colors: ['#064e3b', '#10b981', '#5eead4', '#ecfdf5'], glow: '#2dd4a7', tongues: 7, spread: 0.62, height: 0.86, embers: 6, shards: true, ring: 'faint' },
  { at: 75, name: 'Azure Flame', colors: ['#1e3a8a', '#2563eb', '#60a5fa', '#eff6ff'], glow: '#3b82f6', tongues: 7, spread: 0.62, height: 0.9, embers: 6, shards: true, ring: 'faint' },
  { at: 100, name: 'Violet Flame', colors: ['#3b0764', '#8b3df0', '#c084fc', '#faf5ff'], glow: '#a855f7', tongues: 8, spread: 0.68, height: 0.92, embers: 7, shards: true, ring: 'faint' },
  { at: 150, name: 'Solar Flame', colors: ['#92400e', '#f59e0b', '#fcd34d', '#fffbeb'], glow: '#fbbf24', tongues: 9, spread: 0.72, height: 0.96, embers: 9, shards: true, ring: 'bright' },
  { at: 200, name: 'Crimson Hellfire', colors: ['#450a0a', '#dc2626', '#f87171', '#fff1f2'], glow: '#ef4444', tongues: 9, spread: 0.76, height: 0.96, embers: 8, smoke: true },
  { at: 365, name: "Monarch's Flame", colors: ['#1e1b4b', '#6d28d9', '#a78bfa', '#f5f3ff'], glow: '#7c3aed', tongues: 9, spread: 0.8, height: 0.98, embers: 10, shards: true, ring: 'bright', smoke: true, star: true },
]

export function flameTierIndex(streak: number) {
  let i = 0
  FLAME_TIERS.forEach((t, j) => { if (streak >= t.at) i = j })
  return i
}

const BASE = 92
const r = (n: number) => Math.round(n * 10) / 10
/** One curved, hooked tongue of fire rising from `base`. */
function tongue(cx: number, w: number, h: number, lean: number, base = BASE) {
  const top = base - h
  const hook = lean >= 0 ? 1 : -1
  return `M${r(cx - w)} ${r(base)} C${r(cx - w * 1.15)} ${r(base - h * 0.4)} ${r(cx + lean * 0.9 - hook * w * 0.9)} ${r(base - h * 0.62)} ${r(cx + lean)} ${r(top)} `
    + `C${r(cx + lean * 0.6 + hook * w * 0.2)} ${r(base - h * 0.55)} ${r(cx + w * 1.1)} ${r(base - h * 0.42)} ${r(cx + w)} ${r(base)} Z`
}

/** Rounded bulb the tongues grow out of, so the fire has a soft base. */
function bulb(t: FlameTier, scale = 1) {
  const B = (12 + t.spread * 22) * scale
  const y = BASE - 10
  return `M${r(50 - B)} ${y} C${r(50 - B)} ${BASE + 3} ${r(50 + B)} ${BASE + 3} ${r(50 + B)} ${y} C${r(50 + B * 0.5)} ${r(y - 16 * scale)} ${r(50 - B * 0.5)} ${r(y - 16 * scale)} ${r(50 - B)} ${y} Z`
}

/** Tongues placed symmetrically, tallest in the middle; outer ones start higher on the bulb and lean outward. */
function tongues(t: FlameTier, scale: number) {
  const out: { d: string; i: number }[] = []
  const n = t.tongues
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0 : (i / (n - 1)) * 2 - 1 // -1..1
    const x = 50 + k * t.spread * 34
    const h = (t.height * 80 * (1 - Math.abs(k) * 0.6) + (i % 2 ? 5 : 0)) * scale
    const w = (8 + (1 - Math.abs(k)) * 8) * scale * (0.75 + t.spread * 0.45)
    const lean = k * 12 + (i % 3 === 1 ? -5 : i % 3 === 2 ? 5 : 0)
    out.push({ d: tongue(x, w, h, lean, BASE - 6 - Math.abs(k) * 8 * scale), i })
  }
  // Center tongue last so it draws on top.
  return out.sort((a, b) => Math.abs(b.i - (n - 1) / 2) - Math.abs(a.i - (n - 1) / 2))
}

const SHARD = 'M0 -4 L1.6 0 L0 4 L-1.6 0 Z'

/** The flame graphic for a tier. */
export function Flame({ tier, size = 48, still }: { tier: FlameTier; size?: number; still?: boolean }) {
  const id = useId().replace(/:/g, '')
  const [edge, body, inner, core] = tier.colors
  const anim = (i: number, base: number) => (still ? undefined : { animationDuration: `${base + (i % 4) * 0.23}s`, animationDelay: `${-(i * 0.37)}s` })
  const shards = tier.shards ? [[18, 30], [82, 26], [12, 52], [88, 48], [30, 12], [70, 14]] : []
  return (
    <span className={`flame ${still ? 'still' : ''}`} style={{ width: size, height: size, ['--glow' as string]: tier.glow }} aria-hidden>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <linearGradient id={`fb${id}`} gradientUnits="userSpaceOnUse" x1="50" y1={BASE} x2="50" y2={BASE - 84 * tier.height}><stop offset="0" stopColor={inner} /><stop offset=".45" stopColor={body} /><stop offset="1" stopColor={edge} /></linearGradient>
          <linearGradient id={`fi${id}`} gradientUnits="userSpaceOnUse" x1="50" y1={BASE} x2="50" y2={BASE - 60 * tier.height}><stop offset="0" stopColor={core} /><stop offset=".35" stopColor={inner} /><stop offset="1" stopColor={inner} stopOpacity="0" /></linearGradient>
          <filter id={`fs${id}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6" /></filter>
          <filter id={`fe${id}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".6" /></filter>
          <radialGradient id={`fg${id}`} cx=".5" cy=".9" r=".6"><stop offset="0" stopColor={core} stopOpacity=".9" /><stop offset=".4" stopColor={inner} stopOpacity=".35" /><stop offset="1" stopColor={body} stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="50" cy="86" rx={22 + tier.spread * 26} ry="12" fill={`url(#fg${id})`} />
        {tier.smoke && tongues({ ...tier, spread: tier.spread * 1.15, height: tier.height * 0.92 }, 1.12).map((t) => (
          <path key={`s${t.i}`} d={t.d} fill={edge} opacity=".75" className="flame-tongue" style={anim(t.i + 2, 2.4)} />
        ))}
        {tier.ring && <ellipse cx="50" cy="70" rx="44" ry="10" fill="none" stroke={tier.ring === 'bright' ? core : inner} strokeWidth={tier.ring === 'bright' ? 1.6 : 1} opacity={tier.ring === 'bright' ? 0.9 : 0.6} className="flame-halo" strokeDasharray="160 40" />}
        <g filter={`url(#fe${id})`}>
          <path d={bulb(tier)} fill={`url(#fb${id})`} />
          {tongues(tier, 1).map((t) => <path key={`b${t.i}`} d={t.d} fill={`url(#fb${id})`} className="flame-tongue" style={anim(t.i, 1.5)} />)}
        </g>
        <g filter={`url(#fs${id})`}>
          {tongues({ ...tier, spread: tier.spread * 0.45, tongues: 3 }, 0.7).map((t) => (
            <path key={`i${t.i}`} d={t.d} fill={`url(#fi${id})`} className="flame-tongue" style={anim(t.i + 1, 1.1)} />
          ))}
          <path d={tongue(50, 9, 30 * tier.height + 8, 2, BASE - 3)} fill={core} opacity=".95" className="flame-tongue" style={anim(0, 0.9)} />
        </g>
        {shards.map(([x, y], i) => <path key={`c${i}`} d={SHARD} transform={`translate(${x} ${y}) rotate(${i % 2 ? 20 : -20})`} fill={inner} className="flame-shard" style={still ? undefined : { animationDelay: `${-i * 0.5}s` }} />)}
        {tier.star && (
          <g transform="translate(50 6)" className="flame-star">
            <path d="M0 -9 L1.8 -1.8 L9 0 L1.8 1.8 L0 9 L-1.8 1.8 L-9 0 L-1.8 -1.8 Z" fill={core} />
            <path d="M0 -14 L0 14 M-5 0 L5 0" stroke={core} strokeWidth=".6" opacity=".8" />
          </g>
        )}
      </svg>
      {Array.from({ length: still ? 0 : tier.embers }, (_, i) => (
        <i key={i} className="flame-spark" style={{ left: `${22 + ((i * 37) % 56)}%`, animationDelay: `${(i * 0.41) % 2.4}s`, background: i % 2 ? core : inner, ['--dx' as string]: `${(i % 3) * 6 - 6}px` }} />
      ))}
    </span>
  )
}

/** The decorative line with a diamond that sits under each flame, as on the reference. */
export function FlameBase({ tier, width = 90 }: { tier: FlameTier; width?: number }) {
  return (
    <svg width={width} height="8" viewBox="0 0 90 8" aria-hidden>
      <path d="M2 4 H38 M52 4 H88" stroke={tier.colors[1]} strokeWidth="1" opacity=".8" />
      <path d="M45 0.5 L48.5 4 L45 7.5 L41.5 4 Z" fill={tier.colors[2]} />
    </svg>
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
              <Flame tier={tier} size={110} />
              <FlameBase tier={tier} />
              <div className="sys-title glow-text mt-1 text-xl text-white">{streak} day streak</div>
              <div className="text-xs text-mute">{next ? `${next.at - streak} more day${next.at - streak === 1 ? '' : 's'} to ${next.name}` : 'The highest flame. Keep it burning.'} · Best {best}</div>
            </div>
            <ul className="mt-4 grid gap-1.5">
              {FLAME_TIERS.slice(1).map((t) => {
                const got = streak >= t.at
                return (
                  <li key={t.at} className={`flex items-center gap-3 rounded border px-3 py-1.5 ${got ? 'border-sky-300/30 bg-sky-500/5' : 'border-sky-900/40 opacity-50'}`}>
                    <Flame tier={t} size={34} still={!got} />
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
      <div className="relative cs-hero flex flex-col items-center"><Flame tier={tier} size={210} /><FlameBase tier={tier} width={180} /></div>
      <div className="relative cs-sub sys-title mt-2 text-sm text-mute">{streak} day streak</div>
      <div className="relative cs-slam sys-title glow-text mt-1 text-3xl text-white">{tier.name}</div>
      <div className="relative cs-sub-late mt-10 sys-title text-xs text-mute">Tap to continue</div>
    </div>,
    document.body,
  )
}
