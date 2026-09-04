/**
 * Available App API
 * 
 * GET /api/auth/available-app
 * 
 * Returns the first Strava app that has available slots (< 10 users).
 * Called by the login page before redirecting to Strava OAuth.
 */
import { defineEventHandler, createError } from 'h3'
import { findAvailableApp } from '../../utils/stravaApps'

export default defineEventHandler(async () => {
  try {
    const app = await findAvailableApp()

    if (!app) {
      throw createError({
        statusCode: 503,
        statusMessage: 'Tất cả các slot đã đầy. Vui lòng liên hệ admin.',
      })
    }

    return {
      appIndex: app.index,
      clientId: app.clientId,
    }
  } catch (err: any) {
    // Re-throw h3 errors as-is
    if (err.statusCode) throw err

    console.error('[AvailableApp] Error finding available app:', err)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to find available app: ${err.message}`,
    })
  }
})
