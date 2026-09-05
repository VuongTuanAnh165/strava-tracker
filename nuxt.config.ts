// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Runtime config — secrets stay server-side, public config goes to client
  runtimeConfig: {
    // Server-only (accessible via useRuntimeConfig().xxx in server routes)
    // Multi-app Strava config is read directly from STRAVA_APPS_CONFIG env in stravaApps.ts
    adminSecret: process.env.ADMIN_SECRET || '',

    // Public (accessible on both client and server)
    public: {
      appUrl: process.env.APP_URL || 'http://localhost:3000',
      // Firebase client config (for onSnapshot realtime listener)
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
    },
  },

  // Global CSS
  css: ['~/assets/css/main.css'],

  // Nitro server config
  nitro: {
    // Let Nitro auto-detect the deployment environment (e.g. Vercel)
  },

  // Enable Vercel Edge Caching (CDN) to protect Firebase from read spikes
  routeRules: {
    // Cache on CDN for 15 seconds (SWR). Backend cache handles Firebase protection!
    '/api/leaderboard': { swr: 15 },
    // Cache on CDN for 30 minutes (SWR). 
    '/api/auth/public-users': { swr: 1800 },
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
