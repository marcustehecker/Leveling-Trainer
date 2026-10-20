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
  /** The 365+ tier: magic circle, lightning, orbits, crown and shockwaves. */
  monarch?: boolean
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
  { at: 365, name: "Monarch's Flame", colors: ['#0b0420', '#5b21b6', '#a78bfa', '#ffffff'], glow: '#8b5cf6', tongues: 9, spread: 0.72, height: 1, embers: 18, shards: true, smoke: true, star: true, monarch: true },
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
        {tier.monarch && <MonarchBack id={id} still={still} />}
        <g transform={tier.monarch ? 'translate(9 14) scale(.82)' : undefined}>
        <ellipse cx="50" cy="86" rx={22 + tier.spread * 26} ry="12" fill={`url(#fg${id})`} />
        {tier.smoke && tongues({ ...tier, spread: tier.spread * 1.15, height: tier.height * (tier.monarch ? 0.8 : 0.92) }, 1.12).map((t) => (
          <path key={`s${t.i}`} d={t.d} fill={edge} opacity={tier.monarch ? 0.95 : 0.75} stroke={tier.monarch ? '#7c3aed' : undefined} strokeWidth={tier.monarch ? 0.8 : undefined} className="flame-tongue" style={anim(t.i + 2, 2.4)} />
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
        </g>
        {shards.map(([x, y], i) => <path key={`c${i}`} d={SHARD} transform={`translate(${x} ${y}) rotate(${i % 2 ? 20 : -20})`} fill={inner} className="flame-shard" style={still ? undefined : { animationDelay: `${-i * 0.5}s` }} />)}
        {tier.star && !tier.monarch && (
          <g transform="translate(50 6)" className="flame-star">
            <path d="M0 -9 L1.8 -1.8 L9 0 L1.8 1.8 L0 9 L-1.8 1.8 L-9 0 L-1.8 -1.8 Z" fill={core} />
            <path d="M0 -14 L0 14 M-5 0 L5 0" stroke={core} strokeWidth=".6" opacity=".8" />
          </g>
        )}
        {tier.monarch && <MonarchFront still={still} />}
      </svg>
      {Array.from({ length: still ? 0 : tier.embers }, (_, i) => (
        <i key={i} className="flame-spark" style={{ left: `${22 + ((i * 37) % 56)}%`, animationDelay: `${(i * 0.41) % 2.4}s`, background: i % 2 ? core : inner, ['--dx' as string]: `${(i % 3) * 6 - 6}px` }} />
      ))}
    </span>
  )
}

const CYAN = '#67e8f9'
const RUNES = Array.from({ length: 24 }, (_, i) => i)
const BOLTS = ['M30 40 L26 50 L31 52 L24 66', 'M71 34 L76 46 L70 48 L78 62', 'M50 22 L46 30 L52 32 L47 42', 'M18 62 L12 68 L17 70 L9 78', 'M83 60 L89 67 L84 69 L92 77']

/** Monarch layers drawn behind the fire: aura rays, a spinning magic circle and shockwaves. */
function MonarchBack({ id, still }: { id: string; still?: boolean }) {
  return (
    <g>
      <defs>
        <radialGradient id={`ma${id}`} cx=".5" cy=".55" r=".5"><stop offset="0" stopColor="#c4b5fd" stopOpacity=".55" /><stop offset=".5" stopColor="#6d28d9" stopOpacity=".25" /><stop offset="1" stopColor="#1e1b4b" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="50" cy="52" r="58" fill={`url(#ma${id})`} className={still ? '' : 'mon-breathe'} />
      <g className={still ? '' : 'mon-rays'} style={{ transformOrigin: '50px 52px' }} opacity=".55">
        {Array.from({ length: 16 }, (_, i) => (
          <path key={i} d="M50 52 L48.6 -12 L51.4 -12 Z" fill={i % 2 ? '#a78bfa' : CYAN} opacity={i % 2 ? 0.5 : 0.3} transform={`rotate(${i * 22.5} 50 52)`} />
        ))}
      </g>
      {/* Magic circle lying flat under the fire */}
      <g transform="translate(50 88) scale(1 .32)">
        <g className={still ? '' : 'mon-spin'}>
          <circle r="46" fill="none" stroke="#a78bfa" strokeWidth="1.6" />
          <circle r="40" fill="none" stroke={CYAN} strokeWidth=".8" strokeDasharray="2 3" />
          <circle r="28" fill="none" stroke="#a78bfa" strokeWidth="1" />
          <path d="M0 -40 L34.6 20 L-34.6 20 Z M0 40 L-34.6 -20 L34.6 -20 Z" fill="none" stroke="#c4b5fd" strokeWidth=".9" />
          {RUNES.map((i) => <rect key={i} x="-1" y="-45" width="2" height={i % 3 ? 3 : 5} fill={CYAN} transform={`rotate(${i * 15})`} />)}
        </g>
      </g>
      {!still && [0, 1, 2].map((i) => (
        <ellipse key={i} cx="50" cy="88" rx="20" ry="6" fill="none" stroke={i === 1 ? CYAN : '#c4b5fd'} strokeWidth="1.2" className="mon-wave" style={{ animationDelay: `${i * 0.8}s` }} />
      ))}
    </g>
  )
}

/** Monarch layers in front of the fire: orbit rings, lightning and a crown of light. */
function MonarchFront({ still }: { still?: boolean }) {
  const orbit = 'M6 58 A44 12 0 1 0 94 58 A44 12 0 1 0 6 58'
  return (
    <g>
      {[-22, 22].map((rot, i) => (
        <g key={rot} transform={`rotate(${rot} 50 58)`}>
          <path d={orbit} fill="none" stroke={i ? CYAN : '#c4b5fd'} strokeWidth="1" strokeDasharray="120 60" opacity=".85" className={still ? '' : 'flame-halo'} />
          {!still && (
            <circle r="2.2" fill="#fff" style={{ filter: `drop-shadow(0 0 3px ${i ? CYAN : '#a78bfa'})` }}>
              <animateMotion dur={i ? '2.6s' : '3.4s'} repeatCount="indefinite" path={orbit} keyPoints={i ? '1;0' : '0;1'} keyTimes="0;1" calcMode="linear" />
            </circle>
          )}
        </g>
      ))}
      {!still && BOLTS.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={i % 2 ? CYAN : '#e9d5ff'} strokeWidth="1.1" strokeLinejoin="round" className="mon-bolt" style={{ animationDelay: `${i * 0.47}s`, animationDuration: `${1.9 + i * 0.37}s` }} />
      ))}
      {/* Crown of light */}
      <g className={still ? '' : 'flame-star'}>
        <path d="M41 19 L42.5 11 L46.5 15.5 L50 8 L53.5 15.5 L57.5 11 L59 19 Z" fill="#f5f3ff" stroke="#a78bfa" strokeWidth=".7" />
        <circle cx="50" cy="15" r="1.1" fill={CYAN} />
      </g>
      <g transform="translate(50 -2)">
        <g className={still ? '' : 'mon-star'}>
          <path d="M0 -10 L1.8 -1.8 L10 0 L1.8 1.8 L0 10 L-1.8 1.8 L-10 0 L-1.8 -1.8 Z" fill="#fff" />
          <path d="M0 -17 V17 M-17 0 H17" stroke="#fff" strokeWidth=".5" opacity=".9" />
          <circle r="2.4" fill={CYAN} opacity=".8" />
        </g>
      </g>
    </g>
  )
}

/** The decorative line with a diamond that sits under each flame, as on the reference. */
export function FlameBase({ tier, width = 90 }: { tier: FlameTier; width?: number }) {
  if (tier.monarch) return (
    <svg width={width} height="12" viewBox="0 0 90 12" aria-hidden>
      <path d="M2 6 H34 M56 6 H88 M8 3 H30 M60 3 H82 M8 9 H30 M60 9 H82" stroke="#a78bfa" strokeWidth=".8" />
      <path d="M45 0 L51 6 L45 12 L39 6 Z" fill="#f5f3ff" stroke={CYAN} strokeWidth=".8" />
      <circle cx="36" cy="6" r="1.2" fill={CYAN} /><circle cx="54" cy="6" r="1.2" fill={CYAN} />
    </svg>
  )
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
      {tier.monarch && <div className="relative cs-sub-late sys-title glow-text mt-3 text-5xl text-violet-200" style={{ letterSpacing: '.4em', paddingLeft: '.4em' }}>Arise</div>}
      <div className="relative cs-sub-late mt-10 sys-title text-xs text-mute">Tap to continue</div>
    </div>,
    document.body,
  )
}
