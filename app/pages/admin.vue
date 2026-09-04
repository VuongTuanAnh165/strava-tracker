<template>
  <div class="dashboard">
    <!-- Header -->
    <header class="dashboard__header">
      <div class="container">
        <div class="header__inner">
          <div class="header__brand">
            <h1 class="header__title">⚙️ Admin Dashboard</h1>
          </div>

          <div class="header__actions">
            <NuxtLink to="/" class="btn btn--ghost btn--sm">← Về trang chủ</NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <!-- Auth -->
    <div v-if="!isAuthed" class="container" style="padding-top: var(--space-3xl)">
      <div class="admin-auth glass-card animate-fade-in-up">
        <h2>Đăng nhập Admin</h2>
        <div class="admin-auth__form">
          <input
            v-model="adminSecret"
            type="password"
            placeholder="Admin Secret"
            class="admin-input"
            @keyup.enter="authenticate"
          />
          <button class="btn btn--primary" @click="authenticate">Xác thực</button>
        </div>
        <p v-if="authError" class="admin-error">{{ authError }}</p>
      </div>
    </div>

    <!-- Dashboard Main -->
    <template v-else>
      <!-- Race Info Bar (Stats) -->
      <div class="race-info">
        <div class="container">
          <div class="race-info__inner">
            <div class="race-info__item">
              <span class="race-info__label">Tổng Users</span>
              <span class="race-info__value race-info__value--highlight">{{ adminData?.totalUsers || 0 }}</span>
            </div>
            <div class="race-info__divider"></div>
            <div class="race-info__item">
              <span class="race-info__label">Tổng Activities</span>
              <span class="race-info__value race-info__value--highlight">{{ adminData?.totalActivities || 0 }}</span>
            </div>
            
            <template v-for="team in adminData?.teams" :key="team.id">
              <div class="race-info__divider"></div>
              <div class="race-info__item">
                <span class="race-info__label">{{ team.name }} ({{ team.member_count || 0 }} người)</span>
                <span class="race-info__value" :style="{ color: team.color }">
                  {{ team.total_km?.toFixed(1) || 0 }} km
                </span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <main class="dashboard__main">
        <div class="container">
          <!-- Team Comparison -->
          <section class="dashboard__section animate-fade-in-up">
            <TeamCard :team-a="teamA" :team-b="teamB" />
          </section>

          <div class="dashboard__grid">
            <!-- Leaderboard -->
            <section class="dashboard__section animate-fade-in-up delay-2">
              <LeaderBoard
                :users="adminData?.users || []"
                :is-admin="true"
                :syncing-user-id="syncingUserId"
                @sync-user="syncUser"
              />
            </section>

            <!-- Admin Controls (Replaces Activity Feed) -->
            <section class="dashboard__section animate-fade-in-up delay-3">
              <div class="glass-card admin-controls">
                <div class="admin-controls__header">
                  <h2 class="section-title">🔧 Quản lý hệ thống</h2>
                </div>
                
                <div class="admin-controls__actions">
                  <button class="btn btn--primary btn--full" @click="syncAll" :disabled="isSyncing">
                    <span v-if="isSyncing" class="spinner"></span>
                    {{ isSyncing ? 'Đang sync...' : '🔄 Đồng bộ tất cả Users' }}
                  </button>
                  <button class="btn btn--ghost btn--full mt-2" @click="loadData" :disabled="isLoadingData">
                    {{ isLoadingData ? 'Loading...' : '🔃 Làm mới dữ liệu' }}
                  </button>
                </div>

                <!-- Sync Results -->
                <div v-if="syncResults" class="admin-sync-results animate-fade-in">
                  <h3 class="admin-sync-results__title">Kết quả Sync gần nhất</h3>
                  <div class="admin-sync-table">
                    <div class="admin-sync-row admin-sync-row--header">
                      <span class="admin-sync-cell">User</span>
                      <span class="admin-sync-cell text-center" title="Accepted">A</span>
                      <span class="admin-sync-cell text-center" title="Rejected">R</span>
                      <span class="admin-sync-cell text-center" title="Duplicates">D</span>
                    </div>
                    <div
                      v-for="result in syncResults.results"
                      :key="result.strava_id"
                      class="admin-sync-row"
                    >
                      <span class="admin-sync-cell text-ellipsis" :title="result.name">{{ result.name }}</span>
                      <span class="admin-sync-cell text-center text-success">{{ result.accepted }}</span>
                      <span class="admin-sync-cell text-center text-warning">{{ result.rejected }}</span>
                      <span class="admin-sync-cell text-center text-muted">{{ result.duplicates }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </template>
  </div>
</template>

<script setup lang="ts">
const savedSecret = useCookie('admin_secret', { maxAge: 60 * 60 * 24 * 7 }) // 7 days
const adminSecret = ref(savedSecret.value || '')
const isAuthed = ref(false)
const authError = ref('')
const adminData = ref<any>(null)
const isLoadingData = ref(false)
const isSyncing = ref(false)
const syncResults = ref<any>(null)
const syncingUserId = ref<string | null>(null)

const teamA = computed(() => adminData.value?.teams?.find((t: any) => t.id === 'team_a'))
const teamB = computed(() => adminData.value?.teams?.find((t: any) => t.id === 'team_b'))

onMounted(async () => {
  if (savedSecret.value) {
    await authenticate()
  }
})

async function authenticate() {
  authError.value = ''
  try {
    const data = await $fetch(`/api/admin/users?secret=${adminSecret.value}`)
    adminData.value = data
    isAuthed.value = true
    savedSecret.value = adminSecret.value // Save cookie on success
  } catch (err: any) {
    authError.value = 'Sai Admin Secret'
    savedSecret.value = null // Clear cookie if invalid
  }
}

async function loadData() {
  isLoadingData.value = true
  try {
    const data = await $fetch(`/api/admin/users?secret=${adminSecret.value}`)
    adminData.value = data
  } catch (err: any) {
    console.error('Failed to load admin data:', err)
  } finally {
    isLoadingData.value = false
  }
}

async function syncAll() {
  isSyncing.value = true
  syncResults.value = null
  try {
    const result = await $fetch(`/api/admin/sync?secret=${adminSecret.value}`, {
      method: 'POST',
    })
    syncResults.value = result
    await loadData()
  } catch (err: any) {
    console.error('Sync all failed:', err)
  } finally {
    isSyncing.value = false
  }
}

async function syncUser(stravaId: string) {
  syncingUserId.value = stravaId
  try {
    await $fetch(`/api/admin/sync?secret=${adminSecret.value}&strava_id=${stravaId}`, {
      method: 'POST',
    })
    await loadData()
  } catch (err: any) {
    console.error(`Sync user ${stravaId} failed:`, err)
  } finally {
    syncingUserId.value = null
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

/* Auth */
.admin-auth {
  max-width: 400px;
  margin: 0 auto;
  padding: var(--space-2xl);
  text-align: center;
}

.admin-auth h2 {
  margin-bottom: var(--space-lg);
}

.admin-auth__form {
  display: flex;
  gap: var(--space-sm);
}

.admin-input {
  flex: 1;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-glass);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  outline: none;
}

.admin-input:focus {
  border-color: var(--color-accent);
}

.admin-error {
  color: var(--color-error);
  margin-top: var(--space-md);
  font-size: var(--font-size-sm);
}

/* Race Info Bar (Stats) */
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
  grid-template-columns: 1.5fr 1fr;
  gap: var(--space-2xl);
}

.mt-2 { margin-top: var(--space-sm); }
.mt-4 { margin-top: var(--space-lg); }

/* Admin Controls */
.admin-controls {
  padding: var(--space-xl);
  position: sticky;
  top: 100px;
}

.admin-controls__header {
  margin-bottom: var(--space-lg);
}

.admin-controls__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-xl);
}

.btn--full {
  width: 100%;
  justify-content: center;
}

/* Sync Results */
.admin-sync-results {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  border: 1px solid var(--color-border-glass);
}

.admin-sync-results__title {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-md);
  font-weight: 600;
}

.admin-sync-table {
  overflow-x: auto;
}

.admin-sync-row {
  display: grid;
  grid-template-columns: 1fr 30px 30px 30px;
  padding: var(--space-xs) 0;
  border-bottom: 1px solid var(--color-border-glass);
  font-size: var(--font-size-xs);
  align-items: center;
  gap: var(--space-xs);
}

.admin-sync-row:last-child {
  border-bottom: none;
}

.admin-sync-row--header {
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.admin-sync-cell {
  white-space: nowrap;
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-center { text-align: center; }
.text-success { color: var(--color-success); font-weight: 600; }
.text-warning { color: var(--color-warning); font-weight: 600; }
.text-muted { color: var(--color-text-muted); }

@media (max-width: 1024px) {
  .dashboard__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .race-info__inner {
    gap: var(--space-md);
  }

  .race-info__divider {
    display: none;
  }
}
</style>
