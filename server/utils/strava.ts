/**
 * Strava API helper utilities
 * 
 * Handles: OAuth token exchange, token refresh, fetching activities.
 * All Strava API calls go through these helpers.
 */
import { STRAVA_API_BASE, STRAVA_TOKEN_URL } from './constants'
import { useFirebaseAdmin } from './firebase'
import { getAppForUser } from './stravaApps'

interface StravaTokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: {
    id: number
    firstname: string
    lastname: string
    profile: string
    profile_medium: string
  }
}

interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type: string
  distance: number        // meters
  moving_time: number     // seconds
  elapsed_time: number    // seconds
  start_date: string      // UTC
  start_date_local: string // local timezone
  manual: boolean
  trainer: boolean        // true = treadmill/indoor (no GPS)
  flagged: boolean        // true = Strava AI flagged as suspicious
  average_speed: number   // m/s
  max_speed: number       // m/s
}

/**
 * Exchange OAuth authorization code for access + refresh tokens.
 */
export async function exchangeAuthCode(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<StravaTokenResponse> {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Strava token exchange failed: ${response.status} ${error}`)
  }

  return response.json()
}

/**
 * Refresh an expired access token.
 * Strava tokens expire every 6 hours.
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{
  access_token: string
  refresh_token: string
  expires_at: number
}> {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Strava token refresh failed: ${response.status} ${error}`)
  }

  return response.json()
}

/**
 * Ensure user has a valid access token, refreshing if expired.
 * Updates Firestore with new tokens if refreshed.
 * Returns the valid access token.
 */
export async function getValidAccessToken(stravaId: string): Promise<string> {
  const db = useFirebaseAdmin()
  const userDoc = await db.collection('users').doc(stravaId).get()

  if (!userDoc.exists) {
    throw new Error(`User ${stravaId} not found in database`)
  }

  const userData = userDoc.data()!
  const now = Math.floor(Date.now() / 1000)

  // Token still valid (with 5 min buffer)
  if (userData.token_expires_at > now + 300) {
    return userData.access_token
  }

  // Token expired — refresh it
  // Get the correct app credentials for this user
  const appConfig = await getAppForUser(stravaId)
  console.log(`[Strava] Refreshing token for user ${stravaId} using App${appConfig.index}`)
  const newTokens = await refreshAccessToken(userData.refresh_token, appConfig.clientId, appConfig.clientSecret)

  // Update tokens in Firestore
  await db.collection('users').doc(stravaId).update({
    access_token: newTokens.access_token,
    refresh_token: newTokens.refresh_token,
    token_expires_at: newTokens.expires_at,
  })

  return newTokens.access_token
}

/**
 * Fetch a single activity's full details from Strava.
 */
export async function fetchActivityDetail(
  accessToken: string,
  activityId: number
): Promise<StravaActivity> {
  const response = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Strava fetch activity ${activityId} failed: ${response.status} ${error}`)
  }

  return response.json()
}

/**
 * Fetch all activities for an athlete within a date range.
 * Handles pagination automatically (max 200 per page).
 * 
 * @param after - Unix timestamp (seconds) — activities after this date
 * @param before - Unix timestamp (seconds) — activities before this date
 */
export async function fetchActivitiesInRange(
  accessToken: string,
  after: number,
  before: number
): Promise<StravaActivity[]> {
  const allActivities: StravaActivity[] = []
  let page = 1
  const perPage = 200

  while (true) {
    const url = new URL(`${STRAVA_API_BASE}/athlete/activities`)
    url.searchParams.set('after', String(after))
    url.searchParams.set('before', String(before))
    url.searchParams.set('per_page', String(perPage))
    url.searchParams.set('page', String(page))

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Strava fetch activities failed: ${response.status} ${error}`)
    }

    const activities: StravaActivity[] = await response.json()
    allActivities.push(...activities)

    // If we got fewer than perPage, we've reached the end
    if (activities.length < perPage) break
    page++

    // Safety limit to avoid infinite loops
    if (page > 10) break
  }

  return allActivities
}

export type { StravaActivity, StravaTokenResponse }
