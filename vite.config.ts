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
    exclude: ['@jitsi/rnnoise-wasm', 'rnnoise.wasm']
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