import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createGame, STAT_IDS, statLevel } from '../core/engine'
import { WEEKDAY_SHORT } from '../core/dates'
import type { AgeRange, Assessment, Equipment, Experience, GameState, Goal, Profile } from '../core/types'
import { Btn, Panel, RankEmblem, Stepper, SystemText } from '../ui/components'
import { KG_PER_LB, nowIso, todayKey } from '../store'
import { waterAmount, waterGlasses } from '../core/quests'
import { STAT_LABEL } from './labels'
import { TermsConsent } from './Legal'
import { play } from '../sfx'

type Draft = Omit<Profile, 'heightCm' | 'weightKg'> & { height: string; weight: string; assessment: Assessment }

const initial: Draft = {
  name: '', ageRange: '18-29', units: 'imperial', experience: 'none', goals: [], equipment: ['none'],
  trainingDays: [1, 3, 5], sessionMinutes: 30, diet: { preferences: '', allergies: '' }, bedtime: '22:30',
  height: '', weight: '', assessment: { pushups: 5, plankSeconds: 30, cardioLevel: 2, mobilityLevel: 2 },
}

function Choice<T extends string | number>({ options, value, onChange, multi }: {
  options: { v: T; label: string; sub?: string; icon?: string }[]; value: T | T[]; onChange: (v: T) => void; multi?: boolean
}) {
  const on = (v: T) => (multi ? (value as T[]).includes(v) : value === v)
  return (
    <div className="grid gap-2">
      {options.map((o, i) => (
        <button key={String(o.v)} type="button" onClick={() => onChange(o.v)} aria-pressed={on(o.v)}
          data-sfx={multi ? undefined : 'select'} style={{ animationDelay: `${i * 40}ms` }}
          className={`choice anim-rise flex min-h-12 items-center gap-3 rounded border px-4 py-2 text-left ${on(o.v) ? 'border-sky-200 bg-sys/20 text-white' : 'border-edge bg-panel-2/60 text-mute'}`}>
          {o.icon && <span aria-hidden className={`w-6 text-center text-lg ${on(o.v) ? '' : 'opacity-60 grayscale'}`}>{o.icon}</span>}
          <span className="flex-1">
            <span className="block font-medium">{o.label}</span>
            {o.sub && <span className="block text-xs text-mute">{o.sub}</span>}
          </span>
          <span aria-hidden className={`choice-mark flex h-5 w-5 shrink-0 items-center justify-center border text-[11px] ${multi ? 'rounded-sm' : 'rounded-full'} ${on(o.v) ? 'border-sky-200 bg-sky-300/30 text-white' : 'border-edge'}`}>
            {on(o.v) && <span>{multi ? '✓' : '●'}</span>}
          </span>
        </button>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="sys-title text-xs text-mute">{label}</span>
      {children}
    </label>
  )
}

function toggleEquipment(arr: Equipment[], v: Equipment): Equipment[] {
  if (v === 'none') return ['none']
  const rest = arr.filter((e) => e !== 'none')
  const next = rest.includes(v) ? rest.filter((e) => e !== v) : [...rest, v]
  return next.length ? next : ['none']
}

const input = 'h-12 rounded border border-edge bg-panel-2 px-3 text-ink outline-none focus:border-sys'

export function Onboarding({ onDone, defaultName = '' }: { onDone: (s: GameState) => void; defaultName?: string }) {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState<'r' | 'l'>('r')
  const advanceTimer = useRef<number | undefined>(undefined)
  const [d, setD] = useState<Draft>({ ...initial, name: defaultName })
  const [result, setResult] = useState<GameState | null>(null)
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }))
  const setA = (patch: Partial<Assessment>) => setD((x) => ({ ...x, assessment: { ...x.assessment, ...patch } }))
  const minor = d.ageRange === '13-15' || d.ageRange === '16-17'

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  useEffect(() => () => window.clearTimeout(advanceTimer.current), [])

  function go(to: number) {
    window.clearTimeout(advanceTimer.current)
    setDir(to > step ? 'r' : 'l')
    setStep(to)
    window.scrollTo({ top: 0 })
  }
  /** Single-answer steps move on by themselves after a beat, so the choice registers. */
  function pickThenAdvance(apply: () => void) {
    apply()
    window.clearTimeout(advanceTimer.current)
    const from = step
    advanceTimer.current = window.setTimeout(() => { play('next', from); setDir('r'); setStep((cur) => (cur === from ? from + 1 : cur)) }, 380)
  }

  const GOALS: { v: Goal; label: string; sub: string; icon: string }[] = [
    { v: 'strength', label: 'Build strength', sub: 'Lift and push more', icon: '⚔️' },
    { v: 'muscle', label: 'Build muscle', sub: 'Look and feel stronger', icon: '💪' },
    { v: 'endurance', label: 'Improve endurance', sub: 'Last longer, recover faster', icon: '🫀' },
    ...(minor ? [] : [{ v: 'fatloss' as Goal, label: 'Lose body fat', sub: 'Training plus steady habits', icon: '🔥' }]),
    { v: 'mobility', label: 'Mobility and flexibility', sub: 'Move freely, fewer aches', icon: '🌀' },
    { v: 'technique', label: 'Learn proper technique', sub: 'Train safely with good form', icon: '🎯' },
    { v: 'consistency', label: 'Build a consistent routine', sub: 'Show up, week after week', icon: '📅' },
    { v: 'general', label: 'General fitness', sub: 'A bit of everything', icon: '✨' },
  ]
  const goals = d.goals.filter((g) => GOALS.some((o) => o.v === g))

  const weightOk = Number(d.weight) > (d.units === 'imperial' ? 50 : 25) && Number(d.weight) < (d.units === 'imperial' ? 700 : 320)
  const steps: { title: string; hint: string; body: ReactNode; valid?: boolean; custom?: boolean; skippable?: boolean }[] = [
    {
      title: 'Player Detected',
      hint: 'Registration',
      body: (
        <div className="grid gap-5">
          <SystemText sound className="text-lg leading-relaxed text-ink" text="[You have met the conditions to become a Player. Will you accept?] Enter your Hunter name to register." />
          <Field label="Hunter name">
            <input className={input} value={d.name} maxLength={24} placeholder="Enter your name" onChange={(e) => set({ name: e.target.value })} autoFocus
              enterKeyHint="next" onKeyDown={(e) => { if (e.key === 'Enter' && d.name.trim().length >= 2) { play('next', 0); go(1) } }} />
          </Field>
        </div>
      ),
      valid: d.name.trim().length >= 2,
    },
    {
      title: 'Age Bracket',
      hint: 'Sets safe starting volume',
      body: (
        <Choice<AgeRange> value={d.ageRange} onChange={(v) => pickThenAdvance(() => set({ ageRange: v }))}
          options={(['13-15', '16-17', '18-29', '30-44', '45-59', '60+'] as AgeRange[]).map((v) => ({ v, label: v }))} />
      ),
    },
    {
      title: 'Body Data',
      hint: minor ? 'Optional' : 'Sets your water goal',
      skippable: minor,
      valid: minor || weightOk,
      body: (
        <div className="grid gap-4">
          <p className="text-sm text-mute">{minor ? 'Used only for context, never to judge you. Optional.' : 'Your weight sets your daily water goal. It is never used to judge you, and you can update it once a week.'}</p>
          <Choice<'metric' | 'imperial'> value={d.units} onChange={(v) => set({ units: v })}
            options={[{ v: 'imperial', label: 'Imperial (in, lb)' }, { v: 'metric', label: 'Metric (cm, kg)' }]} />
          <Field label={d.units === 'imperial' ? 'Height (inches)' : 'Height (cm)'}>
            <input className={input} inputMode="decimal" value={d.height} onChange={(e) => set({ height: e.target.value })} placeholder="Optional" />
          </Field>
          {!minor && (
            <Field label={d.units === 'imperial' ? 'Weight (lb)' : 'Weight (kg)'}>
              <input className={input} inputMode="decimal" value={d.weight} onChange={(e) => set({ weight: e.target.value })} placeholder={d.units === 'imperial' ? 'e.g. 170' : 'e.g. 75'} />
            </Field>
          )}
          {!minor && weightOk && (
            <p className="anim-rise text-sm text-glow">[Daily water goal: {waterGlasses(weightKgOf(d), false)} glasses, {waterAmount(waterGlasses(weightKgOf(d), false), d.units)}. +2 on training days.]</p>
          )}
        </div>
      ),
    },
    {
      title: 'Combat Experience',
      hint: 'How long you have trained',
      body: (
        <Choice<Experience> value={d.experience} onChange={(v) => pickThenAdvance(() => set({ experience: v }))} options={[
          { v: 'none', label: 'None yet', sub: 'New to training' },
          { v: 'novice', label: 'Under 6 months', sub: 'Some workouts, still learning' },
          { v: 'intermediate', label: '6 months – 2 years', sub: 'Train fairly regularly' },
          { v: 'advanced', label: '2+ years', sub: 'Consistent, know the main lifts' },
        ]} />
      ),
    },
    {
      title: 'Objectives',
      hint: 'Pick as many as you like',
      body: (
        <div className="grid gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-mute">Select every goal that fits.</span>
            <span className={`sys-title text-xs ${goals.length ? 'text-glow' : 'text-mute'}`}>{goals.length} selected</span>
          </div>
          <Choice<Goal> multi value={goals} onChange={(v) => set({ goals: toggle(goals, v) })} options={GOALS} />
        </div>
      ),
      valid: goals.length > 0,
    },
    {
      title: 'Equipment',
      hint: 'Your plan only uses what you have',
      body: (
        <div className="grid gap-3">
          <p className="text-sm text-mute">Select everything you can use.</p>
          <Choice<Equipment> multi value={d.equipment} onChange={(v) => set({ equipment: toggleEquipment(d.equipment, v) })} options={[
            { v: 'none', label: 'No equipment', sub: 'Bodyweight only' },
            { v: 'dumbbells', label: 'Dumbbells' },
            { v: 'bands', label: 'Resistance bands' },
            { v: 'pullupBar', label: 'Pull-up bar' },
            { v: 'gym', label: 'Full gym access' },
          ]} />
        </div>
      ),
    },
    {
      title: 'Training Schedule',
      hint: 'Pick days you can keep',
      body: (
        <div className="grid gap-5">
          <Field label="Training days">
            <div className="grid grid-cols-7 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
                <button key={wd} type="button" aria-pressed={d.trainingDays.includes(wd)} onClick={() => set({ trainingDays: toggle(d.trainingDays, wd) })}
                  className={`choice h-12 rounded border text-sm ${d.trainingDays.includes(wd) ? 'border-sky-200 bg-sys/25 text-white' : 'border-edge text-mute'}`}>
                  {WEEKDAY_SHORT[wd]}
                </button>
              ))}
            </div>
            <span className="text-xs text-mute">{d.trainingDays.length} days per week. Missing a planned day costs XP, so pick days you can keep.</span>
          </Field>
          <Field label="Session length">
            <Choice<number> value={d.sessionMinutes} onChange={(v) => set({ sessionMinutes: v })}
              options={[20, 30, 45, 60].map((v) => ({ v, label: `${v} minutes` }))} />
          </Field>
          <Field label="Bedtime (for the sleep quest)">
            <input type="time" className={input} value={d.bedtime ?? ''} onChange={(e) => set({ bedtime: e.target.value || undefined })} />
          </Field>
        </div>
      ),
      valid: d.trainingDays.length >= 2 && d.trainingDays.length <= 6,
    },
    {
      title: 'Initial Assessment',
      hint: 'Sets your starting stats',
      body: (
        <div className="grid gap-5">
          <SystemText className="text-sm text-mute" text="[Measuring current ability. Answer honestly. This sets your starting stats, not your rank.]" />
          <Field label="Push-ups in a row, good form (0 is fine)"><Stepper label="push-ups" value={d.assessment.pushups} max={100} onChange={(v) => setA({ pushups: v })} /></Field>
          <Field label="Plank hold, seconds"><Stepper label="plank seconds" value={d.assessment.plankSeconds} max={600} step={5} onChange={(v) => setA({ plankSeconds: v })} /></Field>
          <Field label="Cardio fitness">
            <Choice<number> value={d.assessment.cardioLevel} onChange={(v) => setA({ cardioLevel: v })} options={[
              { v: 1, label: 'Stairs leave me winded' }, { v: 2, label: 'I can walk 30 min comfortably' },
              { v: 3, label: 'I can jog 10 min' }, { v: 4, label: 'I can run 30 min' }, { v: 5, label: 'I train cardio often' },
            ]} />
          </Field>
          <Field label="Mobility">
            <Choice<number> value={d.assessment.mobilityLevel} onChange={(v) => setA({ mobilityLevel: v })} options={[
              { v: 1, label: "Can't reach my knees bending forward" }, { v: 2, label: 'Can reach my shins' },
              { v: 3, label: 'Can touch my toes' }, { v: 4, label: 'Palms near the floor' }, { v: 5, label: 'Very flexible' },
            ]} />
          </Field>
        </div>
      ),
    },
    {
      title: 'Provisions',
      hint: 'Optional',
      skippable: true,
      body: (
        <div className="grid gap-4">
          <p className="text-sm text-mute">Stored for the nutrition system. You can skip this.</p>
          <Field label="Dietary preferences">
            <input className={input} value={d.diet.preferences} placeholder="e.g. vegetarian, halal, no preference" onChange={(e) => set({ diet: { ...d.diet, preferences: e.target.value } })} />
          </Field>
          <Field label="Allergies or restrictions">
            <input className={input} value={d.diet.allergies} placeholder="e.g. peanuts, lactose" onChange={(e) => set({ diet: { ...d.diet, allergies: e.target.value } })} />
          </Field>
        </div>
      ),
    },
    {
      title: 'System Terms',
      hint: 'Last step',
      custom: true,
      body: (
        <div className="grid gap-4">
          <div className="grid gap-1.5 rounded border border-edge bg-panel-2/60 p-3 text-sm">
            <div className="sys-title text-xs text-mute">Player record</div>
            <Row k="Name" v={d.name.trim()} />
            <Row k="Experience" v={{ none: 'New', novice: 'Under 6 months', intermediate: '6 mo – 2 yrs', advanced: '2+ years' }[d.experience]} />
            <Row k="Objectives" v={goals.map((g) => GOALS.find((o) => o.v === g)!.label).join(', ')} />
            <Row k="Schedule" v={`${[...d.trainingDays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((x) => WEEKDAY_SHORT[x]).join(' ')} · ${d.sessionMinutes} min`} />
          </div>
          <p className="text-center text-sm text-glow">[Before the System binds to you, confirm the following.]</p>
          <TermsConsent cta="Complete Registration" sfx="none" onAccept={() => finish()} />
        </div>
      ),
    },
  ]

  function finish() {
    const h = Number(d.height)
    const w = Number(d.weight)
    const profile: Profile = {
      name: d.name.trim(), ageRange: d.ageRange, units: d.units, experience: d.experience, goals,
      equipment: d.equipment, trainingDays: [...d.trainingDays].sort(), sessionMinutes: d.sessionMinutes,
      diet: d.diet, bedtime: d.bedtime, acceptedTermsAt: nowIso(),
      heightCm: h > 0 ? (d.units === 'imperial' ? h * 2.54 : h) : undefined,
      weightKg: w > 0 && !minor ? (d.units === 'imperial' ? w * KG_PER_LB : w) : undefined,
    }
    play('complete')
    setResult(createGame(profile, d.assessment, todayKey(), nowIso()))
  }

  if (result) return <AssessmentReveal s={result} onEnter={() => onDone(result)} />

  const cur = steps[step]
  const last = step === steps.length - 1
  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-full max-w-md flex-col px-4">
      <div className="mb-2 mt-2 grid gap-2">
        <div className="flex items-baseline justify-between">
          <span className="sys-title text-xs text-glow">{cur.hint}</span>
          <span className="sys-title text-xs text-mute">{step + 1} / {steps.length}</span>
        </div>
        <div className="flex gap-1" role="progressbar" aria-label="Registration progress" aria-valuenow={step + 1} aria-valuemax={steps.length}>
          {steps.map((_, i) => (
            <span key={i} className={`seg h-1 flex-1 rounded-full ${i < step ? 'bg-sky-300/80' : i === step ? 'bg-white shadow-[0_0_8px_#93c5fd]' : 'bg-sky-900/60'}`} />
          ))}
        </div>
      </div>
      <div key={step} className={dir === 'r' ? 'anim-slide-r' : 'anim-slide-l'}>
        <Panel title={cur.title} className="mt-6" open>{cur.body}</Panel>
      </div>
      <div className="mt-auto flex gap-3 pt-6">
        {step > 0 && <Btn variant="ghost" sfx="back" onClick={() => go(step - 1)}>Back</Btn>}
        {cur.skippable && <Btn variant="ghost" sfx="next" onClick={() => go(step + 1)}>Skip</Btn>}
        {!cur.custom && (
          <Btn className="flex-1" sfx={last ? 'none' : 'next'} sfxLevel={step} disabled={cur.valid === false} onClick={() => (last ? finish() : go(step + 1))}>
            {last ? 'Complete Registration' : 'Continue'}
          </Btn>
        )}
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><span className="text-mute">{k}</span><span className="text-right text-ink">{v}</span></div>
}

