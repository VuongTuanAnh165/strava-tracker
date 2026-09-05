import { defineEventHandler, getQuery, createError } from 'h3'
import { useFirebaseAdmin } from '../utils/firebase'

export default defineCachedEventHandler(async (event) => {
  const query = getQuery(event)
  const stravaId = query.strava_id as string

  if (!stravaId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing strava_id parameter',
    })
  }

  const db = useFirebaseAdmin()

  // Fetch activities for the specific user (remove orderBy to avoid requiring a Firebase Composite Index)
  const activitiesSnapshot = await db
    .collection('activities')
    .where('strava_id', '==', stravaId)
    .get()

  const activities = activitiesSnapshot.docs.map(doc => {
    const data = doc.data()
    return {
      activity_id: data.activity_id,
      name: data.name,
      distance_km: data.distance_km,
      moving_time: data.moving_time,
      pace: data.pace,
      start_date_local: data.start_date_local,
    }
  })

  // Sort activities by date descending in memory
  activities.sort((a, b) => {
    return new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime()
  })

  return activities
}, {
  maxAge: 60 * 60 * 24 * 365, // Cache for 1 year, invalidated explicitly on webhook/sync
  name: 'userActivities',
  getKey: (event) => {
    const q = getQuery(event)
    return String(q.strava_id || 'default')
  }
})
