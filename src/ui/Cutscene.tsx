import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { RankId } from '../core/types'
import { play } from '../sfx'
import { RANK_COLOR, RANK_NAME, RankEmblem, SystemText } from './components'

/** Particles flying out from the centre; each gets its own angle and distance. */
function Burst({ color, count = 36 }: { color: string; count?: number }) {
  const parts = useMemo(() => Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.3
    const d = 120 + Math.random() * 180
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, delay: Math.random() * 120, size: 2 + Math.random() * 3 }
  }), [count])
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
      {parts.map((p, i) => (
        <i key={i} className="cs-spark" style={{ '--x': `${p.x}px`, '--y': `${p.y}px`, animationDelay: `${p.delay}ms`, width: p.size, height: p.size, background: color, boxShadow: `0 0 8px ${color}` } as React.CSSProperties} />
      ))}
    </div>
  )
}

/** A rotating magic-circle ring behind the hero element. */
function Ring({ color, size }: { color: string; size: number }) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2
    return `${50 + Math.cos(a) * 44},${50 + Math.sin(a) * 44}`
  })
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="cs-ring absolute" aria-hidden style={{ color }}>
      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".8" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth=".3" strokeDasharray="1.5 2.5" />
      <polygon points={[0, 2, 4].map((i) => pts[i]).join(' ')} fill="none" stroke="currentColor" strokeWidth=".5" opacity=".7" />
      <polygon points={[1, 3, 5].map((i) => pts[i]).join(' ')} fill="none" stroke="currentColor" strokeWidth=".5" opacity=".7" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth=".4" opacity=".6" />
    </svg>
  )
}

function useCountUp(from: number, to: number, delay: number, ms: number) {
  const [n, setN] = useState(from)
  useEffect(() => {
    const start = performance.now() + delay
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - start) / ms))
      setN(Math.round(from + (to - from) * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [from, to, delay, ms])
  return n
}

function Shell({ children, onClose, ready, tint }: { children: React.ReactNode; onClose: () => void; ready: boolean; tint: string }) {
  return createPortal(
    <div className="cs-root fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden" role="dialog" aria-modal="true"
      style={{ '--tint': tint } as React.CSSProperties} onClick={() => ready && onClose()}>
      <div className="cs-bg absolute inset-0" aria-hidden />
      <div className="cs-flash absolute inset-0" aria-hidden />
      <div className="cs-beam absolute inset-x-0 top-1/2 h-px" aria-hidden />
      {children}
      <button type="button" data-sfx="next" className={`sys-title absolute bottom-[max(env(safe-area-inset-bottom),24px)] text-xs tracking-[.3em] text-sky-100/80 transition-opacity duration-500 ${ready ? 'opacity-100 anim-flicker' : 'pointer-events-none opacity-0'}`}
        onClick={(e) => { e.stopPropagation(); onClose() }}>Tap to continue</button>
    </div>,
    document.body,
  )
}

export function LevelUpCutscene({ from, to, onClose }: { from: number; to: number; onClose: () => void }) {
  const [ready, setReady] = useState(false)
  const [text, setText] = useState(false)
  const n = useCountUp(from, to, 700, 900)
  useEffect(() => {
    play('levelup')
    const t = [window.setTimeout(() => setText(true), 1100), window.setTimeout(() => setReady(true), 2000)]
    return () => t.forEach((x) => window.clearTimeout(x))
  }, [])
  return (
    <Shell onClose={onClose} ready={ready} tint="#60a5fa">
      <div className="relative flex h-72 w-72 items-center justify-center">
        <Ring color="#93c5fd" size={288} />
        <Burst color="#bfdbfe" />
        <div className="cs-hero relative text-center">
          <div className="sys-title glow-text text-sm tracking-[.5em] text-sky-200">Level</div>
          <div className="sys-title glow-text text-8xl leading-none text-white tabular-nums">{n}</div>
        </div>
      </div>
      <div className="cs-slam sys-title glow-text mt-2 text-4xl tracking-[.25em] text-white">Level Up!</div>
      <div className="cs-sub mt-4 max-w-xs px-6 text-center text-sm text-sky-100/90">
        {text && <SystemText text={`[You have leveled up. Level ${from} → ${to}.]`} speed={22} />}
      </div>
    </Shell>
  )
}

export function RankUpCutscene({ rank, onClose }: { rank: RankId; onClose: () => void }) {
  const [ready, setReady] = useState(false)
  const [text, setText] = useState(false)
  const color = RANK_COLOR[rank]
  useEffect(() => {
    play('rankup')
    const t = [window.setTimeout(() => setText(true), 2200), window.setTimeout(() => setReady(true), 3600)]
    return () => t.forEach((x) => window.clearTimeout(x))
  }, [])
  return (
    <Shell onClose={onClose} ready={ready} tint={color}>
      {/* The gate: two doors that part to reveal the new rank. */}
      <div className="cs-door cs-door-l absolute inset-y-0 left-0 w-1/2" aria-hidden />
      <div className="cs-door cs-door-r absolute inset-y-0 right-0 w-1/2" aria-hidden />
      <div className="cs-rank-in relative flex h-80 w-80 items-center justify-center">
        <div className="cs-rays absolute inset-[-40%]" style={{ background: `repeating-conic-gradient(from 0deg, ${color}33 0deg 6deg, transparent 6deg 18deg)` }} aria-hidden />
        <Ring color={color} size={320} />
        <Burst color={color} count={48} />
        <div className="relative"><RankEmblem rank={rank} size={190} /></div>
      </div>
      <div className="cs-slam-late sys-title mt-2 text-3xl tracking-[.3em]" style={{ color, textShadow: `0 0 18px ${color}` }}>Rank Up</div>
      <div className="cs-sub-late mt-3 max-w-xs px-6 text-center text-sm text-white/90">
        {text && <SystemText text={`[Trial cleared. You are now a ${rank}-Rank Hunter: ${RANK_NAME[rank]}.]`} speed={20} />}
      </div>
    </Shell>
  )
}
