import { ACHIEVEMENT_BY_ID } from '../core/achievements'
import { EXERCISE_BY_ID } from '../core/exercises'
import { BOSS_BY_ID, RAID } from '../core/raids'
import { useEffect } from 'react'
import { play } from '../sfx'
import { toDisplayWeight, weightUnit } from '../store'
import { LevelUpCutscene, RankUpCutscene } from './Cutscene'
import type { Ceremony } from '../core/types'
import { Btn, Corners, NoticeHead, RANK_NAME, RankEmblem, SystemText } from './components'

export function CeremonyOverlay({ c, onClose, units }: { c: Ceremony; onClose: () => void; units: 'metric' | 'imperial' }) {
  if (c.kind === 'levelUp') return <LevelUpCutscene key={`${c.from}-${c.to}`} from={c.from} to={c.to} onClose={onClose} />
  if (c.kind === 'rankUp') return <RankUpCutscene key={c.rank} rank={c.rank} onClose={onClose} />
  return <Notice c={c} onClose={onClose} units={units} />
}

function Notice({ c, onClose, units }: { c: Ceremony; onClose: () => void; units: 'metric' | 'imperial' }) {
  useEffect(() => {
    if (c.kind === 'record') play('record')
    else if (c.kind === 'achievement') play(ACHIEVEMENT_BY_ID[c.id]?.rare ? 'complete' : 'reveal')
    else if (c.kind === 'trialUnlocked' || c.kind === 'raidOpen') play('reveal')
    else if (c.kind === 'raidCleared') play('complete')
    else if (c.kind === 'penalty' || c.kind === 'warning' || c.kind === 'demotion' || c.kind === 'levelDown') play('deny')
  }, [c])
  let tone: 'sys' | 'danger' | 'rare' = 'sys'
  let heading = ''
  let body = ''
  let visual: React.ReactNode = null

  switch (c.kind) {
    case 'levelUp':
      heading = 'Level Up'
      body = `[SYSTEM] Level ${c.from} → ${c.to}. Your strength grows.`
      visual = <div className="sys-title glow-text anim-glow text-7xl text-white">{c.to}</div>
      break
    case 'levelDown':
      tone = 'danger'
      heading = 'Level Decreased'
      body = `[SYSTEM] Level ${c.from} → ${c.to}. Return to training to recover.`
      visual = <div className="sys-title text-7xl text-danger">{c.to}</div>
      break
    case 'rankUp':
      tone = 'rare'
      heading = 'Rank Advancement'
      body = `[SYSTEM] Trial cleared. You have been promoted to ${c.rank}-Rank: ${RANK_NAME[c.rank]}.`
      visual = <RankEmblem rank={c.rank} size={140} />
      break
    case 'demotion':
      tone = 'danger'
      heading = 'Rank Demoted'
      body = `[SYSTEM] XP stayed below the ${c.from}-Rank threshold. Rank adjusted: ${c.from} → ${c.to}. Clear the ${c.from}-Rank Trial again to return.`
      visual = <RankEmblem rank={c.to} size={120} />
      break
    case 'warning':
      tone = 'danger'
      heading = 'Demotion Warning'
      body = `[SYSTEM] XP has fallen below the ${c.rank}-Rank threshold. You have ${c.daysLeft} days to recover before demotion.`
      break
    case 'penalty':
      tone = 'danger'
      heading = 'Penalty Zone'
      body = `[SYSTEM] ${c.reason} ${c.lost} XP lost.${c.reason.startsWith('Planned') ? ' A Penalty Quest has been issued. Complete it today to recover most of it.' : ''}`
      visual = <div className="sys-title text-5xl text-danger">−{c.lost} XP</div>
      break
    case 'achievement': {
      const a = ACHIEVEMENT_BY_ID[c.id]
      tone = a?.rare ? 'rare' : 'sys'
      heading = a?.name ?? 'Achievement'
      body = `[SYSTEM] Achievement unlocked. ${a?.description ?? ''}${a?.title ? ` Title acquired: “${a.title}”.` : ''}`
      break
    }
    case 'questClear':
      heading = 'Quest Complete'
      body = `[SYSTEM] ${c.title}. ${c.xp > 0 ? `+${c.xp} XP.` : ''}`
      visual = <div className="sys-title glow-text text-5xl text-white">✓</div>
      break
    case 'record': {
      const fmt = (r: { weightKg: number; reps: number; seconds: number }) =>
        r.seconds ? `${r.seconds}s` : r.weightKg ? `${toDisplayWeight(r.weightKg, units)}${weightUnit(units)} × ${r.reps}` : `${r.reps} reps`
      tone = 'rare'
      heading = c.items.length > 1 ? `${c.items.length} New Records` : 'New Record'
      body = `[SYSTEM] Limit broken. ${c.items.length > 1 ? 'Your strength is growing fast.' : 'Your strength is growing.'}`
      visual = (
        <div className="grid w-full gap-2 text-left text-sm">
          {c.items.map((it) => (
            <div key={it.exerciseId} className="anim-rise rounded border border-purple-300/40 bg-purple-500/10 px-3 py-2">
              <div className="font-medium text-white">{EXERCISE_BY_ID[it.exerciseId]?.name ?? it.exerciseId}</div>
              <div className="text-xs text-mute">{fmt(it.before)} <span className="text-rare">→</span> <span className="text-white">{fmt(it.after)}</span></div>
            </div>
          ))}
        </div>
      )
      break
    }
    case 'raidOpen': {
      const b = BOSS_BY_ID[c.bossId]
      tone = 'danger'
      heading = 'Dungeon Gate Opened'
      body = `[SYSTEM] ${b?.lore ?? ''} Deal ${c.target} ${b?.unit ?? ''} of damage by Sunday. Only sets you log in real workouts count, and the boss recovers ${RAID.COOLDOWN_HOURS} hours between hits.`
      visual = <div className="sys-title glow-text text-2xl text-white">{b?.name ?? 'Unknown Boss'}</div>
      break
    }
    case 'raidCleared': {
      const b = BOSS_BY_ID[c.bossId]
      tone = 'rare'
      heading = 'Dungeon Cleared'
      body = `[SYSTEM] ${b?.name ?? 'The boss'} has been defeated. +${c.xp} XP. Your strength and discipline grow.`
      visual = <div className="sys-title glow-text text-5xl text-white">+{c.xp} XP</div>
      break
    }
    case 'trialUnlocked':
      tone = 'rare'
      heading = 'Trial Unlocked'
      body = `[SYSTEM] You meet the requirements for ${c.rank}-Rank. A Rank Trial has been issued.`
      visual = <RankEmblem rank={c.rank} size={110} />
      break
  }

  const label = c.kind === 'record' ? 'Record' : c.kind === 'penalty' ? 'Penalty' : c.kind === 'warning' || c.kind === 'demotion' ? 'Alert' : c.kind === 'rankUp' ? 'Rank Up' : c.kind === 'raidOpen' || c.kind === 'raidCleared' ? 'Dungeon' : 'Notification'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#01040f]/85 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={heading} onClick={onClose}>
      <div className={`sys-panel ${tone === 'sys' ? '' : tone} anim-open w-full max-w-sm px-6 pb-6 pt-5 text-center`} onClick={(e) => e.stopPropagation()}>
        <Corners />
        <NoticeHead label={label} tone={tone === 'sys' ? undefined : tone} />
        {visual && <div className="mb-4 flex justify-center">{visual}</div>}
        <div className="sys-title glow-text mb-2 text-xl text-white">[{heading}]</div>
        <SystemText key={body} text={body.replace(/^\[SYSTEM\] /, '')} className="min-h-12 text-sm leading-relaxed text-sky-100" speed={16} />
        <Btn className="mt-5 w-full" variant={tone === 'danger' ? 'danger' : tone === 'rare' ? 'rare' : 'primary'} onClick={onClose}>Confirm</Btn>
      </div>
    </div>
  )
}
