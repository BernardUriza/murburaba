import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    environmentOptions: {
      happyDOM: {
        settings: {
          disableJavaScriptFileLoading: true,
          disableCSSFileLoading: true,
          enableFileSystemHttpRequests: false
        }
      }
    },
    globals: true,
    setupFiles: ['./src/__tests__/vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      enabled: true,
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/core/**/*.ts',
        'src/hooks/**/*.ts',
        'src/engines/**/*.ts',
        'src/managers/**/*.ts',
        'src/utils/**/*.ts',
        'src/components/**/*.tsx'
      ],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'src/index.ts',
        'dist/',
        'coverage/',
        '**/*.config.ts',
        'src/types/**',
        'src/**/types.ts',
        'src/**/interfaces.ts'
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
        // Per-file thresholds for critical components
        'src/core/**/*.ts': {
          lines: 95,
          functions: 95,
          branches: 90,
          statements: 95
        },
        'src/hooks/**/*.ts': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90
        }
      },
      reportOnFailure: true,
      skipFull: false,
    },
    // Test timeout for long-running tests
    testTimeout: 10000,
    // Retry failed tests
    retry: 0,
    // Better error output
    reporters: ['default', 'html'],
    // Pool options for better performance
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});