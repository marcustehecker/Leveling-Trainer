import { useMemo, useState } from 'react'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '../core/achievements'
import { EXERCISE_BY_ID } from '../core/exercises'
import { addDays, range, weekStart } from '../core/dates'
import { isTrainingDay } from '../core/plan'
import { statLevel } from '../core/engine'
import type { GameState, StatId } from '../core/types'
import { Panel, RANK_COLOR, RankEmblem, Tag } from '../ui/components'
import { todayKey, toDisplayWeight, weightUnit } from '../store'
import { WeightUpdate } from '../ui/WeightUpdate'
import { STAT_COLOR, STAT_LABEL } from './labels'

type Series = { name: string; color: string; points: { date: string; v: number }[] }

/** Multi-series line chart over dates. */
function LineChart({ series, unit = '', label, height = 150 }: { series: Series[]; unit?: string; label: string; height?: number }) {
  const all = series.flatMap((x) => x.points)
  if (all.length === 0) return <p className="py-6 text-center text-sm text-mute">No data yet.</p>
  const W = 320, H = height
  const pad = { l: 38, r: 10, t: 10, b: 20 }
  const dates = [...new Set(all.map((p) => p.date))].sort()
  const t0 = Date.parse(dates[0]), t1 = Date.parse(dates[dates.length - 1])
  const vs = all.map((p) => p.v)
  let lo = Math.min(...vs), hi = Math.max(...vs)
  if (hi === lo) { hi += 1; lo = Math.max(0, lo - 1) }
  const span = hi - lo
  lo = Math.max(0, lo - span * 0.1); hi += span * 0.1
  const x = (d: string) => pad.l + (t1 === t0 ? (W - pad.l - pad.r) / 2 : ((Date.parse(d) - t0) / (t1 - t0)) * (W - pad.l - pad.r))
  const y = (v: number) => H - pad.b - ((v - lo) / (hi - lo)) * (H - pad.t - pad.b)
  const ticks = [lo, (lo + hi) / 2, hi]
  const fmt = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v >= 100 ? Math.round(v).toString() : (Math.round(v * 10) / 10).toString())
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#1e3a5f" strokeDasharray="2 4" />
          <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="#8a9bb4">{fmt(t)}{unit}</text>
        </g>
      ))}
      {series.map((sr) => {
        const pts = [...sr.points].sort((a, b) => a.date.localeCompare(b.date))
        const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
        return (
          <g key={sr.name}>
            <path d={d} fill="none" stroke={sr.color} strokeWidth="2" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 3px ${sr.color})` }} />
            {pts.length <= 40 && pts.map((p, i) => <circle key={i} cx={x(p.date)} cy={y(p.v)} r="2.2" fill={sr.color} />)}
          </g>
        )
      })}
      <text x={pad.l} y={H - 4} fontSize="9" fill="#8a9bb4">{dates[0].slice(5)}</text>
      <text x={W - pad.r} y={H - 4} fontSize="9" fill="#8a9bb4" textAnchor="end">{dates[dates.length - 1].slice(5)}</text>
    </svg>
  )
}

function BarChart({ bars, label, color = '#38bdf8' }: { bars: { label: string; v: number }[]; label: string; color?: string }) {
  const W = 320, H = 130, pad = { l: 24, r: 6, t: 14, b: 20 }
  const max = Math.max(1, ...bars.map((b) => b.v))
  const bw = (W - pad.l - pad.r) / bars.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="#1e3a5f" />
      {bars.map((b, i) => {
        const h = (b.v / max) * (H - pad.t - pad.b)
        const bx = pad.l + i * bw + bw * 0.18
        return (
          <g key={i}>
            <rect x={bx} y={H - pad.b - h} width={bw * 0.64} height={h} rx="1.5" fill={color} opacity={i === bars.length - 1 ? 1 : 0.7} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
            {b.v > 0 && <text x={bx + bw * 0.32} y={H - pad.b - h - 3} textAnchor="middle" fontSize="8" fill="#cfe4ff">{b.v}</text>}
            {i % 2 === bars.length % 2 && <text x={bx + bw * 0.32} y={H - 6} textAnchor="middle" fontSize="8" fill="#8a9bb4">{b.label}</text>}
          </g>
        )
      })}
    </svg>
  )
}

/** Best effort per workout day: estimated 1-rep max for weighted lifts, else best reps or seconds. */
function strengthSeries(s: GameState, id: string): { points: { date: string; v: number }[]; unit: string; kind: string } {
  const ex = EXERCISE_BY_ID[id]
  const units = s.profile.units
  const byDate = new Map<string, number>()
  let weighted = false
  for (const w of s.workouts) for (const e of w.exercises) {
    if (e.exerciseId !== id) continue
    for (const x of e.sets) {
      if (!x.done) continue
      let v: number
      if (ex?.kind === 'time') v = x.seconds ?? 0
      else if ((x.weightKg ?? 0) > 0) { weighted = true; v = toDisplayWeight((x.weightKg ?? 0) * (1 + (x.reps ?? 0) / 30), units) }
      else v = x.reps ?? 0
      byDate.set(w.date, Math.max(byDate.get(w.date) ?? 0, Math.round(v * 10) / 10))
    }
  }
  const points = [...byDate].map(([date, v]) => ({ date, v }))
  return ex?.kind === 'time' ? { points, unit: 's', kind: 'Longest hold (seconds)' }
    : weighted ? { points, unit: '', kind: `Estimated 1-rep max (${weightUnit(units)})` } : { points, unit: '', kind: 'Best set (reps)' }
}

function StrengthChart({ s }: { s: GameState }) {
  const options = useMemo(() => {
    const count = new Map<string, number>()
    for (const w of s.workouts) for (const e of w.exercises) if (EXERCISE_BY_ID[e.exerciseId] && EXERCISE_BY_ID[e.exerciseId].pattern !== 'cardio' && EXERCISE_BY_ID[e.exerciseId].pattern !== 'mobility') count.set(e.exerciseId, (count.get(e.exerciseId) ?? 0) + 1)
    return [...count].sort((a, b) => b[1] - a[1]).map(([id]) => id)
  }, [s.workouts])
  const [id, setId] = useState<string | null>(null)
  const cur = id && options.includes(id) ? id : options[0]
  if (!cur) return <p className="text-sm text-mute">Log workouts to see your strength over time.</p>
  const data = strengthSeries(s, cur)
  return (
    <div className="grid gap-2">
      <select value={cur} onChange={(e) => setId(e.target.value)} className="h-11 rounded border border-edge bg-panel-2 px-3 outline-none focus:border-sys">
        {options.map((o) => <option key={o} value={o}>{EXERCISE_BY_ID[o].name}</option>)}
      </select>
      <div className="text-xs text-mute">{data.kind}</div>
      <LineChart label={`${EXERCISE_BY_ID[cur].name} progress`} unit={data.unit} series={[{ name: cur, color: '#a78bfa', points: data.points }]} />
    </div>
  )
}

function BodyWeight({ s, update }: { s: GameState; update: (fn: (s: GameState) => GameState) => void }) {
  const units = s.profile.units
  const list = s.bodyWeights ?? []
  const latest = list[list.length - 1]
  const first = list[0]
  const change = first && latest && list.length > 1 ? toDisplayWeight(latest.kg - first.kg, units) : null
  return (
    <div className="grid gap-3">
      <WeightUpdate s={s} update={update} />
      {change !== null && <p className="text-xs text-mute">Change since {first.date}: <span className="text-ink">{change > 0 ? '+' : ''}{change}{weightUnit(units)}</span></p>}
      <LineChart label="Body weight over time" series={[{ name: 'Body weight', color: '#34d399', points: list.map((b) => ({ date: b.date, v: toDisplayWeight(b.kg, units) })) }]} />
      <p className="text-[11px] text-mute">Update once a week, ideally the same morning each week. Watch the trend, not single weigh-ins.</p>
    </div>
  )
}

function WeeklyChart({ s }: { s: GameState }) {
  const [mode, setMode] = useState<'sessions' | 'minutes'>('sessions')
  const thisWeek = weekStart(todayKey())
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(thisWeek, (i - 11) * 7))
  const bars = weeks.map((w) => {
    const ws = s.workouts.filter((x) => weekStart(x.date) === w)
    return { label: w.slice(5).replace('-', '/'), v: mode === 'sessions' ? ws.length : ws.reduce((m, x) => m + (x.durationMin || 0), 0) }
  })
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        {(['sessions', 'minutes'] as const).map((m) => (
          <button key={m} data-sfx="tab" onClick={() => setMode(m)} className={`sys-title h-9 rounded border text-xs ${mode === m ? 'border-sys bg-sys/15 text-glow' : 'border-edge text-mute'}`}>{m === 'sessions' ? 'Workouts' : 'Minutes'}</button>
        ))}
      </div>
      <BarChart label={`${mode} per week`} bars={bars} color={mode === 'sessions' ? '#38bdf8' : '#f59e0b'} />
    </div>
  )
}

const STAT_IDS: StatId[] = ['strength', 'endurance', 'agility', 'vitality', 'discipline', 'recovery']

function StatChart({ s }: { s: GameState }) {
  const hist = [...(s.statHistory ?? []), { date: todayKey(), stats: s.stats }]
  const series: Series[] = STAT_IDS.map((id) => ({ name: STAT_LABEL[id], color: STAT_COLOR[id], points: hist.map((h) => ({ date: h.date, v: statLevel(h.stats[id]) })) }))
  return (
    <div className="grid gap-2">
      {hist.length < 2 ? <p className="text-sm text-mute">Your stat history builds up day by day. Check back tomorrow.</p> : <LineChart label="Stat levels over time" series={series} />}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        {STAT_IDS.map((id) => <span key={id} className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full" style={{ background: STAT_COLOR[id] }} />{STAT_LABEL[id]} {statLevel(s.stats[id])}</span>)}
      </div>
    </div>
  )
}

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


const HEAT_WEEKS = 18
type DayKind = 'trained' | 'missed' | 'sick' | 'rest' | 'none'

/** Training calendar: one column per week, Monday at the top. */
function Heatmap({ s }: { s: GameState }) {
  const today = todayKey()
  const [sel, setSel] = useState<string | null>(null)
  const start = addDays(weekStart(today), -7 * (HEAT_WEEKS - 1))
  const byDate = useMemo(() => {
    const m: Record<string, { n: number; sets: number; min: number; titles: string[] }> = {}
    for (const w of s.workouts) {
      const d = (m[w.date] ??= { n: 0, sets: 0, min: 0, titles: [] })
      d.n++; d.min += w.durationMin; d.titles.push(w.title)
      d.sets += w.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0)
    }
    return m
  }, [s.workouts])
  const kind = (d: string): DayKind => {
    if (byDate[d]) return 'trained'
    if (d > today || d < s.createdDate) return 'none'
    if (s.sickDays.includes(d)) return 'sick'
    if (d < today && isTrainingDay(s.profile, d)) return 'missed'
    return 'rest'
  }
  const color = (d: string) => {
    const k = kind(d)
    if (k === 'trained') { const sets = byDate[d].sets; return sets >= 20 ? '#a7f3d0' : sets >= 12 ? '#34d399' : sets >= 6 ? '#059669' : '#065f46' }
    return { missed: '#7f1d1d', sick: '#b45309', rest: '#13233f', none: 'transparent' }[k]
  }
  const days = range(start, addDays(weekStart(today), 6))
  const weeks = Array.from({ length: HEAT_WEEKS }, (_, i) => days.slice(i * 7, i * 7 + 7))
  const trainedDays = days.filter((d) => kind(d) === 'trained').length
  const missedDays = days.filter((d) => kind(d) === 'missed').length
  const info = sel && byDate[sel]
  const label = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  return (
    <div>
      <div className="flex gap-[3px]">
        <div className="mr-1 grid grid-rows-7 gap-[3px] text-[9px] leading-none text-mute">
          {['M', '', 'W', '', 'F', '', 'S'].map((l, i) => <span key={i} className="flex aspect-square items-center">{l}</span>)}
        </div>
        {weeks.map((wk) => (
          <div key={wk[0]} className="grid flex-1 grid-rows-7 gap-[3px]">
            {wk.map((d) => (
              <button
                key={d}
                type="button"
                data-sfx="select"
                aria-label={`${label(d)}: ${kind(d)}`}
                disabled={kind(d) === 'none' && d !== today}
                onClick={() => setSel(sel === d ? null : d)}
                className={`aspect-square rounded-[2px] ${d === today ? 'ring-1 ring-sky-200' : ''} ${sel === d ? 'ring-2 ring-white' : ''} ${kind(d) === 'none' ? 'border border-sky-900/30' : ''}`}
                style={{ background: color(d) }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-mute">
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#059669]" />Trained</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#7f1d1d]" />Missed</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#b45309]" />Sick</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#13233f]" />Rest</span>
        <span className="ml-auto">{trainedDays} trained · {missedDays} missed</span>
      </div>
      {sel && (
        <div className="anim-rise mt-3 rounded border border-sky-300/30 bg-sky-500/5 px-3 py-2 text-sm">
          <div className="font-medium text-white">{label(sel)}</div>
          <div className="text-xs text-mute">
            {info ? `${info.titles.join(', ')} · ${info.sets} set${info.sets === 1 ? "" : "s"} · ${info.min} min` : { missed: 'Planned training day, no workout logged.', sick: 'Sick or injured. No XP lost.', rest: 'Rest day.', none: 'Nothing yet.', trained: '' }[kind(sel)]}
          </div>
        </div>
      )}
    </div>
  )
}

export function ProgressTab({ s, update }: { s: GameState; update: (fn: (s: GameState) => GameState) => void }) {
  const units = s.profile.units
  const records = Object.entries(s.records).filter(([id]) => EXERCISE_BY_ID[id])
  return (
    <div className="grid gap-7 pt-3">
      <Panel title="Experience" right={<span className="text-xs text-mute">Lifetime {s.lifetimeXp.toLocaleString()} XP</span>}>
        <XpChart s={s} />
        <p className="mt-2 text-xs text-mute">Red dots mark days XP was lost.</p>
      </Panel>

      <Panel title="Training Calendar"><Heatmap s={s} /></Panel>
      <Panel title="Strength"><StrengthChart s={s} /></Panel>
      <Panel title="Training Volume"><WeeklyChart s={s} /></Panel>
      <Panel title="Stats"><StatChart s={s} /></Panel>
      <Panel title="Body Weight"><BodyWeight s={s} update={update} /></Panel>

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

      <Panel title="Achievements" right={<span className="text-xs text-mute">{Object.keys(s.achievements).filter((k) => ACHIEVEMENTS.some((a) => a.id === k)).length}/{ACHIEVEMENTS.length}</span>}>
        <div className="grid gap-5">
          {ACHIEVEMENT_CATEGORIES.map((cat) => {
            const list = ACHIEVEMENTS.filter((a) => a.category === cat)
            const got = list.filter((a) => s.achievements[a.id]).length
            return (
              <details key={cat} open={cat === 'Training'}>
                <summary className="flex cursor-pointer items-center justify-between py-1">
                  <span className="sys-title text-xs text-glow">{cat}</span>
                  <span className="text-xs text-mute">{got}/{list.length}</span>
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {list.map((a) => {
                    const have = s.achievements[a.id]
                    return (
                      <div key={a.id} className={`rounded border p-2 ${have ? (a.rare ? 'border-rare/60 bg-rare/10' : 'border-sys/50 bg-sys/10') : 'border-edge/50 opacity-50'}`}>
                        <div className={`text-sm font-medium ${have && a.rare ? 'text-rare' : ''}`}>{have || !a.rare ? a.name : '???'}</div>
                        <div className="text-[11px] text-mute">{a.description}</div>
                        {a.title && <div className="mt-1"><Tag color={have ? '#a855f7' : '#8a9bb4'}>Title: {have ? a.title : '???'}</Tag></div>}
                      </div>
                    )
                  })}
                </div>
              </details>
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
