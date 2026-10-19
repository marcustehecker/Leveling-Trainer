import { useRef, useState } from 'react'
import * as B from '../core/balance'
import { availableTitles, equipTitle, sickDaysUsed, toggleSickDay, updateProfile } from '../core/engine'
import { WEEKDAY_SHORT } from '../core/dates'
import type { Equipment, GameState, Goal } from '../core/types'
import { Btn, Panel } from '../ui/components'
import { advanceTo } from '../core/engine'
import { exportBackup, nowIso, readBackup, todayKey } from '../store'
import { cloudEnabled, deleteAccount, signOutAccount, type Account } from '../cloud'
import { LegalSheet } from './Legal'
import { setSoundOn, soundOn } from '../sfx'

const EQUIP: { v: Equipment; label: string }[] = [
  { v: 'none', label: 'Bodyweight' }, { v: 'dumbbells', label: 'Dumbbells' }, { v: 'bands', label: 'Bands' },
  { v: 'pullupBar', label: 'Pull-up bar' }, { v: 'gym', label: 'Full gym' },
]
const GOAL_LABEL: Record<Goal, string> = {
  strength: 'Strength', muscle: 'Muscle', endurance: 'Endurance', fatloss: 'Fat loss', mobility: 'Mobility',
  technique: 'Technique', consistency: 'Consistency', general: 'General fitness',
}
const profileGoals = (s: GameState): Goal[] => s.profile.goals ?? (s.profile.goal ? [s.profile.goal] : ['general'])

