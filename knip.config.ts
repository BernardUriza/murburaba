import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'src/main.tsx',
    'index.html',
    'vite.config.ts',
    'vitest.config.ts',
    'vitest.e2e.config.ts',
    'packages/murmuraba/src/index.ts',
    'packages/murmuraba/rollup.config.js',
    'scripts/**/*.js',
  ],
  project: [
    'src/**/*.{ts,tsx}',
    'packages/murmuraba/src/**/*.{ts,tsx}',
    'scripts/**/*.js',
  ],
  ignore: [
    '**/dist/**',
    '**/node_modules/**',
    '**/coverage/**',
    '**/__tests__/**',
    '**/test/**',
    '**/tests/**',
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}',
    '**/debug/**',
    '**/html/**',
    '**/tsconfig.tsbuildinfo',
  ],
  ignoreDependencies: [
    // Development and testing dependencies
    '@types/*',
    'typescript',
    'vite',
    'vitest',
    'eslint',
    'jest',
    'puppeteer',
    '@vitejs/plugin-react',
    'happy-dom',
    'concurrently',
    
    // Build tools
    'rollup*',
    '@rollup/*',
    'rimraf',
    'npm-run-all',
    'tslib',
    
    // Testing utilities
    '@testing-library/*',
    '@vitest/*',
    
    // Workspace dependencies
    'murmuraba',
  ],
  workspaces: {
    '.': {
      entry: 'src/main.tsx',
      project: 'src/**/*.{ts,tsx}',
    },
    'packages/murmuraba': {
      entry: 'src/index.ts',
      project: 'src/**/*.{ts,tsx}',
    },
  },
  eslint: true,
  include: ['files', 'dependencies', 'unlisted', 'exports', 'nsExports', 'classMembers'],
  exclude: ['binaries', 'unresolved'],
};

export default config;