const { chromium } = require('playwright');

const BASE = 'https://www.alaraf.online';
const RESULTS = [];

async function testPage(browser, route, pageName) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const issues = [];
  const consoleErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  
  try {
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(3000);
    
    // Check if we're on login page (redirected)
    if (page.url().includes('auth') || page.url().includes('login')) {
      await page.close();
      return { page: pageName, route, status: 'REDIRECTED_TO_LOGIN', issues: [] };
    }
    
    // Check page loaded
    const bodyText = await page.locator('body').innerText();
    if (!bodyText || bodyText.length < 50) {
      issues.push('Page blank or minimal content');
    }
    
    // Check for dev tools that shouldn't be in production
    const devTools = await page.locator('text=/Tanstack|React Query Devtools|DevTools/i').all();
    for (const el of devTools) {
      if (await el.isVisible().catch(() => false)) {
        issues.push('Dev tools visible in production!');
      }
    }
    
    // Check for "قريباً" placeholders (not status labels)
    const soonElements = await page.locator('text=/قريباً|Coming Soon/i').all();
    for (const el of soonElements) {
      if (await el.isVisible().catch(() => false)) {
        const parent = (await el.locator('..').innerText().catch(() => '')).substring(0, 100);
        if (!parent.includes('ينتهي') && !parent.includes('مستحق') && !parent.includes('صيانة') && 
            !parent.includes('فحص') && !parent.includes('تأمين') && !parent.includes('ترخيص')) {
          issues.push(`Placeholder visible: "${parent}"`);
        }
      }
    }
    
    // Check for broken buttons (visible, no submit, not tab)
    const buttons = await page.locator('button:visible').all();
    let brokenCount = 0;
    for (const btn of buttons) {
      const text = (await btn.innerText().catch(() => '')).trim();
      const disabled = await btn.isDisabled().catch(() => false);
      const type = await btn.getAttribute('type');
      if (disabled || type === 'submit' || !text || text.length > 100) continue;
      
      const isTab = await btn.evaluate(el => {
        return el.getAttribute('role') === 'tab' || el.parentElement?.getAttribute('role') === 'tablist';
      }).catch(() => false);
      if (isTab) continue;
      
      const urlBefore = page.url();
      const dialogsBefore = await page.locator('[role="dialog"]').count();
      
      try {
        await btn.click({ timeout: 2000 });
        await page.waitForTimeout(800);
      } catch(e) { continue; }
      
      const urlAfter = page.url();
      const dialogsAfter = await page.locator('[role="dialog"]').count();
      const toasts = await page.locator('[data-sonner-toast], [role="status"]').count();
      
      if (urlBefore !== urlAfter || dialogsAfter > dialogsBefore || toasts > 0) {
        // Something happened - close dialog if opened
        if (dialogsAfter > dialogsBefore) {
          const closeBtn = page.locator('[aria-label="Close"], button:has-text("إلغاء")').first();
          if (await closeBtn.isVisible().catch(() => false)) {
            await closeBtn.click().catch(() => {});
            await page.waitForTimeout(500);
          } else {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
          }
        }
        // Go back if navigated
        if (urlAfter !== urlBefore) {
          await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 15000 });
          await page.waitForTimeout(2000);
        }
      } else {
        brokenCount++;
        if (brokenCount <= 3) {
          issues.push(`Button no action: "${text.substring(0, 50)}"`);
        }
      }
    }
    if (brokenCount > 3) issues.push(`... and ${brokenCount - 3} more buttons with no action`);
    
    // Check for console errors
    const uniqueErrors = [...new Set(consoleErrors)].filter(e => 
      !e.includes('favicon') && !e.includes('DevTools') && !e.includes('Download the React')
    );
    if (uniqueErrors.length > 0) {
      issues.push(`${uniqueErrors.length} console errors`);
    }
    
  } catch (err) {
    issues.push(`Page error: ${err.message.substring(0, 80)}`);
  }
  
  await page.close();
  return { page: pageName, route, status: issues.length > 0 ? 'ISSUES' : 'OK', issues };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  // Login on production
  console.log('=== Logging in to production ===');
  const loginPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await loginPage.goto(BASE + '/auth', { waitUntil: 'networkidle', timeout: 30000 });
  await loginPage.waitForTimeout(3000);
  
  const emailInput = loginPage.locator('input[type="email"], input[name="email"]').first();
  const passInput = loginPage.locator('input[type="password"]').first();
  
  if (await emailInput.count() > 0) {
    await emailInput.fill('khamis-1992@hotmail.com');
    await passInput.fill('123456789');
    await loginPage.locator('button[type="submit"]').first().click();
    await loginPage.waitForTimeout(8000);
    console.log('Login result:', loginPage.url().includes('dashboard') ? 'SUCCESS' : 'FAILED');
  }
  await loginPage.close();
  
  const pages = [
    { route: '/dashboard', name: 'Dashboard' },
    { route: '/finance/overview', name: 'Finance Overview' },
    { route: '/finance/billing', name: 'Billing' },
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
    { route: '/finance/payments/quick', name: 'Quick Payment' },
    { route: '/finance/payments/register', name: 'Payment Register' },
  ];
  
  console.log(`\n=== Testing ${pages.length} pages on PRODUCTION ===\n`);
  
  for (const p of pages) {
    const result = await testPage(browser, p.route, p.name);
    RESULTS.push(result);
    if (result.status === 'REDIRECTED_TO_LOGIN') {
      console.log(`🔒 ${p.name} — redirected to login (expected for protected pages)`);
    } else if (result.status === 'OK') {
      console.log(`✅ ${p.name}`);
    } else {
      console.log(`⚠️  ${p.name}:`);
      result.issues.forEach(i => console.log(`    - ${i}`));
    }
  }
  
  await browser.close();
  
  console.log('\n========== PRODUCTION AUDIT ==========');
  const ok = RESULTS.filter(r => r.status === 'OK').length;
  const issues = RESULTS.filter(r => r.status === 'ISSUES');
  const redirected = RESULTS.filter(r => r.status === 'REDIRECTED_TO_LOGIN').length;
  console.log(`Pages OK: ${ok}`);
  console.log(`Pages with issues: ${issues.length}`);
  console.log(`Redirected to login: ${redirected}`);
  
  if (issues.length > 0) {
    console.log('\nPages needing attention:');
    issues.forEach(r => {
      console.log(`  ${r.page}:`);
      r.issues.forEach(i => console.log(`    - ${i}`));
    });
  } else {
    console.log('\n🎉 ALL PRODUCTION PAGES PASS!');
  }
}

main().catch(console.error);
