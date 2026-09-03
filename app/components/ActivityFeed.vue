<template>
  <div class="activity-feed glass-card">
    <div class="section-header">
      <h2 class="section-title">⚡ Hoạt động gần đây</h2>
    </div>

    <div v-if="activities.length === 0" class="activity-feed__empty">
      <p>Chưa có hoạt động nào được ghi nhận.</p>
    </div>

    <div v-else class="activity-feed__list">
      <div
        v-for="(activity, index) in activities"
        :key="activity.id"
        class="activity-feed__item animate-fade-in-up"
        :style="{ animationDelay: `${index * 0.08}s` }"
      >
        <div class="activity-feed__icon" :class="activity.team_id === 'team_a' ? 'activity-feed__icon--a' : 'activity-feed__icon--b'">
          🏃
        </div>

        <div class="activity-feed__content">
          <div class="activity-feed__top">
            <span class="activity-feed__user">{{ getUserName(activity.strava_id) }}</span>
            <span :class="activity.team_id === 'team_a' ? 'badge badge--team-a' : 'badge badge--team-b'">
              {{ activity.team_id === 'team_a' ? 'ACP1' : 'ACP2' }}
            </span>
          </div>
          <div class="activity-feed__name">{{ activity.name }}</div>
          <div class="activity-feed__stats">
            <span class="activity-feed__stat">
              📏 {{ activity.distance_km?.toFixed(2) || '0' }} km
            </span>
            <span class="activity-feed__stat">
              ⏱️ {{ formatPace(activity.pace) }}/km
            </span>
            <span class="activity-feed__stat">
              🕐 {{ formatTime(activity.moving_time) }}
            </span>
          </div>
        </div>

        <div class="activity-feed__date">
          {{ formatDate(activity.start_date_local) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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

interface UserRanking {
  strava_id: string
  name: string
  avatar: string
  team_id: string
  total_km: number
  activity_count: number
}

const props = defineProps<{
  activities: Activity[]
  users: UserRanking[]
}>()

function getUserName(stravaId: string): string {
  const user = props.users.find((u) => u.strava_id === stravaId)
  return user?.name || 'Unknown'
}

function formatPace(paceSeconds: number): string {
  if (!paceSeconds) return '--:--'
  const min = Math.floor(paceSeconds / 60)
  const sec = Math.floor(paceSeconds % 60)
  return `${min}:${String(sec).padStart(2, '0')}`
}

function formatTime(totalSeconds: number): string {
  if (!totalSeconds) return '--:--'
  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h${String(mins).padStart(2, '0')}m`
  return `${mins}m`
}

function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const day = date.getDate()
  const month = date.getMonth() + 1
  const hours = String(date.getHours()).padStart(2, '0')
  const mins = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month} ${hours}:${mins}`
}
</script>

<style scoped>
.activity-feed {
  padding: var(--space-xl);
}

.activity-feed__empty {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--color-text-muted);
}

.activity-feed__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.activity-feed__item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.activity-feed__item:hover {
  background: var(--color-bg-glass);
}

.activity-feed__item:last-child {
  border-bottom: none;
}

.activity-feed__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);
  flex-shrink: 0;
}

.activity-feed__icon--a {
  background: var(--color-team-a-bg);
}

.activity-feed__icon--b {
  background: var(--color-team-b-bg);
}

.activity-feed__content {
  flex: 1;
  min-width: 0;
}

.activity-feed__top {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.activity-feed__user {
  font-weight: 600;
  font-size: var(--font-size-sm);
}

.activity-feed__name {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-bottom: var(--space-xs);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-feed__stats {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.activity-feed__stat {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.activity-feed__date {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .activity-feed__date {
    display: none;
  }
}
</style>
