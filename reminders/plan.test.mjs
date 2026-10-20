import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dueMessages, localNow } from './plan.mjs'

const state = (over = {}) => ({ createdDate: '2026-10-01', profile: { trainingDays: [1, 3, 5], routine: { 1: 'push' } }, workouts: [], sickDays: [], ...over })
// 2026-10-19 is a Monday. 12:30 UTC is 08:30 in New York (EDT).
const mondayMorningNY = new Date('2026-10-19T12:30:00Z')
const mondayEveningNY = new Date('2026-10-20T00:15:00Z')

test('local time follows the time zone', () => {
  assert.deepEqual(localNow(mondayMorningNY, 'America/New_York'), { date: '2026-10-19', minutes: 8 * 60 + 30, weekday: 1 })
})

test('morning reminder names the planned workout, once per day', () => {
  const sub = { tz: 'America/New_York', morning: '08:00', evening: true }
  const [m] = dueMessages(sub, state(), mondayMorningNY)
  assert.equal(m.slot, 'sentMorning')
  assert.match(m.payload.body, /Push/)
  assert.equal(dueMessages({ ...sub, sentMorning: '2026-10-19' }, state(), mondayMorningNY).length, 0)
})

test('no morning reminder before the chosen time or long after it', () => {
  const sub = { tz: 'America/New_York', morning: '09:00', evening: false }
  assert.equal(dueMessages(sub, state(), mondayMorningNY).length, 0)
  assert.equal(dueMessages({ ...sub, morning: '04:00' }, state(), mondayMorningNY).length, 0)
})

test('evening warning only when a planned day has no workout', () => {
  const sub = { tz: 'America/New_York', morning: '08:00', evening: true, sentMorning: '2026-10-19' }
  assert.equal(dueMessages(sub, state(), mondayEveningNY)[0].slot, 'sentEvening')
  assert.equal(dueMessages(sub, state({ workouts: [{ date: '2026-10-19' }] }), mondayEveningNY).length, 0)
  assert.equal(dueMessages(sub, state({ sickDays: ['2026-10-19'] }), mondayEveningNY).length, 0)
  assert.equal(dueMessages(sub, state({ profile: { trainingDays: [2] } }), mondayEveningNY).length, 0)
  assert.equal(dueMessages({ ...sub, evening: false }, state(), mondayEveningNY).length, 0)
})

test('rest days get a recovery message', () => {
  const tuesday = new Date('2026-10-20T12:30:00Z')
  const [m] = dueMessages({ tz: 'America/New_York', morning: '08:00' }, state(), tuesday)
  assert.match(m.payload.body, /Rest day/)
})
