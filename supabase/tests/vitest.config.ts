import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load .env file for test configuration
config();

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    globals: true,
    include: ['test-suites/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
