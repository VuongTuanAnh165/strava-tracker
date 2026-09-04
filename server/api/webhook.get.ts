/**
 * Strava Webhook Verification Endpoint
 * 
 * GET /api/webhook?hub.mode=subscribe&hub.challenge=xxx&hub.verify_token=yyy
 * 
 * Strava sends this GET request when you create a webhook subscription.
 * Must respond within 2 seconds with the challenge value.
 * 
 * Supports multiple Strava apps — verifies token against ALL configured apps.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { isValidWebhookToken } from '../utils/stravaApps'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const mode = query['hub.mode'] as string
  const challenge = query['hub.challenge'] as string
  const verifyToken = query['hub.verify_token'] as string

  console.log(`[Webhook] Verification request: mode=${mode}, verify_token=${verifyToken}`)

  // Validate the request
  if (mode !== 'subscribe') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid hub.mode',
    })
  }

  // Check verify token matches any of our configured apps
  if (!verifyToken || !isValidWebhookToken(verifyToken)) {
    console.error(`[Webhook] Verify token mismatch: got "${verifyToken}", no matching app found`)
    throw createError({
      statusCode: 403,
      statusMessage: 'Verify token mismatch',
    })
  }

  // Echo back the challenge to confirm subscription
  console.log(`[Webhook] ✅ Verification successful, returning challenge.`)
  return {
    'hub.challenge': challenge,
  }
})

