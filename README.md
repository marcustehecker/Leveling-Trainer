# THE SYSTEM

A Solo Leveling–inspired fitness RPG for iPhone, built as an installable web app. Train in real life, earn XP, clear quests, and climb from E-Rank to S-Rank. Skip planned training and you lose XP, and eventually rank.

## Install on iPhone

1. Open the site in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Open THE SYSTEM from the Home Screen icon. It runs full-screen and works offline.

Data lives only on your device. Installing to the Home Screen keeps iOS from clearing it; use **Hunter → Download Backup** now and then.

## What works (Stage 3 MVP)

- Hunter registration and initial assessment → starting stats, E-Rank, first quests
- Status window: rank, level, XP, power rating, streak, six stats with levels and stat ranks
- Daily quests (training, strength side quest, cardio, hydration, sleep, recovery on rest days), weekly objective, bonus objectives
- Workout plan generated from schedule, equipment, experience and assessment; workout logger with sets, reps, weight, swap/skip, rest timer, effort rating
- Personal records, achievements and equippable titles
- XP loss for missed planned days and inactivity, Penalty Quests that refund 75%, 7-day Demotion Warning and demotion
- Rank Trials gated by XP, active weeks and personal records
- Sick/injured days (no XP loss, 4 per 30 days), profile editing, backup/restore, reset
- XP graph, rank history, records, System log

Not yet: nutrition engine (Stage 4), adaptive progression (Stage 4), push notifications and cloud sync (Stage 5). Websites can't read Apple Health, so everything is logged in the app.

All balancing numbers are in [`src/core/balance.ts`](src/core/balance.ts).

## Develop

```bash
npm install
npm run dev        # local dev server
npm test           # game engine tests
npm run build      # production build in dist/
```

Add `?date=YYYY-MM-DD` to the URL to preview another day (useful for testing streaks, penalties and demotion).

## Layout

- `src/core/` — game engine (pure TypeScript, unit tested): XP, levels, ranks, quests, plan generator, exercises, achievements
- `src/screens/` — the five tabs and onboarding
- `src/ui/` — design system components and notification overlays
- `src/store.ts` — on-device storage (IndexedDB)
