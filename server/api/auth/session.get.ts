/**
 * Get current session
 * 
 * GET /api/auth/session
 * 
 * Returns the current user's session data from cookie.
 * Used by frontend to check login status.
 */
import { defineEventHandler, getCookie } from 'h3'

export default defineEventHandler(async (event) => {
  const sessionCookie = getCookie(event, 'strava_session')

  if (!sessionCookie) {
    return { authenticated: false }
  }

  try {
    const session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8'))
    return {
      authenticated: true,
      user: {
        strava_id: session.strava_id,
        name: session.name,
        team_id: session.team_id,
      },
    }
  } catch {
    return { authenticated: false }
  }
})
