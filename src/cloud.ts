// Google sign-in and cloud saves (Firebase Auth + Firestore Lite).
// Loaded lazily so the app still starts fast and works offline.
import type { User } from 'firebase/auth'
import { firebaseConfig } from './firebaseConfig'
import type { GameState } from './core/types'

export const cloudEnabled = firebaseConfig !== null

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
