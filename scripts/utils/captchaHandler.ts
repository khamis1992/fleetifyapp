/**
 * CAPTCHA Handler Utility
 * Detects and handles CAPTCHAs during automation
 */

import { Page } from 'playwright';

export interface CaptchaDetectionResult {
  detected: boolean;
  type?: 'image' | 'checkbox' | 'puzzle' | 'unknown';
  element?: string;
  screenshotPath?: string;
}

/**
 * Detect if CAPTCHA is present on the page
 */
export async function detectCaptcha(page: Page): Promise<CaptchaDetectionResult> {
  // Common CAPTCHA selectors (Qatar court system and general)
  const captchaSelectors = [
    // Google reCAPTCHA v2
    'iframe[src*="recaptcha"]',
    'div.g-recaptcha',
    '.g-recaptcha',

    // hCaptcha
    'iframe[src*="hcaptcha"]',
    '.h-captcha',

    // Image CAPTCHA
    'img[src*="captcha"]',
    'img[alt*="captcha" i]',
    '.captcha-image',
    '#captcha',

    // Custom CAPTCHA elements
    '[class*="captcha" i]',
    '[id*="captcha" i]',

    // Checkbox "I'm not a robot"
    '.recaptcha-checkbox',
    '[aria-label="I am not a robot"]'
  ];

  for (const selector of captchaSelectors) {
    try {
      const element = await page.locator(selector).first();

      if (await element.count() > 0) {
        // Determine CAPTCHA type
        let type: CaptchaDetectionResult['type'] = 'unknown';

        if (selector.includes('recaptcha') || selector.includes('checkbox')) {
          type = 'checkbox';
        } else if (selector.includes('img') || selector.includes('image')) {
          type = 'image';
        } else if (selector.includes('hcaptcha')) {
          type = 'puzzle';
        }

        return {
          detected: true,
          type,
          element: selector
        };
      }
    } catch (error) {
      // Selector not found, continue to next
      continue;
    }
  }

  // Check for text that indicates CAPTCHA
  const bodyText = await page.textContent('body');
  if (bodyText) {
    const captchaKeywords = [
      'captcha',
      'كلمة التحقق',
      'رمز التحقق',
      'أنا لست روبوت',
      'prove you are human'
    ];

    for (const keyword of captchaKeywords) {
      if (bodyText.toLowerCase().includes(keyword)) {
        return {
          detected: true,
          type: 'unknown',
          element: 'body'
        };
      }
    }
  }

  return { detected: false };
}

/**
 * Handle CAPTCHA by pausing and waiting for user
 */
export async function handleCaptcha(
  page: Page,
  screenshotPath?: string
): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('⚠️  CAPTCHA DETECTED');
  console.log('='.repeat(80));
  console.log('Please solve the CAPTCHA in the browser window.');
  console.log('The automation will resume automatically after the CAPTCHA is solved.');
  console.log('='.repeat(80) + '\n');

  // Take screenshot for reference
  if (screenshotPath) {
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${screenshotPath}`);
  }

  // Wait for navigation or page changes that indicate CAPTCHA was solved
  // This is a simple implementation - can be enhanced with more sophisticated detection

  console.log('Waiting for CAPTCHA to be solved...');

  // Wait up to 5 minutes for user to solve CAPTCHA
  const maxWaitTime = 5 * 60 * 1000; // 5 minutes
  const checkInterval = 2000; // Check every 2 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    await page.waitForTimeout(checkInterval);

    // Check if CAPTCHA is still present
    const detection = await detectCaptcha(page);

    if (!detection.detected) {
      console.log('✓ CAPTCHA solved! Resuming automation...\n');
      await page.waitForTimeout(2000); // Give page time to load
      return;
    }

    // Check for page navigation (sign of successful CAPTCHA solve)
    const currentUrl = page.url();
    await page.waitForTimeout(checkInterval);

    if (page.url() !== currentUrl) {
      console.log('✓ Page navigated! CAPTCHA likely solved. Resuming automation...\n');
      await page.waitForTimeout(2000);
      return;
    }
  }

  throw new Error('CAPTCHA not solved within timeout period (5 minutes)');
}

/**
 * Check for CAPTCHA before proceeding with step
 */
export async function checkAndHandleCaptcha(
  page: Page,
  stepDescription: string,
  screenshotPath?: string
): Promise<boolean> {
  const detection = await detectCaptcha(page);

  if (detection.detected) {
    console.log(`\n⚠️  CAPTCHA detected before: ${stepDescription}`);
    await handleCaptcha(page, screenshotPath);
    return true;
  }

  return false;
}

/**
 * Wait for user to manually solve "I'm not a robot" checkbox
 */
export async function handleRecaptchaCheckbox(page: Page): Promise<void> {
  const checkboxSelector = '.recaptcha-checkbox, [aria-label="I am not a robot"]';

  try {
    const checkbox = page.locator(checkboxSelector).first();

    if (await checkbox.count() > 0) {
      console.log('\n⚠️  "I am not a robot" checkbox detected');
      console.log('Please click the checkbox in the browser...');

      // Wait for user to click (timeout after 2 minutes)
      await page.waitForTimeout(10000);

      // Check if checkbox is still there (user might have clicked)
      const stillPresent = await checkbox.count() > 0;

      if (stillPresent) {
        console.log('Waiting for checkbox interaction...');
        // Give user more time
        await page.waitForTimeout(50000);
      }

      console.log('✓ Proceeding...\n');
    }
  } catch (error) {
    // Checkbox not found or error, continue
    console.log('Note: Could not verify checkbox status, continuing...');
  }
}

/**
 * Take screenshot if CAPTCHA is detected during error
 */
export async function captureCaptchaScreenshot(
  page: Page,
  stepNumber: number,
  customerName: string
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `logs/screenshots/${customerName}/captcha-step-${stepNumber}-${timestamp}.png`;

  await page.screenshot({
    path,
    fullPage: true
  });

  return path;
}

export default {
  detectCaptcha,
  handleCaptcha,
  checkAndHandleCaptcha,
  handleRecaptchaCheckbox,
  captureCaptchaScreenshot
};
