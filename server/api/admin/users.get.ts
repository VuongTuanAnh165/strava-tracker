/**
 * Admin: List all users
 * 
 * GET /api/admin/users?secret=xxx
 * 
 * Protected by admin secret. Returns all users with their data.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { useFirebaseAdmin } from '../../utils/firebase'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const secret = query.secret as string

  // Verify admin secret
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Unauthorized. Invalid admin secret.',
    })
  }

  const db = useFirebaseAdmin()

  // Get all users
  const usersSnapshot = await db.collection('users').orderBy('total_km', 'desc').get()

  const users = usersSnapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      strava_id: doc.id,
      name: data.name,
      avatar: data.avatar,
      team_id: data.team_id,
      total_km: data.total_km || 0,
      activity_count: data.activity_count || 0,
      joined_at: data.joined_at,
      last_sync_at: data.last_sync_at,
      // Don't expose tokens in admin API
    }
  })

  // Get teams
  const teamsSnapshot = await db.collection('teams').get()
  const teams = teamsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  return {
    teams,
    users,
    totalUsers: users.length,
  }
})
