import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the demo from /rondel-it/; every other build stays at /.
  base: process.env.PAGES_BASE || '/',
  plugins: [react()],
  // Tauri expects a fixed dev-server port.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
})
