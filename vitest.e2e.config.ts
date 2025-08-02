import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // E2E environment with real browser
    environment: 'happy-dom',
    environmentOptions: {
      happyDOM: {
        settings: {
          disableJavaScriptFileLoading: false,
          disableCSSFileLoading: false,
          enableFileSystemHttpRequests: true
        }
      }
    },
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.e2e.{test,spec}.{ts,tsx}', 'tests/e2e/**/*.{test,spec}.{ts,tsx}'],
    
    // E2E specific configuration
    testTimeout: 60000, // 1 minute for E2E tests
    hookTimeout: 30000, // 30 seconds for setup/teardown
    
    // Coverage disabled for E2E tests (focus on integration, not coverage)
    coverage: {
      enabled: false
    },
    
    // Single threaded for E2E consistency
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
        maxThreads: 1,
        minThreads: 1
      }
    },
    
    // Better reporting for E2E
    reporters: ['default', 'html'],
    outputFile: {
      html: './coverage/e2e-report.html'
    },
    
    // Retry failed E2E tests
    retry: 2,
    
    // Sequential execution for E2E stability
    sequence: {
      shuffle: false,
      concurrent: false
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
  }
});