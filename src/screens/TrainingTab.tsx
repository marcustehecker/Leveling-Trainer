import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { logWorkout, questsFor, updateProfile } from '../core/engine'
import { EXERCISES, EXERCISE_BY_ID, hasEquipment, type Exercise } from '../core/exercises'
import { describeTarget, generatePlan, planDayFor, WORKOUT_TYPES, type PlanDay } from '../core/plan'
import { WEEKDAY_SHORT, weekday } from '../core/dates'
import type { GameState, LoggedExercise, WorkoutInput, WorkoutType } from '../core/types'
import { Btn, Panel, Tag } from '../ui/components'
import { fromDisplayWeight, nowIso, todayKey, toDisplayWeight, weightUnit } from '../store'
import { STAT_COLOR, STAT_LABEL } from './labels'

const DRAFT_KEY = 'the-system:workout-draft'

interface Draft {
  title: string
  planDayId?: string
  startedAt: number
  exercises: (LoggedExercise & { restSec: number })[]
}

function draftFromPlan(day: PlanDay, s: GameState): Draft {
  return {
    title: day.title, planDayId: day.id, startedAt: Date.now(),
    exercises: day.exercises.map((pe) => {
      const ex = EXERCISE_BY_ID[pe.exerciseId]
      return {
        exerciseId: ex.id, name: ex.name, restSec: pe.restSec,
        sets: Array.from({ length: pe.sets }, () => (ex.kind === 'time' ? { seconds: pe.seconds ?? 30, done: false } : { reps: s.records[ex.id]?.reps || pe.reps?.[0] || 10, weightKg: ex.weighted ? s.records[ex.id]?.weightKg ?? 0 : undefined, done: false })),
      }
    }),
  }
}

function exerciseEntry(ex: Exercise): Draft['exercises'][number] {
  return {
    exerciseId: ex.id, name: ex.name, restSec: 60,
    sets: [ex.kind === 'time' ? { seconds: ex.pattern === 'cardio' ? 900 : 30, done: false } : { reps: 10, weightKg: ex.weighted ? 0 : undefined, done: false }],
  }
}

function loadDraft(): Draft | null {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') } catch { return null }
}
function saveDraft(d: Draft | null) {
  try { if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); else localStorage.removeItem(DRAFT_KEY) } catch { /* private mode */ }
}

