import type { FirebaseOptions } from 'firebase/app'

/**
 * Web app config from Firebase console → Project settings → Your apps.
 * These values identify the project; they are not secrets (access is enforced by
 * Firestore security rules). Set to null to run in on-device-only mode.
 */
export const firebaseConfig: FirebaseOptions | null = {
  apiKey: 'AIzaSyD6popdS0UJ3cGiuPmVsq04mz1pxrtMmzc',
  authDomain: 'the-system-6bc30.firebaseapp.com',
  projectId: 'the-system-6bc30',
  storageBucket: 'the-system-6bc30.firebasestorage.app',
  messagingSenderId: '35654220477',
  appId: '1:35654220477:web:82698f5dd67275031ed5d4',
}
