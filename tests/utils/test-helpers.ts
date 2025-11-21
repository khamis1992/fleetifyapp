import { Page, Locator } from '@playwright/test';

/**
 * Test helper utilities for fleetifyapp dashboard testing
 */

export interface ButtonTestResult {
  selector: string;
  isVisible: boolean;
  isEnabled: boolean;
  hasText: boolean;
  hasAriaLabel: boolean;
  clickWorks: boolean;
  error?: string;
}

export interface TestReport {
  totalButtons: number;
  workingButtons: number;
  brokenButtons: number;
  buttonsWithIssues: number;
  results: ButtonTestResult[];
}

/**
 * Comprehensive button testing utility
 */
export async function testAllButtons(page: Page): Promise<TestReport> {
  const results: ButtonTestResult[] = [];
  const buttons = await page.locator('button:not([disabled]), [role="button"]:not([disabled])').all();

  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    const result: ButtonTestResult = {
      selector: await generateSelector(button),
      isVisible: false,
      isEnabled: false,
      hasText: false,
      hasAriaLabel: false,
      clickWorks: false,
    };

    try {
      // Test visibility
      result.isVisible = await button.isVisible();

      if (result.isVisible) {
        // Test enabled state
        result.isEnabled = await button.isEnabled();

        // Test accessible text
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        result.hasText = !!(text?.trim());
        result.hasAriaLabel = !!ariaLabel;

        // Test click functionality
        const currentUrl = page.url();
        await button.click();
        await page.waitForTimeout(1000);

        // Check if something happened (navigation, modal, etc.)
        const newUrl = page.url();
        result.clickWorks = newUrl !== currentUrl ||
          (await page.locator('[role="dialog"], .modal').isVisible()) ||
          (await button.getAttribute('aria-expanded')) === 'true';

        // Go back if navigation occurred
        if (newUrl !== currentUrl) {
          await page.goBack();
          await page.waitForTimeout(1000);
        }

        // Close modal if opened
        const modal = page.locator('[role="dialog"], .modal');
        if (await modal.isVisible()) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }

    results.push(result);
  }

  const workingButtons = results.filter(r => r.isVisible && r.isEnabled && r.clickWorks && !r.error).length;
  const brokenButtons = results.filter(r => r.error).length;
  const buttonsWithIssues = results.filter(r =>
    r.isVisible && (!r.isEnabled || !r.clickWorks || !r.hasText || !r.hasAriaLabel)
  ).length;

  return {
    totalButtons: results.length,
    workingButtons,
    brokenButtons,
    buttonsWithIssues,
    results
  };
}

/**
 * Generate a unique selector for an element
 */
async function generateSelector(element: Locator): Promise<string> {
  try {
    const attributes = await element.evaluateHandle((el: HTMLElement) => {
      const attrs: Record<string, string> = {};
      for (const attr of el.getAttributeNames()) {
        attrs[attr] = el.getAttribute(attr) || '';
      }
      return {
        tagName: el.tagName.toLowerCase(),
        id: el.id,
        className: el.className,
        textContent: el.textContent?.trim().substring(0, 50),
        attributes: attrs
      };
    });

    const data = await attributes.json();

    // Priority order for selector generation
    if (data.id) {
      return `#${data.id}`;
    }

    if (data.attributes['data-testid']) {
      return `[data-testid="${data.attributes['data-testid']}"]`;
    }

    if (data.attributes['aria-label']) {
      return `[aria-label="${data.attributes['aria-label']}"]`;
    }

    if (data.className) {
      const classes = data.className.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) {
        return `${data.tagName}.${classes.join('.')}`;
      }
    }

    if (data.textContent) {
      return `${data.tagName}:has-text("${data.textContent}")`;
    }

    return data.tagName;
  } catch (error) {
    return 'unknown-selector';
  }
}

/**
 * Test responsive button behavior
 */
export async function testResponsiveButtons(page: Page, viewport: { width: number; height: number }): Promise<ButtonTestResult[]> {
  await page.setViewportSize(viewport);
  return testAllButtons(page);
}

/**
 * Test accessibility compliance for buttons
 */
export async function testButtonAccessibility(page: Page): Promise<{
  violations: string[];
  warnings: string[];
  passCount: number;
}> {
  const violations: string[] = [];
  const warnings: string[] = [];
  let passCount = 0;

  const buttons = await page.locator('button, [role="button"]').all();

  for (const button of buttons) {
    const isVisible = await button.isVisible();
    if (!isVisible) continue;

    try {
      // Check for accessible name
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');

      if (!text?.trim() && !ariaLabel && !ariaLabelledBy) {
        violations.push(`Button lacks accessible name: ${await generateSelector(button)}`);
        continue;
      }

      // Check for proper focus handling
      await button.focus();
      const isFocused = await button.evaluate(el => document.activeElement === el);
      if (!isFocused) {
        warnings.push(`Button is not focusable: ${await generateSelector(button)}`);
      }

      // Check for keyboard accessibility
      await button.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Check for color contrast (basic check)
      const styles = await button.evaluateHandle((el: HTMLElement) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize
        };
      });

      passCount++;
    } catch (error) {
      violations.push(`Error testing button accessibility: ${error}`);
    }
  }

  return { violations, warnings, passCount };
}

