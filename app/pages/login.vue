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



    <!-- Main Login Section -->
    <div class="container">
      <div class="login-section animate-fade-in-up delay-2">
        <h2 class="login-section__title">
          Đăng nhập hệ thống
        </h2>
        <p class="login-section__desc">
          Tìm tên của bạn để đăng nhập vào hệ thống.
        </p>



        <!-- Returning User Flow: Select Team & Name -->
        <div class="returning-selector">
          <div class="select-group">
            <label>1. Đội của bạn</label>
            <select v-model="returningTeam" class="glass-select">
              <option value="" disabled>-- Chọn đội --</option>
              <option value="team_a">ACP1</option>
              <option value="team_b">ACP2</option>
            </select>
          </div>

          <div class="select-group" v-if="returningTeam">
            <label>2. Tên của bạn</label>
            <select v-model="returningUser" class="glass-select">
              <option :value="null" disabled>-- Chọn tên của bạn --</option>
              <option v-for="u in filteredUsers" :key="u.stravaId" :value="u">
                {{ u.name }}
              </option>
              <option v-if="filteredUsers.length === 0" disabled>Chưa có ai đăng ký đội này</option>
            </select>
          </div>
        </div>



        <!-- Strava Connect Button (Returning User) -->
        <div class="login-connect animate-fade-in-up delay-3">
          <button
            class="btn btn--strava btn--lg"
            :disabled="!returningUser || isConnecting"
            @click="connectStravaReturning"
          >
            <template v-if="isConnecting">
              <span class="btn-spinner"></span> Đang kết nối...
            </template>
            <template v-else>
              <svg class="strava-logo" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
              Vào trang chủ ngay
            </template>
          </button>
          <p class="login-connect__hint" v-if="!returningUser">⬆️ Vui lòng chọn tên của bạn</p>
          <p class="login-connect__hint" v-else>Đăng nhập trực tiếp (Bỏ qua Strava)</p>
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

const returningTeam = ref<'team_a' | 'team_b' | ''>('')
const returningUser = ref<any>(null)
const errorMessage = ref('')
const isConnecting = ref(false)

// Fetch public users for returning users list
const { data: publicUsers } = useFetch<any[]>('/api/auth/public-users')

const filteredUsers = computed(() => {
  if (!publicUsers.value || !returningTeam.value) return []
  return publicUsers.value.filter(u => u.teamId === returningTeam.value)
})

// Check for error from OAuth redirect
onMounted(() => {
  if (route.query.error === 'denied') {
    errorMessage.value = 'Bạn đã từ chối ủy quyền Strava. Vui lòng thử lại.'
  }
})



async function connectStravaReturning() {
  if (!returningUser.value) return
  isConnecting.value = true
  errorMessage.value = ''

  try {
    const user = returningUser.value
    await $fetch('/api/auth/direct-login', {
      method: 'POST',
      body: { stravaId: user.stravaId }
    })
    
    // Check session to update state and redirect
    await checkSession()
    if (isLoggedIn.value) {
      window.location.href = '/' // Force full reload to ensure clear state
    }
  } catch (err: any) {
    handleConnectError(err)
  }
}

function redirectToStrava(clientId: string, teamId: string, appIndex: number) {
  const appUrl = config.public.appUrl
  const redirectUri = `${appUrl}/api/auth/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    state: `${teamId}:${appIndex}`,
  })

  window.location.href = `https://www.strava.com/oauth/authorize?${params.toString()}`
}

function handleConnectError(err: any) {
  isConnecting.value = false
  console.error(err)
  if (err?.statusCode === 503) {
    errorMessage.value = 'Tất cả các slot đã đầy (50/50 VĐV). Vui lòng liên hệ admin để được hỗ trợ.'
  } else {
    errorMessage.value = `Không thể kết nối: ${err?.data?.message || err?.message || 'Lỗi không xác định'}`
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



/* Login Section */
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

/* Selectors */
.returning-selector {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
  text-align: left;
}

.select-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.select-group label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.glass-select {
  width: 100%;
  padding: var(--space-md);
  background: var(--color-bg-glass);
  border: 1px solid var(--color-border-glass);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-family: var(--font-family);
  font-size: var(--font-size-md);
  outline: none;
  appearance: none;
  cursor: pointer;
}

.glass-select:focus {
  border-color: var(--color-accent);
}

.glass-select option {
  background: #1e1e1e;
  color: white;
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
  /* removed team-selector */
}
</style>
