import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        // Only run unit tests matching *.test.* under tests/
        include: ['tests/**/*.test.{ts,tsx,js,jsx}'],
        // Exclude Playwright/e2e spec files and common config files
        exclude: ['**/*.spec.{ts,tsx,js,jsx}', 'tests/e2e/**', 'playwright.config.*'],
        environment: 'node'
    }
})
