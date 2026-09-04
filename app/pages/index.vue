<template>
  <div class="dashboard">
    <!-- Header -->
    <header class="dashboard__header">
      <div class="container">
        <div class="header__inner">
          <div class="header__brand">
            <h1 class="header__title">🏃 Race Tracker</h1>
            <span class="header__subtitle">ACP1 vs ACP2</span>
          </div>

          <div class="header__actions">
            <button
              class="btn btn--ghost btn--sm"
              @click="syncData"
              :disabled="isSyncing"
            >
              <span v-if="isSyncing" class="spinner"></span>
              <span v-else>🔄</span>
              {{ isSyncing ? 'Đang đồng bộ...' : 'Sync' }}
            </button>

            <div class="header__user" v-if="user">
              <span class="header__username">{{ user.name }}</span>
              <span :class="user.team_id === 'team_a' ? 'badge badge--team-a' : 'badge badge--team-b'">
                {{ user.team_id === 'team_a' ? 'ACP1' : 'ACP2' }}
              </span>
              <button class="btn btn--ghost btn--sm" @click="logout">Đăng xuất</button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Race Info Bar -->
    <div class="race-info">
      <div class="container">
        <div class="race-info__inner">
          <div class="race-info__item">
            <span class="race-info__label">Thời gian cuộc đua</span>
            <span class="race-info__value">01/09 — 24/09/2026</span>
          </div>
          <div class="race-info__divider"></div>
          <div class="race-info__item">
            <span class="race-info__label">Tổng KM</span>
            <span class="race-info__value race-info__value--highlight">{{ totalKmAll.toFixed(1) }} km</span>
          </div>
          <div class="race-info__divider"></div>
          <div class="race-info__item">
            <span class="race-info__label">Còn lại</span>
            <span class="race-info__value">{{ daysLeft }} ngày</span>
          </div>
          <div class="race-info__divider"></div>
          <div class="race-info__item">
            <span class="race-info__label">Cập nhật</span>
            <span class="race-info__value">{{ lastUpdatedText }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main class="dashboard__main">
      <div class="container">
        <!-- Loading State -->
        <div v-if="isLoading" class="dashboard__loading">
          <div class="spinner" style="width: 40px; height: 40px; border-width: 3px;"></div>
          <p>Đang tải dữ liệu...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="dashboard__error glass-card">
          <p>❌ {{ error }}</p>
          <button class="btn btn--primary" @click="fetchData">Thử lại</button>
        </div>

        <!-- Content -->
        <template v-else>
          <!-- Team Comparison -->
          <section class="dashboard__section animate-fade-in-up">
            <TeamCard :team-a="teamA" :team-b="teamB" />
          </section>

          <!-- Leaderboard & Activity Feed -->
          <div class="dashboard__grid">
            <section class="dashboard__section animate-fade-in-up delay-2">
              <LeaderBoard
                :users="users"
                :current-user-strava-id="user?.strava_id"
              />
            </section>
            
            <section class="dashboard__section animate-fade-in-up delay-3">
              <RaceRules />
            </section>
          </div>
        </template>
      </div>
    </main>

    <!-- Sync Toast -->
    <div v-if="syncResult" class="toast toast--success animate-fade-in" @click="syncResult = null">
      <p>✅ Đồng bộ thành công: {{ syncResult.accepted }} bài được chấp nhận, {{ syncResult.rejected }} bị từ chối</p>
    </div>

    <!-- Sync Error Toast -->
    <div v-if="syncError" class="toast toast--error animate-fade-in" @click="syncError = ''">
      <p>❌ {{ syncError }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { user, isLoggedIn, checkSession, logout } = useAuth()
const {
  teams,
  users,
  isLoading,
  error,
  lastUpdated,
  teamA,
  teamB,
  totalKmAll,
  fetchData,
  startPolling,
} = useLeaderboard()

const isSyncing = ref(false)
const syncResult = ref<{ accepted: number; rejected: number } | null>(null)
const syncError = ref('')

// Auth check
const route = useRoute()
const needsInitialSync = ref(route.query.sync === 'initial')

onMounted(async () => {
  await checkSession()
  if (!isLoggedIn.value) {
    navigateTo('/login')
    return
  }

  // Start polling for leaderboard data
  startPolling(30000) // Every 30 seconds

  // Auto-sync on first visit after OAuth
  if (needsInitialSync.value) {
    console.log('[Dashboard] Triggering initial sync...')
    await syncData()
    // Clean up URL
    navigateTo('/', { replace: true })
  }
})

// Days left in race
const daysLeft = computed(() => {
  const end = new Date('2026-09-24T23:59:59+07:00')
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
})

// Last updated text
const lastUpdatedText = computed(() => {
  if (!lastUpdated.value) return 'Chưa cập nhật'
  const now = new Date()
  const diff = now.getTime() - lastUpdated.value.getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'Vừa xong'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} phút trước`
  return lastUpdated.value.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
})

// Sync button handler
async function syncData() {
  isSyncing.value = true
  syncResult.value = null
  syncError.value = ''

  try {
    const result = await $fetch('/api/sync', { method: 'POST' })
    syncResult.value = {
      accepted: result.accepted,
      rejected: result.rejected,
    }

    // Refresh leaderboard data
    await fetchData()

    // Auto-hide toast after 5 seconds
    setTimeout(() => {
      syncResult.value = null
    }, 5000)
  } catch (err: any) {
    syncError.value = err.data?.message || err.message || 'Sync failed'
    setTimeout(() => {
      syncError.value = ''
    }, 5000)
  } finally {
    isSyncing.value = false
  }
}
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
}

/* Header */
.dashboard__header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(10, 14, 23, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--color-border-glass);
}

.header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) 0;
}

.header__brand {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.header__title {
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.header__subtitle {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  padding: var(--space-xs) var(--space-sm);
  background: var(--color-bg-glass);
  border-radius: var(--radius-full);
}

.header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.header__user {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.header__username {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

/* Race Info Bar */
.race-info {
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border-glass);
}

.race-info__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xl);
  padding: var(--space-md) 0;
  flex-wrap: wrap;
}

.race-info__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.race-info__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.race-info__value {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.race-info__value--highlight {
  color: var(--color-accent);
  font-size: var(--font-size-base);
}

.race-info__divider {
  width: 1px;
  height: 30px;
  background: var(--color-border-glass);
}

/* Main Content */
.dashboard__main {
  padding: var(--space-2xl) 0;
}

.dashboard__section {
  margin-bottom: var(--space-2xl);
}

.dashboard__grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-2xl);
}

/* Loading */
.dashboard__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-3xl);
  gap: var(--space-lg);
  color: var(--color-text-muted);
}

/* Error */
.dashboard__error {
  text-align: center;
  padding: var(--space-2xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

@media (max-width: 1024px) {
  .dashboard__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .header__inner {
    flex-direction: column;
    gap: var(--space-sm);
  }

  .header__actions {
    width: 100%;
    justify-content: space-between;
  }

  .race-info__inner {
    gap: var(--space-md);
  }

  .race-info__divider {
    display: none;
  }
}

@media (max-width: 480px) {
  .header__username {
    display: none;
  }
}
</style>
