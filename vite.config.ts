import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:8765',
        changeOrigin: true
      },
      '/users': {
        target: 'http://localhost:8765',
        changeOrigin: true
      },
      '/pricing': {
        target: 'http://localhost:8765',
        changeOrigin: true
      },
      '/tracking': {
        target: 'http://localhost:8765',
        changeOrigin: true
      },
      '/transactions': {
        target: 'http://localhost:8765',
        changeOrigin: true
      },
      '/accounts': {
        target: 'http://localhost:8765',
        changeOrigin: true
      },
      '/personnalisation': {
        target: 'http://localhost:8765',
        changeOrigin: true
      }
    }
  }
})