export function HunterTab({ s, update, commit, account, wipe }: { s: GameState; update: (fn: (s: GameState) => GameState) => void; commit: (s: GameState | null) => void; account: Account | null; wipe: () => Promise<void> }) {
  const today = todayKey()
  const [msg, setMsg] = useState<string | null>(null)
  const [days, setDays] = useState(s.profile.trainingDays)
  const [equip, setEquip] = useState(s.profile.equipment)
  const [minutes, setMinutes] = useState(s.profile.sessionMinutes)
  const [bedtime, setBedtime] = useState(s.profile.bedtime ?? '')
  const [name, setName] = useState(s.profile.name)
  const [goals, setGoals] = useState<Goal[]>(profileGoals(s))
  const [sound, setSound] = useState(soundOn())
  const fileRef = useRef<HTMLInputElement>(null)
  const [legal, setLegal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const sick = s.sickDays.includes(today)
  const titles = availableTitles(s)
  const dirty = name !== s.profile.name || JSON.stringify([...goals].sort()) !== JSON.stringify([...profileGoals(s)].sort()) || minutes !== s.profile.sessionMinutes || bedtime !== (s.profile.bedtime ?? '') ||
    JSON.stringify([...days].sort()) !== JSON.stringify([...s.profile.trainingDays].sort()) || JSON.stringify(equip) !== JSON.stringify(s.profile.equipment)

  const toggleEquip = (v: Equipment) => {
    if (v === 'none') return setEquip(['none'])
    const rest = equip.filter((e) => e !== 'none')
    const next = rest.includes(v) ? rest.filter((e) => e !== v) : [...rest, v]
    setEquip(next.length ? next : ['none'])
  }

  return (
    <div className="grid gap-7 pt-3">
      {cloudEnabled && account && (
        <Panel title="Account">
          <div className="flex items-center gap-3">
            {account.photo && <img src={account.photo} alt="" referrerPolicy="no-referrer" className="h-10 w-10 rounded-full border border-sky-200/60" />}
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-white">{account.name ?? 'Player'}</div>
              <div className="truncate text-xs text-mute">{account.email}</div>
            </div>
            <Btn variant="ghost" onClick={() => { if (confirm('Sign out? Your progress stays saved to your account.')) void signOutAccount() }}>Sign out</Btn>
          </div>
          <p className="mt-3 text-xs text-mute">Progress is saved to your Google account and syncs to any device you sign in on.</p>
        </Panel>
      )}
      <Panel title="Condition" tone={sick ? undefined : undefined}>
        <p className="text-sm text-mute">Feeling sick or injured? Mark today and no XP will be lost. Never train through pain to protect your rank. {B.SICK_DAYS_PER_30 - sickDaysUsed(s, today)} of {B.SICK_DAYS_PER_30} left this month.</p>
        <Btn className="mt-3 w-full" variant={sick ? 'ghost' : 'primary'} onClick={() => {
          const r = toggleSickDay(s, today, nowIso())
          if (r.error) setMsg(r.error); else { update(() => r.state); setMsg(null) }
        }}>{sick ? 'Clear Sick / Injured Status' : 'Mark Today Sick / Injured'}</Btn>
        {msg && <p className="mt-2 text-sm text-danger">{msg}</p>}
      </Panel>

      {titles.length > 0 && (
        <Panel title="Titles">
          <div className="flex flex-wrap gap-2">
            {[null, ...titles].map((t) => (
              <button key={t ?? 'none'} onClick={() => update((x) => equipTitle(x, t))}
                className={`min-h-10 rounded border px-3 text-sm ${s.equippedTitle === t ? 'border-rare bg-rare/15 text-rare' : 'border-edge text-mute'}`}>{t ?? 'None'}</button>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Hunter Profile">
        <div className="grid gap-4">
          <label className="grid gap-1 text-sm"><span className="sys-title text-xs text-mute">Name</span>
            <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} className="h-11 rounded border border-edge bg-panel-2 px-3 outline-none focus:border-sys" /></label>
          <div className="grid gap-1"><span className="sys-title text-xs text-mute">Goals</span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(GOAL_LABEL) as Goal[]).filter((g) => g !== 'fatloss' || !['13-15', '16-17'].includes(s.profile.ageRange)).map((g) => (
                <button key={g} aria-pressed={goals.includes(g)} onClick={() => setGoals(goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g])}
                  className={`min-h-10 rounded border px-3 text-sm ${goals.includes(g) ? 'border-sys bg-sys/20' : 'border-edge text-mute'}`}>{GOAL_LABEL[g]}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-1"><span className="sys-title text-xs text-mute">Training days</span>
            <div className="grid grid-cols-7 gap-1">
              {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
                <button key={wd} aria-pressed={days.includes(wd)} onClick={() => setDays(days.includes(wd) ? days.filter((x) => x !== wd) : [...days, wd])}
                  className={`h-11 rounded border text-xs ${days.includes(wd) ? 'border-sys bg-sys/20' : 'border-edge text-mute'}`}>{WEEKDAY_SHORT[wd]}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-1"><span className="sys-title text-xs text-mute">Equipment</span>
            <div className="flex flex-wrap gap-2">
              {EQUIP.map((e) => (
                <button key={e.v} aria-pressed={equip.includes(e.v)} onClick={() => toggleEquip(e.v)}
                  className={`min-h-10 rounded border px-3 text-sm ${equip.includes(e.v) ? 'border-sys bg-sys/20' : 'border-edge text-mute'}`}>{e.label}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-1"><span className="sys-title text-xs text-mute">Session length</span>
            <div className="grid grid-cols-4 gap-2">
              {[20, 30, 45, 60].map((m) => (
                <button key={m} onClick={() => setMinutes(m)} className={`h-10 rounded border text-sm ${minutes === m ? 'border-sys bg-sys/20' : 'border-edge text-mute'}`}>{m}m</button>
              ))}
            </div>
          </div>
          <label className="grid gap-1 text-sm"><span className="sys-title text-xs text-mute">Bedtime (blank turns off the sleep quest)</span>
            <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} className="h-11 rounded border border-edge bg-panel-2 px-3 outline-none focus:border-sys" /></label>
          <Btn disabled={!dirty || days.length < 2 || goals.length === 0 || name.trim().length < 2} onClick={() => {
            update((x) => updateProfile(x, { name: name.trim(), goals, trainingDays: [...days].sort(), equipment: equip, sessionMinutes: minutes, bedtime: bedtime || undefined }, undefined, today, nowIso()))
          }}>Save Changes</Btn>
          <p className="text-xs text-mute">Schedule changes apply from today. Today's untouched quests are reissued.</p>
        </div>
      </Panel>

      <Panel title="Settings">
        <button type="button" role="switch" aria-checked={sound} data-sfx="none" onClick={() => { setSoundOn(!sound); setSound(!sound) }}
          className="flex w-full items-center justify-between gap-3 text-left">
          <span><span className="block text-sm">Sound effects</span><span className="block text-xs text-mute">Button and System sounds. They follow your phone's silent switch.</span></span>
          <span className={`relative h-7 w-12 shrink-0 rounded-full border transition ${sound ? 'border-sky-200 bg-sys/40' : 'border-edge bg-panel-2'}`}>
            <span className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white transition-all ${sound ? 'left-6' : 'left-0.5'}`} />
          </span>
        </button>
      </Panel>

      <Panel title="Data">
        <p className="mb-3 text-sm text-mute">{cloudEnabled && account ? 'Progress syncs to your account automatically. A backup file is an extra safety copy.' : 'Everything is stored only on this device. Add the site to your Home Screen so iOS keeps it, and download a backup now and then.'}</p>
        <div className="grid gap-2">
          <Btn variant="ghost" onClick={() => exportBackup(s)}>Download Backup</Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>Restore Backup</Btn>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            try {
              const restored = await readBackup(f)
              if (confirm('Replace your current progress with this backup?')) commit(advanceTo(restored, today, nowIso()))
            } catch (err) { setMsg((err as Error).message) }
          }} />
          <Btn variant="danger" onClick={() => { if (confirm('Erase all progress and start over? This cannot be undone.')) commit(null) }}>Reset Everything</Btn>
          {cloudEnabled && account && (
            <Btn variant="danger" disabled={deleting} onClick={async () => {
              if (!confirm('Permanently delete your account and all progress? This cannot be undone.')) return
              if (!confirm('Are you sure? Your hunter, ranks and history will be gone for good.')) return
              setDeleting(true)
              try { await wipe(); await deleteAccount(account.uid) } catch (e) { setMsg(`Delete failed: ${(e as Error).message}`); setDeleting(false) }
            }}>{deleting ? 'Deleting…' : 'Delete My Account'}</Btn>
          )}
          <Btn variant="ghost" onClick={() => setLegal(true)}>Privacy & Terms</Btn>
        </div>
      </Panel>

      <Panel title="How the System Works">
        <ul className="grid list-disc gap-1.5 pl-4 text-xs text-mute">
          <li>Workouts and quests earn XP. Your level comes from XP, so it goes down if XP does.</li>
          <li>Missing a planned training day costs {B.MISS_LOSS.join(' / ')} XP for consecutive misses. A Penalty Quest the next day restores {B.PENALTY_REFUND_RATIO * 100}%.</li>
          <li>{B.INACTIVITY_GRACE_DAYS}+ days with nothing logged costs {B.INACTIVITY_LOSS} XP per rest day after that.</li>
          <li>Rest days and sick days never cost XP.</li>
          <li>Rank up needs XP, active weeks, personal records and a Rank Trial.</li>
          <li>Below your rank's XP threshold you get {B.DEMOTION_WARNING_DAYS} days to recover before demotion.</li>
          <li>Daily XP is capped at {B.DAILY_XP_CAP}. Extra workouts the same day earn less.</li>
          <li>This is a game score, not medical advice.</li>
        </ul>
      </Panel>
      {legal && <LegalSheet onClose={() => setLegal(false)} />}
    </div>
  )
}
