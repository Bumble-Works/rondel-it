import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Tauri expects a fixed dev-server port.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
})
