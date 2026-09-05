<template>
  <div class="leaderboard glass-card" :class="{ 'leaderboard--admin': isAdmin }">
    <div class="leaderboard__header">
      <h2 class="section-title">🏆 Bảng Xếp Hạng Cá Nhân</h2>
      <div class="leaderboard__filters">
        <button
          class="btn btn--sm"
          :class="{ 'btn--primary': filter === 'all', 'btn--ghost': filter !== 'all' }"
          @click="filter = 'all'"
        >
          Tất cả
        </button>
        <button
          class="btn btn--sm"
          :class="{ 'btn--primary': filter === 'team_a', 'btn--ghost': filter !== 'team_a' }"
          @click="filter = 'team_a'"
          style="--color-accent: var(--color-team-a); --color-accent-hover: var(--color-team-a)"
        >
          ACP1
        </button>
        <button
          class="btn btn--sm"
          :class="{ 'btn--primary': filter === 'team_b', 'btn--ghost': filter !== 'team_b' }"
          @click="filter = 'team_b'"
          style="--color-accent: var(--color-team-b); --color-accent-hover: var(--color-team-b)"
        >
          ACP2
        </button>
      </div>
    </div>

    <div class="leaderboard__table">
      <div class="leaderboard__row leaderboard__row--header">
        <span class="leaderboard__cell leaderboard__cell--rank">#</span>
        <span class="leaderboard__cell leaderboard__cell--user">Vận động viên</span>
        <span class="leaderboard__cell leaderboard__cell--team">Đội</span>
        <span class="leaderboard__cell leaderboard__cell--km">Tổng KM</span>
        <span v-if="isAdmin" class="leaderboard__cell leaderboard__cell--action">Hành động</span>
      </div>

      <div
        v-for="(user, index) in filteredUsers"
        :key="user.strava_id"
        class="leaderboard__row animate-fade-in-up clickable"
        :class="{
          'leaderboard__row--highlight': currentUserStravaId === user.strava_id,
          'leaderboard__row--top': index < 3,
        }"
        :style="{ animationDelay: `${index * 0.05}s` }"
        @click="openModal(user)"
      >
        <span class="leaderboard__cell leaderboard__cell--rank">
          <span :class="getRankBadgeClass(index + 1)">
            {{ index + 1 }}
          </span>
        </span>

        <span class="leaderboard__cell leaderboard__cell--user">
          <img
            v-if="user.avatar"
            :src="user.avatar"
            :alt="user.name"
            class="avatar avatar--sm"
            referrerpolicy="no-referrer"
          />
          <span v-else class="avatar avatar--sm avatar--placeholder">
            {{ user.name?.charAt(0) || '?' }}
          </span>
          <span class="leaderboard__username">{{ user.name }}</span>
        </span>

        <span class="leaderboard__cell leaderboard__cell--team">
          <span :class="user.team_id === 'team_a' ? 'badge badge--team-a' : 'badge badge--team-b'">
            {{ user.team_id === 'team_a' ? 'ACP1' : 'ACP2' }}
          </span>
        </span>

        <span class="leaderboard__cell leaderboard__cell--km">
          <strong>{{ user.total_km?.toFixed(1) || '0.0' }}</strong>
          <small>km</small>
        </span>

        <span v-if="isAdmin" class="leaderboard__cell leaderboard__cell--action">
          <button
            class="btn btn--ghost btn--sm"
            @click.stop="emit('sync-user', user.strava_id)"
            :disabled="syncingUserId === user.strava_id"
          >
            <span v-if="syncingUserId === user.strava_id" class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></span>
            <span v-else>Sync</span>
          </button>
        </span>
      </div>

      <div v-if="filteredUsers.length === 0" class="leaderboard__empty">
        <p>Chưa có dữ liệu. Hãy kết nối Strava để bắt đầu!</p>
      </div>
    </div>

    <!-- User Activities Modal -->
    <Teleport to="body">
      <div v-if="selectedUser" class="modal-overlay" @click="selectedUser = null">
        <div class="modal-content animate-fade-in-up" @click.stop>
          <button class="modal-close" @click="selectedUser = null">&times;</button>
          <UserActivitiesModal 
            :user="{...selectedUser, activities: selectedUserActivities}"
            :is-loading="isLoadingActivities" 
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import UserActivitiesModal from './UserActivitiesModal.vue'

