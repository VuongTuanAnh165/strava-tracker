/**
 * Multi-App Strava Configuration Manager
 * 
 * Manages multiple Strava API apps to overcome the 10-user-per-app limit.
 * Each app has its own clientId, clientSecret, and webhookToken.
 * Users are distributed across apps automatically.
 */
import { useFirebaseAdmin } from './firebase'

export interface StravaAppConfig {
  index: number          // 1-based index (1, 2, 3, 4, 5)
  clientId: string
  clientSecret: string
  webhookToken: string
}

const MAX_USERS_PER_APP = 8

/**
 * Parse and return all Strava app configs from environment.
 * Expects STRAVA_APPS_CONFIG as a JSON array in env.
 * 
 * Example:
 * STRAVA_APPS_CONFIG=[{"clientId":"111","clientSecret":"xxx","webhookToken":"token1"}]
 */
let _cachedApps: StravaAppConfig[] | null = null

export function getAppsConfig(): StravaAppConfig[] {
  if (_cachedApps) return _cachedApps

  const raw = process.env.STRAVA_APPS_CONFIG
  if (!raw) {
    throw new Error('[StravaApps] STRAVA_APPS_CONFIG environment variable is not set')
  }

  try {
    const parsed = JSON.parse(raw) as Array<{
      clientId: string
      clientSecret: string
      webhookToken: string
    }>

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('STRAVA_APPS_CONFIG must be a non-empty JSON array')
    }

    _cachedApps = parsed.map((app, i) => ({
      index: i + 1,
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      webhookToken: app.webhookToken,
    }))

    console.log(`[StravaApps] Loaded ${_cachedApps.length} app(s): ${_cachedApps.map(a => `App${a.index}(${a.clientId})`).join(', ')}`)

    return _cachedApps
  } catch (err: any) {
    throw new Error(`[StravaApps] Failed to parse STRAVA_APPS_CONFIG: ${err.message}`)
  }
}

/**
 * Get a specific app config by its 1-based index.
 */
export function getAppByIndex(index: number): StravaAppConfig {
  const apps = getAppsConfig()
  const app = apps.find(a => a.index === index)
  if (!app) {
    throw new Error(`[StravaApps] App index ${index} not found. Available: ${apps.map(a => a.index).join(', ')}`)
  }
  return app
}

/**
 * Find the first app that has fewer than MAX_USERS_PER_APP users.
 * Queries Firestore to count users per app.
 * 
 * Returns the available app config, or null if all apps are full.
 */
export async function findAvailableApp(): Promise<StravaAppConfig | null> {
  const apps = getAppsConfig()
  const db = useFirebaseAdmin()

  // Fetch all users to count them in memory
  // This is very fast since we only have max 50 users, and perfectly handles legacy users
  const usersSnapshot = await db.collection('users').get()

  const userCounts: Record<number, number> = {}

  usersSnapshot.forEach(doc => {
    const data = doc.data()
    // Legacy users without strava_app_index are assumed to be on App 1
    const appIndex = data.strava_app_index || 1
    userCounts[appIndex] = (userCounts[appIndex] || 0) + 1
  })
  console.log(userCounts)
  // Find the first app that has fewer than MAX_USERS_PER_APP
  for (const app of apps) {
    const userCount = userCounts[app.index] || 0
    console.log(`[StravaApps] App${app.index} (${app.clientId}): ${userCount}/${MAX_USERS_PER_APP} users`)

    if (userCount < MAX_USERS_PER_APP) {
      return app
    }
  }

  return null
}

/**
 * Get the app config that a specific user belongs to.
 * Reads strava_app_index from the user's Firestore document.
 */
export async function getAppForUser(stravaId: string): Promise<StravaAppConfig> {
  const db = useFirebaseAdmin()
  const userDoc = await db.collection('users').doc(stravaId).get()

  if (!userDoc.exists) {
    throw new Error(`[StravaApps] User ${stravaId} not found in database`)
  }

  const userData = userDoc.data()!
  const appIndex = userData.strava_app_index

  if (!appIndex) {
    // Fallback for legacy users who don't have strava_app_index
    // Assume they belong to app 1
    console.warn(`[StravaApps] User ${stravaId} has no strava_app_index, defaulting to App 1`)
    return getAppByIndex(1)
  }

  return getAppByIndex(appIndex)
}

/**
 * Check if a webhook verify token matches any of our apps.
 * Used during Strava webhook subscription verification.
 */
export function isValidWebhookToken(token: string): boolean {
  const apps = getAppsConfig()
  return apps.some(app => app.webhookToken === token)
}

/**
 * Clear cached config (useful for testing).
 */
export function clearAppsCache(): void {
  _cachedApps = null
}
