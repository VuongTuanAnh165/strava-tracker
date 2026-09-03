/**
 * Anti-Cheat Engine
 * 
 * Validates Strava activities against race rules.
 * All activities must pass ALL rules to be counted.
 */
import { RACE_START, RACE_END, MIN_PACE, MAX_PACE, VALID_ACTIVITY_TYPES } from './constants'
import { useFirebaseAdmin } from './firebase'
import type { StravaActivity } from './strava'

interface ValidationResult {
  valid: boolean
  reason?: string
  distanceKm?: number
  paceSecondsPerKm?: number
}

/**
 * Validate a single Strava activity against all race rules.
 * Returns { valid: true, distanceKm, paceSecondsPerKm } if the activity passes.
 * Returns { valid: false, reason: "..." } if it fails.
 */
export function validateActivity(activity: StravaActivity): ValidationResult {
  // Rule 1: Activity type must be Run or VirtualRun
  if (!VALID_ACTIVITY_TYPES.includes(activity.type)) {
    return {
      valid: false,
      reason: `Invalid activity type: "${activity.type}". Only ${VALID_ACTIVITY_TYPES.join(', ')} are accepted.`,
    }
  }

  // Rule 2: Must not be manually entered
  if (activity.manual) {
    return {
      valid: false,
      reason: 'Manual activity entries are not accepted.',
    }
  }

  // Rule 3: Must be within race date range (01/09 00:00 — 24/09 23:59 UTC+7)
  const activityDate = new Date(activity.start_date_local)
  if (activityDate < RACE_START || activityDate > RACE_END) {
    return {
      valid: false,
      reason: `Activity date ${activity.start_date_local} is outside race period (${RACE_START.toISOString()} — ${RACE_END.toISOString()}).`,
    }
  }

  // Rule 4: Distance must be > 0
  if (!activity.distance || activity.distance <= 0) {
    return {
      valid: false,
      reason: 'Activity has no distance recorded.',
    }
  }

  // Rule 5: Pace must be between 4:00/km and 15:00/km
  const distanceKm = activity.distance / 1000
  const paceSecondsPerKm = activity.moving_time / distanceKm

  if (paceSecondsPerKm < MIN_PACE) {
    const paceMin = Math.floor(paceSecondsPerKm / 60)
    const paceSec = Math.floor(paceSecondsPerKm % 60)
    return {
      valid: false,
      reason: `Pace too fast: ${paceMin}:${String(paceSec).padStart(2, '0')}/km (minimum ${MIN_PACE / 60}:00/km).`,
    }
  }

  if (paceSecondsPerKm > MAX_PACE) {
    const paceMin = Math.floor(paceSecondsPerKm / 60)
    const paceSec = Math.floor(paceSecondsPerKm % 60)
    return {
      valid: false,
      reason: `Pace too slow: ${paceMin}:${String(paceSec).padStart(2, '0')}/km (maximum ${MAX_PACE / 60}:00/km).`,
    }
  }

  // All rules passed
  return {
    valid: true,
    distanceKm: Math.round(distanceKm * 100) / 100, // Round to 2 decimal places
    paceSecondsPerKm: Math.round(paceSecondsPerKm),
  }
}

/**
 * Check if an activity already exists in the database (dedup).
 * Prevents counting the same activity twice if webhook sends duplicate events.
 */
export async function isActivityDuplicate(activityId: number): Promise<boolean> {
  const db = useFirebaseAdmin()
  const doc = await db.collection('activities').doc(String(activityId)).get()
  return doc.exists
}

/**
 * Process a validated activity: write to Firestore using a transaction.
 * Atomically updates:
 *   1. activities collection (history log)
 *   2. users/{strava_id}.total_km + activity_count
 *   3. teams/{team_id}.total_km
 * 
 * If any step fails, the entire transaction rolls back.
 */
export async function processValidActivity(
  activity: StravaActivity,
  stravaId: string,
  teamId: string,
  distanceKm: number,
  paceSecondsPerKm: number
): Promise<void> {
  const db = useFirebaseAdmin()
  const { FieldValue } = await import('firebase-admin/firestore')

  await db.runTransaction(async (transaction) => {
    const activityRef = db.collection('activities').doc(String(activity.id))
    const userRef = db.collection('users').doc(stravaId)
    const teamRef = db.collection('teams').doc(teamId)

    // Check dedup inside transaction
    const existingActivity = await transaction.get(activityRef)
    if (existingActivity.exists) {
      console.log(`[AntiCheat] Activity ${activity.id} already processed, skipping.`)
      return
    }

    // 1. Write activity record
    transaction.set(activityRef, {
      activity_id: activity.id,
      strava_id: stravaId,
      team_id: teamId,
      distance_km: distanceKm,
      moving_time: activity.moving_time,
      pace: paceSecondsPerKm,
      name: activity.name,
      start_date_local: activity.start_date_local,
      processed_at: FieldValue.serverTimestamp(),
    })

    // 2. Update user total
    transaction.update(userRef, {
      total_km: FieldValue.increment(distanceKm),
      activity_count: FieldValue.increment(1),
      last_sync_at: FieldValue.serverTimestamp(),
    })

    // 3. Update team total
    transaction.update(teamRef, {
      total_km: FieldValue.increment(distanceKm),
    })

    console.log(
      `[AntiCheat] ✅ Activity ${activity.id} accepted: ${distanceKm}km, pace ${Math.floor(paceSecondsPerKm / 60)}:${String(Math.floor(paceSecondsPerKm % 60)).padStart(2, '0')}/km → user ${stravaId} (${teamId})`
    )
  })
}

/**
 * Remove a previously processed activity (for webhook delete/update events).
 * Atomically subtracts km from user and team totals.
 */
export async function removeProcessedActivity(activityId: number): Promise<void> {
  const db = useFirebaseAdmin()
  const { FieldValue } = await import('firebase-admin/firestore')

  const activityRef = db.collection('activities').doc(String(activityId))
  const activityDoc = await activityRef.get()

  if (!activityDoc.exists) {
    console.log(`[AntiCheat] Activity ${activityId} not found in DB, nothing to remove.`)
    return
  }

  const data = activityDoc.data()!

  await db.runTransaction(async (transaction) => {
    // Subtract km from user
    const userRef = db.collection('users').doc(data.strava_id)
    transaction.update(userRef, {
      total_km: FieldValue.increment(-data.distance_km),
      activity_count: FieldValue.increment(-1),
    })

    // Subtract km from team
    const teamRef = db.collection('teams').doc(data.team_id)
    transaction.update(teamRef, {
      total_km: FieldValue.increment(-data.distance_km),
    })

    // Delete activity record
    transaction.delete(activityRef)
  })

  console.log(
    `[AntiCheat] 🗑️ Activity ${activityId} removed: -${data.distance_km}km from user ${data.strava_id} (${data.team_id})`
  )
}
