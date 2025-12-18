/**
 * Visual Regression Testing Configuration
 * Sets up Playwright for automated visual regression testing
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Visual regression configuration
const SNAPSHOT_DIR = path.join(__dirname, '__snapshots__');
const SNAPSHOT_UPDATE = process.env.SNAPSHOT_UPDATE === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
      animations: 'disabled',
    },
    // Visual regression options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    video: 'retain-on-failure',
  },

  // Configure projects for visual testing
  projects: [
    {
      name: 'visual-regression-chrome',
      use: {
        ...devices['Desktop Chrome'],
        // Reduced motion for consistent screenshots
        reducedMotion: 'reduce',
        // Force consistent color scheme
        colorScheme: 'light',
        // Force consistent locale
        locale: 'en-US',
      },
      testMatch: '**/*.visual.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'visual-regression-dark',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        reducedMotion: 'reduce',
        locale: 'en-US',
      },
      testMatch: '**/*.visual.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'visual-regression-mobile',
      use: {
        ...devices['iPhone 13'],
        reducedMotion: 'reduce',
        locale: 'en-US',
      },
      testMatch: '**/*.visual.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'visual-regression-rtl',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'light',
        reducedMotion: 'reduce',
        locale: 'ar-SA', // Arabic locale for RTL testing
      },
      testMatch: '**/*.visual.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'setup',
      testMatch: '**/setup.visual.ts',
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: '**/cleanup.visual.ts',
    },
  ],

  // Global setup for visual regression
  globalSetup: path.join(__dirname, 'visual-setup.ts'),

  // Output directory for test artifacts
  outputDir: 'test-results',

  // Snapshot directory
  snapshotDir: SNAPSHOT_DIR,

  // Update snapshots on demand
  updateSnapshots: SNAPSHOT_UPDATE ? 'all' : 'missing',

  // Timeout for visual tests
  timeout: 30000,
  expect: {
    // Visual comparison threshold (0-1)
    threshold: 0.2,
    // Animation handling
    toHaveScreenshot: {
      threshold: 0.2,
      animationHandling: 'disabled',
      // Crop to specific regions
      clip: null,
    },
    // Visual comparison timeout
    timeout: 5000,
  },
});