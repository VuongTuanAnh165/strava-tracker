/**
 * Firebase Admin SDK initialization (singleton)
 * 
 * Uses environment variables for credentials.
 * Auto-imported by Nitro in all server routes.
 */
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let _app: App | undefined
let _db: Firestore | undefined

function getFirebaseApp(): App {
  if (_app) return _app

  const apps = getApps()
  if (apps.length > 0) {
    _app = apps[0]
    return _app
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error(
      'Missing Firebase credentials. Check FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL in .env'
    )
  }

  _app = initializeApp({
    credential: cert({
      projectId,
      privateKey,
      clientEmail,
    }),
  })

  return _app
}

/**
 * Get Firestore database instance.
 * Lazily initializes Firebase Admin if not already done.
 */
export function useFirebaseAdmin(): Firestore {
  if (_db) return _db
  const app = getFirebaseApp()
  _db = getFirestore(app)
  return _db
}
