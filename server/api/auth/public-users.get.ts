/**
 * Fetch a public list of users for the "Returning User" login flow.
 * Returns only necessary, non-sensitive information.
 * 
 * GET /api/auth/public-users
 */
import { defineEventHandler } from 'h3'
import { useFirebaseAdmin } from '../../utils/firebase'

export default defineEventHandler(async (event) => {
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
})
