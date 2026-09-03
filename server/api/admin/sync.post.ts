/**
 * Admin: Force sync a specific user or all users
 * 
 * POST /api/admin/sync?secret=xxx&strava_id=123 (single user)
 * POST /api/admin/sync?secret=xxx (all users)
 * 
 * Protected by admin secret.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { useFirebaseAdmin } from '../../utils/firebase'
import { getValidAccessToken, fetchActivitiesInRange } from '../../utils/strava'
import { validateActivity, processValidActivity } from '../../utils/antiCheat'
import { RACE_START, RACE_END } from '../../utils/constants'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const secret = query.secret as string
  const targetStravaId = query.strava_id as string | undefined

  // Verify admin secret
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Unauthorized. Invalid admin secret.',
    })
  }

  const db = useFirebaseAdmin()
  const results: Array<{ strava_id: string; name: string; accepted: number; rejected: number; duplicates: number; error?: string }> = []

  // Get users to sync
  let usersToSync: Array<{ strava_id: string; name: string; team_id: string }>

  if (targetStravaId) {
    // Single user
    const userDoc = await db.collection('users').doc(targetStravaId).get()
    if (!userDoc.exists) {
      throw createError({ statusCode: 404, statusMessage: `User ${targetStravaId} not found` })
    }
    const data = userDoc.data()!
    usersToSync = [{ strava_id: targetStravaId, name: data.name, team_id: data.team_id }]
  } else {
    // All users
    const snapshot = await db.collection('users').get()
    usersToSync = snapshot.docs.map((doc) => ({
      strava_id: doc.id,
      name: doc.data().name,
      team_id: doc.data().team_id,
    }))
  }

  console.log(`[AdminSync] Starting sync for ${usersToSync.length} user(s)`)

  for (const user of usersToSync) {
    try {
      const accessToken = await getValidAccessToken(user.strava_id)

      const afterTimestamp = Math.floor(RACE_START.getTime() / 1000)
      const beforeTimestamp = Math.floor(Math.min(Date.now(), RACE_END.getTime()) / 1000)

      const activities = await fetchActivitiesInRange(accessToken, afterTimestamp, beforeTimestamp)

      let accepted = 0
      let rejected = 0
      let duplicates = 0

      for (const activity of activities) {
        // Check for duplicates
        const actRef = db.collection('activities').doc(String(activity.id))
        const existing = await actRef.get()
        if (existing.exists) {
          duplicates++
          continue
        }

        const validation = validateActivity(activity)
        if (!validation.valid) {
          rejected++
          continue
        }

        await processValidActivity(
          activity,
          user.strava_id,
          user.team_id,
          validation.distanceKm!,
          validation.paceSecondsPerKm!
        )
        accepted++
      }

      // Update last_sync_at
      const { FieldValue } = await import('firebase-admin/firestore')
      await db.collection('users').doc(user.strava_id).update({
        last_sync_at: FieldValue.serverTimestamp(),
      })

      results.push({
        strava_id: user.strava_id,
        name: user.name,
        accepted,
        rejected,
        duplicates,
      })

      console.log(`[AdminSync] ✅ ${user.name}: ${accepted} accepted, ${rejected} rejected, ${duplicates} duplicates`)
    } catch (err: any) {
      console.error(`[AdminSync] ❌ ${user.name}: ${err.message}`)
      results.push({
        strava_id: user.strava_id,
        name: user.name,
        accepted: 0,
        rejected: 0,
        duplicates: 0,
        error: err.message,
      })
    }
  }

  return {
    total_users: usersToSync.length,
    results,
  }
})
