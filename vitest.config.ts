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
    clearMocks: true,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage/unit-integration',
      include: ['src/background/**/*.ts', 'src/shared/types.ts'],
      checkCoverage: true,
      thresholds: {
        lines: 78,
        functions: 78,
        statements: 78,
        branches: 70,
      },
    },
  },
});
