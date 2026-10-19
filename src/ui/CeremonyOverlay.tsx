import { ACHIEVEMENT_BY_ID } from '../core/achievements'
import type { Ceremony } from '../core/types'
import { Btn, RANK_COLOR, RANK_NAME, RankEmblem, SystemText } from './components'

export function CeremonyOverlay({ c, onClose }: { c: Ceremony; onClose: () => void }) {
  let tone: 'sys' | 'danger' | 'rare' = 'sys'
  let heading = ''
  let body = ''
  let visual: React.ReactNode = null

  switch (c.kind) {
    case 'levelUp':
      heading = 'Level Up'
      body = `[SYSTEM] Level ${c.from} → ${c.to}. Your strength grows.`
      visual = <div className="sys-title glow-text anim-glow text-7xl text-glow">{c.to}</div>
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
      heading = 'Achievement'
      body = `[SYSTEM] ${a?.name ?? c.id}. ${a?.description ?? ''}${a?.title ? ` Title unlocked: “${a.title}”.` : ''}`
      break
    }
    case 'questClear':
      heading = 'Quest Complete'
      body = `[SYSTEM] ${c.title}. ${c.xp > 0 ? `+${c.xp} XP.` : ''}`
      visual = <div className="sys-title glow-text text-5xl text-glow">✓</div>
      break
    case 'trialUnlocked':
      tone = 'rare'
      heading = 'Trial Unlocked'
      body = `[SYSTEM] You meet the requirements for ${c.rank}-Rank. A Rank Trial has been issued.`
      visual = <RankEmblem rank={c.rank} size={110} />
      break
  }

  const color = tone === 'danger' ? '#ef4444' : tone === 'rare' ? (c.kind === 'rankUp' ? RANK_COLOR[c.rank] : '#a855f7') : '#22d3ee'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={heading} onClick={onClose}>
      <div className={`sys-panel ${tone === 'sys' ? '' : tone} anim-rise w-full max-w-sm p-6 text-center`} onClick={(e) => e.stopPropagation()}>
        <div className="sys-title mb-1 text-[10px] text-mute">Notification</div>
        <h2 className="sys-title mb-4 text-2xl" style={{ color, textShadow: `0 0 14px ${color}88` }}>{heading}</h2>
        {visual && <div className="mb-4 flex justify-center">{visual}</div>}
        <SystemText key={body} text={body} className="min-h-12 text-sm leading-relaxed text-ink" speed={16} />
        <Btn className="mt-5 w-full" variant={tone === 'danger' ? 'danger' : tone === 'rare' ? 'rare' : 'primary'} onClick={onClose}>Confirm</Btn>
      </div>
    </div>
  )
}
