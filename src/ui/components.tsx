import { useEffect, useState, type ReactNode } from 'react'
import type { RankId } from '../core/types'
import { play, type Sfx } from '../sfx'

export const RANK_COLOR: Record<RankId, string> = {
  E: '#94a3b8', D: '#34d399', C: '#38bdf8', B: '#6366f1', A: '#a855f7', S: '#f59e0b',
}

export const RANK_NAME: Record<RankId, string> = {
  E: 'Beginner Hunter', D: 'Developing Hunter', C: 'Intermediate Hunter', B: 'Advanced Hunter', A: 'Elite Hunter', S: 'Exceptional Hunter',
}

export function Corners() {
  return <><i className="sys-corner tl" /><i className="sys-corner tr" /><i className="sys-corner bl" /><i className="sys-corner br" /></>
}

/** A System window: framed glass panel with an optional title plaque on the top edge. */
export function Panel({ children, className = '', tone, title, right, open }: {
  children: ReactNode; className?: string; tone?: 'danger' | 'rare'; title?: string; right?: ReactNode; open?: boolean
}) {
  return (
    <section className={`sys-panel ${tone ?? ''} px-4 pb-4 ${title ? 'pt-0' : 'pt-4'} ${open ? 'anim-open' : ''} ${className}`}>
      <Corners />
      {title && (
        <header className="relative -mt-3.5 mb-3 flex items-center justify-center">
          <h2 className={`sys-plaque sys-title glow-text text-sm text-white`}>{title}</h2>
          {right && <div className="absolute right-0 top-[18px] text-right">{right}</div>}
        </header>
      )}
      <div className={title && right ? 'pt-3' : ''}>{children}</div>
    </section>
  )
}

/** Notification header: ⓘ NOTIFICATION over a rule, as in the System's pop-ups. */
export function NoticeHead({ label, tone }: { label: string; tone?: 'danger' | 'rare' }) {
  const color = tone === 'danger' ? '#fecaca' : tone === 'rare' ? '#e9d5ff' : '#dbeafe'
  return (
    <div className="sys-notice-head" style={{ color }}>
      <span className="sys-notice-icon">{tone === 'danger' ? '!' : 'i'}</span>
      <span className="sys-title glow-text text-lg text-white">{label}</span>
    </div>
  )
}

export function Bar({ value, max, color, height = 8, label }: { value: number; max: number; color?: string; height?: number; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="bar-track" style={{ height }} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemax={max} aria-label={label}>
      <div className="bar-fill" style={{ width: `${pct}%`, ...(color ? { background: color, boxShadow: `0 0 10px ${color}99` } : {}) }} />
    </div>
  )
}

export function RankEmblem({ rank, size = 72, glow = true }: { rank: RankId; size?: number; glow?: boolean }) {
  const c = RANK_COLOR[rank]
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={glow ? 'anim-glow' : ''} role="img" aria-label={`${rank}-Rank emblem`}>
      <defs>
        <linearGradient id={`rg-${rank}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity="0.35" />
          <stop offset="1" stopColor={c} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <polygon points="50,4 92,27 92,73 50,96 8,73 8,27" fill={`url(#rg-${rank})`} stroke={c} strokeWidth="3" />
      <polygon points="50,14 83,32 83,68 50,86 17,68 17,32" fill="none" stroke={c} strokeOpacity="0.4" strokeWidth="1.5" />
      {rank === 'S' && <polygon points="50,0 56,10 44,10" fill={c} />}
      <text x="50" y="65" textAnchor="middle" fontFamily="Rajdhani, sans-serif" fontWeight="700" fontSize="46" fill={c}>{rank}</text>
    </svg>
  )
}

const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Typewriter-style System text. */
export function SystemText({ text, className = '', speed = 22, onDone, sound }: { text: string; className?: string; speed?: number; onDone?: () => void; sound?: boolean }) {
  const [n, setN] = useState(reduceMotion() ? text.length : 0)
  useEffect(() => {
    if (reduceMotion()) { setN(text.length); onDone?.(); return }
    setN(0)
    let i = 0
    const t = setInterval(() => {
      i += 1
      setN(i)
      if (sound && i % 2 === 0 && text[i - 1] !== ' ') play('type')
      if (i >= text.length) { clearInterval(t); onDone?.() }
    }, speed)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])
  return (
    <p className={className} aria-label={text}>
      <span aria-hidden>{text.slice(0, n)}</span>
      {n < text.length && <span aria-hidden className="anim-flicker text-glow">▍</span>}
    </p>
  )
}

export function Btn({ children, onClick, variant = 'primary', className = '', disabled, type = 'button', sfx, sfxLevel }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'danger' | 'rare'; className?: string; disabled?: boolean; type?: 'button' | 'submit'; sfx?: Sfx | 'none'; sfxLevel?: number
}) {
  const styles = {
    primary: 'bg-blue-600/25 text-white border-sky-200/80 shadow-[0_0_12px_rgba(59,130,246,.55),inset_0_0_10px_rgba(147,197,253,.25)] glow-soft hover:bg-blue-500/35',
    ghost: 'bg-blue-950/40 text-glow border-edge hover:border-sys hover:text-white',
    danger: 'bg-red-600/25 text-red-100 border-red-200/80 shadow-[0_0_12px_rgba(239,68,68,.5)] hover:bg-red-500/35',
    rare: 'bg-purple-600/25 text-purple-100 border-purple-200/80 shadow-[0_0_12px_rgba(168,85,247,.5)] hover:bg-purple-500/35',
  }[variant]
  return (
    <button type={type} disabled={disabled} onClick={onClick} data-sfx={sfx} data-sfx-level={sfxLevel}
      className={`sys-title min-h-11 rounded-sm border px-4 py-2 text-sm transition active:scale-[.98] disabled:opacity-40 ${styles} ${className}`}>
      {children}
    </button>
  )
}

export function Tag({ children, color = '#38bdf8' }: { children: ReactNode; color?: string }) {
  return (
    <span className="sys-title inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px]" style={{ color, borderColor: `${color}66`, background: `${color}14` }}>
      {children}
    </span>
  )
}

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - step))} className="h-11 w-11 rounded border border-edge text-xl text-sys">−</button>
      <input aria-label={label} inputMode="decimal" value={Number.isFinite(value) ? value : ''} onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v))) }}
        className="h-11 w-20 rounded border border-edge bg-panel-2 text-center text-ink outline-none focus:border-sys" />
      <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(max, value + step))} className="h-11 w-11 rounded border border-edge text-xl text-sys">+</button>
    </div>
  )
}
