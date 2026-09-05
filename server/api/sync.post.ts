/**
 * Historical Data Sync Endpoint
 * 
 * POST /api/sync
 * 
 * Syncs all activities from race start (01/09) to now for the authenticated user.
 * Called after initial OAuth login and available as manual sync button.
 */
import { defineEventHandler, readBody, getCookie, createError } from 'h3'
import { getValidAccessToken, fetchActivitiesInRange } from '../utils/strava'
import { validateActivity, processValidActivity } from '../utils/antiCheat'
import { useStorage } from '#imports'
import { useFirebaseAdmin } from '../utils/firebase'
import { RACE_START, RACE_END } from '../utils/constants'

export default defineEventHandler(async (event) => {
  // Get session from cookie
  const sessionCookie = getCookie(event, 'strava_session')
  if (!sessionCookie) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Not authenticated. Please login first.',
    })
  }

  let session: { strava_id: string; name: string; team_id: string }
  try {
    session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8'))
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid session cookie.',
    })
  }

  const stravaId = session.strava_id

  // Verify user exists in DB
  const db = useFirebaseAdmin()
  const userDoc = await db.collection('users').doc(stravaId).get()
  if (!userDoc.exists) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found in database.',
    })
  }

  const userData = userDoc.data()!

  try {
    // Get valid access token
    const accessToken = await getValidAccessToken(stravaId)

    // Calculate time range
    const afterTimestamp = Math.floor(RACE_START.getTime() / 1000)
    const now = new Date()
    const beforeTimestamp = Math.floor(
      Math.min(now.getTime(), RACE_END.getTime()) / 1000
    )

    console.log(
      `[Sync] Syncing activities for user ${stravaId} (${userData.name}): ${new Date(afterTimestamp * 1000).toISOString()} → ${new Date(beforeTimestamp * 1000).toISOString()}`
    )

    // Fetch all activities in race period
    const activities = await fetchActivitiesInRange(accessToken, afterTimestamp, beforeTimestamp)

    console.log(`[Sync] Found ${activities.length} total activities from Strava`)

    let accepted = 0
    let rejected = 0
    let duplicates = 0
    const results: Array<{ id: number; name: string; status: string; reason?: string }> = []

    for (const activity of activities) {
      // Check if already processed
      const activityRef = db.collection('activities').doc(String(activity.id))
      const existingActivity = await activityRef.get()
      if (existingActivity.exists) {
        duplicates++
        results.push({
          id: activity.id,
          name: activity.name,
          status: 'duplicate',
        })
        continue
      }

      // Validate
      const validation = validateActivity(activity)

      if (!validation.valid) {
        rejected++
        results.push({
          id: activity.id,
          name: activity.name,
          status: 'rejected',
          reason: validation.reason,
        })
        console.log(`[Sync] ❌ Rejected: "${activity.name}" — ${validation.reason}`)
        continue
      }

      // Process valid activity
      await processValidActivity(
        activity,
        stravaId,
        userData.team_id,
        validation.distanceKm!,
        validation.paceSecondsPerKm!
      )

      accepted++
      results.push({
        id: activity.id,
        name: activity.name,
        status: 'accepted',
      })
    }

    // Update last_sync_at
    const { FieldValue } = await import('firebase-admin/firestore')
    await db.collection('users').doc(stravaId).update({
      last_sync_at: FieldValue.serverTimestamp(),
    })

    const summary = {
      total: activities.length,
      accepted,
      rejected,
      duplicates,
      results,
    }

    if (accepted > 0) {
      await useStorage('cache').removeItem('nitro:handlers:leaderboardData:global.json')
      await useStorage('cache').removeItem(`nitro:handlers:userActivities:${stravaId}.json`)
    }

    console.log(
      `[Sync] ✅ Sync complete for ${userData.name}: ${accepted} accepted, ${rejected} rejected, ${duplicates} duplicates`
    )

    return summary
  } catch (err: any) {
    console.error(`[Sync] Error syncing user ${stravaId}:`, err)
    throw createError({
      statusCode: 500,
      statusMessage: `Sync failed: ${err.message}`,
    })
  }
})
