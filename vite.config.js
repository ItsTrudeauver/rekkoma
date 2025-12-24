import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
    proxy: {
      // 1. Forward API requests to Python
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      // 2. Keep your Piped API proxy if you still use it
      '/pipedapi': {
        target: 'https://pipedapi.tokhmi.xyz',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pipedapi/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('Origin');
            proxyReq.removeHeader('Referer');
          });
        },
      },
    },
  }
})