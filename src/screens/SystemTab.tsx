import { RANK_XP } from '../core/balance'
import { demotionDaysLeft, levelInfo, powerRating, progressQuest, promotionStatus, questsFor, STAT_IDS, statLevel, statRank } from '../core/engine'
import type { GameState, Quest } from '../core/types'
import { Bar, Btn, Panel, RANK_COLOR, RANK_NAME, RankEmblem, Tag } from '../ui/components'
import { nowIso, todayKey } from '../store'
import { STAT_ABBR, STAT_COLOR, STAT_LABEL } from './labels'

const ORDER: Quest['type'][] = ['trial', 'penalty', 'main', 'side', 'recovery', 'habit', 'sleep', 'weekly']

export function SystemTab({ s, update, goTraining }: { s: GameState; update: (fn: (s: GameState) => GameState) => void; goTraining: () => void }) {
  const today = todayKey()
  const lv = levelInfo(s.xp)
  const promo = promotionStatus(s)
  const warn = demotionDaysLeft(s, today)
  const quests = questsFor(s, today).sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type))
  const daily = quests.filter((q) => ['main', 'side', 'habit', 'recovery', 'sleep'].includes(q.type))
  const cleared = daily.filter((q) => q.status === 'done').length
  const sick = s.sickDays.includes(today)

  return (
    <div className="grid gap-4">
      <Panel className="anim-rise">
        <div className="flex items-start gap-4">
          <RankEmblem rank={s.rank} size={78} />
          <div className="min-w-0 flex-1">
            <div className="sys-title text-xs text-mute">Player</div>
            <div className="truncate text-2xl font-semibold leading-tight">{s.profile.name}</div>
            {s.equippedTitle && <div className="sys-title text-xs text-rare">「{s.equippedTitle}」</div>}
            <div className="mt-1 text-sm" style={{ color: RANK_COLOR[s.rank] }}>{s.rank}-Rank · {RANK_NAME[s.rank]}</div>
          </div>
          <div className="text-right">
            <div className="sys-title text-xs text-mute">Level</div>
            <div className="sys-title glow-text text-4xl leading-none text-glow">{lv.level}</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-mute">
            <span>XP {lv.into.toLocaleString()} / {lv.span.toLocaleString()}</span>
            <span>Total {s.xp.toLocaleString()}</span>
          </div>
          <Bar value={lv.into} max={lv.span} height={10} label="XP to next level" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Metric label="Power" value={powerRating(s).toLocaleString()} />
          <Metric label="Streak" value={`${s.streak}d`} />
          <Metric label="Workouts" value={String(s.workouts.length)} />
        </div>
      </Panel>

      {warn !== null && (
        <Panel tone="danger" title="Demotion Warning" className="anim-rise">
          <p className="text-sm">XP has fallen below the {s.rank}-Rank threshold. Earn {(promoNeed(s)).toLocaleString()} XP within <b className="text-danger">{warn} day{warn === 1 ? '' : 's'}</b> or you will be demoted.</p>
        </Panel>
      )}

      {sick && (
        <Panel title="Recovery Status" className="anim-rise">
          <p className="text-sm text-mute">Marked sick / injured today. No XP will be lost. Rest is the right call.</p>
        </Panel>
      )}

      <Panel title="Quest Log" right={<span className="sys-title text-xs text-mute">Daily {cleared}/{daily.length}</span>}>
        <div className="grid gap-3">
          {quests.length === 0 && <p className="text-sm text-mute">No quests right now.</p>}
          {quests.map((q) => <QuestCard key={q.id} q={q} onProgress={(n) => update((x) => progressQuest(x, q.id, n, today, nowIso()))} goTraining={goTraining} />)}
        </div>
      </Panel>

      {promo && (
        <Panel title={`Path to ${promo.next}-Rank`} tone={promo.trialUnlocked ? 'rare' : undefined}>
          <div className="grid gap-3 text-sm">
            <Req label="Experience" have={promo.xp.have} need={promo.xp.need} />
            <Req label="Active weeks at rank" have={promo.weeks.have} need={promo.weeks.need} />
            <Req label="Personal records" have={promo.prs.have} need={promo.prs.need} />
            <div className="flex items-center justify-between">
              <span>Rank Trial</span>
              {promo.trialUnlocked ? <Tag color="#a855f7">Unlocked</Tag> : <Tag color="#8a9bb4">Locked</Tag>}
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Status">
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
                  <span className="flex items-center gap-2"><span className="sys-title text-ink">Lv {l}</span><Tag color={RANK_COLOR[statRank(l)]}>{statRank(l)}</Tag></span>
                </div>
                <Bar value={xp - lo} max={hi - lo} height={5} color={STAT_COLOR[id]} label={`${STAT_LABEL[id]} progress`} />
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}

function promoNeed(s: GameState) {
  return Math.max(0, RANK_XP[s.rank] - s.xp)
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-edge/70 bg-panel-2/50 py-2">
      <div className="sys-title text-lg leading-none text-ink">{value}</div>
      <div className="sys-title mt-1 text-[10px] text-mute">{label}</div>
    </div>
  )
}

function Req({ label, have, need }: { label: string; have: number; need: number }) {
  const ok = have >= need
  return (
    <div>
      <div className="mb-1 flex justify-between"><span>{label}</span><span className={ok ? 'text-ok' : 'text-mute'}>{Math.min(have, need).toLocaleString()} / {need.toLocaleString()}{ok ? ' ✓' : ''}</span></div>
      <Bar value={have} max={need} height={4} color={ok ? '#34d399' : undefined} label={label} />
    </div>
  )
}

const TYPE_LABEL: Record<Quest['type'], string> = {
  main: 'Daily · Main', side: 'Daily', habit: 'Daily · Habit', recovery: 'Recovery', sleep: 'Daily · Sleep',
  weekly: 'Weekly', penalty: 'Penalty', trial: 'Rank Trial',
}

export function QuestCard({ q, onProgress, goTraining }: { q: Quest; onProgress: (n: number) => void; goTraining: () => void }) {
  const done = q.status === 'done'
  const tone = q.type === 'penalty' ? 'danger' : q.type === 'trial' ? 'rare' : undefined
  const accent = tone === 'danger' ? '#ef4444' : tone === 'rare' ? '#a855f7' : '#38bdf8'
  const bonusOpen = done && q.bonus && !q.bonus.done && q.measure !== 'workout'
  const steps = q.measure === 'minutes' ? [5, 10] : q.unit === 'glasses' ? [1] : q.unit === 'sec' ? [15, 30] : [1, 5, 10]
  return (
    <article className={`rounded border p-3 transition ${done ? 'border-ok/40 bg-ok/5' : tone === 'danger' ? 'border-danger/50 bg-danger/5' : tone === 'rare' ? 'border-rare/50 bg-rare/5' : 'border-edge bg-panel-2/40'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="sys-title text-[10px]" style={{ color: accent }}>{TYPE_LABEL[q.type]}</div>
          <h3 className={`font-semibold ${done ? 'text-ok' : 'text-ink'}`}>{done ? '✓ ' : ''}{q.title}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Tag color={RANK_COLOR[q.difficulty]}>Rank {q.difficulty}</Tag>
          {q.xp > 0 && <span className="sys-title text-xs text-glow">+{q.xp} XP</span>}
        </div>
      </div>
      <p className="mt-1 text-sm text-mute">{q.description}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute">
        <span className="text-ink">◆ {q.objective}</span>
        {q.minutes > 0 && <span>~{q.minutes} min</span>}
        <span>{STAT_LABEL[q.stat]}</span>
        {q.verification && <Tag color={q.verification === 'Logged' ? '#34d399' : '#8a9bb4'}>{q.verification}</Tag>}
      </div>
      {q.measure !== 'check' && q.target > 1 && (
        <div className="mt-2">
          <div className="mb-1 flex justify-between text-xs text-mute"><span>Progress</span><span>{Math.min(q.progress, q.bonus && done ? q.bonus.target : q.target)} / {q.target} {q.unit}</span></div>
          <Bar value={q.progress} max={q.target} height={6} color={done ? '#34d399' : accent} label={`${q.title} progress`} />
        </div>
      )}
      {q.bonus && (
        <div className={`mt-2 text-xs ${q.bonus.done ? 'text-rare' : 'text-mute'}`}>★ Bonus: {q.bonus.text} {q.bonus.done ? '(cleared)' : `(+${Math.round(q.xp / 2)} XP)`}</div>
      )}
      {(!done || bonusOpen) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {q.measure === 'workout' && <Btn variant={tone ?? 'primary'} onClick={goTraining}>{q.type === 'trial' ? 'Begin Trial' : 'Start Workout'}</Btn>}
          {q.measure === 'check' && <Btn onClick={() => onProgress(1)}>Complete</Btn>}
          {(q.measure === 'count' || q.measure === 'minutes') && steps.map((n) => (
            <Btn key={n} variant="ghost" onClick={() => onProgress(n)}>+{n} {q.measure === 'minutes' ? 'min' : q.unit === 'glasses' ? 'glass' : q.unit}</Btn>
          ))}
          {q.measure === 'weeklyWorkouts' && <span className="text-xs text-mute">Advances automatically as you log planned workouts.</span>}
        </div>
      )}
    </article>
  )
}
