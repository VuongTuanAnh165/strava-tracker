/**
 * Available App API
 * 
 * GET /api/auth/available-app
 * 
 * Returns the first Strava app that has available slots (< 10 users).
 * Called by the login page before redirecting to Strava OAuth.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { findAvailableApp, getAppByIndex } from '../../utils/stravaApps'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    
    // If a specific appIndex is requested (for returning users)
    if (query.appIndex) {
      const appIndex = parseInt(query.appIndex as string, 10)
      if (!isNaN(appIndex)) {
        const app = getAppByIndex(appIndex)
        return {
          appIndex: app.index,
          clientId: app.clientId,
        }
      }
    }

    // Otherwise, find the first available app (for new users)
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
