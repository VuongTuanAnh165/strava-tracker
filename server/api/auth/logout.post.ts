/**
 * Logout endpoint
 * 
 * POST /api/auth/logout
 * 
 * Clears the session cookie.
 */
import { defineEventHandler, setCookie, sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  // Clear the session cookie
  setCookie(event, 'strava_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Expire immediately
  })

  return { success: true }
})
