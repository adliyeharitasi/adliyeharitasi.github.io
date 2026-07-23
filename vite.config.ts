import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const basePath = process.env.DEPLOY_BASE_PATH || '/'

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'data/**/*.json'],
      manifest: {
        name: 'Adliye Haritası — İlçe Hangi Adliyeye Bağlı?',
        short_name: 'Adliye Haritası',
        description: 'İlçelerin bağlı olduğu adliyeyi gösteren kaynaklı Türkiye adliye rehberi',
        lang: 'tr',
        start_url: basePath,
        scope: basePath,
        display: 'standalone',
        background_color: '#f3f0e8',
        theme_color: '#163a59',
        icons: [{ src: `${basePath}icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,geojson}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: `${basePath}index.html`,
        runtimeCaching: [{
          urlPattern: /^https:\/\/tile\.openstreetmap\.org\//,
          handler: 'NetworkOnly',
        }],
      },
    }),
  ],
})
