// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Runtime config — secrets stay server-side, public config goes to client
  runtimeConfig: {
    // Server-only (accessible via useRuntimeConfig().xxx in server routes)
    stravaClientId: process.env.STRAVA_CLIENT_ID || '',
    stravaClientSecret: process.env.STRAVA_CLIENT_SECRET || '',
    stravaWebhookVerifyToken: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || '',
    adminSecret: process.env.ADMIN_SECRET || '',

    // Public (accessible on both client and server)
    public: {
      appUrl: process.env.APP_URL || 'http://localhost:3000',
      stravaClientId: process.env.STRAVA_CLIENT_ID || '',
      // Firebase client config (for onSnapshot realtime listener)
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
    },
  },

  // Global CSS
  css: ['~/assets/css/main.css'],

  // Nitro server config
  nitro: {
    // Vercel will auto-detect, but explicit is better
    preset: process.env.NITRO_PRESET || 'node-server',
  },

  // App head config
  app: {
    head: {
      title: 'Strava Race Tracker — ACP1 vs ACP2',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Bảng xếp hạng chạy bộ realtime — Đội ACP1 vs ACP2. Kết nối Strava để tham gia cuộc đua!',
        },
      ],
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
        },
      ],
    },
  },
})
