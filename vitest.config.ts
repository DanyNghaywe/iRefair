import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['src/components/**/*.test.tsx', 'jsdom'],
    ],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['vitest.setup.ts'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 31,
        functions: 33,
        branches: 25,
        statements: 31,
      },
      exclude: [
        '**/*.d.ts',
        '**/*.css',
        '**/*.module.css',
        'src/**/*.backup',
        'src/**/globals.css',
        'src/**/layout.tsx',
        'src/**/page.tsx',
        'src/**/error.tsx',
        'src/**/not-found.tsx',
      ],
    },
  },
});
