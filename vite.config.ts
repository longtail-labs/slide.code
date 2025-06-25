import { defineConfig } from 'vitest/config'

/**
 * Configuration for the global end-to-end testing,
 * placed in the project's root 'tests' folder.
 * @type {import('vite').UserConfig}
 * @see https://vitest.dev/config/
 */
export const vitestConfig = defineConfig({
  test: {
    setupFiles: ['./packages/database/test/setup.ts'],

    /**
     * By default, vitest searches for the test files in all packages.
     * For e2e tests, have vitest search only in the project root 'tests' folder.
     */
    include: ['./packages/database/test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    /**
     * The default timeout of 5000ms is sometimes not enough for playwright.
     */
    testTimeout: 30_000,
    hookTimeout: 30_000
  }
})

// Default export for Storybook compatibility
export default defineConfig({
  // You can merge the test configuration here if needed
  test: vitestConfig.test
})
