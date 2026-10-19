import { ACHIEVEMENTS } from '../core/achievements'
import { EXERCISE_BY_ID } from '../core/exercises'
import type { GameState } from '../core/types'
import { Panel, RANK_COLOR, RankEmblem, Tag } from '../ui/components'
import { todayKey, toDisplayWeight, weightUnit } from '../store'

function XpChart({ s }: { s: GameState }) {
  const pts = [...s.xpHistory.slice(-60), { date: todayKey(), xp: s.xp }]
  const W = 320
  const H = 140
  const pad = { l: 36, r: 8, t: 10, b: 20 }
  const max = Math.max(100, ...pts.map((p) => p.xp)) * 1.1
  const x = (i: number) => pad.l + (pts.length <= 1 ? 0 : (i / (pts.length - 1)) * (W - pad.l - pad.r))
  const y = (v: number) => H - pad.b - (v / max) * (H - pad.t - pad.b)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.xp).toFixed(1)}`).join(' ')
  const ticks = [0, max / 2, max].map((v) => Math.round(v / 10) * 10)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`XP over the last ${pts.length} days, now ${s.xp}`}>
      <defs>
        <linearGradient id="xpfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22d3ee" stopOpacity=".35" /><stop offset="1" stopColor="#22d3ee" stopOpacity="0" /></linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#1e3a5f" strokeDasharray="2 4" />
          <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="#8a9bb4">{t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}</text>
        </g>
      ))}
      <path d={`${line} L${x(pts.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="url(#xpfill)" />
      <path d={line} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round" />
      {pts.map((p, i) => i > 0 && p.xp < pts[i - 1].xp && <circle key={i} cx={x(i)} cy={y(p.xp)} r="2.5" fill="#ef4444" />)}
      <text x={pad.l} y={H - 4} fontSize="9" fill="#8a9bb4">{pts[0].date}</text>
      <text x={W - pad.r} y={H - 4} fontSize="9" fill="#8a9bb4" textAnchor="end">Today</text>
    </svg>
  )
}

export function ProgressTab({ s }: { s: GameState }) {
  const units = s.profile.units
  const records = Object.entries(s.records).filter(([id]) => EXERCISE_BY_ID[id])
  return (
    <div className="grid gap-7 pt-3">
      <Panel title="Experience" right={<span className="text-xs text-mute">Lifetime {s.lifetimeXp.toLocaleString()} XP</span>}>
        <XpChart s={s} />
        <p className="mt-2 text-xs text-mute">Red dots mark days XP was lost.</p>
      </Panel>

      <Panel title="Rank History">
        <ol className="grid gap-2">
          {[...s.rankHistory].reverse().map((h, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <RankEmblem rank={h.rank} size={32} glow={false} />
              <span className="flex-1" style={{ color: RANK_COLOR[h.rank] }}>{h.rank}-Rank</span>
              <span className="text-xs text-mute">{h.kind === 'start' ? 'Registered' : h.kind === 'promotion' ? 'Promoted' : 'Demoted'} · {h.date}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Personal Records" right={<span className="text-xs text-mute">{s.prCount} set</span>}>
        {records.length === 0 ? <p className="text-sm text-mute">Log workouts to set records.</p> : (
          <div className="grid gap-1.5 text-sm">
            {records.map(([id, r]) => (
              <div key={id} className="flex justify-between border-b border-edge/40 pb-1.5 last:border-0">
                <span>{EXERCISE_BY_ID[id].name}</span>
                <span className="text-mute">{r.seconds ? `${r.seconds}s` : r.weightKg ? `${toDisplayWeight(r.weightKg, units)}${weightUnit(units)} × ${r.reps}` : `${r.reps} reps`}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Achievements" right={<span className="text-xs text-mute">{Object.keys(s.achievements).length}/{ACHIEVEMENTS.length}</span>}>
        <div className="grid grid-cols-2 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const got = s.achievements[a.id]
            return (
              <div key={a.id} className={`rounded border p-2 ${got ? (a.rare ? 'border-rare/60 bg-rare/10' : 'border-sys/50 bg-sys/10') : 'border-edge/50 opacity-45'}`}>
                <div className={`text-sm font-medium ${got && a.rare ? 'text-rare' : ''}`}>{got ? a.name : '???'}</div>
                <div className="text-[11px] text-mute">{a.description}</div>
                {a.title && got && <div className="mt-1"><Tag color="#a855f7">Title</Tag></div>}
              </div>
            )
          })}
        </div>
      </Panel>

      <Panel title="System Log">
        <ul className="grid max-h-80 gap-1.5 overflow-y-auto text-xs">
          {s.log.slice(0, 80).map((l) => (
            <li key={l.id} className={l.tone === 'loss' ? 'text-danger' : l.tone === 'rare' ? 'text-rare' : l.tone === 'gain' ? 'text-sys' : 'text-mute'}>
              <span className="mr-2 text-mute">{l.date}</span>{l.text}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
