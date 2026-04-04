const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // Login on localhost
  await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passInput = page.locator('input[type="password"]').first();
  await emailInput.fill('khamis-1992@hotmail.com');
  await passInput.fill('123456789');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(6000);
  
  console.log('Logged in:', page.url());
  
  // Test Quick Payment page specifically
  await page.goto('http://localhost:8080/finance/payments/quick', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(4000);
  
  console.log('\n=== Quick Payment Page - Clicking EVERY button ===\n');
  
  const buttons = await page.locator('button:visible').all();
  console.log(`Found ${buttons.length} visible buttons\n`);
  
  let tested = 0;
  for (const btn of buttons) {
    const text = (await btn.innerText().catch(() => '')).trim();
    const disabled = await btn.isDisabled().catch(() => false);
    const type = await btn.getAttribute('type');
    
    if (!text) continue;
    
    console.log(`Button: "${text.substring(0, 60)}" ${disabled ? '[DISABLED]' : ''} ${type === 'submit' ? '[SUBMIT]' : ''}`);
    
    if (disabled || type === 'submit') {
      console.log('  → Skipped');
      continue;
    }
    
    const urlBefore = page.url();
    const dialogBefore = await page.locator('[role="dialog"], [data-state="open"]').count();
    const toastBefore = await page.locator('[data-sonner-toast], [role="status"]').count();
    
    try {
      await btn.click({ timeout: 2000 });
      await page.waitForTimeout(1200);
    } catch(e) {
      console.log(`  → Click failed: ${e.message.substring(0, 60)}`);
      continue;
    }
    
    const urlAfter = page.url();
    const dialogAfter = await page.locator('[role="dialog"], [data-state="open"]').count();
    const toastAfter = await page.locator('[data-sonner-toast], [role="status"]').count();
    
    let action = [];
    if (urlBefore !== urlAfter) action.push(`NAV → ${urlAfter}`);
    if (dialogAfter > dialogBefore) action.push('DIALOG OPENED');
    if (toastAfter > toastBefore) action.push('TOAST SHOWN');
    
    // Check for tab change (internal state)
    const isTab = await btn.evaluate(el => el.getAttribute('role') === 'tab' || el.parentElement?.getAttribute('role') === 'tablist').catch(() => false);
    if (isTab) action.push('TAB CHANGE');
    
    if (action.length === 0) {
      // Check if it's a password toggle or similar input toggle
      const isInputToggle = await btn.evaluate(el => {
        const label = (el.getAttribute('aria-label') || '') + (el.innerText || '');
        return label.includes('كلمة المرور') || label.includes('password');
      }).catch(() => false);
      if (isInputToggle) action.push('INPUT TOGGLE');
      else action.push('⚠️ NO VISIBLE ACTION');
    }
    
    console.log(`  → ${action.join(', ')}`);
    
    // Cleanup: close dialogs, go back if navigated
    if (dialogAfter > dialogBefore) {
      const closeBtn = page.locator('[aria-label="Close"], button:has-text("إلغاء"), button:has-text("Cancel"), button:has-text("حفظ"), button:has-text("إغلاق")').first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click().catch(() => {});
        await page.waitForTimeout(500);
      } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }
    
    if (urlAfter !== urlBefore && !urlAfter.includes('/finance/payments/quick')) {
      await page.goto('http://localhost:8080/finance/payments/quick', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
    }
    
    tested++;
  }
  
  console.log(`\n=== Summary: ${tested} buttons tested ===`);
  
  // Also test all sidebar links
  console.log('\n=== Sidebar Links ===\n');
  const sidebarLinks = await page.locator('nav a[href]:visible').all();
  for (const link of sidebarLinks) {
    const href = await link.getAttribute('href');
    const text = (await link.innerText().catch(() => '')).trim();
    if (!href || href === '#' || !text) continue;
    console.log(`Link: "${text.substring(0, 40)}" → ${href}`);
  }
  
  await browser.close();
}

main().catch(console.error);
