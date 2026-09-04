/**
 * Anti-Cheat Engine
 * 
 * Validates Strava activities against race rules.
 * All activities must pass ALL rules to be counted.
 * 
 * 10-Layer Validation:
 *  1. Activity type check (type + sport_type)
 *  2. Manual entry block
 *  3. Treadmill/Indoor block (trainer)
 *  4. Strava flagged activity block
 *  5. Race date range check
 *  6. Minimum distance (1km)
 *  7. Max speed check
 *  8. Auto-pause exploit check (rest ratio)
 *  9. Average pace too fast check
 * 10. Average pace too slow check
 */
import { RACE_START, RACE_END, MIN_PACE, MAX_PACE, MAX_SPEED_MS, MAX_PAUSE_RATIO, MIN_DISTANCE, VALID_ACTIVITY_TYPES, VALID_SPORT_TYPES } from './constants'
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
  // Rule 1: Activity type must be Run/VirtualRun (check both type AND sport_type)
  // Strava deprecated 'type' in favor of 'sport_type', so we check both for safety
  const typeValid = VALID_ACTIVITY_TYPES.includes(activity.type)
  const sportTypeValid = activity.sport_type ? VALID_SPORT_TYPES.includes(activity.sport_type) : true
  if (!typeValid && !sportTypeValid) {
    return {
      valid: false,
      reason: `Sai loại hình: type="${activity.type}", sport_type="${activity.sport_type}". Chỉ chấp nhận chạy bộ (Run, VirtualRun, TrailRun).`,
    }
  }

  // Rule 2: Must not be manually entered
  if (activity.manual) {
    return {
      valid: false,
      reason: 'Không chấp nhận bài chạy nhập tay (Manual entry).',
    }
  }

  // Rule 3: Must not be from a treadmill/indoor trainer (no GPS verification possible)
  if (activity.trainer) {
    return {
      valid: false,
      reason: 'Không chấp nhận chạy trên máy (Treadmill/Indoor). Yêu cầu chạy ngoài trời có GPS.',
    }
  }

  // Rule 4: Must not be flagged by Strava's own anti-cheat AI
  if (activity.flagged) {
    return {
      valid: false,
      reason: 'Bài chạy đã bị Strava gắn cờ nghi ngờ gian lận (Flagged by Strava).',
    }
  }

  // Rule 5: Must be within race date range
  const activityDate = new Date(activity.start_date_local)
  if (activityDate < RACE_START || activityDate > RACE_END) {
    return {
      valid: false,
      reason: `Nằm ngoài thời gian giải: ${activity.start_date_local}.`,
    }
  }

  // Rule 6: Minimum distance (1km) — prevents micro-run spam
  if (!activity.distance || activity.distance < MIN_DISTANCE) {
    const actualKm = activity.distance ? (activity.distance / 1000).toFixed(2) : '0'
    return {
      valid: false,
      reason: `Quãng đường quá ngắn: ${actualKm} km (Tối thiểu: ${MIN_DISTANCE / 1000} km).`,
    }
  }

  // Rule 7: Max Speed Check — detects motorized transport
  if (activity.max_speed && activity.max_speed > MAX_SPEED_MS) {
    return {
      valid: false,
      reason: `Vận tốc tối đa quá cao: ${(activity.max_speed * 3.6).toFixed(1)} km/h (Giới hạn: ${(MAX_SPEED_MS * 3.6).toFixed(1)} km/h). Nghi ngờ dùng phương tiện.`,
    }
  }

  // Rule 8: Auto-Pause Exploit Check (Rest Ratio)
  if (activity.moving_time > 0) {
    const pauseRatio = activity.elapsed_time / activity.moving_time
    if (pauseRatio > MAX_PAUSE_RATIO) {
      return {
        valid: false,
        reason: `Thời gian nghỉ ngắt quãng quá dài (Tỷ lệ: ${pauseRatio.toFixed(1)}x). Vượt quá mức cho phép ${MAX_PAUSE_RATIO}x.`,
      }
    }
  }

  // Rule 9 & 10: Average Pace Check (using moving_time)
  const distanceKm = activity.distance / 1000
  const paceSecondsPerKm = activity.moving_time / distanceKm

  if (paceSecondsPerKm < MIN_PACE) {
    const paceMin = Math.floor(paceSecondsPerKm / 60)
    const paceSec = Math.floor(paceSecondsPerKm % 60)
    return {
      valid: false,
      reason: `Pace trung bình quá nhanh: ${paceMin}:${String(paceSec).padStart(2, '0')}/km (Giới hạn: ${MIN_PACE / 60}:00/km).`,
    }
  }

  if (paceSecondsPerKm > MAX_PACE) {
    const paceMin = Math.floor(paceSecondsPerKm / 60)
    const paceSec = Math.floor(paceSecondsPerKm % 60)
    return {
      valid: false,
      reason: `Pace trung bình quá chậm: ${paceMin}:${String(paceSec).padStart(2, '0')}/km (Giới hạn: ${MAX_PACE / 60}:00/km).`,
    }
  }

  // All 10 rules passed ✅
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
