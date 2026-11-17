import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, strictPort: true },
  build: {
    // plotly.js-dist-min is large; it is lazy-loaded, so the warning threshold is raised for it only.
    chunkSizeWarningLimit: 5000,
  },
  preview: { port: 4173 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
