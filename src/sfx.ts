// Synthesized System sound effects (Web Audio, no audio files).
// Every button plays a sound automatically; set data-sfx on a button to pick a
// different one, or data-sfx="none" to silence it.

export type Sfx = 'tap' | 'select' | 'deselect' | 'next' | 'back' | 'tab' | 'toggleOn' | 'toggleOff' | 'deny' | 'complete' | 'reveal' | 'stat' | 'type' | 'levelup' | 'rankup' | 'record'

const KEY = 'the-system:sfx'
let ctx: AudioContext | null = null
let master: GainNode | null = null
let enabled = true
try { enabled = localStorage.getItem(KEY) !== 'off' } catch { /* storage blocked */ }

export const soundOn = () => enabled
export function setSoundOn(on: boolean) {
  enabled = on
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* storage blocked */ }
  if (on) play('toggleOn')
}

function audio(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    // Light compression keeps stacked tones punchy without clipping.
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 4
    master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(comp).connect(ctx.destination)
    // Short filtered echo gives every sound a bit of space.
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.13
    const fb = ctx.createGain()
    fb.gain.value = 0.28
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 3200
    const wet = ctx.createGain()
    wet.gain.value = 0.22
    master.connect(delay).connect(lp).connect(fb).connect(delay)
    lp.connect(wet).connect(comp)
  }
  if (ctx.state !== 'running') void ctx.resume()
  return ctx
}

/** iOS only lets audio start inside a touch. Play one silent sample on the first
 * touch so the context is unlocked before the first real sound. */
function unlock() {
  const a = audio()
  if (!a) return
  const src = a.createBufferSource()
  src.buffer = a.createBuffer(1, 1, 22050)
  src.connect(a.destination)
  src.start(0)
  if (a.state === 'running') for (const ev of ['touchstart', 'touchend', 'pointerdown', 'keydown']) document.removeEventListener(ev, unlock, true)
}

/** One enveloped oscillator, optionally gliding from `f` to `to`. */
function tone(a: AudioContext, { f, to, at = 0, dur = 0.12, vol = 0.3, type = 'sine', attack = 0.004 }: {
  f: number; to?: number; at?: number; dur?: number; vol?: number; type?: OscillatorType; attack?: number
}) {
  const t = a.currentTime + at
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(f, t)
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(master!)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function noise(a: AudioContext, dur: number) {
  const len = Math.max(1, Math.ceil(a.sampleRate * dur))
  const buf = a.createBuffer(1, len, a.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = a.createBufferSource()
  src.buffer = buf
  return src
}

/** Filtered noise sweep: the "window opening" whoosh. */
function whoosh(a: AudioContext, { at = 0, dur = 0.22, from = 600, to = 4000, vol = 0.12 } = {}) {
  const t = a.currentTime + at
  const src = noise(a, dur)
  const bp = a.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.4
  bp.frequency.setValueAtTime(from, t)
  bp.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = a.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(bp).connect(g).connect(master!)
  src.start(t)
  src.stop(t + dur + 0.02)
}

/** A tiny bright transient that makes a press feel physical. */
function click(a: AudioContext, at = 0, vol = 0.18, freq = 5000) {
  const t = a.currentTime + at
  const src = noise(a, 0.012)
  const hp = a.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = freq
  const g = a.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.012)
  src.connect(hp).connect(g).connect(master!)
  src.start(t)
}

/** A soft low knock under the press. */
function thump(a: AudioContext, at = 0, vol = 0.35, f = 150) {
  tone(a, { f, to: 55, at, dur: 0.09, vol, attack: 0.002 })
}

/** A glassy chime: sine plus a quiet octave shimmer. */
function chime(a: AudioContext, f: number, at = 0, dur = 0.35, vol = 0.22) {
  tone(a, { f, at, dur, vol })
  tone(a, { f: f * 2.005, at, dur: dur * 0.7, vol: vol * 0.25 })
  tone(a, { f: f * 3.01, at, dur: dur * 0.35, vol: vol * 0.08 })
}

// Minor pentatonic from E5: any run of notes sounds musical.
const SCALE = [0, 3, 5, 7, 10]
const note = (i: number) => 659.25 * 2 ** ((12 * Math.floor(i / 5) + SCALE[((i % 5) + 5) % 5]) / 12)
const jitter = (f: number) => f * (1 + (Math.random() - 0.5) * 0.03)
const pickOne = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]

// Quick successive selections climb the scale like a combo, then reset.
let combo = 0
let lastPick = 0
function nextCombo() {
  const now = performance.now()
  combo = now - lastPick < 1400 ? Math.min(combo + 1, 9) : 0
  lastPick = now
  return combo
}

