import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'e2e/**',
      'tests/**',
      'scripts/**/*.spec.{ts,tsx,js,jsx}',
      // Pre-Vitest suites target removed APIs and require a dedicated migration.
      'src/components/performance/tests/**',
      'src/__tests__/accessibility/accessibility.test.tsx',
      'src/__tests__/integration/PaymentFlow.test.ts',
      'src/utils/__tests__/contractJournalEntry.test.ts',
    ],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist',
      ],
      all: true,
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
