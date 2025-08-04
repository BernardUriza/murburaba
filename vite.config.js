import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  root: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separate WASM modules into their own chunk
          if (id.includes('rnnoise.wasm') || id.includes('rnnoise-wasm')) {
            return 'rnnoise-wasm';
          }
          // Separate workers into their own chunk
          if (id.includes('.worker.')) {
            return 'workers';
          }
          // Separate large dependencies
          if (id.includes('node_modules')) {
            // Keep the sync version out of main bundle
            if (id.includes('rnnoise-sync')) {
              return 'rnnoise-sync';
            }
            // Other large dependencies
            if (id.includes('jszip')) {
              return 'jszip';
            }
          }
          // Return undefined for default chunking behavior
          return undefined;
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@features': path.resolve(__dirname, './src/features'),
      '@core': path.resolve(__dirname, './src/core'),
      '@shared': path.resolve(__dirname, './src/shared'),
      'murmuraba': path.resolve(__dirname, './packages/murmuraba/src')
    }
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(process.env.npm_package_version || '3.0.0'),
    __BUILD_DATE__: JSON.stringify(new Date().toLocaleString())
  },
  server: {
    port: 3000,
    strictPort: false
  },
  optimizeDeps: {
    exclude: ['@jitsi/rnnoise-wasm']
  }
})