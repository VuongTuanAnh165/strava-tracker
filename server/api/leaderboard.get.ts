/**
 * Leaderboard API
 * 
 * GET /api/leaderboard
 * 
 * Returns teams and individual rankings.
 * Fallback for when Firebase realtime listener is not available.
 */
// defineCachedEventHandler is auto-imported by Nuxt/Nitro
import { useFirebaseAdmin } from '../utils/firebase'

export default defineCachedEventHandler(async () => {
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

  // Dynamically calculate actual member count and total_km from the users array
  // This prevents mismatches if admin manually deletes users from Firebase
  const calculatedTeams = teams.map(team => {
    const teamUsers = users.filter(u => u.team_id === team.id)
    return {
      ...team,
      member_count: teamUsers.length,
    }
  })

  return {
    teams: calculatedTeams,
    users,
  }
}, {
  maxAge: 60 * 15, // Cache for 15 minutes
  name: 'leaderboardData',
  getKey: () => 'global'
})
