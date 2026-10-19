import { useEffect, useState, type ReactNode } from 'react'
import type { RankId } from '../core/types'

export const RANK_COLOR: Record<RankId, string> = {
  E: '#94a3b8', D: '#34d399', C: '#38bdf8', B: '#6366f1', A: '#a855f7', S: '#f59e0b',
}

export const RANK_NAME: Record<RankId, string> = {
  E: 'Beginner Hunter', D: 'Developing Hunter', C: 'Intermediate Hunter', B: 'Advanced Hunter', A: 'Elite Hunter', S: 'Exceptional Hunter',
}

export function Panel({ children, className = '', tone, title, right }: {
  children: ReactNode; className?: string; tone?: 'danger' | 'rare'; title?: string; right?: ReactNode
}) {
  return (
    <section className={`sys-panel ${tone ?? ''} p-4 ${className}`}>
      {title && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className={`sys-title text-sm ${tone === 'danger' ? 'text-danger' : tone === 'rare' ? 'text-rare' : 'text-sys'}`}>{title}</h2>
          {right}
        </header>
      )}
      {children}
    </section>
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
export function SystemText({ text, className = '', speed = 22, onDone }: { text: string; className?: string; speed?: number; onDone?: () => void }) {
  const [n, setN] = useState(reduceMotion() ? text.length : 0)
  useEffect(() => {
    if (reduceMotion()) { setN(text.length); onDone?.(); return }
    setN(0)
    let i = 0
    const t = setInterval(() => {
      i += 1
      setN(i)
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

export function Btn({ children, onClick, variant = 'primary', className = '', disabled, type = 'button' }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'danger' | 'rare'; className?: string; disabled?: boolean; type?: 'button' | 'submit'
}) {
  const styles = {
    primary: 'bg-sys/15 text-glow border-sys/60 hover:bg-sys/25',
    ghost: 'bg-transparent text-mute border-edge hover:text-ink',
    danger: 'bg-danger/15 text-danger border-danger/60 hover:bg-danger/25',
    rare: 'bg-rare/15 text-rare border-rare/60 hover:bg-rare/25',
  }[variant]
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={`sys-title min-h-11 rounded border px-4 py-2 text-sm transition active:scale-[.98] disabled:opacity-40 ${styles} ${className}`}>
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
