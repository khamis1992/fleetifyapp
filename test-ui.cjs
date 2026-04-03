const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ 
    viewport: { width: 1440, height: 900 },
    locale: 'ar-SA'
  });
  const page = await context.newPage();
  
  const errors = [];
  const screenshots = [];
  
  async function checkPage(name, url) {
    try {
      console.log(`\n🔍 Checking: ${name} (${url})`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      
      // Check for React errors
      const errorOverlay = await page.$('[data-testid="error"]') || await page.$('.error-overlay');
      if (errorOverlay) {
        const errorText = await errorOverlay.textContent();
        errors.push(`${name}: ${errorText}`);
        console.log(`  ❌ ERROR: ${errorText}`);
      }
      
      // Check for console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!text.includes('favicon') && !text.includes('manifest') && !text.includes('hot')) {
            console.log(`  ⚠️ Console: ${text.substring(0, 120)}`);
          }
        }
      });
      
      // Check page loaded
      const bodyText = await page.textContent('body').catch(() => '');
      if (bodyText.includes('خطأ') || bodyText.includes('Error') || bodyText.includes('Something went wrong')) {
        errors.push(`${name}: Page shows error`);
        console.log(`  ❌ Page shows error`);
      }
      
      // Screenshot
      const safeName = name.replace(/[^a-zA-Z0-9]/g, '-');
      const screenshotPath = `/tmp/fleetifyapp/screenshots/${safeName}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      screenshots.push(screenshotPath);
      console.log(`  ✅ Screenshot saved: ${screenshotPath}`);
      
    } catch (e) {
      errors.push(`${name}: ${e.message}`);
      console.log(`  ❌ Failed: ${e.message.substring(0, 120)}`);
    }
  }

  console.log('=== Fleetify Finance UI Review ===');
  
  // Login
  try {
    console.log('\n🔐 Logging in...');
    await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Fill login form
    const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]') || await page.$('input[placeholder*="email" i]') || await page.$('input[placeholder*="بريد"]');
    const passwordInput = await page.$('input[type="password"]') || await page.$('input[name="password"]');
    
    if (emailInput && passwordInput) {
      await emailInput.fill('khamis-1992@hotmail.com');
      await passwordInput.fill('123456789');
      
      // Click login button
      const loginBtn = await page.$('button[type="submit"]') || await page.$('button:has-text("تسجيل")') || await page.$('button:has-text("دخول")');
      if (loginBtn) {
        await loginBtn.click();
        await page.waitForTimeout(5000);
        console.log('  ✅ Logged in');
      } else {
        console.log('  ⚠️ Login button not found');
      }
    } else {
      console.log('  ⚠️ Login form not found, trying direct navigation...');
    }
  } catch (e) {
    console.log(`  ⚠️ Login issue: ${e.message.substring(0, 100)}`);
  }
  
  // Check finance pages
  const pages = [
    ['Finance-Overview', 'http://localhost:8080/finance/overview'],
    ['Finance-Hub', 'http://localhost:8080/finance/hub'],
    ['Billing-Center', 'http://localhost:8080/finance/billing'],
    ['Treasury', 'http://localhost:8080/finance/treasury'],
    ['General-Ledger', 'http://localhost:8080/finance/general-ledger'],
    ['Chart-of-Accounts', 'http://localhost:8080/finance/chart-of-accounts'],
    ['Reports', 'http://localhost:8080/finance/reports'],
    ['Budgets', 'http://localhost:8080/finance/budgets'],
    ['Cost-Centers', 'http://localhost:8080/finance/cost-centers'],
    ['Vendors', 'http://localhost:8080/finance/vendors'],
    ['Fixed-Assets', 'http://localhost:8080/finance/assets'],
    ['Deposits', 'http://localhost:8080/finance/deposits'],
    ['Finance-Settings', 'http://localhost:8080/finance/settings'],
    ['Payments-Dashboard', 'http://localhost:8080/finance/payments-dashboard'],
  ];
  
  for (const [name, url] of pages) {
    await checkPage(name, url);
  }
  
  // Summary
  console.log('\n\n=== RESULTS ===');
  console.log(`Pages checked: ${pages.length}`);
  console.log(`Screenshots: ${screenshots.length}`);
  console.log(`Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('\nErrors found:');
    errors.forEach(e => console.log(`  ❌ ${e}`));
  } else {
    console.log('\n✅ No errors found on any page!');
  }
  
  await browser.close();
})();
