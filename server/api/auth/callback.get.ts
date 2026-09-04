/**
 * Strava OAuth Callback Handler
 * 
 * GET /api/auth/callback?code=xxx&scope=xxx&state=team_a:1
 * 
 * Flow:
 * 1. Parse state to get team_id and appIndex
 * 2. Exchange authorization code for access + refresh tokens (using correct app credentials)
 * 3. Fetch athlete profile from Strava
 * 4. Create/update user in Firestore (with strava_app_index)
 * 5. Set session cookie
 * 6. Redirect to dashboard
 */
import { defineEventHandler, getQuery, setCookie, sendRedirect, createError } from 'h3'
import { exchangeAuthCode } from '../../utils/strava'
import { useFirebaseAdmin } from '../../utils/firebase'
import { TEAMS, type TeamId } from '../../utils/constants'
import { getAppByIndex } from '../../utils/stravaApps'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string
  const state = query.state as string // Contains "team_id:appIndex" e.g. "team_a:1"
  const error = query.error as string

  // User denied authorization
  if (error) {
    console.log(`[Auth] User denied Strava authorization: ${error}`)
    return sendRedirect(event, '/login?error=denied')
  }

  // Validate required params
  if (!code) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing authorization code',
    })
  }

  // Parse state: "team_a:2" → teamId="team_a", appIndex=2
  const [teamIdRaw, appIndexStr = ''] = (state || '').split(':')
  const teamId = teamIdRaw as TeamId
  const appIndex = parseInt(appIndexStr, 10)

  if (!teamId || !TEAMS[teamId]) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid team selection',
    })
  }

  if (!appIndex || isNaN(appIndex)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid app index in state parameter',
    })
  }

  try {
    // 1. Get the correct app credentials
    const appConfig = getAppByIndex(appIndex)
    console.log(`[Auth] Exchanging auth code for tokens using App${appIndex} (${appConfig.clientId})...`)

    // 2. Exchange code for tokens with the correct app credentials
    const tokenData = await exchangeAuthCode(code, appConfig.clientId, appConfig.clientSecret)

    const stravaId = String(tokenData.athlete.id)
    const athleteName = `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`.trim()
    const avatar = tokenData.athlete.profile_medium || tokenData.athlete.profile || ''

    // 3. Create/update user in Firestore
    const db = useFirebaseAdmin()
    const userRef = db.collection('users').doc(stravaId)
    const existingUser = await userRef.get()

    if (existingUser.exists) {
      // User already exists — update tokens but keep team_id and strava_app_index (prevent switching)
      const existingData = existingUser.data()!
      await userRef.update({
        name: athleteName,
        avatar,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: tokenData.expires_at,
      })
      console.log(`[Auth] Updated existing user: ${athleteName} (${stravaId}), team: ${existingData.team_id}, app: App${existingData.strava_app_index}`)
    } else {
      // New user — create with selected team and app index
      const { FieldValue } = await import('firebase-admin/firestore')
      
      // Ensure team document exists
      const teamRef = db.collection('teams').doc(teamId)
      const teamDoc = await teamRef.get()
      if (!teamDoc.exists) {
        // Initialize team document if it doesn't exist
        await teamRef.set({
          name: TEAMS[teamId].name,
          total_km: 0,
          member_count: 0,
          color: TEAMS[teamId].color,
        })
      }

      await userRef.set({
        strava_id: stravaId,
        name: athleteName,
        avatar,
        team_id: teamId,
        strava_app_index: appIndex,
        total_km: 0,
        activity_count: 0,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: tokenData.expires_at,
        joined_at: FieldValue.serverTimestamp(),
        last_sync_at: null,
      })

      // Increment team member count
      await teamRef.update({
        member_count: FieldValue.increment(1),
      })

      console.log(`[Auth] New user created: ${athleteName} (${stravaId}) → ${TEAMS[teamId].name}, App${appIndex}`)
    }

    // 4. Set session cookie (httpOnly, secure in production)
    const sessionData = JSON.stringify({
      strava_id: stravaId,
      name: athleteName,
      team_id: existingUser.exists ? existingUser.data()!.team_id : teamId,
    })

    setCookie(event, 'strava_session', Buffer.from(sessionData).toString('base64'), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    // 5. Redirect to dashboard — initial sync will be triggered client-side
    console.log(`[Auth] Session set, redirecting to dashboard...`)
    return sendRedirect(event, '/?sync=initial')

  } catch (err: any) {
    console.error(`[Auth] OAuth callback error:`, err)
    throw createError({
      statusCode: 500,
      statusMessage: `Authentication failed: ${err.message}`,
    })
  }
})