function AssessmentReveal({ s, onEnter }: { s: GameState; onEnter: () => void }) {
  const [shown, setShown] = useState(false)
  const [stats, setStats] = useState(0)
  useEffect(() => {
    if (!shown) return
    play('reveal')
    const timers = STAT_IDS.map((_, i) => window.setTimeout(() => { setStats(i + 1); play('stat', i) }, 650 + i * 160))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [shown])
  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-full max-w-md flex-col gap-4 px-4">
      <div className="screen-flash" aria-hidden />
      <Panel title="Notification" className="mt-5" open>
        <SystemText sound className="text-ink" text={`[Assessment complete. Player ${s.profile.name}, your journey begins now.]`} onDone={() => setShown(true)} />
      </Panel>
      {shown && (
        <>
          <Panel className="anim-rise"><div className="flex items-center gap-4">
            <RankEmblem rank="E" size={84} />
            <div>
              <div className="sys-title text-xs text-mute">Rank assigned</div>
              <div className="sys-title text-3xl text-ink">E-Rank</div>
              <div className="text-sm text-mute">Everyone begins here. Your growth will decide the rest.</div>
            </div>
          </div></Panel>
          <Panel title="Status" className="mt-3" open>
            <div className="grid gap-3">
              {STAT_IDS.map((id, i) => (
                <div key={id} className={i < stats ? 'anim-rise' : 'opacity-0'}>
                  <div className="flex justify-between text-sm"><span>{STAT_LABEL[id]}</span><span className="sys-title text-glow">Lv {statLevel(s.stats[id])}</span></div>
                </div>
              ))}
            </div>
          </Panel>
          <div className="mt-auto pt-2">
            <Btn className="w-full" sfx="complete" onClick={onEnter}>Accept · Enter the System</Btn>
          </div>
        </>
      )}
    </div>
  )
}

function weightKgOf(d: Draft) {
  const w = Number(d.weight)
  return d.units === 'imperial' ? w * KG_PER_LB : w
}
