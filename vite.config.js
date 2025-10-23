import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry point
        entry: 'electron/main.js',
        onstart: (options) => {
          if (options.startup) {
            options.startup()
          }
        },
      },
      {
        // Preload scripts
        entry: 'electron/preload.js',
        onstart: (options) => {
          options.reload()
        },
      }
    ]),
    renderer(),
  ],
  server: {
    port: 5173,
    host: 'localhost',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})