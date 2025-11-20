/**
 * Contract Performance Tests
 *
 * Performance testing for contract management workflows including:
 * - Page load performance
 * - API response times
 * - Component rendering performance
 * - Memory usage monitoring
 * - Database query performance
 */

import { test, expect } from '@playwright/test';

test.describe('Contract Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enable performance monitoring
    await page.goto('/login');
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should load contracts list within performance budget', async ({ page }) => {
    // Login first
    await page.fill('[data-testid="email-input"]', 'test@fleetify.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Navigate to contracts list
    const startTime = Date.now();
    await page.goto('/contracts');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="contracts-list"]');

    const loadTime = Date.now() - startTime;

    // Performance assertions
    expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds

    // Check Web Vitals
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
        loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
        firstPaint: Math.round(performance.getEntriesByName('first-paint')[0]?.startTime || 0),
        firstContentfulPaint: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0),
      };
    });

    expect(performanceMetrics.domContentLoaded).toBeLessThan(1500);
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1000);
  });

  test('should render contracts list efficiently with large datasets', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@fleetify.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Monitor rendering performance with large dataset
    await page.goto('/contracts');

    // Measure initial render time
    const renderStartTime = Date.now();
    await page.waitForSelector('[data-testid="contract-card"]', { timeout: 10000 });
    const initialRenderTime = Date.now() - renderStartTime;

    expect(initialRenderTime).toBeLessThan(2000); // Initial render should be fast

    // Test scrolling performance
    await page.evaluate(() => {
      return new Promise((resolve) => {
        let scrollCount = 0;
        const scrollInterval = setInterval(() => {
          window.scrollBy(0, 300);
          scrollCount++;
          if (scrollCount >= 10) {
            clearInterval(scrollInterval);
            resolve(null);
          }
        }, 100);
      });
    });

    // Check for memory leaks
    const memoryUsage = await page.evaluate(() => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        return {
          usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
          totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
          jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
        };
      }
      return null;
    });

    if (memoryUsage) {
      expect(memoryUsage.usedJSHeapSize).toBeLessThan(100); // Should use less than 100MB
    }
  });

  test('should handle contract search within performance budget', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@fleetify.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.goto('/contracts');

    // Test search performance
    const searchStartTime = Date.now();
    await page.fill('[data-testid="contract-search"]', 'AGR-001');
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 });
    const searchTime = Date.now() - searchStartTime;

    expect(searchTime).toBeLessThan(1500); // Search should complete within 1.5 seconds

    // Test search with complex query
    const complexSearchStartTime = Date.now();
    await page.fill('[data-testid="contract-search"]', 'customer:Test Company status:active type:rental');
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 });
    const complexSearchTime = Date.now() - complexSearchStartTime;

    expect(complexSearchTime).toBeLessThan(2000); // Complex search should be fast
  });

  test('should handle contract filtering efficiently', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@fleetify.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    await page.goto('/contracts');

    // Test filter performance
    const filterTests = [
      { filter: 'status', value: 'active' },
      { filter: 'type', value: 'rental' },
      { filter: 'date-range', start: '2024-01-01', end: '2024-12-31' },
    ];

    for (const test of filterTests) {
      const filterStartTime = Date.now();

      if (test.filter === 'status') {
        await page.click('[data-testid="status-filter"]');
        await page.click(`[data-testid="status-filter-${test.value}"]`);
      } else if (test.filter === 'type') {
        await page.click('[data-testid="type-filter"]');
        await page.click(`[data-testid="type-filter-${test.value}"]`);
      } else if (test.filter === 'date-range') {
        await page.fill('[data-testid="date-range-start"]', test.start);
        await page.fill('[data-testid="date-range-end"]', test.end);
        await page.click('[data-testid="apply-date-filter"]');
      }

      await page.waitForSelector('[data-testid="contracts-list"]', { timeout: 3000 });
      const filterTime = Date.now() - filterStartTime;

      expect(filterTime).toBeLessThan(1000); // Filters should be very fast
    }
  });

  test('should handle contract creation within performance budget', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@fleetify.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Navigate to contract creation
    const creationPageStartTime = Date.now();
    await page.goto('/contracts/create');
    await page.waitForSelector('[data-testid="contract-creation-form"]', { timeout: 5000 });
    const creationPageLoadTime = Date.now() - creationPageStartTime;

    expect(creationPageLoadTime).toBeLessThan(2000);

    // Test form field interaction performance
    const fieldTests = [
      { selector: '[data-testid="agreement-number"]', value: 'AGR-PERF-001' },
      { selector: '[data-testid="monthly-rate"]', value: '1500' },
      { selector: '[data-testid="deposit-amount"]', value: '3000' },
      { selector: '[data-testid="insurance-fees"]', value: '150' },
      { selector: '[data-testid="service-fees"]', value: '50' },
    ];

    for (const field of fieldTests) {
      const fieldInteractionStartTime = Date.now();
      await page.fill(field.selector, field.value);
      const fieldInteractionTime = Date.now() - fieldInteractionStartTime;

      expect(fieldInteractionTime).toBeLessThan(100); // Field interactions should be instant
    }

    // Test form calculation performance
    await page.fill('[data-testid="monthly-rate"]', '2000');
    const calculationStartTime = Date.now();
    await page.waitForSelector('[data-testid="monthly-total"]', { timeout: 1000 });
    const calculationTime = Date.now() - calculationStartTime;

    expect(calculationTime).toBeLessThan(200); // Calculations should be instant
  });

  test('should handle API response times within acceptable limits', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@fleetify.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Monitor API response times
    const apiResponseTimes = await page.evaluate(() => {
      const responseTimes: number[] = [];

      // Intercept fetch calls
      const originalFetch = window.fetch;
      window.fetch = async function(...args: any[]) {
        const startTime = performance.now();
        const response = await originalFetch.apply(this, args);
        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
        return response;
      };

      return responseTimes;
    });

    // Navigate to contracts to trigger API calls
    await page.goto('/contracts');
    await page.waitForLoadState('networkidle');

    // Get response times from page
    const responseTimes = await page.evaluate(() => (window as any).apiResponseTimes || []);

    if (responseTimes.length > 0) {
      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(averageResponseTime).toBeLessThan(500); // Average API response < 500ms
      expect(maxResponseTime).toBeLessThan(2000); // Max API response < 2s
    }
  });

  test('should handle concurrent operations efficiently', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@fleetify.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Test concurrent operations
    const concurrentOperations = [
      () => page.goto('/contracts'),
      () => page.goto('/customers'),
      () => page.goto('/fleet'),
      () => page.goto('/reports'),
    ];

    const concurrentStartTime = Date.now();
    await Promise.all(concurrentOperations.map(op => op()));
    const concurrentTime = Date.now() - concurrentStartTime;

    // Concurrent operations should complete efficiently
    expect(concurrentTime).toBeLessThan(5000);
  });

  test('should maintain performance under memory stress', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@fleetify.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Create memory stress by opening multiple tabs/pages
    const memoryStressStartTime = Date.now();

    // Simulate memory-intensive operations
    for (let i = 0; i < 10; i++) {
      await page.goto('/contracts');
      await page.fill('[data-testid="contract-search"]', `test-${i}`);
      await page.click('[data-testid="clear-search"]');
    }

    const memoryStressTime = Date.now() - memoryStressStartTime;

    // Check if performance degraded significantly
    expect(memoryStressTime).toBeLessThan(10000); // Should handle stress within 10s

    // Check memory usage after stress
    const memoryAfterStress = await page.evaluate(() => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        return Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
      }
      return null;
    });

    if (memoryAfterStress) {
      expect(memoryAfterStress).toBeLessThan(150); // Should not exceed 150MB under stress
    }
  });

  test('should handle database query performance efficiently', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@fleetify.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Test different query patterns
    const queryTests = [
      {
        name: 'Simple list query',
        action: () => page.goto('/contracts'),
        expectedMaxTime: 2000,
      },
      {
        name: 'Filtered query',
        action: async () => {
          await page.goto('/contracts');
          await page.click('[data-testid="status-filter"]');
          await page.click('[data-testid="status-filter-active"]');
          await page.waitForSelector('[data-testid="contracts-list"]');
        },
        expectedMaxTime: 1500,
      },
      {
        name: 'Search query',
        action: async () => {
          await page.goto('/contracts');
          await page.fill('[data-testid="contract-search"]', 'customer');
          await page.waitForSelector('[data-testid="search-results"]');
        },
        expectedMaxTime: 2000,
      },
      {
        name: 'Aggregated data query',
        action: () => page.goto('/reports'),
        expectedMaxTime: 3000,
      },
    ];

    for (const test of queryTests) {
      const queryStartTime = Date.now();
      await test.action();
      const queryTime = Date.now() - queryStartTime;

      expect(queryTime).toBeLessThan(test.expectedMaxTime);
    }
  });

  test('should handle large file uploads efficiently', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@fleetify.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    await page.goto('/contracts/create');

    // Test file upload performance
    const fileUploadStartTime = Date.now();

    // Create a temporary large file for testing
    const largeFileContent = 'x'.repeat(1024 * 1024); // 1MB file
    const fileBuffer = Buffer.from(largeFileContent);

    // Simulate file upload
    const fileInput = page.locator('[data-testid="document-upload"]');
    await fileInput.setInputFiles({
      name: 'test-large-file.pdf',
      mimeType: 'application/pdf',
      buffer: fileBuffer,
    });

    // Wait for upload to complete
    await page.waitForSelector('[data-testid="upload-progress"]', { state: 'hidden' });

    const fileUploadTime = Date.now() - fileUploadStartTime;

    expect(fileUploadTime).toBeLessThan(10000); // File upload should complete within 10s
  });

  test('should maintain accessibility performance', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@fleetify.com');
    await page.fill('[data-testid="password-input"]', 'testpassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Test accessibility features don't impact performance
    const accessibilityStartTime = Date.now();

    // Enable screen reader mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('aria-live', 'polite');
      document.body.classList.add('sr-mode');
    });

    await page.goto('/contracts');
    await page.waitForSelector('[data-testid="contracts-list"]');

    const accessibilityTime = Date.now() - accessibilityStartTime;

    expect(accessibilityTime).toBeLessThan(3000); // Accessibility features shouldn't slow down significantly

    // Verify screen reader announcements are present
    const announcements = await page.locator('[aria-live]').count();
    expect(announcements).toBeGreaterThan(0);
  });
});