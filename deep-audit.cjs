const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({ type: msg.type(), text: msg.text(), url: page.url() });
    }
  });
  page.on('pageerror', err => {
    errors.push({ type: 'pageerror', text: err.message, url: page.url() });
  });
  
  // Login
  await page.goto('https://www.alaraf.online/auth', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passInput = page.locator('input[type="password"]').first();
  
  if (await emailInput.count() > 0) {
    await emailInput.fill('khamis-1992@hotmail.com');
    await passInput.fill('123456789');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(8000);
  }
  
  console.log('After login URL:', page.url());
  
  // Navigate to a page and capture errors
  await page.goto('https://www.alaraf.online/finance/overview', { waitUntil: 'networkidle', timeout: 25000 });
  await page.waitForTimeout(5000);
  
  console.log('\nConsole errors on Finance Overview:');
  const uniqueErrors = [...new Set(errors.map(e => e.text))];
  uniqueErrors.forEach(e => console.log('  -', e.substring(0, 200)));
  
  // Also click a few buttons to see what happens
  console.log('\nClicking buttons...');
  const buttons = await page.locator('button:visible').all();
  let clicked = 0;
  for (const btn of buttons) {
    const text = (await btn.innerText().catch(() => '')).trim();
    if (!text || text.length > 50 || await btn.isDisabled().catch(() => false)) continue;
    const type = await btn.getAttribute('type');
    if (type === 'submit') continue;
    
    const isTab = await btn.evaluate(el => el.getAttribute('role') === 'tab' || el.parentElement?.getAttribute('role') === 'tablist').catch(() => false);
    if (isTab) continue;
    
    console.log(`  Clicking: "${text.substring(0, 40)}"`);
    
    const urlBefore = page.url();
    const dialogBefore = await page.locator('[role="dialog"]').count();
    
    try {
      await btn.click({ timeout: 2000 });
      await page.waitForTimeout(1000);
    } catch(e) { continue; }
    
    const urlAfter = page.url();
    const dialogAfter = await page.locator('[role="dialog"]').count();
    const toast = await page.locator('[data-sonner-toast]').count();
    
    if (urlBefore !== urlAfter) console.log(`    → Navigated to: ${urlAfter}`);
    else if (dialogAfter > dialogBefore) console.log(`    → Dialog opened`);
    else if (toast > 0) console.log(`    → Toast shown`);
    else console.log(`    → No visible action`);
    
    // Close dialog if opened
    if (dialogAfter > dialogBefore) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    if (urlAfter !== urlBefore) {
      await page.goto('https://www.alaraf.online/finance/overview', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
    }
    
    clicked++;
    if (clicked >= 15) break; // Test max 15 buttons per page
  }
  
  // Test Quick Payment specifically
  console.log('\n\n=== Testing Quick Payment page ===');
  errors.length = 0;
  await page.goto('https://www.alaraf.online/finance/payments/quick', { waitUntil: 'networkidle', timeout: 25000 });
  await page.waitForTimeout(5000);
  
  console.log('URL:', page.url());
  
  const qpButtons = await page.locator('button:visible').all();
  let qpClicked = 0;
  for (const btn of qpButtons) {
    const text = (await btn.innerText().catch(() => '')).trim();
    if (!text || text.length > 50 || await btn.isDisabled().catch(() => false)) continue;
    const type = await btn.getAttribute('type');
    if (type === 'submit') continue;
    const isTab = await btn.evaluate(el => el.getAttribute('role') === 'tab' || el.parentElement?.getAttribute('role') === 'tablist').catch(() => false);
    if (isTab) continue;
    
    const urlBefore = page.url();
    const dialogBefore = await page.locator('[role="dialog"]').count();
    
    try {
      await btn.click({ timeout: 2000 });
      await page.waitForTimeout(1000);
    } catch(e) { continue; }
    
    const urlAfter = page.url();
    const dialogAfter = await page.locator('[role="dialog"]').count();
    const toast = await page.locator('[data-sonner-toast]').count();
    
    const action = urlBefore !== urlAfter ? 'NAV' : dialogAfter > dialogBefore ? 'DIALOG' : toast > 0 ? 'TOAST' : 'NONE';
    console.log(`  [${action}] "${text.substring(0, 40)}"`);
    
    if (dialogAfter > dialogBefore) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    if (urlAfter !== urlBefore) {
      await page.goto('https://www.alaraf.online/finance/payments/quick', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
    }
    
    qpClicked++;
    if (qpClicked >= 15) break;
  }
  
  console.log('\nErrors on Quick Payment:', [...new Set(errors.map(e => e.text))].join('\n  '));
  
  await browser.close();
}

main().catch(console.error);
