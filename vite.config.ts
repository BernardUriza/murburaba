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
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'murmuraba': path.resolve(__dirname, './packages/murmuraba/src')
    }
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['audio-resampler'],
    exclude: ['@jitsi/rnnoise-wasm', 'rnnoise.wasm'],
    // Explicitly configure WASM handling
    esbuildOptions: {
      target: 'es2020', // Modern browser support
    }
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    ...defineConfig().build,
    rollupOptions: {
      ...defineConfig().build?.rollupOptions,
      output: {
        manualChunks(id) {
          // Separate WASM into its own chunk
          if (id.includes('rnnoise.wasm')) {
            return 'rnnoise-wasm';
          }
        }
      }
    },
    // Reduce chunk size
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 3000,
    open: true,
    fs: {
      // Allow serving files from node_modules for WASM
      allow: ['..']
    }
  }
})