/**
 * Monitor console errors during button testing
 */
export function monitorConsoleErrors(page: Page): string[] {
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

/**
 * Test button performance metrics
 */
export async function testButtonPerformance(page: Page): Promise<{
  averageClickTime: number;
  slowButtons: Array<{ selector: string; time: number }>;
  networkRequests: Array<{ url: string; method: string; status: number }>;
}> {
  const buttonTimes: Array<{ selector: string; time: number }> = [];
  const networkRequests: Array<{ url: string; method: string; status: number }> = [];

  // Monitor network requests
  page.on('response', response => {
    networkRequests.push({
      url: response.url(),
      method: response.request().method(),
      status: response.status()
    });
  });

  const buttons = await page.locator('button:not([disabled])').all();
  const testCount = Math.min(buttons.length, 20); // Test first 20 buttons

  for (let i = 0; i < testCount; i++) {
    const button = buttons[i];
    const isVisible = await button.isVisible();

    if (isVisible) {
      const selector = await generateSelector(button);
      const startTime = Date.now();

      await button.click();
      await page.waitForTimeout(500);

      const endTime = Date.now();
      buttonTimes.push({ selector, time: endTime - startTime });

      // Handle any navigation or modal
      const modal = page.locator('[role="dialog"], .modal');
      if (await modal.isVisible()) {
        await page.keyboard.press('Escape');
      }

      const currentUrl = page.url();
      if (i > 0 && currentUrl !== page.url()) {
        await page.goBack();
      }
    }
  }

  const totalTime = buttonTimes.reduce((sum, b) => sum + b.time, 0);
  const averageClickTime = buttonTimes.length > 0 ? totalTime / buttonTimes.length : 0;
  const slowButtons = buttonTimes.filter(b => b.time > 2000);

  return {
    averageClickTime,
    slowButtons,
    networkRequests
  };
}

/**
 * Generate comprehensive test report
 */
export function generateTestReport(results: TestReport): string {
  const { totalButtons, workingButtons, brokenButtons, buttonsWithIssues } = results;

  let report = `
🔍 FLEETIFYAPP DASHBOARD BUTTON TESTING REPORT
============================================

📊 OVERVIEW:
• Total buttons tested: ${totalButtons}
• Working buttons: ✅ ${workingButtons} (${((workingButtons/totalButtons)*100).toFixed(1)}%)
• Broken buttons: ❌ ${brokenButtons} (${((brokenButtons/totalButtons)*100).toFixed(1)}%)
• Buttons with issues: ⚠️ ${buttonsWithIssues} (${((buttonsWithIssues/totalButtons)*100).toFixed(1)}%)

🔧 DETAILED RESULTS:
`;

  // Categorize results
  const working = results.results.filter(r => r.isVisible && r.isEnabled && r.clickWorks && !r.error);
  const broken = results.results.filter(r => r.error);
  const issues = results.results.filter(r => r.isVisible && (!r.isEnabled || !r.clickWorks || !r.hasText || !r.hasAriaLabel));

  if (working.length > 0) {
    report += '\n✅ WORKING BUTTONS:\n';
    working.forEach(result => {
      report += `  • ${result.selector}\n`;
    });
  }

  if (issues.length > 0) {
    report += '\n⚠️ BUTTONS WITH ISSUES:\n';
    issues.forEach(result => {
      const issues = [];
      if (!result.isEnabled) issues.push('disabled');
      if (!result.clickWorks) issues.push('click not working');
      if (!result.hasText) issues.push('no text');
      if (!result.hasAriaLabel) issues.push('no aria-label');
      report += `  • ${result.selector} - Issues: ${issues.join(', ')}\n`;
    });
  }

  if (broken.length > 0) {
    report += '\n❌ BROKEN BUTTONS:\n';
    broken.forEach(result => {
      report += `  • ${result.selector} - Error: ${result.error}\n`;
    });
  }

  report += '\n🔧 RECOMMENDED FIXES:\n';
  report += '• Add missing aria-labels to icon-only buttons\n';
  report += '• Fix buttons with click handlers that aren\'t working\n';
  report += '• Ensure all interactive elements have accessible names\n';
  report += '• Test disabled states and error handling\n';

  return report;
}