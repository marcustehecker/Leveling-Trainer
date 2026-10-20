import { useState } from 'react'
import { RANK_XP } from '../core/balance'
import { currentRaid, demotionDaysLeft, levelInfo, powerRating, progressQuest, promotionStatus, questsFor, STAT_IDS, statLevel, statRank } from '../core/engine'
import { BOSS_BY_ID, RAID } from '../core/raids'
import type { GameState, Quest } from '../core/types'
import { Bar, Btn, Panel, RANK_COLOR, RANK_NAME, RankEmblem, Tag } from '../ui/components'
import { nowIso, todayKey } from '../store'
import { StreakBadge } from '../ui/StreakFlame'
import { STAT_ABBR, STAT_COLOR, STAT_LABEL } from './labels'

const DAILY: Quest['type'][] = ['main', 'side', 'recovery', 'habit', 'sleep']

export function SystemTab({ s, update, goTraining }: { s: GameState; update: (fn: (s: GameState) => GameState) => void; goTraining: () => void }) {
  const today = todayKey()
  const lv = levelInfo(s.xp)
  const promo = promotionStatus(s)
  const warn = demotionDaysLeft(s, today)
  const quests = questsFor(s, today)
  const daily = quests.filter((q) => DAILY.includes(q.type)).sort((a, b) => DAILY.indexOf(a.type) - DAILY.indexOf(b.type))
  const special = quests.filter((q) => q.type === 'penalty' || q.type === 'trial')
  const weekly = quests.find((q) => q.type === 'weekly')
  const cleared = daily.filter((q) => q.status === 'done').length
  const sick = s.sickDays.includes(today)
  const progress = (id: string, n: number) => update((x) => progressQuest(x, id, n, today, nowIso()))

  return (
    <div className="grid gap-7 pt-3">
      {/* STATUS WINDOW */}
      <Panel title="Status" open>
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-4">
          <div className="text-center">
            <div className="sys-title glow-text text-6xl leading-none text-white">{lv.level}</div>
            <div className="sys-title mt-1 text-[11px] text-glow">Level</div>
          </div>
          <dl className="grid gap-1 text-sm">
            <Row k="Name" v={s.profile.name} />
            <Row k="Job" v={<span style={{ color: RANK_COLOR[s.rank] }}>{s.rank}-Rank Hunter</span>} />
            <Row k="Title" v={s.equippedTitle ?? 'None'} />
          </dl>
        </div>

        <div className="mt-4 grid gap-2">
          <Gauge label="EXP" value={lv.into} max={lv.span} text={`${lv.into.toLocaleString()} / ${lv.span.toLocaleString()}`} />
          <Gauge label="Quest" value={cleared} max={Math.max(1, daily.length)} text={`${cleared} / ${daily.length}`} color="linear-gradient(90deg,#0e7490,#22d3ee,#cffafe)" />
        </div>

        <div className="my-4 h-px bg-gradient-to-r from-transparent via-sky-200/50 to-transparent" />

        <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
          {STAT_IDS.map((id) => {
            const l = statLevel(s.stats[id])
            return (
              <div key={id} className="flex items-baseline justify-between">
                <span className="sys-title text-[13px] text-glow">{STAT_LABEL[id]}:</span>
                <span className="flex items-baseline gap-1.5">
                  <span className="sys-title glow-text text-lg text-white">{l}</span>
                  <span className="sys-title text-[10px]" style={{ color: RANK_COLOR[statRank(l)] }}>{statRank(l)}</span>
                </span>
              </div>
            )
          })}
        </div>

        <div className="my-4 h-px bg-gradient-to-r from-transparent via-sky-200/50 to-transparent" />

        <div className="grid grid-cols-3 items-end text-center">
          <Metric label="Power" value={powerRating(s).toLocaleString()} />
          <StreakBadge streak={s.streak} best={s.bestStreak} />
          <Metric label="Total EXP" value={s.xp.toLocaleString()} />
        </div>
      </Panel>

      {warn !== null && (
        <Panel tone="danger" title="Warning" open>
          <p className="text-center text-sm leading-relaxed">[Experience has fallen below the {s.rank}-Rank threshold. Recover {Math.max(0, RANK_XP[s.rank] - s.xp).toLocaleString()} EXP within <b className="text-red-200">{warn} day{warn === 1 ? '' : 's'}</b> or your rank will be demoted.]</p>
        </Panel>
      )}

      {sick && (
        <Panel title="Recovery">
          <p className="text-center text-sm text-glow">[Condition: Sick / Injured. No EXP will be lost today. Rest is the correct choice.]</p>
        </Panel>
      )}

      {special.map((q) => (
        <Panel key={q.id} tone={q.type === 'penalty' ? 'danger' : 'rare'} title={q.type === 'penalty' ? 'Penalty Quest' : 'Rank Trial'} open>
          <p className="text-center text-sm">[{q.description}]</p>
          <div className="mt-3 text-center text-xs uppercase tracking-widest text-mute">Goal</div>
          <p className="text-center text-sm text-white">{q.objective}</p>
          {q.type === 'trial' && <p className="mt-1 text-center text-xs text-purple-200">Reward: +{q.xp} EXP and promotion to {q.trialRank}-Rank</p>}
          <Btn variant={q.type === 'penalty' ? 'danger' : 'rare'} className="mt-4 w-full" onClick={goTraining}>{q.type === 'penalty' ? 'Clear Penalty' : 'Begin Trial'}</Btn>
        </Panel>
      ))}

      {/* DAILY QUEST WINDOW */}
      <Panel title="Daily Quest" open>
        <p className="text-center text-sm text-glow">[Daily Quest: Training to become strong has arrived.]</p>
        <div className="mt-3 text-center">
          <span className="sys-title border-b border-sky-200/60 px-3 pb-0.5 text-sm text-white">Goals</span>
        </div>
        <ul className="mt-3 grid gap-1">
          {daily.map((q) => <QuestRow key={q.id} q={q} onProgress={(n) => progress(q.id, n)} goTraining={goTraining} />)}
        </ul>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-red-300/90">
          WARNING: Failure to complete planned training will result in an appropriate penalty.
        </p>
      </Panel>

      <RaidPanel s={s} today={today} goTraining={goTraining} />

      {weekly && (
        <Panel title="Weekly Quest">
          <QuestRow q={weekly} onProgress={() => {}} goTraining={goTraining} />
        </Panel>
      )}

      {promo && (
        <Panel title={`Path to ${promo.next}-Rank`} tone={promo.trialUnlocked ? 'rare' : undefined}>
          <div className="mb-3 flex items-center justify-center gap-4">
            <RankEmblem rank={s.rank} size={48} glow={false} />
            <span className="sys-title text-glow">→</span>
            <RankEmblem rank={promo.next} size={48} />
          </div>
          <div className="grid gap-3 text-sm">
            <Req label="Experience" have={promo.xp.have} need={promo.xp.need} />
            <Req label="Active weeks at rank" have={promo.weeks.have} need={promo.weeks.need} />
            <Req label="Personal records" have={promo.prs.have} need={promo.prs.need} />
            <div className="flex items-center justify-between">
              <span className="sys-title text-xs text-glow">Rank Trial</span>
              {promo.trialUnlocked ? <Tag color="#c084fc">Unlocked</Tag> : <Tag color="#93a8c9">Locked</Tag>}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-mute">{RANK_NAME[promo.next]}</p>
        </Panel>
      )}

      <Panel title="Stat Detail">
        <div className="grid gap-3">
          {STAT_IDS.map((id) => {
            const xp = s.stats[id]
            const l = statLevel(xp)
            const lo = 25 * (l - 1) ** 2
            const hi = 25 * l ** 2
            return (
              <div key={id}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span><span className="sys-title mr-2 text-xs" style={{ color: STAT_COLOR[id] }}>{STAT_ABBR[id]}</span>{STAT_LABEL[id]}</span>
                  <span className="text-xs text-mute">{xp - lo} / {hi - lo}</span>
                </div>
                <Bar value={xp - lo} max={hi - lo} height={4} color={STAT_COLOR[id]} label={`${STAT_LABEL[id]} progress`} />
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="sys-title w-14 shrink-0 text-[12px] text-glow">{k}:</dt>
      <dd className="truncate font-medium text-white">{v}</dd>
    </div>
  )
}

function Gauge({ label, value, max, text, color }: { label: string; value: number; max: number; text: string; color?: string }) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2">
      <span className="sys-title text-xs text-glow">{label}</span>
      <Bar value={value} max={max} height={9} color={color} label={label} />
      <span className="w-20 text-right text-[11px] tabular-nums text-mute">{text}</span>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="sys-title glow-text text-xl leading-none text-white">{value}</div>
      <div className="sys-title mt-1 text-[10px] text-mute">{label}</div>
    </div>
  )
}

function Req({ label, have, need }: { label: string; have: number; need: number }) {
  const ok = have >= need
  return (
    <div>
      <div className="mb-1 flex justify-between"><span className="sys-title text-xs text-glow">{label}</span><span className={`text-xs tabular-nums ${ok ? 'text-ok' : 'text-mute'}`}>{Math.min(have, need).toLocaleString()} / {need.toLocaleString()}{ok ? ' ✓' : ''}</span></div>
      <Bar value={have} max={need} height={4} color={ok ? '#6ee7b7' : undefined} label={label} />
    </div>
  )
}

/** One goal line: "Push-ups [12/45] ☐", expands to show details and controls. */
function QuestRow({ q, onProgress, goTraining }: { q: Quest; onProgress: (n: number) => void; goTraining: () => void }) {
  const [open, setOpen] = useState(false)
  const done = q.status === 'done'
  const bonusOpen = done && q.bonus && !q.bonus.done && (q.measure === 'count' || q.measure === 'minutes')
  const steps = q.measure === 'minutes' ? [5, 10] : q.unit === 'glasses' ? [1] : q.unit === 'sec' ? [15, 30] : [1, 5, 10]
  const shown = q.measure === 'check' ? (done ? 1 : 0) : Math.min(q.progress, done && q.bonus ? q.bonus.target : q.target)
  return (
    <li className={`rounded-sm border transition ${open ? 'border-sky-200/40 bg-blue-950/40' : 'border-transparent'}`}>
      <button className="flex w-full items-center gap-3 px-2 py-2.5 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className={`flex-1 font-medium ${done ? 'text-ok' : 'text-white'}`}>{q.title}</span>
        <span className="sys-title text-sm tabular-nums text-glow">[{shown}/{q.measure === 'check' ? 1 : q.target}{q.unit && q.measure !== 'workout' && q.measure !== 'check' ? ` ${q.unit}` : ''}]</span>
        <span aria-hidden className={`flex h-5 w-5 items-center justify-center border text-xs ${done ? 'border-ok bg-ok/20 text-ok' : 'border-sky-200/70'}`}>{done ? '✓' : ''}</span>
      </button>
      {open && (
        <div className="grid gap-2 px-2 pb-3 text-sm">
          <p className="text-mute">{q.description}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-mute">
            <span>◆ {q.objective}</span>
            <span>Rank {q.difficulty}</span>
            <span className="text-glow">+{q.xp} EXP</span>
            <span>{STAT_LABEL[q.stat]}</span>
            {q.verification && <Tag color={q.verification === 'Logged' ? '#6ee7b7' : '#93a8c9'}>{q.verification}</Tag>}
          </div>
          {q.bonus && <div className={`text-xs ${q.bonus.done ? 'text-rare' : 'text-mute'}`}>★ Bonus: {q.bonus.text} {q.bonus.done ? '(cleared)' : `(+${Math.round(q.xp / 2)} EXP)`}</div>}
          {(!done || bonusOpen) && (
            <div className="mt-1 flex flex-wrap gap-2">
              {q.measure === 'workout' && <Btn onClick={goTraining}>Start Workout</Btn>}
              {q.measure === 'check' && <Btn onClick={() => onProgress(1)}>Complete</Btn>}
              {(q.measure === 'count' || q.measure === 'minutes') && steps.map((n) => (
                <Btn key={n} variant="ghost" onClick={() => onProgress(n)}>+{n} {q.measure === 'minutes' ? 'min' : q.unit === 'glasses' ? 'glass' : q.unit}</Btn>
              ))}
              {q.measure === 'weeklyWorkouts' && <span className="text-xs text-mute">Advances as you log planned workouts.</span>}
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function RaidPanel({ s, today, goTraining }: { s: GameState; today: string; goTraining: () => void }) {
  const raid = currentRaid(s, today)
  const boss = raid && BOSS_BY_ID[raid.bossId]
  if (!raid || !boss) return null
  const hp = Math.max(0, raid.target - raid.progress)
  const cap = Math.ceil(raid.target * RAID.DAILY_SHARE)
  const todayDmg = raid.byDay[today] ?? 0
  const wd = new Date(`${today}T12:00:00`).getDay()
  const daysLeft = wd === 0 ? 1 : 8 - wd
  const readyAt = raid.lastCountedAt ? Date.parse(raid.lastCountedAt) + RAID.COOLDOWN_HOURS * 3_600_000 : 0
  const waitMin = Math.max(0, Math.ceil((readyAt - Date.now()) / 60_000))
  const cleared = raid.status === 'cleared'
  return (
    <Panel title="Dungeon Raid" tone={cleared ? 'rare' : 'danger'} open>
      <div className="text-center">
        <div className="sys-title glow-text text-xl text-white">{boss.name}</div>
        <p className="mt-1 text-xs leading-relaxed text-mute">{boss.lore}</p>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs"><span className="sys-title text-danger">Boss HP</span><span className="text-sky-100">{hp.toLocaleString()} / {raid.target.toLocaleString()} {boss.unit}</span></div>
        <div className="h-3 overflow-hidden rounded-sm border border-red-400/40 bg-red-950/40">
          <div className="h-full bg-gradient-to-r from-red-700 via-red-500 to-orange-300 transition-all duration-700" style={{ width: `${(hp / raid.target) * 100}%` }} />
        </div>
      </div>
      {cleared ? (
        <p className="mt-4 text-center text-sm text-rare">[Dungeon cleared. +{raid.xp} XP earned. A new gate opens on Monday.]</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 text-center">
            <Metric label="Today" value={`${todayDmg}/${cap}`} />
            <Metric label="Next hit" value={todayDmg >= cap ? 'Tomorrow' : waitMin > 0 ? (waitMin >= 60 ? `${Math.ceil(waitMin / 60)} h` : `${waitMin} min`) : 'Ready'} />
            <Metric label="Gate closes" value={`${daysLeft} day${daysLeft === 1 ? '' : 's'}`} />
          </div>
          <details className="mt-3 text-xs text-mute">
            <summary className="cursor-pointer text-glow">Raid rules</summary>
            <ul className="mt-2 grid list-disc gap-1 pl-5">
              <li>Only sets you tick off in a logged workout deal damage.</li>
              <li>Workouts under {RAID.MIN_MINUTES} minutes don't count.</li>
              <li>The boss recovers for {RAID.COOLDOWN_HOURS} hours after each hit.</li>
              <li>At most {cap} {boss.unit} per day, so it takes at least 3 days.</li>
              <li>Damage is limited by how long you trained.</li>
              <li>Reward: +{raid.xp} XP. If the gate closes first, you lose nothing.</li>
            </ul>
          </details>
          <Btn className="mt-4 w-full" variant="danger" onClick={goTraining}>Enter Dungeon (Train)</Btn>
        </>
      )}
    </Panel>
  )
}
