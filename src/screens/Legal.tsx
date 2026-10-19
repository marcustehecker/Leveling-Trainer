import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Btn, Corners } from '../ui/components'
import type { Sfx } from '../sfx'

const UPDATED = 'October 19, 2026'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-1.5">
      <h3 className="sys-title text-sm text-glow">{title}</h3>
      <div className="grid gap-1.5 text-sm leading-relaxed text-sky-100/90">{children}</div>
    </section>
  )
}

export function LegalText() {
  return (
    <div className="grid gap-5">
      <p className="text-xs text-mute">Last updated {UPDATED}</p>

      <Section title="Safety">
        <p>THE SYSTEM is a game that makes exercise feel like an RPG. It is <b>not medical advice</b> and does not replace a doctor, physical therapist, dietitian or coach.</p>
        <p>Talk to a doctor before starting if you have a heart, lung, joint or other health condition, are pregnant, are recovering from an injury, or are unsure whether exercise is safe for you.</p>
        <p>Train within your limits. Stop if you feel pain, dizziness, chest pain or shortness of breath beyond normal effort. Never train through pain or illness to protect XP, a streak or a rank. Use the Sick / Injured option instead.</p>
        <p>Workout suggestions, quest targets and nutrition tips are general and automatically generated. You are responsible for choosing exercises and loads that are safe for you. If you are under 18, train with a parent, guardian or coach who knows what you are doing.</p>
      </Section>

      <Section title="Who can use it">
        <p>You must be <b>13 or older</b>. If you are under 18, a parent or guardian should know you are using it.</p>
      </Section>

      <Section title="What we store">
        <p>When you sign in with Google, the System receives your Google account ID, name, email address and profile picture so it can identify your save. It never sees your Google password.</p>
        <p>Your save contains game progress and what you entered at registration: hunter name, age range, optional height and weight, experience, goals, equipment, schedule, assessment results, diet notes, workouts and quest history.</p>
        <p>There are no ads, no tracking or analytics, no location data and no access to your contacts, photos or email. Your data is never sold or shared.</p>
      </Section>

      <Section title="Where it is kept">
        <p>A copy is kept on your device and, when signed in, in Google Firebase (Cloud Firestore). Database rules allow only your signed-in account to read or change your save.</p>
      </Section>

      <Section title="Deleting your data">
        <p>Hunter → Delete My Account permanently erases your cloud save, your account and the copy on this device. Hunter → Reset Everything erases progress but keeps your account.</p>
      </Section>

      <Section title="No guarantees">
        <p>The app is provided free and “as is”, without warranties. To the extent the law allows, its makers are not liable for injuries, losses or damages that come from using it. Progress could be lost through bugs or outages, so use Download Backup if your save matters to you.</p>
      </Section>

      <Section title="Fan project">
        <p>THE SYSTEM is an unofficial fan-made project inspired by the Solo Leveling series. It is not affiliated with or endorsed by the series' creators or publishers. All interface art and text in the app are original.</p>
      </Section>

      <Section title="Changes">
        <p>If these terms change, the app will ask you to accept the new version.</p>
      </Section>
    </div>
  )
}

/** Full-screen reader for the terms, opened from the login screen or Hunter tab. */
export function LegalSheet({ onClose }: { onClose: () => void }) {
  // Portal so it sits above the header and tab bar, outside the page's stacking context.
  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#01040f]/90 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Privacy and terms">
      <div className="sys-panel safe-bottom mx-auto max-w-md px-5 pb-6 pt-0">
        <Corners />
        <header className="relative -mt-3.5 mb-5 flex justify-center"><h2 className="sys-plaque sys-title glow-text text-sm text-white">Privacy & Terms</h2></header>
        <LegalText />
        <Btn className="mt-6 w-full" onClick={onClose}>Close</Btn>
      </div>
    </div>,
    document.body,
  )
}

/** Required acknowledgment: 13+ and the safety terms. */
export function TermsConsent({ onAccept, cta = 'Accept', sfx }: { onAccept: () => void; cta?: string; sfx?: Sfx | 'none' }) {
  const [age, setAge] = useState(false)
  const [safety, setSafety] = useState(false)
  const [reading, setReading] = useState(false)
  const box = (on: boolean) => `mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border text-xs ${on ? 'border-ok bg-ok/20 text-ok' : 'border-sky-200/70'}`
  return (
    <div className="grid gap-4">
      <button type="button" className="flex gap-3 text-left text-sm" onClick={() => setAge(!age)} aria-pressed={age} data-sfx={age ? 'deselect' : 'select'}>
        <span className={box(age)} aria-hidden>{age ? '✓' : ''}</span>
        <span>I am 13 or older. If I'm under 18, a parent or guardian knows I'm using this.</span>
      </button>
      <button type="button" className="flex gap-3 text-left text-sm" onClick={() => setSafety(!safety)} aria-pressed={safety} data-sfx={safety ? 'deselect' : 'select'}>
        <span className={box(safety)} aria-hidden>{safety ? '✓' : ''}</span>
        <span>I understand THE SYSTEM is a game, not medical advice. I'll train within my limits, stop if something hurts, and check with a doctor if I have a health condition.</span>
      </button>
      <p className="text-xs text-mute">By continuing you agree to the <button type="button" className="text-sys underline" onClick={() => setReading(true)}>Privacy & Terms</button>.</p>
      <Btn disabled={!age || !safety} sfx={sfx} onClick={onAccept}>{cta}</Btn>
      {reading && <LegalSheet onClose={() => setReading(false)} />}
    </div>
  )
}
