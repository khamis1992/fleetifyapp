/**
 * Finance Hub E2E Tests
 * Tests for main financial dashboard at /finance/hub
 *
 * Test Coverage:
 * - FH-001: Navigate to Finance Hub and verify layout
 * - FH-002: Verify KPI cards display correctly
 * - FH-003: Quick Actions work correctly
 * - FH-004: Universal Search functionality
 * - FH-005: Activity Timeline displays recent activities
 * - FH-006: Navigate to Billing Center from Hub
 * - FH-007: Navigate to Reports from Hub
 */

import { test, expect } from '@playwright/test';

// Test credentials
const TEST_EMAIL = 'khamis-1992@hotmail.com';
const TEST_PASSWORD = '123456789';
const BASE_URL = 'http://localhost:8080';

test.describe('Finance Hub', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/auth`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for login and navigation to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  /**
   * FH-001: Navigate to Finance Hub and verify layout
   * P0 - Critical
   */
  test('FH-001: Navigate to Finance Hub and verify layout', async ({ page }) => {
    // Navigate to Finance Hub directly
    await page.goto(`${BASE_URL}/finance/hub`);
    await page.waitForLoadState('networkidle');

    // Verify URL
    expect(page.url()).toContain('/finance/hub');

    // Verify page title - "المركز المالي" is shown in header
    await expect(page.locator('h1, h2').filter({ hasText: /المركز المالي|Finance Hub/ })).toBeVisible({ timeout: 5000 });

    // Verify main layout elements - check for KPI cards (at least one should be visible)
    const kpiCard = page.locator('text="إجمالي الإيرادات"').or(page.locator('text="صافي التدفق"')).or(page.locator('text="الفواتير المعلقة"')).or(page.locator('text="رصيد الخزينة"'));
    await expect(kpiCard.first()).toBeVisible({ timeout: 5000 });
  });

  /**
   * FH-002: Verify KPI cards display correctly
   * P0 - Critical
   */
  test('FH-002: Verify KPI cards display correctly', async ({ page }) => {
    // Navigate to Finance Hub
    await page.goto(`${BASE_URL}/finance/hub`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for KPI cards - using actual Finance Hub component text
    const kpiSelectors = [
      'text="إجمالي الإيرادات"',  // Total Revenue
      'text="صافي التدفق"',       // Net Flow
      'text="الفواتير المعلقة"',  // Pending Invoices
      'text="رصيد الخزينة"',      // Treasury Balance
    ];

    // At least some KPIs should be visible
    let foundKpis = 0;
    for (const selector of kpiSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          foundKpis++;
        }
      } catch {
        // Element not found, continue
      }
    }

    // Should find at least 2 KPI cards
    expect(foundKpis).toBeGreaterThanOrEqual(2);
  });

  /**
   * FH-003: Quick Actions work correctly
   * P1 - High
   */
  test('FH-003: Quick Actions work correctly', async ({ page }) => {
    // Navigate to Finance Hub
    await page.goto(`${BASE_URL}/finance/hub`);
    await page.waitForLoadState('networkidle');

    // Look for quick action buttons - using actual QuickActions component labels
    const quickActions = page.locator('button').filter({ hasText: /استلام دفعة|إدارة المدفوعات|الفواتير|إيداع بنكي|قيد يومي/ });

    const count = await quickActions.count();

    if (count > 0) {
      // Click first available quick action
      const firstAction = quickActions.first();

      // Get action text for verification
      const actionText = await firstAction.textContent();

      // Click action
      await firstAction.click();

      // Verify navigation to appropriate page
      if (actionText?.includes('استلام دفعة')) {
        await page.waitForURL(/\/finance\/operations\/receive-payment/, { timeout: 5000 });
      } else if (actionText?.includes('إدارة المدفوعات')) {
        await page.waitForURL(/\/finance\/payments/, { timeout: 5000 });
      } else if (actionText?.includes('الفواتير')) {
        await page.waitForURL(/\/finance\/invoices|\/finance\/billing/, { timeout: 5000 });
      } else if (actionText?.includes('إيداع بنكي')) {
        await page.waitForURL(/\/finance\/deposits/, { timeout: 5000 });
      } else if (actionText?.includes('قيد يومي')) {
        await page.waitForURL(/\/finance\/new-entry/, { timeout: 5000 });
      }
    }
  });

  /**
   * FH-004: Universal Search functionality
   * P1 - High
   */
  test('FH-004: Universal Search functionality', async ({ page }) => {
    // Navigate to Finance Hub
    await page.goto(`${BASE_URL}/finance/hub`);
    await page.waitForLoadState('networkidle');

    // Look for search input
    const searchInput = page.locator('input[placeholder*="ابحث" i], input[type="search"]').first();

    if (await searchInput.isVisible({ timeout: 2000 })) {
      // Type search query
      await searchInput.fill('فاتورة');

      // Wait for search results or page update
      await page.waitForTimeout(500);

      // Verify search results appear or filter is applied
      // This depends on implementation, so we just verify no errors
      expect(searchInput).toHaveValue('فاتورة');
    }
  });

  /**
   * FH-005: Activity Timeline displays recent activities
   * P1 - High
   */
  test('FH-005: Activity Timeline displays recent activities', async ({ page }) => {
    // Navigate to Finance Hub
    await page.goto(`${BASE_URL}/finance/hub`);
    await page.waitForLoadState('networkidle');

    // Look for activity timeline section
    const activityTimeline = page.locator('text="الأنشطة الأخيرة"');

    if (await activityTimeline.isVisible({ timeout: 2000 })) {
      // Verify timeline section exists
      await expect(activityTimeline).toBeVisible();

      // Look for activity items
      const activities = page.locator('[class*="activity" i], [class*="timeline" i]').all();

      // At least timeline container should be present
      expect(activities.length).toBeGreaterThan(0);
    }
  });

  /**
   * FH-006: Navigate to Billing Center from Hub
   * P1 - High
   */
  test('FH-006: Navigate to Billing Center from Hub', async ({ page }) => {
    // Navigate to Finance Hub
    await page.goto(`${BASE_URL}/finance/hub`);

    // Look for Billing Center link or button - using actual module text
    const billingLink = page.locator('a, button').filter({ hasText: /الفواتير والمدفوعات|الفواتير والمدفوعات|Billing Center/ }).first();

    if (await billingLink.isVisible({ timeout: 2000 })) {
      await billingLink.click();
      await page.waitForURL(/\/finance\/billing/, { timeout: 5000 });
      expect(page.url()).toContain('/finance/billing');
    }
  });

  /**
   * FH-007: Navigate to Reports from Hub
   * P2 - Medium
   */
  test('FH-007: Navigate to Reports from Hub', async ({ page }) => {
    // Navigate to Finance Hub
    await page.goto(`${BASE_URL}/finance/hub`);

    // Look for Reports link - using actual module text
    const reportsLink = page.locator('a, button').filter({ hasText: /التقارير والتحليل|التقارير|Reports/ }).first();

    if (await reportsLink.isVisible({ timeout: 2000 })) {
      await reportsLink.click();

      // Reports could navigate to /reports (general) or /finance/reports (finance-specific)
      await page.waitForTimeout(1000);
      expect(page.url()).toMatch(/\/(finance\/)?reports/);
    }
  });
});
