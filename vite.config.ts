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
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env': JSON.stringify({}),
  },
  optimizeDeps: {
    exclude: ['@jitsi/rnnoise-wasm', 'rnnoise.wasm'],
    // Explicitly configure WASM handling
    esbuildOptions: {
      target: 'es2020', // Modern browser support
    }
  },
  assetsInclude: ['**/*.wasm'],
  worker: {
    format: 'es',
    plugins: () => [react()]
  },
  server: {
    port: 3000,
    open: true,
    fs: {
      // Allow serving files from node_modules for WASM
      allow: ['..']
    },
    // Add aggressive cache-busting headers for development
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    },
    // Force full page reload on file changes
    hmr: {
      overlay: true,
      protocol: 'ws',
      host: 'localhost'
    }
  }
})