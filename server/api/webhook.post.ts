/**
 * Strava Webhook Event Handler
 * 
 * POST /api/webhook
 * 
 * Receives real-time events from Strava when athletes create/update/delete activities.
 * MUST respond with 200 within 2 seconds — heavy processing happens after response.
 */
import { defineEventHandler, readBody } from 'h3'
import { getValidAccessToken, fetchActivityDetail } from '../utils/strava'
import { validateActivity, isActivityDuplicate, processValidActivity, removeProcessedActivity } from '../utils/antiCheat'
import { useFirebaseAdmin } from '../utils/firebase'

interface StravaWebhookEvent {
  object_type: 'activity' | 'athlete'
  object_id: number
  aspect_type: 'create' | 'update' | 'delete'
  owner_id: number
  subscription_id: number
  event_time: number
  updates?: Record<string, any>
}

export default defineEventHandler(async (event) => {
  const body: StravaWebhookEvent = await readBody(event)

  console.log(
    `[Webhook] Event received: ${body.object_type}/${body.aspect_type} — object_id=${body.object_id}, owner_id=${body.owner_id}`
  )

  // Only process activity events
  if (body.object_type !== 'activity') {
    console.log(`[Webhook] Ignoring non-activity event: ${body.object_type}`)
    return { status: 'ok' }
  }

  // Process asynchronously — don't block the 200 response
  // Nitro will keep the function alive until this completes
  processWebhookEvent(body).catch((err) => {
    console.error(`[Webhook] Error processing event:`, err)
  })

  // Return 200 immediately (Strava requires <2s response)
  return { status: 'ok' }
})

/**
 * Async processing of webhook events.
 * Runs after the 200 response has been sent.
 */
async function processWebhookEvent(body: StravaWebhookEvent): Promise<void> {
  const stravaId = String(body.owner_id)
  const activityId = body.object_id

  // Check if this user exists in our system
  const db = useFirebaseAdmin()
  const userDoc = await db.collection('users').doc(stravaId).get()

  if (!userDoc.exists) {
    console.log(`[Webhook] Unknown user ${stravaId}, ignoring.`)
    return
  }

  const userData = userDoc.data()!

  // Handle DELETE events
  if (body.aspect_type === 'delete') {
    console.log(`[Webhook] Activity ${activityId} deleted by user ${stravaId}`)
    await removeProcessedActivity(activityId)
    // Clear caches
    await useStorage('cache').removeItem('nitro:handlers:leaderboardData:global.json')
    await useStorage('cache').removeItem(`nitro:handlers:userActivities:${stravaId}.json`)
    return
  }

  // Handle UPDATE events — remove old data first, then re-process
  if (body.aspect_type === 'update') {
    console.log(`[Webhook] Activity ${activityId} updated by user ${stravaId}`)
    await removeProcessedActivity(activityId)
    // Fall through to re-process like a create event
  }

  // Handle CREATE (and UPDATE after removal) events
  try {
    // Get valid access token (auto-refreshes if expired)
    const accessToken = await getValidAccessToken(stravaId)

    // Fetch full activity details from Strava
    const activity = await fetchActivityDetail(accessToken, activityId)

    // Validate against anti-cheat rules
    const validation = validateActivity(activity)

    if (!validation.valid) {
      console.log(`[Webhook] ❌ Activity ${activityId} rejected: ${validation.reason}`)
      return
    }

    // Process the valid activity (atomic Firestore transaction)
    await processValidActivity(
      activity,
      stravaId,
      userData.team_id,
      validation.distanceKm!,
      validation.paceSecondsPerKm!
    )

    // Caches are now managed entirely by Vercel CDN (swr) and fetch directly from Firebase
  } catch (err: any) {
    console.error(`[Webhook] Failed to process activity ${activityId}:`, err.message)
  }
}
