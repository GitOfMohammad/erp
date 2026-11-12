import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  plugins: [tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg'],
    manifest: {
      name: 'راهکار ERP', short_name: 'راهکار', description: 'سامانه یکپارچه مدیریت سازمان',
      theme_color: '#0d1b2a', background_color: '#f4f6f8', display: 'standalone',
      lang: 'fa', dir: 'rtl', start_url: '/',
      icons: [
        { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
        { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
      ],
    },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,woff2,png}'], navigateFallback: '/index.html' },
    devOptions: { enabled: true },
  })],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
})
