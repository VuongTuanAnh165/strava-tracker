/**
 * Auth composable
 * 
 * Manages authentication state using the server session cookie.
 * Uses $fetch instead of useFetch to avoid Nuxt lifecycle warnings.
 */
export function useAuth() {
  const user = useState<{
    strava_id: string
    name: string
    team_id: string
  } | null>('auth_user', () => null)

  const isLoggedIn = computed(() => !!user.value)
  const isLoading = ref(true)

  async function checkSession() {
    try {
      isLoading.value = true
      // Use $fetch instead of useFetch to avoid "called after mount" warnings
      const data = await $fetch('/api/auth/session')
      if (data?.authenticated) {
        user.value = data.user
      } else {
        user.value = null
      }
    } catch {
      user.value = null
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    navigateTo('/login')
  }

  return {
    user,
    isLoggedIn,
    isLoading,
    checkSession,
    logout,
  }
}
