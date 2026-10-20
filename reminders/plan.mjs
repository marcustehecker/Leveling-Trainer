// Pure decision logic for reminders, kept separate so it can be tested without Firebase.

const WORKOUT_LABEL = { push: 'Push', pull: 'Pull', lower: 'Lower Body', upper: 'Upper Body', full: 'Full Body', cardio: 'Cardio' }
export const EVENING = '20:00'
const WINDOW_MIN = 180

/** Local date, minutes since midnight and weekday for an instant in a time zone. */
export function localNow(at, tz) {
  let parts
  try {
    parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
    }).formatToParts(at).map((p) => [p.type, p.value]))
  } catch {
    return localNow(at, 'UTC')
  }
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute), weekday: wd }
}

const toMin = (hhmm) => { const [h, m] = String(hhmm || '08:00').split(':').map(Number); return (h || 0) * 60 + (m || 0) }
const inWindow = (now, at) => now >= toMin(at) && now < toMin(at) + WINDOW_MIN

/**
 * Which notifications are due for one subscriber right now.
 * `sub` is the pushSubs doc, `state` the parsed save (or null).
 */
export function dueMessages(sub, state, at) {
  const now = localNow(at, sub.tz || 'UTC')
  const out = []
  const profile = state?.profile
  const training = !!profile?.trainingDays?.includes(now.weekday)
  const label = WORKOUT_LABEL[profile?.routine?.[now.weekday]] ?? 'Training'
  const trained = !!state?.workouts?.some((w) => w.date === now.date)
  const sick = !!state?.sickDays?.includes(now.date)

  if (sub.morning && inWindow(now.minutes, sub.morning) && sub.sentMorning !== now.date) {
    out.push({
      slot: 'sentMorning', date: now.date,
      payload: {
        title: 'THE SYSTEM',
        body: training
          ? `[Daily Quest has arrived.] Today: ${label}. Complete it to keep your XP.`
          : '[Daily Quest has arrived.] Rest day. Complete the Recovery Protocol.',
        tag: 'daily-quest',
      },
    })
  }
  if (sub.evening && inWindow(now.minutes, EVENING) && sub.sentEvening !== now.date
    && training && !trained && !sick && state?.createdDate !== now.date) {
    out.push({
      slot: 'sentEvening', date: now.date,
      payload: { title: 'THE SYSTEM · WARNING', body: '[Planned training not completed.] Finish today’s workout before midnight or XP will be lost.', tag: 'penalty-warning' },
    })
  }
  return out
}
