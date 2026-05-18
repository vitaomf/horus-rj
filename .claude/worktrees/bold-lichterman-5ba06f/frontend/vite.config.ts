import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    // Em dev, redireciona /api/* pro backend FastAPI (porta 7291).
    // Em produção, FastAPI serve frontend e API na mesma porta — proxy não roda.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:7291',
        changeOrigin: true,
      },
    },
  },
})