interface UserRanking {
  strava_id: string
  name: string
  avatar: string
  team_id: string
  total_km: number
  activity_count: number
}

const props = defineProps<{
  users: UserRanking[]
  currentUserStravaId?: string
  isAdmin?: boolean
  syncingUserId?: string | null
}>()

const emit = defineEmits<{
  (e: 'sync-user', stravaId: string): void
}>()

const filter = ref<'all' | 'team_a' | 'team_b'>('all')
const selectedUser = ref<UserRanking | null>(null)
const selectedUserActivities = ref<any[]>([])
const isLoadingActivities = ref(false)

async function openModal(user: UserRanking) {
  selectedUser.value = user
  selectedUserActivities.value = [] // clear previous
  isLoadingActivities.value = true
  try {
    const data = await $fetch(`/api/user-activities?strava_id=${user.strava_id}`)
    selectedUserActivities.value = data as any[]
  } catch (err) {
    console.error('Failed to fetch activities', err)
  } finally {
    isLoadingActivities.value = false
  }
}

const filteredUsers = computed(() => {
  if (filter.value === 'all') return props.users
  return props.users.filter((u) => u.team_id === filter.value)
})

function getRankBadgeClass(rank: number) {
  if (rank === 1) return 'rank-badge rank-badge--1'
  if (rank === 2) return 'rank-badge rank-badge--2'
  if (rank === 3) return 'rank-badge rank-badge--3'
  return 'rank-badge rank-badge--default'
}
</script>

<style scoped>
.leaderboard {
  padding: var(--space-xl);
}

.leaderboard__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-xl);
  flex-wrap: wrap;
  gap: var(--space-md);
}

.leaderboard__filters {
  display: flex;
  gap: var(--space-xs);
}

.leaderboard__table {
  display: flex;
  flex-direction: column;
}

.leaderboard__row {
  display: grid;
  grid-template-columns: 50px 1fr 100px 100px;
  align-items: center;
  padding: var(--space-md) var(--space-sm);
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.leaderboard__row.clickable {
  cursor: pointer;
}

.leaderboard--admin .leaderboard__row {
  grid-template-columns: 50px 1fr 100px 100px 80px;
}

.leaderboard__row:not(.leaderboard__row--header):hover {
  background: var(--color-bg-glass);
}

.leaderboard__row.clickable:hover {
  transform: translateX(4px);
}

.leaderboard__row--header {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border-glass);
  padding-bottom: var(--space-md);
  margin-bottom: var(--space-sm);
}

.leaderboard__row--highlight {
  background: rgba(129, 140, 248, 0.1) !important;
  border: 1px solid rgba(129, 140, 248, 0.2);
}

.leaderboard__row--top {
  font-weight: 600;
}

.leaderboard__cell--user {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.leaderboard__username {
  font-size: var(--font-size-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.leaderboard__cell--km {
  font-variant-numeric: tabular-nums;
}

.leaderboard__cell--km strong {
  font-size: var(--font-size-base);
}

.leaderboard__cell--km small {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  margin-left: 2px;
}

.leaderboard__cell--runs {
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.leaderboard__empty {
  text-align: center;
  padding: var(--space-3xl);
  color: var(--color-text-muted);
}

.avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-glass);
  color: var(--color-text-muted);
  font-weight: 700;
  font-size: var(--font-size-xs);
}

/* Modal specific styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-md);
}

.modal-content {
  position: relative;
  width: 100%;
  max-width: 500px;
  border-radius: var(--radius-xl);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-close {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

@media (max-width: 768px) {
  .leaderboard__row {
    grid-template-columns: 40px 1fr 70px 80px;
  }

  .leaderboard--admin .leaderboard__row {
    grid-template-columns: 40px 1fr 70px 60px;
  }
}

@media (max-width: 480px) {
  .leaderboard__row {
    grid-template-columns: 35px 1fr 70px;
  }

  .leaderboard__cell--team {
    display: none;
  }

  .leaderboard__row--header .leaderboard__cell--team {
    display: none;
  }

  .leaderboard__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
