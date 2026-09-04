<template>
  <div class="login-page">
    <!-- Hero Section -->
    <div class="login-hero">
      <div class="login-hero__bg"></div>
      <div class="container">
        <div class="login-hero__content animate-fade-in-up">
          <div class="login-hero__badge">🏃 Cuộc đua chạy bộ 2026</div>
          <h1 class="login-hero__title">
            <span class="login-hero__team-a">ACP1</span>
            <span class="login-hero__vs">vs</span>
            <span class="login-hero__team-b">ACP2</span>
          </h1>
          <p class="login-hero__subtitle">
            01/09 — 24/09/2026 • Kết nối Strava • Chạy và theo dõi realtime
          </p>
        </div>
      </div>
    </div>

    <!-- Team Selection -->
    <div class="container">
      <div class="login-section animate-fade-in-up delay-2">
        <h2 class="login-section__title">Chọn đội của bạn</h2>
        <p class="login-section__desc">Chọn đội rồi kết nối Strava để tham gia cuộc đua</p>

        <div class="team-selector">
          <button
            class="team-option glass-card"
            :class="{ 'team-option--selected': selectedTeam === 'team_a', 'team-card--a': true }"
            @click="selectedTeam = 'team_a'"
          >
            <div class="team-option__icon" style="background: var(--color-team-a)">1</div>
            <h3 class="team-option__name">ACP1</h3>
            <div class="team-option__check" v-if="selectedTeam === 'team_a'">✓</div>
          </button>

          <button
            class="team-option glass-card"
            :class="{ 'team-option--selected': selectedTeam === 'team_b', 'team-card--b': true }"
            @click="selectedTeam = 'team_b'"
          >
            <div class="team-option__icon" style="background: var(--color-team-b)">2</div>
            <h3 class="team-option__name">ACP2</h3>
            <div class="team-option__check" v-if="selectedTeam === 'team_b'">✓</div>
          </button>
        </div>

        <!-- Strava Connect Button -->
        <div class="login-connect animate-fade-in-up delay-3">
          <button
            class="btn btn--strava btn--lg"
            :disabled="!selectedTeam || isConnecting"
            @click="connectStrava"
          >
            <template v-if="isConnecting">
              <span class="btn-spinner"></span>
              Đang kết nối...
            </template>
            <template v-else>
              <svg class="strava-logo" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
              </svg>
              Kết nối với Strava
            </template>
          </button>
          <p class="login-connect__hint" v-if="!selectedTeam">
            ⬆️ Vui lòng chọn đội trước
          </p>
          <p class="login-connect__hint" v-else>
            Bạn sẽ được chuyển sang Strava để ủy quyền đọc dữ liệu chạy bộ
          </p>
        </div>

        <!-- Error message -->
        <div v-if="errorMessage" class="login-error animate-fade-in">
          <p>❌ {{ errorMessage }}</p>
        </div>
      </div>

      <!-- How it works -->
      <div class="login-how animate-fade-in-up delay-4">
        <h3 class="login-how__title">Cách thức hoạt động</h3>
        <div class="login-how__steps">
          <div class="login-how__step glass-card">
            <div class="login-how__step-num">1</div>
            <h4>Chọn đội</h4>
            <p>Chọn ACP1 hoặc ACP2</p>
          </div>
          <div class="login-how__step glass-card">
            <div class="login-how__step-num">2</div>
            <h4>Kết nối Strava</h4>
            <p>Ủy quyền để đọc dữ liệu chạy</p>
          </div>
          <div class="login-how__step glass-card">
            <div class="login-how__step-num">3</div>
            <h4>Chạy & Theo dõi</h4>
            <p>Mỗi km chạy tự động cộng điểm</p>
          </div>
        </div>
      </div>

      <!-- Rules -->
      <div class="login-rules animate-fade-in-up delay-5">
        <h3 class="login-rules__title">📋 Quy định</h3>
        <ul class="login-rules__list">
          <li>Thời gian: <strong>01/09 → 24/09/2026</strong></li>
          <li>Pace hợp lệ: <strong>4:00 – 15:00 phút/km</strong></li>
          <li>Chỉ tính bài chạy bộ (Run/VirtualRun)</li>
          <li>Không chấp nhận nhập tay (manual entry)</li>
          <li>Dữ liệu được đồng bộ tự động qua Strava</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <footer class="login-footer">
      <p>Powered by Strava API • Built with ❤️</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()

const selectedTeam = ref<'team_a' | 'team_b' | null>(null)
const errorMessage = ref('')
const isConnecting = ref(false)

// Check for error from OAuth redirect
onMounted(() => {
  if (route.query.error === 'denied') {
    errorMessage.value = 'Bạn đã từ chối ủy quyền Strava. Vui lòng thử lại.'
  }
})

