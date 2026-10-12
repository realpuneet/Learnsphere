import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const api = env.VITE_PROXY_TARGET || 'http://localhost:5000';
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons/*.png'],
        manifest: {
          name: 'LearnSphere',
          short_name: 'LearnSphere',
          description: 'Learn in-demand skills with video courses, quizzes and certificates.',
          theme_color: '#5b3df5',
          background_color: '#f7f6fb',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/],
          runtimeCaching: [
            { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i, handler: 'CacheFirst', options: { cacheName: 'fonts', expiration: { maxEntries: 20, maxAgeSeconds: 31536000 } } },
            { urlPattern: /^https:\/\/ik\.imagekit\.io\/.*/i, handler: 'StaleWhileRevalidate', options: { cacheName: 'images', expiration: { maxEntries: 200, maxAgeSeconds: 2592000 } } },
            { urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/categories') || url.pathname === '/api/v1/home', handler: 'StaleWhileRevalidate', options: { cacheName: 'catalog', expiration: { maxEntries: 30, maxAgeSeconds: 600 } } },
          ],
        },
      }),
    ],
    server: {
      port: 5173,
      proxy: { '/api': { target: api, changeOrigin: true }, '/socket.io': { target: api, ws: true } },
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            motion: ['gsap', '@gsap/react', 'lenis'],
            data: ['@tanstack/react-query', 'axios', 'zustand', 'socket.io-client'],
          },
        },
      },
    },
  };
});
