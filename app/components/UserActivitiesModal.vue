<template>
  <div class="user-activities-modal glass-card">
    <!-- Header -->
    <div class="modal__header">
      <div class="modal__user-info">
        <img
          v-if="user.avatar"
          :src="user.avatar"
          :alt="user.name"
          class="avatar avatar--md"
          referrerpolicy="no-referrer"
        />
        <span v-else class="avatar avatar--md avatar--placeholder">
          {{ user.name?.charAt(0) || '?' }}
        </span>
        <div class="modal__user-details">
          <h3 class="modal__username">{{ user.name }}</h3>
          <span :class="user.team_id === 'team_a' ? 'badge badge--team-a' : 'badge badge--team-b'">
            {{ user.team_id === 'team_a' ? 'ACP1' : 'ACP2' }}
          </span>
        </div>
        <div class="modal__stats">
          <div class="modal__stat">
            <span class="modal__stat-label">Tổng KM</span>
            <span class="modal__total-value">{{ user.total_km?.toFixed(1) || '0.0' }} <small>km</small></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Activities List -->
    <div class="modal__body">
      <div v-if="isLoading" class="modal__loading">
        <span class="spinner"></span>
        <p>Đang tải dữ liệu bài chạy...</p>
      </div>
      
      <div v-else-if="!user.activities || user.activities.length === 0" class="modal__empty">
        <p>Chưa có bài chạy nào được ghi nhận.</p>
      </div>
      
      <div v-else class="activities-list">
        <div
          v-for="activity in user.activities"
          :key="activity.activity_id"
          class="activity-card"
        >
          <div class="activity-card__main">
            <h4 class="activity-card__name">{{ activity.name }}</h4>
            <span class="activity-card__date">{{ formatDate(activity.start_date_local) }}</span>
          </div>
          
          <div class="activity-card__stats">
            <div class="activity-stat">
              <span class="activity-stat__value">{{ activity.distance_km?.toFixed(2) }}</span>
              <span class="activity-stat__label">km</span>
            </div>
            <div class="activity-stat">
              <span class="activity-stat__value">{{ formatPace(activity.pace) }}</span>
              <span class="activity-stat__label">/km</span>
            </div>
          </div>
          
          <div class="activity-card__action">
            <a
              :href="`https://www.strava.com/activities/${activity.activity_id}`"
              target="_blank"
              class="btn btn--strava btn--sm"
              title="Xem chi tiết trên Strava"
            >
              <svg class="strava-logo" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
              Xem Strava
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Activity {
  activity_id: number
  name: string
  distance_km: number
  moving_time: number
  pace: number
  start_date_local: string
}

interface UserData {
  strava_id: string
  name: string
  avatar: string
  team_id: string
  total_km: number
  activities: Activity[]
}

const props = defineProps<{
  user: UserData
  isLoading?: boolean
}>()

function formatDate(dateString: string) {
  // Strava's start_date_local notoriously includes 'Z' at the end even though it's local time.
  // We must remove the 'Z' so Javascript parses it as Local time, not UTC.
  const cleanDateString = dateString.replace('Z', '')
  const d = new Date(cleanDateString)
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(',', '') // Remove comma for cleaner display
}

function formatPace(secondsPerKm: number) {
  const minutes = Math.floor(secondsPerKm / 60)
  const seconds = Math.floor(secondsPerKm % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.user-activities-modal {
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-md);
  margin-bottom: var(--space-md);
  border-bottom: 1px solid var(--color-border-glass);
}

.modal__user-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.modal__username {
  font-size: var(--font-size-base);
  font-weight: 700;
  margin-bottom: 4px;
}

.modal__total {
  text-align: right;
  display: flex;
  flex-direction: column;
}

.modal__total-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.modal__total-value {
  font-size: var(--font-size-lg);
  font-weight: 800;
  color: var(--color-accent);
}

.modal__total-value small {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.modal__body {
  overflow-y: auto;
  padding-right: var(--space-xs);
  margin-right: calc(var(--space-xs) * -1);
}

/* Custom Scrollbar */
.modal__body::-webkit-scrollbar {
  width: 6px;
}
.modal__body::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 3px;
}
.modal__body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.modal__empty {
  text-align: center;
  padding: var(--space-2xl) 0;
  color: var(--color-text-muted);
}

.activities-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.activity-card {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-glass);
  transition: transform 0.2s, background 0.2s;
}

.activity-card:hover {
  background: var(--color-bg-glass);
  transform: translateY(-1px);
}

.activity-card__main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.activity-card__name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-card__date {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.activity-card__stats {
  display: flex;
  gap: var(--space-md);
}

.activity-stat {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.activity-stat__value {
  font-size: var(--font-size-base);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.activity-stat__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.activity-card__action {
  display: flex;
  align-items: center;
}

.btn--strava {
  background-color: #fc4c02;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  text-decoration: none;
}

.btn--strava:hover {
  background-color: #e34402;
  transform: translateY(-1px);
}

@media (max-width: 640px) {
  .activity-card {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    gap: var(--space-sm);
  }
  
  .activity-card__stats {
    justify-content: flex-start;
  }
}
</style>
