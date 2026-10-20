// Daily Quest reminders via Web Push. On iPhone this needs iOS 16.4+ and the
// app opened from the Home Screen icon.
import { getReminder, reminderKey, removeReminder, saveReminder, type ReminderPrefs } from './cloud'

export type ReminderSupport = 'ok' | 'not-installed' | 'unsupported'

export function reminderSupport(): ReminderSupport {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
  if (ios && !standalone) return 'not-installed'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  return 'ok'
}

function keyBytes(base64url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

/** Must be called straight from a tap: iOS only shows the permission prompt then. */
export async function enableReminders(uid: string, prefs: Omit<ReminderPrefs, 'tz'>): Promise<void> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them for THE SYSTEM in your phone’s Settings → Notifications.')
  const key = await reminderKey()
  if (!key) throw new Error('Reminders are still being set up. Try again later.')
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) as BufferSource })
  await saveReminder(uid, sub.toJSON(), { ...prefs, tz: localTimeZone() })
}

export async function disableReminders(uid: string): Promise<void> {
  const reg = await navigator.serviceWorker.ready.catch(() => null)
  const sub = await reg?.pushManager.getSubscription()
  await sub?.unsubscribe().catch(() => undefined)
  await removeReminder(uid)
}

export async function currentReminders(uid: string): Promise<ReminderPrefs | null> {
  const prefs = await getReminder(uid).catch(() => null)
  if (!prefs) return null
  // Permission revoked in Settings means there is nothing to deliver to.
  if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') return null
  return prefs
}
