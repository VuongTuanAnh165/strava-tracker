/**
 * Leaderboard data composable
 * 
 * Fetches teams, users, and activities from the API.
 * Uses polling for real-time-like updates (every 30 seconds).
 * 
 * Note: For true realtime, we'd use Firebase onSnapshot on the client.
 * However, to keep the client-side simple and avoid exposing Firebase
 * config, we use server-side API polling instead.
 */
interface Team {
  id: string
  name: string
  total_km: number
  member_count: number
  color: string
}

interface UserRanking {
  strava_id: string
  name: string
  avatar: string
  team_id: string
  total_km: number
  activity_count: number
}

interface Activity {
  id: string
  activity_id: number
  strava_id: string
  team_id: string
  distance_km: number
  moving_time: number
  pace: number
  name: string
  start_date_local: string
}

export function useLeaderboard() {
  const teams = ref<Team[]>([])
  const users = ref<UserRanking[]>([])
  const activities = ref<Activity[]>([])
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const lastUpdated = ref<Date | null>(null)

  let pollInterval: ReturnType<typeof setInterval> | null = null

  async function fetchData() {
    try {
      error.value = null
      const data = await $fetch('/api/leaderboard')
      teams.value = data.teams as Team[]
      users.value = data.users as UserRanking[]
      activities.value = data.activities as Activity[]
      lastUpdated.value = new Date()
    } catch (err: any) {
      error.value = err.message || 'Failed to load leaderboard'
      console.error('[Leaderboard] Fetch error:', err)
    } finally {
      isLoading.value = false
    }
  }

  function startPolling(intervalMs = 300000) {
    stopPolling()
    fetchData()
    pollInterval = setInterval(fetchData, intervalMs)
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  // Computed helpers
  const teamA = computed(() => teams.value.find((t) => t.id === 'team_a'))
  const teamB = computed(() => teams.value.find((t) => t.id === 'team_b'))
  const totalKmAll = computed(() => teams.value.reduce((sum, t) => sum + (t.total_km || 0), 0))

  const usersTeamA = computed(() =>
    users.value.filter((u) => u.team_id === 'team_a')
  )
  const usersTeamB = computed(() =>
    users.value.filter((u) => u.team_id === 'team_b')
  )

  // Cleanup on unmount
  onUnmounted(() => {
    stopPolling()
  })

  return {
    teams,
    users,
    activities,
    isLoading,
    error,
    lastUpdated,
    teamA,
    teamB,
    totalKmAll,
    usersTeamA,
    usersTeamB,
    fetchData,
    startPolling,
    stopPolling,
  }
}