export function TrainingTab({ s, update, onLogged }: { s: GameState; update: (fn: (s: GameState) => GameState) => void; onLogged: (msg: string) => void }) {
  const today = todayKey()
  const [draft, setDraft] = useState<Draft | null>(loadDraft)
  const [view, setView] = useState<'plan' | 'library' | 'history'>('plan')
  const [editing, setEditing] = useState(false)
  const plan = useMemo(() => generatePlan(s.profile, s.assessment), [s.profile, s.assessment])
  const todayPlan = planDayFor(s.profile, s.assessment, today)
  const trial = questsFor(s, today).find((q) => q.type === 'trial' && q.status === 'active')
  const penalty = questsFor(s, today).find((q) => q.type === 'penalty' && q.status === 'active')
  const loggedToday = s.workouts.filter((w) => w.date === today).length

  useEffect(() => saveDraft(draft), [draft])

  if (draft) {
    return <Logger s={s} draft={draft} setDraft={setDraft} onSubmit={(input) => {
      const { state, result } = logWorkout(s, input, today, nowIso())
      if (!result.ok) return result.reason
      update(() => state)
      setDraft(null)
      onLogged(`+${result.xp} XP${result.prs.length ? ` · New record: ${result.prs.join(', ')}` : ''}`)
      return null
    }} />
  }

  return (
    <div className="grid gap-7 pt-3">
      <div className="grid grid-cols-3 gap-2">
        {(['plan', 'library', 'history'] as const).map((v) => (
          <button key={v} data-sfx="tab" onClick={() => setView(v)} className={`sys-title h-10 rounded border text-xs ${view === v ? 'border-sys bg-sys/15 text-glow' : 'border-edge text-mute'}`}>
            {v === 'plan' ? 'Plan' : v === 'library' ? 'Exercises' : 'History'}
          </button>
        ))}
      </div>

      {view === 'plan' && (
        <>
          {(trial || penalty) && (
            <Panel tone={trial ? 'rare' : 'danger'} title={trial ? trial.title : 'Penalty Quest'}>
              <p className="text-sm text-mute">{trial ? trial.objective : penalty!.objective}. Use today's workout or log any session below.</p>
            </Panel>
          )}
          {todayPlan ? (
            <Panel title="Today's Training" right={loggedToday > 0 ? <Tag color="#34d399">Logged</Tag> : <Tag>~{todayPlan.estMinutes} min</Tag>}>
              <PlanDayView day={todayPlan} s={s} />
              <Btn className="mt-4 w-full" onClick={() => setDraft(draftFromPlan(todayPlan, s))}>{loggedToday > 0 ? 'Train Again (reduced XP)' : 'Start Workout'}</Btn>
            </Panel>
          ) : (
            <Panel title="Rest Day">
              <p className="text-sm text-mute">No training is planned today. Recovery is part of the plan: complete the Recovery Protocol quest, or log a light session if you feel like moving.</p>
            </Panel>
          )}
          <Btn variant="ghost" onClick={() => setDraft({ title: 'Custom Session', startedAt: Date.now(), exercises: [] })}>Log a Custom Session</Btn>
          {editing ? <RoutineEditor s={s} onClose={() => setEditing(false)} onSave={(trainingDays, routine) => {
            update((x) => updateProfile(x, { trainingDays, routine }, undefined, today, nowIso()))
            setEditing(false)
          }} /> : (
          <Panel title="This Week's Plan">
            <Btn variant="ghost" className="mb-3 w-full" onClick={() => setEditing(true)}>Edit Routine</Btn>
            <div className="grid gap-2">
              {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
                const d = plan[wd]
                const isToday = weekday(today) === wd
                return (
                  <details key={wd} className={`rounded border px-3 py-2 ${isToday ? 'border-sys/60' : 'border-edge/60'}`}>
                    <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                      <span className="sys-title w-10 text-mute">{WEEKDAY_SHORT[wd]}</span>
                      <span className="flex-1">{d ? d.title : <span className="text-mute">Rest · Recovery</span>}</span>
                      {d && <span className="text-xs text-mute">{d.focus}</span>}
                    </summary>
                    {d && <div className="mt-2"><PlanDayView day={d} s={s} /></div>}
                  </details>
                )
              })}
            </div>
          </Panel>
          )}
        </>
      )}

      {view === 'library' && <Library s={s} />}
      {view === 'history' && <History s={s} />}
    </div>
  )
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** Choose the workout for each weekday, or Rest. */
function RoutineEditor({ s, onSave, onClose }: { s: GameState; onSave: (days: number[], routine: Partial<Record<number, WorkoutType>>) => void; onClose: () => void }) {
  const [pick, setPick] = useState<Record<number, WorkoutType | 'rest'>>(() =>
    Object.fromEntries(DAY_ORDER.map((wd) => [wd, s.profile.trainingDays.includes(wd) ? s.profile.routine?.[wd] ?? 'auto' : 'rest'])))
  const days = DAY_ORDER.filter((wd) => pick[wd] !== 'rest')
  const ok = days.length >= 2 && days.length <= 6
  return (
    <Panel title="Edit Routine" open>
      <p className="mb-3 text-sm text-mute">Pick a workout for each day. Auto lets the System choose. Changes start today; missing a training day still costs XP.</p>
      <div className="grid gap-2">
        {DAY_ORDER.map((wd) => (
          <label key={wd} className="flex items-center gap-3">
            <span className="sys-title w-10 text-xs text-mute">{WEEKDAY_SHORT[wd]}</span>
            <select value={pick[wd]} onChange={(e) => setPick({ ...pick, [wd]: e.target.value as WorkoutType | 'rest' })}
              className={`h-11 flex-1 rounded border bg-panel-2 px-3 outline-none focus:border-sys ${pick[wd] === 'rest' ? 'border-edge text-mute' : 'border-sys/70 text-ink'}`}>
              <option value="rest">Rest</option>
              {WORKOUT_TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
          </label>
        ))}
      </div>
      {!ok && <p className="mt-2 text-sm text-danger">Choose between 2 and 6 training days.</p>}
      <div className="mt-4 flex gap-3">
        <Btn variant="ghost" sfx="back" onClick={onClose}>Cancel</Btn>
        <Btn className="flex-1" sfx="next" disabled={!ok} onClick={() => onSave([...days].sort(), Object.fromEntries(days.map((wd) => [wd, pick[wd] as WorkoutType])))}>Save Routine</Btn>
      </div>
    </Panel>
  )
}

function PlanDayView({ day, s }: { day: PlanDay; s: GameState }) {
  return (
    <div className="grid gap-3 text-sm">
      <div className="text-xs text-mute"><span className="sys-title text-sys">Warm-up</span> · {day.warmup.join(' · ')}</div>
      <ol className="grid gap-2">
        {day.exercises.map((pe, i) => {
          const ex = EXERCISE_BY_ID[pe.exerciseId]
          const rec = s.records[pe.exerciseId]
          return (
            <li key={i} className="flex items-baseline justify-between gap-3 border-b border-edge/40 pb-2 last:border-0">
              <span><span className="mr-2 text-mute">{i + 1}.</span>{ex.name}</span>
              <span className="shrink-0 text-right text-xs text-mute">
                {describeTarget(pe)}{pe.restSec ? ` · rest ${pe.restSec}s` : ''}
                {rec && rec.weightKg > 0 && <span className="block text-sys">best {toDisplayWeight(rec.weightKg, s.profile.units)}{weightUnit(s.profile.units)} × {rec.reps}</span>}
              </span>
            </li>
          )
        })}
      </ol>
      <div className="text-xs text-mute"><span className="sys-title text-sys">Cooldown</span> · {day.cooldown.join(' · ')}</div>
    </div>
  )
}

function Logger({ s, draft, setDraft, onSubmit }: { s: GameState; draft: Draft; setDraft: (d: Draft | null) => void; onSubmit: (w: WorkoutInput) => string | null }) {
  const units = s.profile.units
  const [rpe, setRpe] = useState<number | undefined>()
  const [minutes, setMinutes] = useState(() => Math.max(1, Math.round((Date.now() - draft.startedAt) / 60000)))
  const [error, setError] = useState<string | null>(null)
  const [rest, setRest] = useState<number | null>(null)
  const [picking, setPicking] = useState<number | 'add' | null>(null)

  useEffect(() => {
    const t = setInterval(() => {
      setMinutes(Math.max(1, Math.round((Date.now() - draft.startedAt) / 60000)))
      setRest((r) => (r === null ? null : r <= 1 ? null : r - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [draft.startedAt])

  const edit = (fn: (d: Draft) => void) => { const d = structuredClone(draft); fn(d); setDraft(d) }

  const submit = () => {
    const err = onSubmit({
      title: draft.title, planDayId: draft.planDayId, durationMin: minutes, rpe,
      exercises: draft.exercises.map(({ exerciseId, name, sets }) => ({ exerciseId, name, sets })),
    })
    setError(err)
  }

  return (
    <div className="grid gap-7 pt-3 pb-28">
      <Panel title={draft.title} right={<button className="sys-title text-xs text-mute" onClick={() => { if (confirm('Discard this workout?')) setDraft(null) }}>Discard</button>}>
        <p className="text-xs text-mute">Tick each set when done. Edit reps{units ? ` and weight (${weightUnit(units)})` : ''} to what you actually did.</p>
      </Panel>

      {draft.exercises.map((e, ei) => {
        const ex = EXERCISE_BY_ID[e.exerciseId]
        return (
          <Panel key={ei}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{ex.name}</h3>
                <div className="mt-0.5 flex gap-1.5"><Tag color={STAT_COLOR[ex.stat]}>{STAT_LABEL[ex.stat]}</Tag></div>
              </div>
              <div className="flex gap-3 text-xs">
                <button className="text-sys" onClick={() => setPicking(ei)}>Swap</button>
                <button className="text-mute" onClick={() => edit((d) => { d.exercises.splice(ei, 1) })}>Skip</button>
              </div>
            </div>
            <details className="mb-3 text-xs text-mute"><summary className="cursor-pointer text-sys">Technique</summary><ul className="mt-1 list-disc pl-4">{ex.cues.map((c) => <li key={c}>{c}</li>)}</ul></details>
            <div className="grid gap-2">
              <div className="grid grid-cols-[2rem_1fr_1fr_3rem] gap-2 text-[10px] text-mute sys-title">
                <span>Set</span><span>{ex.kind === 'time' ? (ex.pattern === 'cardio' ? 'Minutes' : 'Seconds') : 'Reps'}</span><span>{ex.weighted ? weightUnit(units) : ''}</span><span className="text-center">Done</span>
              </div>
              {e.sets.map((set, si) => (
                <div key={si} className="grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2">
                  <span className="sys-title text-mute">{si + 1}</span>
                  {ex.kind === 'time' ? (
                    <NumIn value={ex.pattern === 'cardio' ? Math.round((set.seconds ?? 0) / 60) : set.seconds ?? 0} label="time"
                      onChange={(v) => edit((d) => { d.exercises[ei].sets[si].seconds = ex.pattern === 'cardio' ? v * 60 : v })} />
                  ) : (
                    <NumIn value={set.reps ?? 0} label="reps" onChange={(v) => edit((d) => { d.exercises[ei].sets[si].reps = v })} />
                  )}
                  {ex.weighted ? (
                    <NumIn value={toDisplayWeight(set.weightKg ?? 0, units)} label="weight" onChange={(v) => edit((d) => { d.exercises[ei].sets[si].weightKg = fromDisplayWeight(v, units) })} />
                  ) : <span />}
                  <button aria-label={`Set ${si + 1} done`} aria-pressed={set.done}
                    onClick={() => edit((d) => { const st = d.exercises[ei].sets[si]; st.done = !st.done; if (st.done && e.restSec) setRest(e.restSec) })}
                    className={`mx-auto h-10 w-10 rounded border text-lg ${set.done ? 'border-ok bg-ok/20 text-ok' : 'border-edge text-transparent'}`}>✓</button>
                </div>
              ))}
              <button className="justify-self-start text-xs text-sys" onClick={() => edit((d) => { const last = d.exercises[ei].sets.at(-1); d.exercises[ei].sets.push({ ...(last ?? { reps: 10 }), done: false }) })}>+ Add set</button>
            </div>
          </Panel>
        )
      })}

      <Btn variant="ghost" onClick={() => setPicking('add')}>+ Add Exercise</Btn>

      <Panel title="Session">
        <div className="grid gap-4">
          <label className="flex items-center justify-between gap-3 text-sm">Duration (min)<NumIn value={minutes} label="duration" onChange={setMinutes} /></label>
          <div>
            <div className="mb-2 text-sm">Effort (RPE) <span className="text-xs text-mute">1 easy · 10 max effort. +{5} XP for recording it.</span></div>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setRpe(n)} aria-pressed={rpe === n}
                  className={`h-10 rounded border text-sm ${rpe === n ? 'border-sys bg-sys/20 text-ink' : 'border-edge text-mute'}`}>{n}</button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        </div>
      </Panel>

      <div className="safe-bottom fixed inset-x-0 bottom-[64px] z-20 mx-auto flex max-w-md gap-3 border-t border-edge bg-void/95 px-4 pt-3 backdrop-blur">
        {rest !== null && <div className="sys-title flex items-center rounded border border-sys/50 px-3 text-sm text-glow" aria-live="polite">Rest {rest}s</div>}
        <Btn className="flex-1" onClick={submit}>Complete Workout</Btn>
      </div>

      {picking !== null && (
        <ExercisePicker s={s} pattern={typeof picking === 'number' ? EXERCISE_BY_ID[draft.exercises[picking].exerciseId].pattern : undefined}
          onClose={() => setPicking(null)}
          onPick={(ex) => { edit((d) => {
            if (picking === 'add') d.exercises.push(exerciseEntry(ex))
            else { const old = d.exercises[picking]; d.exercises[picking] = { ...exerciseEntry(ex), restSec: old.restSec, sets: old.sets.map(() => ({ ...exerciseEntry(ex).sets[0] })) } }
          }); setPicking(null) }} />
      )}
    </div>
  )
}

function NumIn({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  return (
    <input aria-label={label} inputMode="decimal" value={text}
      onChange={(e) => { setText(e.target.value); const v = Number(e.target.value); if (e.target.value !== '' && Number.isFinite(v) && v >= 0) onChange(v) }}
      className="h-10 w-full min-w-0 rounded border border-edge bg-panel-2 px-2 text-center text-ink outline-none focus:border-sys" />
  )
}

function ExercisePicker({ s, pattern, onPick, onClose }: { s: GameState; pattern?: string; onPick: (e: Exercise) => void; onClose: () => void }) {
  const list = EXERCISES.filter((e) => hasEquipment(e, s.profile.equipment) && (!pattern || e.pattern === pattern))
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end bg-black/70" onClick={onClose}>
      <div className="safe-bottom mx-auto max-h-[75vh] w-full max-w-md overflow-y-auto rounded-t-lg border border-edge bg-panel p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h2 className="sys-title text-sm text-sys">{pattern ? 'Swap Exercise' : 'Add Exercise'}</h2><button className="text-mute" onClick={onClose}>Close</button></div>
        <div className="grid gap-2">
          {list.map((e) => (
            <button key={e.id} onClick={() => onPick(e)} className="flex items-center justify-between rounded border border-edge px-3 py-3 text-left text-sm hover:border-sys">
              <span>{e.name}</span><span className="text-xs text-mute">{e.level === 1 ? 'Beginner' : e.level === 2 ? 'Intermediate' : 'Advanced'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Library({ s }: { s: GameState }) {
  const groups: Record<string, string> = { squat: 'Squat', hinge: 'Hinge', push: 'Push', vpush: 'Overhead Press', pull: 'Row', vpull: 'Pull-down / Pull-up', lunge: 'Single Leg', core: 'Core', cardio: 'Cardio', mobility: 'Mobility & Balance' }
  return (
    <div className="grid gap-7 pt-3">
      {Object.entries(groups).map(([p, label]) => (
        <Panel key={p} title={label}>
          <div className="grid gap-2">
            {EXERCISES.filter((e) => e.pattern === p).map((e) => {
              const owned = hasEquipment(e, s.profile.equipment)
              return (
                <details key={e.id} className={`rounded border border-edge/60 px-3 py-2 ${owned ? '' : 'opacity-50'}`}>
                  <summary className="flex cursor-pointer items-center justify-between text-sm">
                    <span>{e.name}</span>
                    <span className="flex gap-1">{!owned && <Tag color="#8a9bb4">No equipment</Tag>}<Tag color={STAT_COLOR[e.stat]}>{STAT_LABEL[e.stat]}</Tag></span>
                  </summary>
                  <ul className="mt-2 list-disc pl-4 text-xs text-mute">{e.cues.map((c) => <li key={c}>{c}</li>)}</ul>
                  {e.easier && <p className="mt-1 text-xs text-sys">Easier option: {EXERCISE_BY_ID[e.easier]?.name}</p>}
                  <p className="mt-1 text-xs text-mute">Equipment: {e.equipment.map((q) => ({ none: 'none', dumbbells: 'dumbbells', bands: 'bands', pullupBar: 'pull-up bar', gym: 'gym' })[q]).join(' or ')}</p>
                </details>
              )
            })}
          </div>
        </Panel>
      ))}
    </div>
  )
}

function History({ s }: { s: GameState }) {
  const units = s.profile.units
  if (s.workouts.length === 0) return <Panel title="Training Log"><p className="text-sm text-mute">No workouts logged yet.</p></Panel>
  return (
    <Panel title="Training Log">
      <div className="grid gap-3">
        {s.workouts.slice(0, 50).map((w) => (
          <details key={w.id} className="rounded border border-edge/60 px-3 py-2">
            <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span><span className="mr-2 text-xs text-mute">{w.date}</span>{w.title}</span>
              <span className="sys-title text-xs text-glow">+{w.xpAwarded} XP</span>
            </summary>
            <div className="mt-2 grid gap-1 text-xs text-mute">
              <div>{w.durationMin} min{w.rpe ? ` · effort ${w.rpe}/10` : ''}{w.planned ? ' · planned' : ''}</div>
              {w.prs.length > 0 && <div className="text-rare">New records: {w.prs.join(', ')}</div>}
              {w.exercises.map((e, i) => (
                <div key={i}><span className="text-ink">{e.name}</span>: {e.sets.filter((x) => x.done).map((x) => x.seconds ? `${x.seconds}s` : `${x.reps}${x.weightKg ? `×${toDisplayWeight(x.weightKg, units)}${weightUnit(units)}` : ''}`).join(', ') || 'skipped'}</div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </Panel>
  )
}
