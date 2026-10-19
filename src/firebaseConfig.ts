import type { FirebaseOptions } from 'firebase/app'

/**
 * Paste the web app config from Firebase console → Project settings → Your apps.
 * These values identify the project; they are not secrets (access is enforced by
 * Firestore security rules). Leave null to run in on-device-only mode.
 */
export const firebaseConfig: FirebaseOptions | null = null
