<template>
  <div class="team-cards">
    <div
      class="glass-card team-card team-card--a"
      :class="{ 'team-card--winner': isTeamAWinning }"
    >
      <div class="team-card__header">
        <div class="team-card__name-wrapper">
          <div class="team-card__dot" style="background: var(--color-team-a)"></div>
          <h2 class="team-card__name">{{ teamA?.name || 'ACP1' }}</h2>
        </div>
        <span class="badge badge--team-a">{{ teamA?.member_count || 0 }} thành viên</span>
      </div>

      <div class="team-card__km">
        <span class="team-card__km-value" :style="{ color: 'var(--color-team-a)' }">
          {{ formatKm(teamA?.total_km || 0) }}
        </span>
        <span class="team-card__km-unit">km</span>
      </div>

      <div class="team-card__bar">
        <div class="progress-bar">
          <div
            class="progress-bar__fill"
            :style="{
              width: teamAPercent + '%',
              background: 'linear-gradient(90deg, var(--color-team-a), #FF9A6C)'
            }"
          ></div>
        </div>
        <span class="team-card__percent">{{ teamAPercent }}%</span>
      </div>
    </div>

    <div class="team-cards__vs">
      <div class="team-cards__vs-circle">VS</div>
    </div>

    <div
      class="glass-card team-card team-card--b"
      :class="{ 'team-card--winner': isTeamBWinning }"
    >
      <div class="team-card__header">
        <div class="team-card__name-wrapper">
          <div class="team-card__dot" style="background: var(--color-team-b)"></div>
          <h2 class="team-card__name">{{ teamB?.name || 'ACP2' }}</h2>
        </div>
        <span class="badge badge--team-b">{{ teamB?.member_count || 0 }} thành viên</span>
      </div>

      <div class="team-card__km">
        <span class="team-card__km-value" :style="{ color: 'var(--color-team-b)' }">
          {{ formatKm(teamB?.total_km || 0) }}
        </span>
        <span class="team-card__km-unit">km</span>
      </div>

      <div class="team-card__bar">
        <div class="progress-bar">
          <div
            class="progress-bar__fill"
            :style="{
              width: teamBPercent + '%',
              background: 'linear-gradient(90deg, var(--color-team-b), #7EEEE6)'
            }"
          ></div>
        </div>
        <span class="team-card__percent">{{ teamBPercent }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Team {
  id: string
  name: string
  total_km: number
  member_count: number
  color: string
}

const props = defineProps<{
  teamA?: Team
  teamB?: Team
}>()

const totalKm = computed(() => (props.teamA?.total_km || 0) + (props.teamB?.total_km || 0))

const teamAPercent = computed(() => {
  if (totalKm.value === 0) return 50
  return Math.round(((props.teamA?.total_km || 0) / totalKm.value) * 100)
})

const teamBPercent = computed(() => {
  if (totalKm.value === 0) return 50
  return 100 - teamAPercent.value
})

const isTeamAWinning = computed(() => (props.teamA?.total_km || 0) > (props.teamB?.total_km || 0))
const isTeamBWinning = computed(() => (props.teamB?.total_km || 0) > (props.teamA?.total_km || 0))

function formatKm(km: number): string {
  return km.toFixed(1)
}
</script>

<style scoped>
.team-cards {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--space-lg);
  align-items: center;
}

.team-card {
  padding: var(--space-xl);
  position: relative;
  overflow: hidden;
}

.team-card--winner::before {
  content: '👑';
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  font-size: var(--font-size-2xl);
  animation: float 3s ease-in-out infinite;
}

.team-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
}

.team-card__name-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.team-card__dot {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.team-card__name {
  font-size: var(--font-size-xl);
  font-weight: 700;
}

.team-card__km {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.team-card__km-value {
  font-size: var(--font-size-5xl);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.02em;
  animation: countUp 0.6s ease-out;
}

.team-card__km-unit {
  font-size: var(--font-size-xl);
  color: var(--color-text-muted);
  font-weight: 500;
}

.team-card__bar {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.team-card__bar .progress-bar {
  flex: 1;
}

.team-card__percent {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-secondary);
  min-width: 40px;
  text-align: right;
}

/* VS Circle */
.team-cards__vs {
  display: flex;
  align-items: center;
  justify-content: center;
}

.team-cards__vs-circle {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: var(--color-bg-glass);
  border: 1px solid var(--color-border-glass);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: 800;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
}

@media (max-width: 768px) {
  .team-cards {
    grid-template-columns: 1fr;
    gap: var(--space-md);
  }

  .team-cards__vs {
    order: 1;
  }

  .team-card:first-child {
    order: 0;
  }

  .team-card:last-child {
    order: 2;
  }

  .team-card__km-value {
    font-size: var(--font-size-4xl);
  }
}
</style>
