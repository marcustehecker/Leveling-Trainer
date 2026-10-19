import { useState, type ReactNode } from 'react'
import { createGame, STAT_IDS, statLevel } from '../core/engine'
import { WEEKDAY_SHORT } from '../core/dates'
import type { AgeRange, Assessment, Equipment, Experience, GameState, Goal, Profile } from '../core/types'
import { Bar, Btn, Panel, RankEmblem, Stepper, SystemText } from '../ui/components'
import { KG_PER_LB, nowIso, todayKey } from '../store'
import { STAT_LABEL } from './labels'
import { TermsConsent } from './Legal'

type Draft = Omit<Profile, 'heightCm' | 'weightKg'> & { height: string; weight: string; assessment: Assessment }

const initial: Draft = {
  name: '', ageRange: '18-29', units: 'imperial', experience: 'none', goal: 'general', equipment: ['none'],
  trainingDays: [1, 3, 5], sessionMinutes: 30, diet: { preferences: '', allergies: '' }, bedtime: '22:30',
  height: '', weight: '', assessment: { pushups: 5, plankSeconds: 30, cardioLevel: 2, mobilityLevel: 2 },
}

function Choice<T extends string | number>({ options, value, onChange, multi }: {
  options: { v: T; label: string; sub?: string }[]; value: T | T[]; onChange: (v: T) => void; multi?: boolean
}) {
  const on = (v: T) => (multi ? (value as T[]).includes(v) : value === v)
  return (
    <div className="grid gap-2">
      {options.map((o) => (
        <button key={String(o.v)} type="button" onClick={() => onChange(o.v)} aria-pressed={on(o.v)}
          className={`min-h-12 rounded border px-4 py-2 text-left transition ${on(o.v) ? 'border-sys bg-sys/15 text-ink' : 'border-edge bg-panel-2/60 text-mute'}`}>
          <div className="font-medium">{o.label}</div>
          {o.sub && <div className="text-xs text-mute">{o.sub}</div>}
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
  const [d, setD] = useState<Draft>({ ...initial, name: defaultName })
  const [result, setResult] = useState<GameState | null>(null)
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }))
  const setA = (patch: Partial<Assessment>) => setD((x) => ({ ...x, assessment: { ...x.assessment, ...patch } }))
  const minor = d.ageRange === '13-15' || d.ageRange === '16-17'

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const steps: { title: string; body: ReactNode; valid?: boolean; custom?: boolean }[] = [
    {
      title: 'Player Detected',
      body: (
        <div className="grid gap-5">
          <SystemText className="text-lg leading-relaxed text-ink" text="[You have met the conditions to become a Player. Will you accept?] Enter your Hunter name to register." />
          <Field label="Hunter name">
            <input className={input} value={d.name} maxLength={24} placeholder="Enter your name" onChange={(e) => set({ name: e.target.value })} autoFocus />
          </Field>
        </div>
      ),
      valid: d.name.trim().length >= 2,
    },
    {
      title: 'Age Bracket',
      body: (
        <Choice<AgeRange> value={d.ageRange} onChange={(v) => set({ ageRange: v })}
          options={(['13-15', '16-17', '18-29', '30-44', '45-59', '60+'] as AgeRange[]).map((v) => ({ v, label: v }))} />
      ),
    },
    {
      title: 'Body Data',
      body: (
        <div className="grid gap-4">
          <p className="text-sm text-mute">Used only for context, never to judge you. Both are optional.</p>
          <Choice<'metric' | 'imperial'> value={d.units} onChange={(v) => set({ units: v })}
            options={[{ v: 'imperial', label: 'Imperial (in, lb)' }, { v: 'metric', label: 'Metric (cm, kg)' }]} />
          <Field label={d.units === 'imperial' ? 'Height (inches)' : 'Height (cm)'}>
            <input className={input} inputMode="decimal" value={d.height} onChange={(e) => set({ height: e.target.value })} placeholder="Optional" />
          </Field>
          {!minor && (
            <Field label={d.units === 'imperial' ? 'Weight (lb)' : 'Weight (kg)'}>
              <input className={input} inputMode="decimal" value={d.weight} onChange={(e) => set({ weight: e.target.value })} placeholder="Optional, skip anytime" />
            </Field>
          )}
        </div>
      ),
    },
    {
      title: 'Combat Experience',
      body: (
        <Choice<Experience> value={d.experience} onChange={(v) => set({ experience: v })} options={[
          { v: 'none', label: 'None yet', sub: 'New to training' },
          { v: 'novice', label: 'Under 6 months', sub: 'Some workouts, still learning' },
          { v: 'intermediate', label: '6 months – 2 years', sub: 'Train fairly regularly' },
          { v: 'advanced', label: '2+ years', sub: 'Consistent, know the main lifts' },
        ]} />
      ),
    },
    {
      title: 'Primary Objective',
      body: (
        <Choice<Goal> value={d.goal} onChange={(v) => set({ goal: v })} options={[
          { v: 'strength', label: 'Build strength' },
          { v: 'endurance', label: 'Improve endurance' },
          { v: 'technique', label: 'Learn proper technique' },
          { v: 'consistency', label: 'Build a consistent routine' },
          { v: 'general', label: 'General fitness' },
        ]} />
      ),
    },
    {
      title: 'Equipment',
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
      body: (
        <div className="grid gap-5">
          <Field label="Training days">
            <div className="grid grid-cols-7 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
                <button key={wd} type="button" aria-pressed={d.trainingDays.includes(wd)} onClick={() => set({ trainingDays: toggle(d.trainingDays, wd) })}
                  className={`h-12 rounded border text-sm ${d.trainingDays.includes(wd) ? 'border-sys bg-sys/20 text-ink' : 'border-edge text-mute'}`}>
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
      custom: true,
      body: (
        <div className="grid gap-4">
          <p className="text-center text-sm text-glow">[Before the System binds to you, confirm the following.]</p>
          <TermsConsent cta="Complete Registration" onAccept={() => finish()} />
        </div>
      ),
    },
  ]

  function finish() {
    const h = Number(d.height)
    const w = Number(d.weight)
    const profile: Profile = {
      name: d.name.trim(), ageRange: d.ageRange, units: d.units, experience: d.experience, goal: d.goal,
      equipment: d.equipment, trainingDays: [...d.trainingDays].sort(), sessionMinutes: d.sessionMinutes,
      diet: d.diet, bedtime: d.bedtime, acceptedTermsAt: nowIso(),
      heightCm: h > 0 ? (d.units === 'imperial' ? h * 2.54 : h) : undefined,
      weightKg: w > 0 && !minor ? (d.units === 'imperial' ? w * KG_PER_LB : w) : undefined,
    }
    setResult(createGame(profile, d.assessment, todayKey(), nowIso()))
  }

  if (result) return <AssessmentReveal s={result} onEnter={() => onDone(result)} />

  const cur = steps[step]
  const last = step === steps.length - 1
  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-full max-w-md flex-col px-4">
      <div className="mb-4 mt-2 flex items-center gap-3">
        <span className="sys-title text-xs text-mute">Registration</span>
        <div className="flex-1"><Bar value={step + 1} max={steps.length} height={4} label="Registration progress" /></div>
        <span className="sys-title text-xs text-mute">{step + 1}/{steps.length}</span>
      </div>
      <Panel title={cur.title} className="mt-4" open key={step}>{cur.body}</Panel>
      <div className="mt-auto flex gap-3 pt-6">
        {step > 0 && <Btn variant="ghost" onClick={() => setStep(step - 1)}>Back</Btn>}
        {!cur.custom && (
          <Btn className="flex-1" disabled={cur.valid === false} onClick={() => (last ? finish() : setStep(step + 1))}>
            {last ? 'Complete Registration' : 'Continue'}
          </Btn>
        )}
      </div>
    </div>
  )
}

function AssessmentReveal({ s, onEnter }: { s: GameState; onEnter: () => void }) {
  const [shown, setShown] = useState(false)
  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-full max-w-md flex-col gap-4 px-4">
      <Panel title="Notification" className="mt-5" open>
        <SystemText className="text-ink" text={`[Assessment complete. Player ${s.profile.name}, your journey begins now.]`} onDone={() => setShown(true)} />
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
                <div key={id} className="anim-rise" style={{ animationDelay: `${i * 120}ms` }}>
                  <div className="flex justify-between text-sm"><span>{STAT_LABEL[id]}</span><span className="sys-title text-glow">Lv {statLevel(s.stats[id])}</span></div>
                </div>
              ))}
            </div>
          </Panel>
          <div className="mt-auto pt-2">
            <Btn className="w-full" onClick={onEnter}>Accept · Enter the System</Btn>
          </div>
        </>
      )}
    </div>
  )
}
