import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['img/favicon.png','img/icon-192.png','img/icon-512.png'],
      manifest: {
        name: 'ImmuniQ — Espace Bénéficiaire',
        short_name: 'ImmuniQ',
        description: 'Consultez le dossier vaccinal de votre famille et suivez les échéances.',
        theme_color: '#083860',
        background_color: '#F0F7F7',
        display: 'standalone',
        lang: 'fr',
        start_url: '/',
        icons: [
          { src: '/img/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/img/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Le portail est en ligne-first : pas de cache des réponses API
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
