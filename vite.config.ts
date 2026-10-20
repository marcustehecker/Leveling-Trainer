import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// BASE lets GitHub Pages serve the app from /the-system/.
export default defineConfig({
  base: process.env.BASE ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      // Adds the push and notification-click handlers for Daily Quest reminders.
      workbox: { importScripts: ['push-sw.js'] },
      manifest: {
        name: 'THE SYSTEM',
        short_name: 'SYSTEM',
        description: 'Level up through real training.',
        theme_color: '#05070D',
        background_color: '#05070D',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { include: ['src/**/*.test.ts'] },
})
