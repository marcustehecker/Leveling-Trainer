// Synthesized System sound effects (Web Audio, no audio files).
// Every button plays a sound automatically; set data-sfx on a button to pick a
// different one, or data-sfx="none" to silence it.

export type Sfx = 'tap' | 'select' | 'deselect' | 'next' | 'back' | 'deny' | 'complete' | 'reveal' | 'stat' | 'type'

const KEY = 'the-system:sfx'
let ctx: AudioContext | null = null
let master: GainNode | null = null
let enabled = true
try { enabled = localStorage.getItem(KEY) !== 'off' } catch { /* storage blocked */ }

export const soundOn = () => enabled
export function setSoundOn(on: boolean) {
  enabled = on
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* storage blocked */ }
  if (on) play('select')
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
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
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

/** Filtered noise sweep: the "window opening" whoosh. */
function whoosh(a: AudioContext, { at = 0, dur = 0.22, from = 600, to = 4000, vol = 0.12 } = {}) {
  const t = a.currentTime + at
  const len = Math.ceil(a.sampleRate * dur)
  const buf = a.createBuffer(1, len, a.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = a.createBufferSource()
  src.buffer = buf
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

/** A glassy chime: sine plus a quiet octave shimmer. */
function chime(a: AudioContext, f: number, at = 0, dur = 0.35, vol = 0.22) {
  tone(a, { f, at, dur, vol })
  tone(a, { f: f * 2.005, at, dur: dur * 0.7, vol: vol * 0.25 })
}

let lastType = 0

export function play(kind: Sfx) {
  if (!enabled) return
  const a = audio()
  if (!a || !master) return
  switch (kind) {
    case 'tap':
      tone(a, { f: 1400, to: 900, dur: 0.06, vol: 0.18, type: 'triangle' })
      break
    case 'select':
      tone(a, { f: 880, dur: 0.08, vol: 0.2, type: 'triangle' })
      chime(a, 1318, 0.05, 0.22, 0.18)
      break
    case 'deselect':
      tone(a, { f: 990, to: 620, dur: 0.1, vol: 0.16, type: 'triangle' })
      break
    case 'next':
      whoosh(a, { dur: 0.2, vol: 0.1 })
      chime(a, 784, 0.03, 0.25, 0.18)
      chime(a, 1175, 0.09, 0.32, 0.2)
      break
    case 'back':
      whoosh(a, { dur: 0.16, from: 3000, to: 500, vol: 0.08 })
      tone(a, { f: 700, to: 460, dur: 0.12, vol: 0.16, type: 'triangle' })
      break
    case 'deny':
      tone(a, { f: 160, dur: 0.16, vol: 0.2, type: 'square' })
      tone(a, { f: 150, at: 0.09, dur: 0.16, vol: 0.18, type: 'square' })
      break
    case 'stat':
      tone(a, { f: 1046, dur: 0.07, vol: 0.14, type: 'triangle' })
      chime(a, 2093, 0.03, 0.18, 0.08)
      break
    case 'type': {
      const now = performance.now()
      if (now - lastType < 45) return
      lastType = now
      tone(a, { f: 2400 + Math.random() * 500, dur: 0.018, vol: 0.035, type: 'square', attack: 0.001 })
      break
    }
    case 'reveal':
      whoosh(a, { dur: 0.5, from: 300, to: 6000, vol: 0.12 })
      tone(a, { f: 55, to: 40, dur: 0.6, vol: 0.4 })
      chime(a, 1568, 0.25, 0.6, 0.12)
      break
    case 'complete': {
      // Low impact, then a rising arpeggio with a sustained shimmer.
      tone(a, { f: 70, to: 38, dur: 0.7, vol: 0.5 })
      whoosh(a, { dur: 0.6, from: 400, to: 7000, vol: 0.12 })
      ;[523, 659, 784, 1046, 1318].forEach((f, i) => chime(a, f, 0.08 + i * 0.07, 0.6, 0.18))
      tone(a, { f: 1046, at: 0.45, dur: 1.2, vol: 0.1, attack: 0.08 })
      tone(a, { f: 1568, at: 0.45, dur: 1.2, vol: 0.06, attack: 0.08 })
      break
    }
  }
}

/** Plays a sound for every button press in the app. Capture phase runs before
 * React updates, so aria-pressed still holds the pre-click state. */
export function installButtonSounds() {
  document.addEventListener('click', (e) => {
    const el = (e.target as Element | null)?.closest?.('button, [role="button"], a[href], input[type="checkbox"], select')
    if (!el) return
    const set = el.getAttribute('data-sfx') as Sfx | 'none' | null
    if (set === 'none') return
    if (set) return play(set)
    const pressed = el.getAttribute('aria-pressed')
    play(pressed === 'false' ? 'select' : pressed === 'true' ? 'deselect' : 'tap')
  }, true)
}
