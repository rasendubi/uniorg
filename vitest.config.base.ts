import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['**/*.spec.ts'],
    exclude: ['**/node_modules', '.direnv'],
    coverage: {
      enabled: !!process.env.CI,
      reporter: ['text', 'json', 'html'],
    },
  },
});
