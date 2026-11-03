import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    // Proxy /api/* -> backend during local `vite dev` so the same relative
    // URL (/api) works both in development AND inside Docker behind Nginx.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Strip the /api prefix before forwarding to FastAPI
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
