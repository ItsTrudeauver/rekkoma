import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',  // Forces IPv4 (fixes the ::1 IPv6 ghost issue)
    port: 3000,         // Moves to a standard, usually safe port
    strictPort: true,   // Fails if port is busy (so you know for sure)
  }
})