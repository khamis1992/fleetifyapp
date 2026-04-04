const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:8080';
const RESULTS = [];

async function testPage(browser, route, pageName) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageResults = [];
  
  try {
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    
    // Check if page loaded correctly (not error/blank)
    const bodyText = await page.locator('body').innerText();
    if (!bodyText || bodyText.length < 50) {
      pageResults.push({ type: 'ERROR', msg: `Page blank or minimal content (${bodyText.length} chars)` });
    }
    
    // Find ALL buttons on the page
    const buttons = await page.locator('button').all();
    const links = await page.locator('a[href]').all();
    
    // Test each button
    for (let i = 0; i < buttons.length; i++) {
      try {
        const btn = buttons[i];
        const isVisible = await btn.isVisible().catch(() => false);
        if (!isVisible) continue;
        
        const text = (await btn.innerText().catch(() => '')) || '';
        const onClick = await btn.getAttribute('onclick');
        const disabled = await btn.isDisabled().catch(() => false);
        const type = await btn.getAttribute('type');
        const ariaLabel = await btn.getAttribute('aria-label');
        
        // Skip submit buttons in forms and disabled buttons
        if (disabled) continue;
        if (type === 'submit') continue;
        
        // Check for empty onClick (react)
        if (!onClick && text.trim()) {
          // Try to check if button has an actual handler by looking at React fiber
          const hasHandler = await btn.evaluate(el => {
            const key = Object.keys(el).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
            if (!key) return 'unknown';
            const fiber = el[key];
            return fiber?.memoizedProps?.onClick ? 'has-handler' : 'no-handler';
          }).catch(() => 'unknown');
          
          if (hasHandler === 'no-handler' && text.trim()) {
            const label = text.trim().substring(0, 50) || ariaLabel || `Button#${i}`;
            pageResults.push({ type: 'BROKEN_BUTTON', msg: `Button "${label}" has no onClick handler` });
          }
        }
      } catch (e) {}
    }
    
    // Test each link
    for (let i = 0; i < links.length; i++) {
      try {
        const link = links[i];
        const isVisible = await link.isVisible().catch(() => false);
        if (!isVisible) continue;
        
        const href = await link.getAttribute('href');
        const text = (await link.innerText().catch(() => '')) || '';
        
        if (!href || href === '#' || href === 'javascript:void(0)') {
          if (text.trim()) {
            const label = text.trim().substring(0, 50);
            pageResults.push({ type: 'BROKEN_LINK', msg: `Link "${label}" has href="${href}"` });
          }
        }
      } catch (e) {}
    }
    
    // Check for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    
    // Check for "قريباً" or "Coming Soon" text visible to user
    const soonText = await page.locator('text=/قريباً|Coming Soon|ستتوفر قريباً/i').all();
    for (const el of soonText) {
      const visible = await el.isVisible().catch(() => false);
      if (visible) {
        const t = (await el.innerText().catch(() => '')).substring(0, 100);
        pageResults.push({ type: 'PLACEHOLDER', msg: `"${t}" still visible` });
      }
    }
    
    // Check for TODO comments visible in UI
    const todos = await page.locator('text=/TODO|FIXME/i').all();
    for (const el of todos) {
      const visible = await el.isVisible().catch(() => false);
      if (visible) {
        const t = (await el.innerText().catch(() => '')).substring(0, 100);
        pageResults.push({ type: 'TODO_VISIBLE', msg: `TODO/FIXME visible: "${t}"` });
      }
    }
    
  } catch (err) {
    pageResults.push({ type: 'NAV_ERROR', msg: `Failed to load: ${err.message.substring(0, 100)}` });
  }
  
  await page.close();
  
  const result = {
    page: pageName,
    route: route,
    issues: pageResults,
    status: pageResults.filter(r => r.type === 'ERROR' || r.type === 'NAV_ERROR').length > 0 ? 'FAIL' : 'OK'
  };
  
  RESULTS.push(result);
  return result;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  // Login first
  console.log('=== Logging in ===');
  const loginPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await loginPage.goto(BASE + '/auth', { waitUntil: 'networkidle', timeout: 30000 });
  await loginPage.waitForTimeout(2000);
  
  // Try to find and fill login form
  const emailInput = loginPage.locator('input[type="email"], input[name="email"], input[placeholder*="بريد"], input[placeholder*="email"], input[placeholder*="Email"]').first();
  const passInput = loginPage.locator('input[type="password"]').first();
  const submitBtn = loginPage.locator('button[type="submit"]').first();
  
  if (await emailInput.count() > 0 && await passInput.count() > 0) {
    await emailInput.fill('khamis-1992@hotmail.com');
    await passInput.fill('123456789');
    await submitBtn.click();
    console.log('Login submitted, waiting...');
    await loginPage.waitForURL(/dashboard|main/, { timeout: 15000 }).catch(() => {});
    await loginPage.waitForTimeout(5000);
    console.log('Current URL:', loginPage.url());
    
    if (loginPage.url().includes('auth')) {
      console.log('Login may have failed, trying alternative approach...');
      // Try clicking a login button
      const loginBtn = loginPage.locator('button:has-text("تسجيل"), button:has-text("دخول"), button:has-text("Login")').first();
      if (await loginBtn.isVisible().catch(() => false)) {
        await loginBtn.click();
        await loginPage.waitForTimeout(3000);
      }
    }
  }
  
  // Set auth cookie manually if needed
  const cookies = await loginPage.context().cookies();
  console.log('Cookies:', cookies.length);
  
  await loginPage.close();
  
  // Pages to test
  const pages = [
    { route: '/dashboard', name: 'Dashboard' },
    { route: '/finance/overview', name: 'Finance Overview' },
    { route: '/finance/billing', name: 'Billing Center' },
    { route: '/finance/treasury', name: 'Treasury' },
    { route: '/finance/general-ledger', name: 'General Ledger' },
    { route: '/finance/chart-of-accounts', name: 'Chart of Accounts' },
    { route: '/finance/reports', name: 'Finance Reports' },
    { route: '/finance/budgets', name: 'Budgets' },
    { route: '/finance/cost-centers', name: 'Cost Centers' },
    { route: '/finance/vendors', name: 'Vendors' },
    { route: '/finance/fixed-assets', name: 'Fixed Assets' },
    { route: '/finance/deposits', name: 'Deposits' },
    { route: '/finance/settings', name: 'Finance Settings' },
    { route: '/customers', name: 'Customers' },
    { route: '/fleet', name: 'Fleet' },
    { route: '/contracts', name: 'Contracts' },
    { route: '/quotations', name: 'Quotations' },
    { route: '/sales/quotes', name: 'Sales Quotes' },
    { route: '/hr/employees', name: 'HR Employees' },
    { route: '/hr/payroll', name: 'HR Payroll' },
    { route: '/hr/attendance', name: 'HR Attendance' },
    { route: '/legal/cases', name: 'Legal Cases' },
    { route: '/tasks', name: 'Tasks' },
    { route: '/reports', name: 'Reports Hub' },
    { route: '/settings', name: 'Settings' },
    { route: '/approvals', name: 'Approvals' },
    { route: '/support', name: 'Support' },
    { route: '/finance/payments/quick', name: 'Quick Payment' },
    { route: '/finance/payments/register', name: 'Payment Registration' },
  ];
  
  console.log(`\n=== Testing ${pages.length} pages ===\n`);
  
  for (const page of pages) {
    console.log(`Testing: ${page.name} (${page.route})...`);
    const result = await testPage(browser, page.route, page.name);
    const issueCount = result.issues.length;
    const brokenCount = result.issues.filter(i => i.type === 'BROKEN_BUTTON' || i.type === 'BROKEN_LINK' || i.type === 'ERROR').length;
    console.log(`  ${issueCount > 0 ? '⚠️' : '✅'} ${issueCount} issues (${brokenCount} broken)`);
    for (const issue of result.issues) {
      console.log(`    [${issue.type}] ${issue.msg}`);
    }
  }
  
  await browser.close();
  
  // Summary
  console.log('\n=== SUMMARY ===');
  const totalIssues = RESULTS.reduce((sum, r) => sum + r.issues.length, 0);
  const brokenButtons = RESULTS.reduce((sum, r) => sum + r.issues.filter(i => i.type === 'BROKEN_BUTTON').length, 0);
  const brokenLinks = RESULTS.reduce((sum, r) => sum + r.issues.filter(i => i.type === 'BROKEN_LINK').length, 0);
  const placeholders = RESULTS.reduce((sum, r) => sum + r.issues.filter(i => i.type === 'PLACEHOLDER').length, 0);
  const errors = RESULTS.reduce((sum, r) => sum + r.issues.filter(i => i.type === 'ERROR' || i.type === 'NAV_ERROR').length, 0);
  
  console.log(`Total pages: ${RESULTS.length}`);
  console.log(`Pages with issues: ${RESULTS.filter(r => r.issues.length > 0).length}`);
  console.log(`Broken buttons: ${brokenButtons}`);
  console.log(`Broken links: ${brokenLinks}`);
  console.log(`Placeholders (قريباً): ${placeholders}`);
  console.log(`Page errors: ${errors}`);
  console.log(`Total issues: ${totalIssues}`);
  
  // Save results
  fs.writeFileSync('/tmp/fleetifyapp/button-audit-results.json', JSON.stringify(RESULTS, null, 2));
  console.log('\nResults saved to button-audit-results.json');
}

main().catch(console.error);
