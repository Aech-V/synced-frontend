import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically updates the app when a new version is pushed
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'synced-logo.png'],
      manifest: {
        name: 'Synced Messenger',
        short_name: 'Synced',
        description: 'A high-performance real-time messaging application',
        theme_color: '#fccb06', // Your yellow accent color for the mobile status bar
        background_color: '#1a1b1e', // Your dark background color for the splash screen
        display: 'standalone', // Hides the browser UI (URL bar, navigation buttons)
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Ensures the icon adapts to Android teardrop/squircle shapes
          }
        ]
      },
      workbox: {
        // Caches all static assets (JS, CSS, Images) for instant subsequent loads
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Exclude socket.io polling routes if they accidentally get caught by standard fetch handlers
        navigateFallbackDenylist: [/^\/socket\.io/] 
      }
    })
  ]
});