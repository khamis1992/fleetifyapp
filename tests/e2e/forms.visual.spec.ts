/**
 * Visual Regression Tests for Forms
 * Ensures all form components render correctly across different states
 */

import { test, expect } from '@playwright/test';

test.describe('Forms Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('login form layout', async ({ page }) => {
    // Test initial state
    await expect(page).toHaveScreenshot('login-form-initial.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Test form with filled data
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await expect(page).toHaveScreenshot('login-form-filled.png');

    // Test validation errors
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500); // Allow validation to show
    await expect(page).toHaveScreenshot('login-form-validation.png');
  });

  test('form field variations', async ({ page }) => {
    // Navigate to a page with various form fields
    await page.goto('/contracts/new');
    await page.waitForLoadState('networkidle');

    // Test input fields
    const textInputs = page.locator('input[type="text"], input[type="number"], input[type="date"]');
    for (let i = 0; i < Math.min(3, await textInputs.count()); i++) {
      const input = textInputs.nth(i);
      await input.fill('Test value');
      await expect(input).toHaveScreenshot(`text-input-${i}.png`);
    }

    // Test select fields
    const selects = page.locator('select, [role="combobox"]');
    for (let i = 0; i < Math.min(2, await selects.count()); i++) {
      const select = selects.nth(i);
      await select.click();
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot(`select-open-${i}.png`, {
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
    }

    // Test textarea
    const textarea = page.locator('textarea');
    if (await textarea.count() > 0) {
      await textarea.first().fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.');
      await expect(textarea.first()).toHaveScreenshot('textarea-filled.png');
    }
  });

  test('form validation states', async ({ page }) => {
    await page.goto('/contracts/new');
    await page.waitForLoadState('networkidle');

    // Test required field validation
    const requiredFields = page.locator('[required]');
    if (await requiredFields.count() > 0) {
      const firstRequired = requiredFields.first();
      await firstRequired.focus();
      await firstRequired.blur(); // Trigger validation
      await expect(page).toHaveScreenshot('validation-required.png');
    }

    // Test error state
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      await emailInput.first().fill('invalid-email');
      await page.click('body'); // Blur to trigger validation
      await expect(page).toHaveScreenshot('validation-error.png');
    }
  });

  test('form loading state', async ({ page }) => {
    await page.goto('/login');

    // Intercept form submission
    await page.route('**/api/auth/login', (route) => {
      // Don't respond to show loading state
      setTimeout(() => route.abort(), 5000);
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Capture loading state
    await expect(page.locator('button[type="submit"]')).toHaveAttribute('disabled');
    await expect(page).toHaveScreenshot('form-loading.png');
  });

  test('form success state', async ({ page }) => {
    // Mock successful submission
    await page.route('**/api/auth/login', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user: { id: '1', email: 'test@example.com' } }),
      });
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for success state
    await page.waitForURL('/dashboard');
    await expect(page).toHaveScreenshot('form-success-redirect.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('multi-step form', async ({ page }) => {
    // Test if there's a multi-step form
    await page.goto('/contracts/new');
    await page.waitForLoadState('networkidle');

    // Look for step indicators
    const stepIndicators = page.locator('[data-testid="step-indicator"]');
    if (await stepIndicators.count() > 0) {
      // Test each step
      const steps = await stepIndicators.count();
      for (let i = 0; i < steps; i++) {
        const step = stepIndicators.nth(i);
        await expect(step).toHaveScreenshot(`step-${i + 1}.png`);

        // Move to next step if button exists
        const nextBtn = page.locator('button:has-text("التالي"), button:has-text("Next")');
        if (await nextBtn.isVisible() && i < steps - 1) {
          await nextBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('form accessibility focus states', async ({ page }) => {
    await page.goto('/login');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page).toHaveScreenshot('form-focus-1.png');

    await page.keyboard.press('Tab');
    await expect(page).toHaveScreenshot('form-focus-2.png');

    await page.keyboard.press('Tab');
    await expect(page).toHaveScreenshot('form-focus-3.png');
  });

  test('form tooltips and help text', async ({ page }) => {
    await page.goto('/contracts/new');
    await page.waitForLoadState('networkidle');

    // Look for help icons or tooltips
    const helpIcons = page.locator('[data-testid="help-icon"], [title], [aria-label*="help"]');
    for (let i = 0; i < Math.min(3, await helpIcons.count()); i++) {
      const helpIcon = helpIcons.nth(i);
      await helpIcon.hover();
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot(`tooltip-${i}.png`, {
        animations: 'disabled',
      });
      await page.mouse.move(0, 0); // Move away to hide tooltip
    }
  });

  test('form responsive layout', async ({ page }) => {
    await page.goto('/contracts/new');

    // Mobile view
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('form-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('form-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('form-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('form dark mode', async ({ page }) => {
    // Enable dark mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
    });

    await page.goto('/login');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('form-dark-mode.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});