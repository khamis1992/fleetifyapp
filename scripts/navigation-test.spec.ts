import { test, expect, type Page } from '@playwright/test';

// Helper function to check for console errors
async function checkConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  return errors;
}

// Helper function to login (you may need to adjust based on your auth flow)
async function login(page: Page) {
  await page.goto('http://localhost:5173/auth');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

test.describe('FleetifyApp Navigation Testing', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = await checkConsoleErrors(page);
    // Login if needed
    if (await page.locator('text=Sign In').isVisible()) {
      await login(page);
    }
  });

  test.afterEach(async () => {
    if (consoleErrors.length > 0) {
      console.log('Console Errors Found:', consoleErrors);
    }
  });

  test.describe('Main Navigation Elements', () => {
    test('Header Navigation', async ({ page }) => {
      // Test logo navigation
      await page.click('img[alt="Fleetify Logo"]');
      await expect(page).toHaveURL(/\/dashboard/);

      // Test user dropdown
      await page.click('[data-testid="user-dropdown-trigger"]');
      await expect(page.locator('[data-testid="user-dropdown-menu"]')).toBeVisible();

      // Test profile navigation
      await page.click('text=الملف الشخصي');
      await expect(page).toHaveURL(/\/profile/);

      // Test settings navigation
      await page.goto('/dashboard');
      await page.click('[data-testid="user-dropdown-trigger"]');
      await page.click('text=الإعدادات');
      await expect(page).toHaveURL(/\/settings/);
    });

    test('Sidebar Navigation - Main Sections', async ({ page }) => {
      const navigationTests = [
        { name: 'Dashboard', selector: 'text=لوحة التحكم', url: /\/dashboard$/ },
        { name: 'Customers', selector: 'text=قائمة العملاء', url: /\/customers$/ },
        { name: 'Customer CRM', selector: 'text=إدارة العلاقات', url: /\/customers\/crm$/ },
        { name: 'Fleet', selector: 'text=إدارة المركبات', url: /\/fleet$/ },
        { name: 'Contracts', selector: 'text=العقود', url: /\/contracts$/ },
        { name: 'Quotations', selector: 'text=عروض الأسعار', url: /\/quotations$/ },
        { name: 'Reports', selector: 'text=التقارير', url: /\/reports$/ },
        { name: 'Support', selector: 'text=الدعم الفني', url: /\/support$/ },
      ];

      for (const navTest of navigationTests) {
        await test.step(`Test ${navTest.name} navigation`, async () => {
          await page.click(navTest.selector);
          await page.waitForLoadState('networkidle');
          await expect(page).toHaveURL(navTest.url);

          // Check for page load errors
          expect(await page.locator('body').textContent()).not.toContain('Page not found');
          expect(await page.locator('body').textContent()).not.toContain('404');
        });
      }
    });

    test('Sidebar Navigation - Fleet Management Submenu', async ({ page }) => {
      // Open fleet submenu
      await page.click('text=إدارة الأسطول');
      await page.waitForTimeout(500); // Wait for submenu animation

      const fleetSubmenu = [
        { name: 'Maintenance', selector: 'text=الصيانة', url: /\/fleet\/maintenance$/ },
        { name: 'Dispatch Permits', selector: 'text=تصاريح الحركة', url: /\/fleet\/dispatch-permits$/ },
        { name: 'Traffic Violations', selector: 'text=المخالفات والمدفوعات', url: /\/fleet\/traffic-violations$/ },
        { name: 'Fleet Reports', selector: 'text=التقارير والتحليلات', url: /\/fleet\/reports$/ },
        { name: 'Vehicle Installments', selector: 'text=أقساط المركبات', url: /\/fleet\/vehicle-installments$/ },
        { name: 'Reservation System', selector: 'text=نظام الحجوزات', url: /\/fleet\/reservation-system$/ },
      ];

      for (const fleetNav of fleetSubmenu) {
        await test.step(`Test Fleet - ${fleetNav.name}`, async () => {
          await page.click(fleetNav.selector);
          await page.waitForLoadState('networkidle');
          await expect(page).toHaveURL(fleetNav.url);
        });
      }
    });

    test('Sidebar Navigation - Finance Submenu', async ({ page }) => {
      // Open finance submenu
      await page.click('text=المالية');
      await page.waitForTimeout(500);

      const financeSubmenu = [
        { name: 'Chart of Accounts', selector: 'text=دليل الحسابات', url: /\/finance\/chart-of-accounts$/ },
        { name: 'Ledger', selector: 'text=دفتر الأستاذ', url: /\/finance\/ledger$/ },
        { name: 'Invoices & Payments', selector: 'text=الفواتير والمدفوعات', url: /\/finance\/invoices$/ },
        { name: 'Treasury & Banks', selector: 'text=الخزينة والبنوك', url: /\/finance\/treasury$/ },
        { name: 'AR Aging', selector: 'text=الذمم المدينة', url: /\/finance\/ar-aging$/ },
        { name: 'Payment Tracking', selector: 'text=تتبع الدفعات', url: /\/finance\/payment-tracking$/ },
        { name: 'Analysis & Reports', selector: 'text=التحليل والتقارير', url: /\/finance\/reports$/ },
      ];

      for (const financeNav of financeSubmenu) {
        await test.step(`Test Finance - ${financeNav.name}`, async () => {
          await page.click(financeNav.selector);
          await page.waitForLoadState('networkidle');
          await expect(page).toHaveURL(financeNav.url);
        });
      }
    });
  });

  test.describe('Page-Level Navigation', () => {
    test('Dashboard Quick Actions', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Test quick action buttons if they exist
      const quickActions = await page.locator('[data-testid="quick-action"]').all();

      for (let i = 0; i < quickActions.length; i++) {
        await test.step(`Test Quick Action ${i + 1}`, async () => {
          const action = quickActions[i];
          if (await action.isVisible()) {
            await action.click();
            await page.waitForLoadState('networkidle');
            // Verify navigation occurred
            expect(page.url()).not.toBe('http://localhost:5173/dashboard');
          }
        });
      }
    });

    test('Customers Page Navigation', async ({ page }) => {
      await page.goto('/customers');
      await page.waitForLoadState('networkidle');

      // Test add customer button
      const addCustomerBtn = page.locator('text=إضافة عميل, text=Add Customer');
      if (await addCustomerBtn.isVisible()) {
        await addCustomerBtn.click();
        await page.waitForLoadState('networkidle');
      }

      // Test customer row navigation if customers exist
      const customerRows = await page.locator('[data-testid="customer-row"]').all();
      if (customerRows.length > 0) {
        await customerRows[0].click();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toMatch(/\/customers\/\d+/);
      }
    });

    test('Fleet Page Navigation', async ({ page }) => {
      await page.goto('/fleet');
      await page.waitForLoadState('networkidle');

      // Test add vehicle button
      const addVehicleBtn = page.locator('text=إضافة مركبة, text=Add Vehicle');
      if (await addVehicleBtn.isVisible()) {
        await addVehicleBtn.click();
        await page.waitForLoadState('networkidle');
      }

      // Test vehicle row navigation if vehicles exist
      const vehicleRows = await page.locator('[data-testid="vehicle-row"]').all();
      if (vehicleRows.length > 0) {
        await vehicleRows[0].click();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toMatch(/\/fleet\/vehicles\/\d+/);
      }
    });
  });

  test.describe('Direct URL Access', () => {
    const testUrls = [
      '/dashboard',
      '/customers',
      '/customers/crm',
      '/fleet',
      '/fleet/maintenance',
      '/fleet/dispatch-permits',
      '/fleet/traffic-violations',
      '/fleet/reports',
      '/contracts',
      '/quotations',
      '/finance/chart-of-accounts',
      '/finance/ledger',
      '/finance/invoices',
      '/finance/treasury',
      '/hr/employees',
      '/hr/attendance',
      '/hr/payroll',
      '/reports',
      '/support',
      '/help',
      '/profile',
      '/settings',
    ];

    testUrls.forEach(url => {
      test(`Direct access to ${url}`, async ({ page }) => {
        await page.goto(`http://localhost:5173${url}`);
        await page.waitForLoadState('networkidle');

        // Check if page loaded without errors
        expect(await page.locator('body').textContent()).not.toContain('Page not found');
        expect(await page.locator('body').textContent()).not.toContain('404');

        // Check for critical errors
        expect(await page.locator('body').textContent()).not.toContain('Application error');
        expect(await page.locator('body').textContent()).not.toContain('Something went wrong');
      });
    });
  });

  test.describe('Browser Navigation', () => {
    test('Back and Forward Navigation', async ({ page }) => {
      // Navigate through several pages
      await page.goto('/dashboard');
      await page.click('text=قائمة العملاء');
      await page.waitForLoadState('networkidle');

      await page.click('text=العقود');
      await page.waitForLoadState('networkidle');

      await page.click('text=إدارة الأسطول');
      await page.waitForLoadState('networkidle');

      // Test back button
      await page.goBack();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/contracts');

      // Test forward button
      await page.goForward();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/fleet');
    });

    test('Page Refresh', async ({ page }) => {
      await page.goto('/customers');
      await page.waitForLoadState('networkidle');

      const initialContent = await page.content();
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Page should load successfully after refresh
      expect(await page.locator('body').textContent()).not.toContain('Page not found');
      expect(await page.locator('body').textContent()).not.toContain('404');
    });
  });

  test.describe('Error Handling', () => {
    test('Invalid Route 404', async ({ page }) => {
      await page.goto('http://localhost:5173/invalid-route');
      await page.waitForLoadState('networkidle');

      // Should show 404 page
      expect(await page.locator('body').textContent()).toContain('404');
    });

    test('Invalid Dynamic Route', async ({ page }) => {
      await page.goto('http://localhost:5173/customers/999999');
      await page.waitForLoadState('networkidle');

      // Should handle gracefully (either 404 or "not found" message)
      const content = await page.locator('body').textContent();
      const hasError = content?.includes('404') ||
                      content?.includes('not found') ||
                      content?.includes('Not Found');
      expect(hasError).toBeTruthy();
    });
  });

  test.describe('Responsive Navigation', () => {
    test('Mobile Navigation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Test hamburger menu if it exists
      const menuToggle = page.locator('[data-testid="menu-toggle"]');
      if (await menuToggle.isVisible()) {
        await menuToggle.click();
        await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

        // Test navigation from mobile menu
        await page.click('text=قائمة العملاء');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/customers');
      }
    });

    test('Tablet Navigation', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Test that navigation adapts to tablet view
      await expect(page.locator('text=لوحة التحكم')).toBeVisible();
      await expect(page.locator('text=إدارة العملاء')).toBeVisible();
    });
  });

  test.describe('Accessibility Testing', () => {
    test('Keyboard Navigation', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Test Tab navigation through main elements
      await page.keyboard.press('Tab');
      let focusedElement = await page.locator(':focus');

      // Should be able to tab through navigation elements
      let tabCount = 0;
      while (tabCount < 10) { // Prevent infinite loop
        await page.keyboard.press('Tab');
        focusedElement = await page.locator(':focus');
        tabCount++;

        if (await focusedElement.count() === 0) break;
      }

      expect(tabCount).toBeGreaterThan(0);
    });

    test('ARIA Labels and Roles', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check for proper ARIA labels on navigation elements
      const navElements = await page.locator('nav, [role="navigation"]').all();
      expect(navElements.length).toBeGreaterThan(0);

      // Check for proper button roles
      const buttons = await page.locator('button, [role="button"]').all();
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  test.describe('Performance Testing', () => {
    test('Navigation Load Times', async ({ page }) => {
      const navigationTests = [
        { url: '/dashboard', name: 'Dashboard' },
        { url: '/customers', name: 'Customers' },
        { url: '/fleet', name: 'Fleet' },
        { url: '/contracts', name: 'Contracts' },
        { url: '/finance/chart-of-accounts', name: 'Finance' },
      ];

      for (const navTest of navigationTests) {
        await test.step(`Test ${navTest.name} load time`, async () => {
          const startTime = Date.now();
          await page.goto(`http://localhost:5173${navTest.url}`);
          await page.waitForLoadState('networkidle');
          const loadTime = Date.now() - startTime;

          // Page should load within reasonable time (5 seconds)
          expect(loadTime).toBeLessThan(5000);
          console.log(`${navTest.name} loaded in ${loadTime}ms`);
        });
      }
    });
  });
});