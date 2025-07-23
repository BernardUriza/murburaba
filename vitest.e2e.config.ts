import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.{test,spec}.{ts,tsx}'],
    testTimeout: 60000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      enabled: true,
      reporter: ['text', 'html'],
      include: [
        'components/**/*.tsx',
        'packages/murmuraba/src/**/*.ts'
      ],
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'dist/',
        'coverage/'
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90
      }
    }
  }
})