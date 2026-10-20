// Google sign-in and cloud saves (Firebase Auth + Firestore Lite).
// Loaded lazily so the app still starts fast and works offline.
import type { User } from 'firebase/auth'
import { firebaseConfig } from './firebaseConfig'
import type { GameState } from './core/types'

// VITE_LOCAL_ONLY=1 builds a sign-in-free copy for testing.
export const cloudEnabled = firebaseConfig !== null && !import.meta.env.VITE_LOCAL_ONLY

export interface Account { uid: string; email: string | null; name: string | null; photo: string | null }

const toAccount = (u: User): Account => ({ uid: u.uid, email: u.email, name: u.displayName, photo: u.photoURL })

let ready: Promise<{ auth: typeof import('firebase/auth'); fs: typeof import('firebase/firestore/lite'); app: import('firebase/app').FirebaseApp }> | null = null

function load() {
  if (!firebaseConfig) throw new Error('Cloud saves are not configured.')
  ready ??= (async () => {
    const [{ initializeApp }, auth, fs] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore/lite')])
    return { app: initializeApp(firebaseConfig!), auth, fs }
  })()
  return ready
}

export async function watchAccount(cb: (a: Account | null) => void): Promise<() => void> {
  const { app, auth } = await load()
  const a = auth.getAuth(app)
  await auth.getRedirectResult(a).catch(() => null)
  return auth.onAuthStateChanged(a, (u) => cb(u ? toAccount(u) : null))
}

export async function signIn(): Promise<void> {
  const { app, auth } = await load()
  const a = auth.getAuth(app)
  const provider = new auth.GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await auth.signInWithPopup(a, provider)
  } catch (e) {
    const code = (e as { code?: string }).code ?? ''
    // Home-screen apps on iOS sometimes can't open pop-ups; fall back to a full redirect.
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment' || code === 'auth/web-storage-unsupported') {
      await auth.signInWithRedirect(a, provider)
      return
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return
    throw e
  }
}

export async function signOutAccount(): Promise<void> {
  const { app, auth } = await load()
  await auth.signOut(auth.getAuth(app))
}

interface CloudDoc { state: string; updatedAt: number; version: 1 }

export async function pullState(uid: string): Promise<GameState | null> {
  const { app, fs } = await load()
  const snap = await fs.getDoc(fs.doc(fs.getFirestore(app), 'hunters', uid))
  if (!snap.exists()) return null
  const d = snap.data() as CloudDoc
  return JSON.parse(d.state) as GameState
}

export async function pushState(uid: string, s: GameState | null): Promise<void> {
  const { app, fs } = await load()
  const ref = fs.doc(fs.getFirestore(app), 'hunters', uid)
  if (!s) { await fs.deleteDoc(ref); return }
  const body: CloudDoc = { state: JSON.stringify(s), updatedAt: s.updatedAt ?? Date.now(), version: 1 }
  await fs.setDoc(ref, body)
}

/** Permanently delete the cloud save and the Google-linked account. */
export async function deleteAccount(uid: string): Promise<void> {
  const { app, auth, fs } = await load()
  const a = auth.getAuth(app)
  const user = a.currentUser
  if (!user || user.uid !== uid) throw new Error('Sign in again before deleting your account.')
  await fs.deleteDoc(fs.doc(fs.getFirestore(app), 'hunters', uid))
  await fs.deleteDoc(fs.doc(fs.getFirestore(app), 'pushSubs', uid)).catch(() => undefined)
  try {
    await auth.deleteUser(user)
  } catch (e) {
    // Firebase requires a recent sign-in to delete an account.
    if ((e as { code?: string }).code !== 'auth/requires-recent-login') throw e
    await auth.reauthenticateWithPopup(user, new auth.GoogleAuthProvider())
    await auth.deleteUser(user)
  }
}

// ---------- Reminders ----------
// The reminder sender (a scheduled GitHub Action) reads pushSubs/{uid} and the
// player's save, then sends web push notifications at the chosen local time.

export interface ReminderPrefs { morning: string; evening: boolean; tz: string }
interface ReminderDoc extends ReminderPrefs { subscription: PushSubscriptionJSON; updatedAt: number }

/** Public key the sender signs pushes with; the sender publishes it on its first run. */
export async function reminderKey(): Promise<string | null> {
  const { app, fs } = await load()
  const snap = await fs.getDoc(fs.doc(fs.getFirestore(app), 'public', 'vapid'))
  return snap.exists() ? (snap.data() as { publicKey?: string }).publicKey ?? null : null
}

export async function getReminder(uid: string): Promise<ReminderPrefs | null> {
  const { app, fs } = await load()
  const snap = await fs.getDoc(fs.doc(fs.getFirestore(app), 'pushSubs', uid))
  if (!snap.exists()) return null
  const d = snap.data() as ReminderDoc
  return { morning: d.morning, evening: d.evening, tz: d.tz }
}

export async function saveReminder(uid: string, subscription: PushSubscriptionJSON, prefs: ReminderPrefs): Promise<void> {
  const { app, fs } = await load()
  const doc: ReminderDoc = { ...prefs, subscription, updatedAt: Date.now() }
  await fs.setDoc(fs.doc(fs.getFirestore(app), 'pushSubs', uid), doc)
}

export async function removeReminder(uid: string): Promise<void> {
  const { app, fs } = await load()
  await fs.deleteDoc(fs.doc(fs.getFirestore(app), 'pushSubs', uid))
}
