/**
 * Race constants & configuration
 * All race-specific values are centralized here for easy updates.
 */

// Race date range (Vietnam timezone UTC+7)
export const RACE_START = new Date('2026-09-01T00:00:00+07:00')
export const RACE_END = new Date('2026-09-24T23:59:59+07:00')

// Pace limits (seconds per km)
// 4:00/km = 240s, 15:00/km = 900s
export const MIN_PACE = 240
export const MAX_PACE = 900

// Anti-Cheat constraints
export const MAX_SPEED_MS = 1000 / MIN_PACE // Equivalent to 4:00/km (4.16 m/s or 15 km/h)
export const MAX_PAUSE_RATIO = 1.5 // Elapsed time cannot be more than 1.5x moving time
export const MIN_DISTANCE = 1000 // Minimum 1km per activity (in meters)

// Valid activity types (deprecated 'type' field — kept for backward compatibility)
export const VALID_ACTIVITY_TYPES = ['Run', 'VirtualRun']
// Valid sport types (new 'sport_type' field — recommended by Strava API)
export const VALID_SPORT_TYPES = ['Run', 'VirtualRun', 'TrailRun']

// Team configuration
export const TEAMS = {
  team_a: {
    id: 'team_a',
    name: 'ACP1',
    color: '#FF6B35',
  },
  team_b: {
    id: 'team_b',
    name: 'ACP2',
    color: '#4ECDC4',
  },
} as const

export type TeamId = keyof typeof TEAMS

// Strava API
export const STRAVA_API_BASE = 'https://www.strava.com/api/v3'
export const STRAVA_OAUTH_URL = 'https://www.strava.com/oauth/authorize'
export const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'
