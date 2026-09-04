import { defineEventHandler, readBody, setCookie, createError } from 'h3'
import { useFirebaseAdmin } from '../../utils/firebase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const stravaId = body.stravaId

  if (!stravaId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing stravaId' })
  }

  const db = useFirebaseAdmin()
  const userDoc = await db.collection('users').doc(stravaId).get()

  if (!userDoc.exists) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const userData = userDoc.data()!

  // Create session
  const sessionData = JSON.stringify({
    strava_id: stravaId,
    name: userData.name,
    team_id: userData.team_id,
    timestamp: Date.now()
  })

  // Set session cookie (valid for 30 days)
  setCookie(event, 'strava_session', Buffer.from(sessionData).toString('base64'), {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  })

  return { success: true }
})