let lastType = 0
let lastTap = -1

export function play(kind: Sfx, level = 0) {
  if (!enabled) return
  const a = audio()
  if (!a || !master) return
  // Context still waking up: play as soon as it is running.
  if (a.state !== 'running') { void a.resume().then(() => { if (a.state === 'running') play(kind, level) }); return }
  switch (kind) {
    case 'tap': {
      click(a, 0, 0.12)
      thump(a, 0, 0.18, 170)
      // Rotate through three voicings so repeated taps never sound identical.
      lastTap = (lastTap + 1 + Math.floor(Math.random() * 2)) % 3
      if (lastTap === 0) tone(a, { f: jitter(1400), to: 950, dur: 0.07, vol: 0.16, type: 'triangle' })
      else if (lastTap === 1) { tone(a, { f: jitter(1046), dur: 0.06, vol: 0.12 }); tone(a, { f: jitter(1568), at: 0.025, dur: 0.08, vol: 0.1 }) }
      else tone(a, { f: jitter(1760), to: 1320, dur: 0.05, vol: 0.12, type: 'sine' })
      break
    }
    case 'select': {
      const c = nextCombo()
      click(a, 0, 0.14)
      thump(a, 0, 0.25)
      chime(a, note(c + 2), 0, 0.3, 0.2)
      chime(a, note(c + 4), 0.045, 0.38, 0.13)
      if (c >= 3) chime(a, note(c + 7), 0.09, 0.45, 0.07)
      break
    }
    case 'deselect': {
      const c = nextCombo()
      click(a, 0, 0.1, 3500)
      tone(a, { f: note(c + 2), to: note(c) * 0.75, dur: 0.14, vol: 0.15, type: 'triangle' })
      break
    }
    case 'next': {
      // The arpeggio starts higher on each step, so progress sounds like progress.
      const r = level
      whoosh(a, { dur: 0.24, vol: 0.11, to: 3000 + r * 400 })
      thump(a, 0, 0.3, 120)
      ;[0, 2, 4].forEach((k, i) => chime(a, note(r + k), 0.03 + i * 0.055, 0.32 + i * 0.06, 0.17))
      tone(a, { f: note(r) / 2, at: 0.03, dur: 0.4, vol: 0.08, type: 'triangle' })
      break
    }
    case 'back':
      whoosh(a, { dur: 0.18, from: 3000, to: 500, vol: 0.09 })
      click(a, 0, 0.1, 3000)
      chime(a, note(3), 0, 0.14, 0.13)
      chime(a, note(0), 0.06, 0.2, 0.13)
      break
    case 'tab': {
      const base = pickOne([2637, 2794, 2960])
      click(a, 0, 0.12, 6000)
      whoosh(a, { dur: 0.12, from: 2000, to: 9000, vol: 0.07 })
      tone(a, { f: base, dur: 0.22, vol: 0.06 })
      tone(a, { f: base * 1.007, dur: 0.22, vol: 0.06 })
      tone(a, { f: base / 2, dur: 0.12, vol: 0.08, type: 'triangle' })
      break
    }
    case 'toggleOn':
      click(a, 0, 0.12)
      chime(a, note(2), 0, 0.15, 0.15)
      chime(a, note(5), 0.07, 0.3, 0.17)
      break
    case 'toggleOff':
      click(a, 0, 0.1, 3500)
      tone(a, { f: note(4), at: 0, dur: 0.1, vol: 0.13, type: 'triangle' })
      tone(a, { f: note(0), at: 0.07, dur: 0.16, vol: 0.13, type: 'triangle' })
      break
    case 'deny':
      tone(a, { f: 160, dur: 0.16, vol: 0.2, type: 'square' })
      tone(a, { f: 150, at: 0.09, dur: 0.16, vol: 0.18, type: 'square' })
      break
    case 'stat':
      click(a, 0, 0.08, 6000)
      chime(a, note(5 + level), 0, 0.25, 0.14)
      tone(a, { f: note(5 + level) * 2, at: 0.02, dur: 0.12, vol: 0.05 })
      break
    case 'type': {
      const now = performance.now()
      if (now - lastType < 45) return
      lastType = now
      tone(a, { f: pickOne([2200, 2500, 2800, 3100]), dur: 0.016, vol: 0.03, type: 'square', attack: 0.001 })
      break
    }
    case 'reveal':
      whoosh(a, { dur: 0.6, from: 300, to: 7000, vol: 0.13 })
      tone(a, { f: 55, to: 38, dur: 0.8, vol: 0.45 })
      ;[0, 4, 7, 9].forEach((k, i) => chime(a, note(5 + k), 0.25 + i * 0.09, 0.7, 0.1))
      break
    case 'levelup': {
      // Beam sweep, impact on the flash, number roll, then the slam chord.
      whoosh(a, { at: 0.1, dur: 0.45, from: 300, to: 8000, vol: 0.14 })
      tone(a, { f: 65, to: 34, at: 0.45, dur: 0.9, vol: 0.6 })
      click(a, 0.45, 0.25, 2000)
      for (let i = 0; i < 8; i++) tone(a, { f: note(i + 3), at: 0.7 + i * 0.1, dur: 0.07, vol: 0.06, type: 'triangle' })
      ;[0, 4, 7, 9].forEach((k, i) => chime(a, note(k + 2), 1.0 + i * 0.03, 1.1, 0.16))
      tone(a, { f: note(2) / 2, at: 1.0, dur: 1.4, vol: 0.12, type: 'triangle', attack: 0.02 })
      tone(a, { f: note(11), at: 1.05, dur: 1.6, vol: 0.05, attack: 0.1 })
      break
    }
    case 'rankup': {
      // Rumble while the gate shakes, the doors grind open, impact, then a wide chord.
      tone(a, { f: 42, at: 0, dur: 1.6, vol: 0.35, attack: 0.4 })
      tone(a, { f: 44, at: 0, dur: 1.6, vol: 0.3, attack: 0.4 })
      whoosh(a, { at: 0.9, dur: 1.2, from: 150, to: 1800, vol: 0.16 })
      tone(a, { f: 80, to: 30, at: 1.45, dur: 1.2, vol: 0.65 })
      click(a, 1.45, 0.3, 1500)
      whoosh(a, { at: 1.45, dur: 0.8, from: 800, to: 9000, vol: 0.12 })
      ;[0, 2, 4, 7, 9, 12].forEach((k, i) => chime(a, note(k), 1.9 + i * 0.09, 1.6, 0.15))
      tone(a, { f: note(0) / 2, at: 1.9, dur: 2.2, vol: 0.14, type: 'triangle', attack: 0.05 })
      tone(a, { f: note(7), at: 2.3, dur: 2.0, vol: 0.06, attack: 0.3 })
      tone(a, { f: note(7) * 1.005, at: 2.3, dur: 2.0, vol: 0.05, attack: 0.3 })
      break
    }
    case 'record': {
      click(a, 0, 0.2, 2500)
      tone(a, { f: 90, to: 45, dur: 0.4, vol: 0.4 })
      ;[0, 2, 4, 7].forEach((k, i) => chime(a, note(k + 4), 0.05 + i * 0.07, 0.5, 0.17))
      tone(a, { f: note(11), at: 0.35, dur: 0.8, vol: 0.06, attack: 0.04 })
      break
    }
    case 'complete': {
      // Low impact, then a rising arpeggio with a sustained shimmer.
      tone(a, { f: 70, to: 36, dur: 0.8, vol: 0.55 })
      click(a, 0, 0.2, 2500)
      whoosh(a, { dur: 0.7, from: 400, to: 8000, vol: 0.13 })
      ;[0, 2, 4, 5, 7, 9].forEach((k, i) => chime(a, note(k), 0.08 + i * 0.065, 0.7, 0.17))
      tone(a, { f: note(5), at: 0.5, dur: 1.4, vol: 0.09, attack: 0.08 })
      tone(a, { f: note(9), at: 0.5, dur: 1.4, vol: 0.06, attack: 0.08 })
      tone(a, { f: note(9) * 1.006, at: 0.5, dur: 1.4, vol: 0.05, attack: 0.08 })
      break
    }
  }
}

/** Plays a sound for every button press in the app. Capture phase runs before
 * React updates, so aria-pressed still holds the pre-click state. */
export function installButtonSounds() {
  for (const ev of ['touchstart', 'touchend', 'pointerdown', 'keydown']) document.addEventListener(ev, unlock, { capture: true, passive: true })
  document.addEventListener('click', (e) => {
    const el = (e.target as Element | null)?.closest?.('button, [role="button"], [role="switch"], a[href], summary, input[type="checkbox"]')
    if (!el) return
    const set = el.getAttribute('data-sfx') as Sfx | 'none' | null
    if (set === 'none') return
    if (set) return play(set, Number(el.getAttribute('data-sfx-level') ?? 0))
    const pressed = el.getAttribute('aria-pressed')
    const checked = el.getAttribute('aria-checked')
    if (checked) return play(checked === 'false' ? 'toggleOn' : 'toggleOff')
    play(pressed === 'false' ? 'select' : pressed === 'true' ? 'deselect' : 'tap')
  }, true)
  document.addEventListener('change', (e) => { if ((e.target as Element | null)?.tagName === 'SELECT') play('select') }, true)
}
