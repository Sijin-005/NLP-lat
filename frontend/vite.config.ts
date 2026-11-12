import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// NLPulse frontend build config.
// The dev server proxies /api to the local FastAPI backend so that the browser
// makes same-origin requests (no CORS surprises during a live demo).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  // `npm run preview` serves the production build; give it the same proxy so
  // Real Test works there too.
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // This is a locally served teaching app, not a public site over a slow
    // link, so a single larger chunk is preferable to code-splitting that
    // could stall mid-demo. The limit is raised to keep the build output clean.
    chunkSizeWarningLimit: 1200,
  },
})