async function connectStrava() {
  if (!selectedTeam.value) return

  isConnecting.value = true
  errorMessage.value = ''

  try {
    // Fetch available app from server (finds first app with < 10 users)
    const data = await $fetch<{ appIndex: number; clientId: string }>('/api/auth/available-app')

    const appUrl = config.public.appUrl
    const redirectUri = `${appUrl}/api/auth/callback`

    const params = new URLSearchParams({
      client_id: data.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: 'activity:read_all',
      state: `${selectedTeam.value}:${data.appIndex}`,
    })

    window.location.href = `https://www.strava.com/oauth/authorize?${params.toString()}`
  } catch (err: any) {
    isConnecting.value = false
    if (err?.statusCode === 503) {
      errorMessage.value = 'Tất cả các slot đã đầy (50/50 VĐV). Vui lòng liên hệ admin để được hỗ trợ.'
    } else {
      errorMessage.value = `Không thể kết nối: ${err?.data?.message || err?.message || 'Lỗi không xác định'}`
    }
  }
}

// If already logged in, redirect to dashboard
const { isLoggedIn, checkSession } = useAuth()
onMounted(async () => {
  await checkSession()
  if (isLoggedIn.value) {
    navigateTo('/')
  }
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  padding-bottom: var(--space-3xl);
}

/* Hero */
.login-hero {
  position: relative;
  padding: var(--space-3xl) 0;
  text-align: center;
  overflow: hidden;
}

.login-hero__bg {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse at 30% 50%, rgba(255, 107, 53, 0.15), transparent 60%),
    radial-gradient(ellipse at 70% 50%, rgba(78, 205, 196, 0.15), transparent 60%);
  z-index: 0;
}

.login-hero__content {
  position: relative;
  z-index: 1;
}

.login-hero__badge {
  display: inline-block;
  padding: var(--space-sm) var(--space-lg);
  background: var(--color-bg-glass);
  border: 1px solid var(--color-border-glass);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xl);
}

.login-hero__title {
  font-size: var(--font-size-hero);
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin-bottom: var(--space-lg);
}

.login-hero__team-a {
  color: var(--color-team-a);
  text-shadow: 0 0 40px var(--color-team-a-glow);
}

.login-hero__vs {
  color: var(--color-text-muted);
  font-size: 0.5em;
  vertical-align: middle;
  margin: 0 var(--space-md);
}

.login-hero__team-b {
  color: var(--color-team-b);
  text-shadow: 0 0 40px var(--color-team-b-glow);
}

.login-hero__subtitle {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  max-width: 500px;
  margin: 0 auto;
}

/* Team Selection */
.login-section {
  max-width: 600px;
  margin: var(--space-3xl) auto;
  text-align: center;
}

.login-section__title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  margin-bottom: var(--space-sm);
}

.login-section__desc {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xl);
}

.team-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.team-option {
  padding: var(--space-xl);
  cursor: pointer;
  text-align: center;
  position: relative;
  transition: all var(--transition-base);
  border: 2px solid transparent;
  background: none;
  color: var(--color-text-primary);
  font-family: var(--font-family);
}

.team-option--selected {
  transform: translateY(-4px) !important;
}

.team-option--selected.team-card--a {
  border-color: var(--color-team-a);
  box-shadow: var(--shadow-glow-a);
}

.team-option--selected.team-card--b {
  border-color: var(--color-team-b);
  box-shadow: var(--shadow-glow-b);
}

.team-option__icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-2xl);
  font-weight: 900;
  color: white;
  margin: 0 auto var(--space-md);
}

.team-option__name {
  font-size: var(--font-size-xl);
  font-weight: 700;
}

.team-option__check {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--color-success);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: 700;
  animation: scaleIn 0.3s ease-out;
}

/* Connect Button */
.login-connect {
  text-align: center;
}

.btn--lg {
  padding: var(--space-lg) var(--space-2xl);
  font-size: var(--font-size-lg);
}

.login-connect__hint {
  margin-top: var(--space-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.strava-logo {
  flex-shrink: 0;
}

.btn-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error */
.login-error {
  margin-top: var(--space-xl);
  padding: var(--space-md) var(--space-lg);
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: var(--radius-md);
  color: var(--color-error);
}

/* How it works */
.login-how {
  max-width: 700px;
  margin: var(--space-3xl) auto;
  text-align: center;
}

.login-how__title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin-bottom: var(--space-xl);
  color: var(--color-text-secondary);
}

.login-how__steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-lg);
}

.login-how__step {
  padding: var(--space-xl) var(--space-md);
}

.login-how__step-num {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: var(--font-size-sm);
  margin: 0 auto var(--space-md);
}

.login-how__step h4 {
  font-size: var(--font-size-sm);
  font-weight: 600;
  margin-bottom: var(--space-xs);
}

.login-how__step p {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

/* Rules */
.login-rules {
  max-width: 500px;
  margin: var(--space-3xl) auto;
}

.login-rules__title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  margin-bottom: var(--space-lg);
  text-align: center;
}

.login-rules__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.login-rules__list li {
  padding: var(--space-sm) var(--space-md);
  background: var(--color-bg-glass);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.login-rules__list li::before {
  content: '✓ ';
  color: var(--color-success);
  font-weight: 700;
}

/* Footer */
.login-footer {
  text-align: center;
  padding: var(--space-2xl) 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

@media (max-width: 768px) {
  .login-hero__title {
    font-size: var(--font-size-4xl);
  }

  .login-how__steps {
    grid-template-columns: 1fr;
    max-width: 300px;
    margin: 0 auto;
  }
}

@media (max-width: 480px) {
  .team-selector {
    grid-template-columns: 1fr;
  }
}
</style>
