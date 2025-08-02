import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks(id) {
          // Separate WASM into its own chunk
          if (id.includes('rnnoise.wasm')) {
            return 'rnnoise-wasm';
          }
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
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['@jitsi/rnnoise-wasm', 'rnnoise.wasm'],
    // Explicitly configure WASM handling
    esbuildOptions: {
      target: 'es2020', // Modern browser support
    }
  },
  assetsInclude: ['**/*.wasm'],
  server: {
    port: 3000,
    open: true,
    fs: {
      // Allow serving files from node_modules for WASM
      allow: ['..']
    }
  }
})