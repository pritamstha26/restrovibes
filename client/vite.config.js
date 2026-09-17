import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['/vite.svg'],
      manifest: {
        name: 'RestroVibe',
        short_name: 'RestroVibe',
        description: 'Book your table at RestroVibe',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ff6b35',
        orientation: 'portrait-primary',
        icons: [
          { src: '/vite.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/vite.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
