/**
 * Leaderboard API
 * 
 * GET /api/leaderboard
 * 
 * Returns teams and individual rankings.
 * Fallback for when Firebase realtime listener is not available.
 */
import { defineEventHandler } from 'h3'
import { useFirebaseAdmin } from '../utils/firebase'

export default defineEventHandler(async () => {
  const db = useFirebaseAdmin()

  // Fetch teams
  const teamsSnapshot = await db.collection('teams').get()
  const teams = teamsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  // Fetch users sorted by total_km (descending)
  const usersSnapshot = await db
    .collection('users')
    .orderBy('total_km', 'desc')
    .get()

  const users = usersSnapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      strava_id: doc.id,
      name: data.name,
      avatar: data.avatar,
      team_id: data.team_id,
      total_km: data.total_km || 0,
      activity_count: data.activity_count || 0,
    }
  })

  // Fetch recent activities (last 20)
  const activitiesSnapshot = await db
    .collection('activities')
    .orderBy('processed_at', 'desc')
    .limit(20)
    .get()

  const activities = activitiesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  return {
    teams,
    users,
    activities,
  }
})
