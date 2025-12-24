import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
    proxy: {
      '/pipedapi': {
        target: 'https://pipedapi.tokhmi.xyz', // A public Piped instance
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pipedapi/, ''),
        // Remove headers to look like a real browser request, not a dev server
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            proxyReq.removeHeader('Origin');
            proxyReq.removeHeader('Referer');
          });
        },
      },
    },
  }
})