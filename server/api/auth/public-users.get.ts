/**
 * Fetch a public list of users for the "Returning User" login flow.
 * Returns only necessary, non-sensitive information.
 * 
 * GET /api/auth/public-users
 */
// defineCachedEventHandler is auto-imported by Nuxt/Nitro
import { useFirebaseAdmin } from '../../utils/firebase'

export default defineCachedEventHandler(async (event) => {
  const db = useFirebaseAdmin()
  const usersSnapshot = await db.collection('users').get()

  const publicUsers: Array<{
    stravaId: string
    name: string
    teamId: string
    appIndex: number
  }> = []

  usersSnapshot.forEach(doc => {
    const data = doc.data()
    publicUsers.push({
      stravaId: doc.id,
      name: data.name || 'Unknown Athlete',
      teamId: data.team_id || '',
      appIndex: data.strava_app_index || 1
    })
  })

  // Sort alphabetically by name
  publicUsers.sort((a, b) => a.name.localeCompare(b.name))

  return publicUsers
}, {
  maxAge: 60 * 10, // Cache for 10 minutes
  name: 'publicUsersData',
  getKey: () => 'global'
})
