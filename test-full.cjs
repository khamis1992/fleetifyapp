const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  const results = [];
  const pageErrors = [];
  
  page.on('pageerror', err => {
    pageErrors.push(err.message.substring(0, 200));
  });
  
  // Collect console warnings
  let lastWarnings = [];
  page.on('console', msg => {
    if (msg.type() === 'warning' && msg.text().includes('Maximum update depth')) {
      lastWarnings.push(msg.text().substring(0, 100));
    }
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!t.includes('favicon') && !t.includes('manifest') && !t.includes('.hot')) {
        lastWarnings.push(`ERR: ${t.substring(0, 100)}`);
      }
    }
  });
  
  // Login
  console.log('🔐 Logging in...');
  await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);
  const email = await page.$('input[type="email"]') || await page.$('input[name="email"]');
  const pass = await page.$('input[type="password"]');
  if (email && pass) {
    await email.fill('khamis-1992@hotmail.com');
    await pass.fill('123456789');
    const btn = await page.$('button[type="submit"]') || await page.$('button:has-text("تسجيل")') || await page.$('button:has-text("دخول")');
    if (btn) await btn.click();
    await page.waitForTimeout(5000);
    console.log('✅ Logged in');
  } else {
    console.log('⚠️ Login form not found');
  }
  
  // All finance pages + redirects
  const pages = [
    // Main pages
    ['Finance-Overview', '/finance/overview', true],
    ['Billing-Center', '/finance/billing', true],
    ['Treasury', '/finance/treasury', true],
    ['General-Ledger', '/finance/general-ledger', true],
    ['Chart-of-Accounts', '/finance/chart-of-accounts', true],
    ['Reports', '/finance/reports', true],
    ['Budgets', '/finance/budgets', true],
    ['Cost-Centers', '/finance/cost-centers', true],
    ['Vendors', '/finance/vendors', true],
    ['Fixed-Assets', '/finance/assets', true],
    ['Deposits', '/finance/deposits', true],
    ['Finance-Settings', '/finance/settings', true],
    // Redirects
    ['Redirect: /finance', '/finance', false],
    ['Redirect: /finance/hub', '/finance/hub', false],
    ['Redirect: /finance/unified', '/finance/unified', false],
    ['Redirect: /finance/unified-payments', '/finance/unified-payments', false],
    ['Redirect: /finance/unified-reports', '/finance/unified-reports', false],
    ['Redirect: /finance/payments', '/finance/payments', false],
    ['Redirect: /finance/invoices', '/finance/invoices', false],
    ['Redirect: /finance/ledger', '/finance/ledger', false],
    ['Redirect: /finance/journal-entries', '/finance/journal-entries', false],
    ['Redirect: /finance/analysis', '/finance/analysis', false],
    ['Redirect: /finance/financial-ratios', '/finance/financial-ratios', false],
    ['Redirect: /finance/calculator', '/finance/calculator', false],
    ['Redirect: /finance/accounting', '/finance/accounting', false],
    ['Redirect: /finance/budgets-centers', '/finance/budgets-centers', false],
    ['Redirect: /finance/audit-settings', '/finance/audit-settings', false],
    ['Redirect: /finance/reports-analysis', '/finance/reports-analysis', false],
    ['Redirect: /finance/monthly-rent-tracking', '/finance/monthly-rent-tracking', false],
    // Other important pages
    ['Main-Dashboard', '/dashboard', true],
    ['Customers', '/customers', true],
    ['Fleet', '/fleet', true],
    ['Contracts', '/contracts', true],
  ];
  
  let passed = 0, failed = 0;
  
  for (const [name, url, screenshot] of pages) {
    lastWarnings = [];
    try {
      await page.goto('http://localhost:8080' + url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(2500);
      
      const errors = lastWarnings.filter(w => w.includes('Maximum update depth') || w.startsWith('ERR:'));
      const hasReactError = errors.length > 3; // Allow some warnings
      
      // Check page content
      const bodyText = await page.textContent('body').catch(() => '');
      const hasError = bodyText.includes('Something went wrong') || bodyText.includes('Application error');
      
      if (hasReactError || hasError) {
        console.log(`❌ ${name} — React error detected`);
        failed++;
        results.push({ name, url, status: 'FAIL', errors: errors.slice(0, 3) });
      } else {
        console.log(`✅ ${name}`);
        passed++;
        results.push({ name, url, status: 'OK' });
        
        if (screenshot) {
          const safeName = name.replace(/[^a-zA-Z0-9]/g, '-');
          await page.screenshot({ path: `/tmp/fleetifyapp/screenshots/v2-${safeName}.png`, fullPage: false }).catch(() => {});
        }
      }
    } catch(e) {
      console.log(`❌ ${name} — ${e.message.substring(0, 80)}`);
      failed++;
      results.push({ name, url, status: 'FAIL', errors: [e.message.substring(0, 80)] });
    }
  }
  
  await browser.close();
  
  console.log('\n═══════════════════════════════════════');
  console.log(`📊 TOTAL: ${pages.length} pages`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('═══════════════════════════════════════');
  
  if (failed > 0) {
    console.log('\nFailed pages:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.name} (${r.url})`);
      if (r.errors) r.errors.forEach(e => console.log(`     → ${e}`));
    });
  }
})();
