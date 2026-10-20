// Daily boot-up: shown the first time the app opens each day.
import { useEffect } from 'react'
import { currentRaid, levelInfo, questsFor } from '../core/engine'
import { BOSS_BY_ID } from '../core/raids'
import type { GameState } from '../core/types'
import { play } from '../sfx'
import { Btn, Corners, RANK_COLOR } from './components'
import { Flame, FLAME_TIERS, flameTierIndex } from './StreakFlame'

const KEY = 'the-system:boot'

export function bootDue(uid: string, today: string) {
  try { return localStorage.getItem(`${KEY}:${uid}`) !== today } catch { return false }
}

function markBooted(uid: string, today: string) {
  try { localStorage.setItem(`${KEY}:${uid}`, today) } catch { /* private mode */ }
}

export function BootScreen({ s, uid, today, onDone }: { s: GameState; uid: string; today: string; onDone: () => void }) {
  const lv = levelInfo(s.xp)
  const daily = questsFor(s, today).filter((q) => ['main', 'side', 'recovery', 'habit', 'sleep', 'penalty', 'trial'].includes(q.type))
  const raid = currentRaid(s, today)
  const boss = raid && BOSS_BY_ID[raid.bossId]
  const tier = FLAME_TIERS[flameTierIndex(s.streak)]
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const date = new Date(`${today}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  useEffect(() => {
    play('reveal')
    const timers = [500, 900, 1300].map((t) => setTimeout(() => play('type'), t))
    return () => timers.forEach(clearTimeout)
  }, [])
  const done = () => { markBooted(uid, today); onDone() }
  const d = (ms: number) => ({ animationDelay: `${ms}ms` })

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-[#01030c]/95 p-5 backdrop-blur" role="dialog" aria-modal="true" aria-label="System online">
      <div className="boot-scan pointer-events-none absolute inset-x-0 top-0" />
      <div className="sys-panel anim-open relative w-full max-w-sm px-5 pb-5 pt-5">
        <Corners />
        <div className="boot-line sys-title anim-flicker text-center text-xs text-glow" style={d(200)}>[System booting…]</div>
        <div className="boot-line sys-title glow-text mt-2 text-center text-2xl text-white" style={d(500)}>The System is online</div>
        <div className="boot-line mt-1 text-center text-xs text-mute" style={d(700)}>{date}</div>

        <div className="boot-line mt-5 flex items-center justify-between rounded border border-sky-300/25 bg-sky-500/5 px-3 py-2" style={d(900)}>
          <div>
            <div className="text-sm text-white">{greet}, {s.profile.name}.</div>
            <div className="sys-title text-[11px]"><span className="text-glow">Level {lv.level}</span> · <span style={{ color: RANK_COLOR[s.rank] }}>{s.rank}-Rank</span></div>
          </div>
          <div className="flex items-end gap-1"><Flame tier={tier} size={34} /><span className="sys-title glow-text text-lg text-white">{s.streak}</span></div>
        </div>

        <div className="boot-line sys-title mt-4 text-[11px] text-glow" style={d(1100)}>Today's Quests</div>
        <ul className="mt-1 grid gap-1">
          {daily.length === 0 && <li className="boot-line text-sm text-mute" style={d(1200)}>No quests today. Rest and recover.</li>}
          {daily.slice(0, 6).map((q, i) => (
            <li key={q.id} className="boot-line flex items-center gap-2 text-sm" style={d(1200 + i * 120)}>
              <span className={`h-1.5 w-1.5 rounded-full ${q.status === 'done' ? 'bg-ok' : q.type === 'penalty' ? 'bg-danger' : 'bg-sys'}`} />
              <span className={q.status === 'done' ? 'text-mute line-through' : q.type === 'penalty' ? 'text-red-200' : 'text-sky-100'}>{q.title}</span>
            </li>
          ))}
        </ul>

        {raid && boss && raid.status === 'active' && (
          <div className="boot-line mt-3 rounded border border-red-400/30 bg-red-500/5 px-3 py-2 text-xs" style={d(1300 + daily.length * 120)}>
            <span className="sys-title text-danger">Dungeon:</span> <span className="text-red-100">{boss.name}</span>
            <span className="text-mute"> · {Math.max(0, raid.target - raid.progress)} {boss.unit} left</span>
          </div>
        )}

        <div className="boot-line" style={d(1500 + daily.length * 120)}>
          <Btn className="mt-5 w-full" sfx="next" onClick={done}>Begin</Btn>
        </div>
      </div>
    </div>
  )
}
