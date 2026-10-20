// Sends due Daily Quest reminders. Run on a schedule by .github/workflows/reminders.yml.
// Needs the FIREBASE_SERVICE_ACCOUNT secret (the JSON key from Firebase → Project settings → Service accounts).
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import webpush from 'web-push'
import { dueMessages } from './plan.mjs'

const raw = process.env.FIREBASE_SERVICE_ACCOUNT
if (!raw) {
  console.log('FIREBASE_SERVICE_ACCOUNT is not set; reminders are off.')
  process.exit(0)
}
initializeApp({ credential: cert(JSON.parse(raw)) })
const db = getFirestore()

// VAPID keys are created on the first run. The private key stays in a document
// clients cannot read; the public key is published for the app to subscribe with.
async function vapidKeys() {
  const ref = db.doc('config/vapid')
  const snap = await ref.get()
  if (snap.exists) return snap.data()
  const keys = webpush.generateVAPIDKeys()
  await ref.set(keys)
  await db.doc('public/vapid').set({ publicKey: keys.publicKey })
  console.log('Created VAPID keys.')
  return keys
}

const keys = await vapidKeys()
const pub = await db.doc('public/vapid').get()
if (!pub.exists || pub.data().publicKey !== keys.publicKey) await db.doc('public/vapid').set({ publicKey: keys.publicKey })
webpush.setVapidDetails('https://marcustehecker.github.io/Leveling-Trainer/', keys.publicKey, keys.privateKey)

const subs = await db.collection('pushSubs').get()
const at = new Date()
let sent = 0, removed = 0, failed = 0
for (const doc of subs.docs) {
  const sub = doc.data()
  let state = null
  try {
    const h = await db.doc(`hunters/${doc.id}`).get()
    if (h.exists) state = JSON.parse(h.data().state)
  } catch { /* no save yet */ }
  for (const m of dueMessages(sub, state, at)) {
    try {
      await webpush.sendNotification(sub.subscription, JSON.stringify(m.payload), { TTL: 6 * 3600, urgency: 'high' })
      await doc.ref.update({ [m.slot]: m.date })
      sent++
    } catch (e) {
      // 404/410: the phone dropped this subscription, so forget it.
      if (e.statusCode === 404 || e.statusCode === 410) { await doc.ref.delete(); removed++; break }
      failed++
      console.log(`Push failed with status ${e.statusCode ?? 'unknown'}`)
    }
  }
}
console.log(`Checked ${subs.size} subscribers: ${sent} sent, ${removed} removed, ${failed} failed.`)
