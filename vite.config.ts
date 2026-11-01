import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': process.env.CHURCHSERVE_API_URL ?? 'http://localhost:5100',
      '/health': process.env.CHURCHSERVE_API_URL ?? 'http://localhost:5100',
      '/runtime-config.json':
        process.env.CHURCHSERVE_API_URL ?? 'http://localhost:5100',
    },
  },
})
