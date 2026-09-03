<template>
  <div class="admin-page">
    <div class="container">
      <header class="admin-header animate-fade-in-up">
        <h1 class="admin-header__title">⚙️ Admin Dashboard</h1>
        <NuxtLink to="/" class="btn btn--ghost btn--sm">← Về trang chủ</NuxtLink>
      </header>

      <!-- Auth -->
      <div v-if="!isAuthed" class="admin-auth glass-card animate-fade-in-up">
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

      <!-- Dashboard -->
      <template v-else>
        <!-- Stats -->
        <div class="admin-stats animate-fade-in-up">
          <div class="admin-stat glass-card">
            <span class="admin-stat__value">{{ adminData?.totalUsers || 0 }}</span>
            <span class="admin-stat__label">Tổng người dùng</span>
          </div>
          <div class="admin-stat glass-card">
            <span class="admin-stat__value">{{ adminData?.totalActivities || 0 }}</span>
            <span class="admin-stat__label">Tổng activities</span>
          </div>
          <div class="admin-stat glass-card" v-for="team in adminData?.teams" :key="team.id">
            <span class="admin-stat__value" :style="{ color: team.color }">
              {{ team.total_km?.toFixed(1) || 0 }} km
            </span>
            <span class="admin-stat__label">{{ team.name }} ({{ team.member_count || 0 }} người)</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="admin-actions animate-fade-in-up delay-1">
          <h2>🔧 Hành động</h2>
          <div class="admin-actions__buttons">
            <button class="btn btn--primary" @click="syncAll" :disabled="isSyncing">
              <span v-if="isSyncing" class="spinner"></span>
              {{ isSyncing ? 'Đang sync...' : '🔄 Sync tất cả users' }}
            </button>
            <button class="btn btn--ghost" @click="loadData" :disabled="isLoadingData">
              {{ isLoadingData ? 'Loading...' : '🔃 Refresh dữ liệu' }}
            </button>
          </div>
        </div>

        <!-- Sync Results -->
        <div v-if="syncResults" class="admin-sync-results glass-card animate-fade-in-up">
          <h3>Kết quả Sync</h3>
          <div class="admin-sync-table">
            <div class="admin-sync-row admin-sync-row--header">
              <span>User</span>
              <span>Accepted</span>
              <span>Rejected</span>
              <span>Duplicates</span>
              <span>Status</span>
            </div>
            <div
              v-for="result in syncResults.results"
              :key="result.strava_id"
              class="admin-sync-row"
            >
              <span>{{ result.name }}</span>
              <span class="admin-sync-accepted">{{ result.accepted }}</span>
              <span class="admin-sync-rejected">{{ result.rejected }}</span>
              <span>{{ result.duplicates }}</span>
              <span :class="result.error ? 'admin-sync-error' : 'admin-sync-success'">
                {{ result.error || '✅' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Users Table -->
        <div class="admin-users glass-card animate-fade-in-up delay-2">
          <h2>👥 Danh sách người dùng</h2>
          <div class="admin-users__table">
            <div class="admin-users__row admin-users__row--header">
              <span>#</span>
              <span>Tên</span>
              <span>Đội</span>
              <span>KM</span>
              <span>Activities</span>
              <span>Hành động</span>
            </div>
            <div
              v-for="(user, index) in adminData?.users"
              :key="user.strava_id"
              class="admin-users__row"
            >
              <span>{{ index + 1 }}</span>
              <span class="admin-users__name">
                <img v-if="user.avatar" :src="user.avatar" class="avatar avatar--sm" referrerpolicy="no-referrer" />
                {{ user.name }}
              </span>
              <span>
                <span :class="user.team_id === 'team_a' ? 'badge badge--team-a' : 'badge badge--team-b'">
                  {{ user.team_id === 'team_a' ? 'ACP1' : 'ACP2' }}
                </span>
              </span>
              <span>{{ user.total_km?.toFixed(1) }}</span>
              <span>{{ user.activity_count || 0 }}</span>
              <span>
                <button
                  class="btn btn--ghost btn--sm"
                  @click="syncUser(user.strava_id)"
                  :disabled="syncingUserId === user.strava_id"
                >
                  {{ syncingUserId === user.strava_id ? '...' : 'Sync' }}
                </button>
              </span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const adminSecret = ref('')
const isAuthed = ref(false)
const authError = ref('')
const adminData = ref<any>(null)
const isLoadingData = ref(false)
const isSyncing = ref(false)
const syncResults = ref<any>(null)
const syncingUserId = ref<string | null>(null)

async function authenticate() {
  authError.value = ''
  try {
    const data = await $fetch(`/api/admin/users?secret=${adminSecret.value}`)
    adminData.value = data
    isAuthed.value = true
  } catch (err: any) {
    authError.value = 'Sai Admin Secret'
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
.admin-page {
  min-height: 100vh;
  padding: var(--space-2xl) 0;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2xl);
}

.admin-header__title {
  font-size: var(--font-size-2xl);
  font-weight: 800;
}

/* Auth */
.admin-auth {
  max-width: 400px;
  margin: var(--space-3xl) auto;
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

/* Stats */
.admin-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-2xl);
}

.admin-stat {
  padding: var(--space-xl);
  text-align: center;
}

.admin-stat__value {
  display: block;
  font-size: var(--font-size-3xl);
  font-weight: 900;
  margin-bottom: var(--space-xs);
}

.admin-stat__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* Actions */
.admin-actions {
  margin-bottom: var(--space-2xl);
}

.admin-actions h2 {
  margin-bottom: var(--space-lg);
}

.admin-actions__buttons {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

/* Sync Results */
.admin-sync-results {
  padding: var(--space-xl);
  margin-bottom: var(--space-2xl);
}

.admin-sync-results h3 {
  margin-bottom: var(--space-lg);
}

.admin-sync-table {
  overflow-x: auto;
}

.admin-sync-row {
  display: grid;
  grid-template-columns: 1fr 80px 80px 80px 1fr;
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--color-border-glass);
  font-size: var(--font-size-sm);
  align-items: center;
}

.admin-sync-row--header {
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  font-size: var(--font-size-xs);
}

.admin-sync-accepted {
  color: var(--color-success);
  font-weight: 600;
}

.admin-sync-rejected {
  color: var(--color-warning);
  font-weight: 600;
}

.admin-sync-error {
  color: var(--color-error);
  font-size: var(--font-size-xs);
}

.admin-sync-success {
  color: var(--color-success);
}

/* Users Table */
.admin-users {
  padding: var(--space-xl);
}

.admin-users h2 {
  margin-bottom: var(--space-lg);
}

.admin-users__table {
  overflow-x: auto;
}

.admin-users__row {
  display: grid;
  grid-template-columns: 40px 1fr 100px 80px 80px 80px;
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--color-border-glass);
  font-size: var(--font-size-sm);
  align-items: center;
}

.admin-users__row--header {
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  font-size: var(--font-size-xs);
}

.admin-users__name {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

@media (max-width: 768px) {
  .admin-users__row {
    grid-template-columns: 30px 1fr 70px 60px 60px;
  }
}
</style>
