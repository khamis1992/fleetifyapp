const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://localhost:8080';
const RESULTS = [];

async function testButtonsOnPage(browser, route, pageName) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageResults = [];
  const consoleErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  
  page.on('pageerror', err => {
    consoleErrors.push(`PAGE_ERROR: ${err.message}`);
  });
  
  try {
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    
    // Get all buttons
    const buttons = await page.locator('button:visible').all();
    
    for (let i = 0; i < buttons.length; i++) {
      try {
        const btn = buttons[i];
        const text = (await btn.innerText().catch(() => '')).trim();
        const disabled = await btn.isDisabled().catch(() => false);
        const type = await btn.getAttribute('type');
        const ariaLabel = await btn.getAttribute('aria-label') || '';
        
        // Skip submit buttons in forms, disabled, and empty buttons
        if (disabled) continue;
        if (type === 'submit') continue;
        if (!text && !ariaLabel) continue;
        // Skip tab buttons and pagination buttons (they work via state)
        if (text.length > 100) continue;
        
        const label = text.substring(0, 60) || ariaLabel;
        
        // Record state before click
        const urlBefore = page.url();
        const dialogsBefore = await page.locator('[role="dialog"], [data-state="open"]').count();
        
        // Click and wait
        try {
          await btn.click({ timeout: 3000 });
          await page.waitForTimeout(1000);
        } catch (clickErr) {
          // Button might be obscured
          continue;
        }
        
        const urlAfter = page.url();
        const dialogsAfter = await page.locator('[role="dialog"], [data-state="open"]').count();
        const toastsAfter = await page.locator('[data-sonner-toast], [role="status"], .toast').count();
        
        // Check if something happened
        const urlChanged = urlBefore !== urlAfter;
        const dialogOpened = dialogsAfter > dialogsBefore;
        const toastShown = toastsAfter > 0;
        const actionHappened = urlChanged || dialogOpened || toastShown;
        
        if (!actionHappened) {
          // Check if it's a tab/section toggle (internal state change)
          const isTab = await btn.evaluate(el => {
            const role = el.getAttribute('role');
            const ariaSelected = el.getAttribute('aria-selected');
            const dataState = el.getAttribute('data-state');
            const parentRole = el.parentElement?.getAttribute('role');
            return role === 'tab' || ariaSelected !== null || dataState === 'active' || parentRole === 'tablist';
          }).catch(() => false);
          
          if (!isTab) {
            pageResults.push({ 
              type: 'NO_ACTION', 
              msg: `"${label}" — clicked but nothing happened (no nav, dialog, toast, or tab change)` 
            });
          }
        }
        
        // If a dialog opened, close it before testing next button
        if (dialogOpened) {
          const closeBtn = page.locator('[aria-label="Close"], button:has-text("إلغاء"), button:has-text("Cancel")').first();
          if (await closeBtn.isVisible().catch(() => false)) {
            await closeBtn.click().catch(() => {});
            await page.waitForTimeout(500);
          } else {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
          }
        }
        
        // If navigated away, go back
        if (urlChanged && !urlAfter.includes(route)) {
          await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 20000 });
          await page.waitForTimeout(2000);
        }
        
      } catch (e) {}
    }
    
    // Check for visible "قريباً" text
    const soonElements = await page.locator('text=/قريباً|Coming Soon/i').all();
    for (const el of soonElements) {
      const visible = await el.isVisible().catch(() => false);
      if (visible) {
        const parentText = (await el.locator('..').innerText().catch(() => '')).substring(0, 100);
        // Filter out status labels (ينتهي قريباً)
        if (!parentText.includes('ينتهي') && !parentText.includes('مستحق') && 
            !parentText.includes('صيانة') && !parentText.includes('فحص') &&
            !parentText.includes('تأمين') && !parentText.includes('ترخيص') &&
            !parentText.includes('تقرير') && !parentText.includes('عقود')) {
          pageResults.push({ type: 'PLACEHOLDER', msg: `"${parentText}"` });
        }
      }
    }
    
    // Check for visible TODO text
    const todoElements = await page.locator('text=/TODO:|FIXME:/i').all();
    for (const el of todoElements) {
      const visible = await el.isVisible().catch(() => false);
      if (visible) {
        const t = (await el.innerText().catch(() => '')).substring(0, 100);
        pageResults.push({ type: 'TODO', msg: `"${t}"` });
      }
    }
    
    // Report console errors from this page
    const uniqueErrors = [...new Set(consoleErrors)].filter(e => 
      !e.includes('favicon') && !e.includes('DevTools') && !e.includes('React does not recognize') && !e.includes('Download the React DevTools')
    );
    for (const err of uniqueErrors.slice(0, 5)) {
      pageResults.push({ type: 'CONSOLE_ERROR', msg: err.substring(0, 150) });
    }
    
  } catch (err) {
    pageResults.push({ type: 'PAGE_ERROR', msg: err.message.substring(0, 100) });
  }
  
  await page.close();
  
  const result = { page: pageName, route, issues: pageResults };
  RESULTS.push(result);
  return result;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  // Login
  console.log('=== Logging in ===');
  const loginPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await loginPage.goto(BASE + '/auth', { waitUntil: 'networkidle', timeout: 30000 });
  await loginPage.waitForTimeout(2000);
  
  const emailInput = loginPage.locator('input[type="email"], input[name="email"]').first();
  const passInput = loginPage.locator('input[type="password"]').first();
  
  if (await emailInput.count() > 0) {
    await emailInput.fill('khamis-1992@hotmail.com');
    await passInput.fill('123456789');
    await loginPage.locator('button[type="submit"]').first().click();
    await loginPage.waitForTimeout(5000);
  }
  
  console.log('Logged in:', !loginPage.url().includes('auth'));
  await loginPage.close();
  
  // Test pages
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
    { route: '/approvals', name: 'Approvals' },
  ];
  
  console.log(`\n=== Clicking every button on ${pages.length} pages ===\n`);
  
  for (const p of pages) {
    console.log(`\n📌 ${p.name} (${p.route})`);
    const result = await testButtonsOnPage(browser, p.route, p.name);
    if (result.issues.length === 0) {
      console.log('   ✅ All buttons work');
    } else {
      for (const issue of result.issues) {
        console.log(`   ⚠️  [${issue.type}] ${issue.msg}`);
      }
    }
  }
  
  await browser.close();
  
  // Summary
  console.log('\n\n========== FINAL AUDIT REPORT ==========');
  const noAction = RESULTS.reduce((s, r) => s + r.issues.filter(i => i.type === 'NO_ACTION').length, 0);
  const placeholders = RESULTS.reduce((s, r) => s + r.issues.filter(i => i.type === 'PLACEHOLDER').length, 0);
  const todos = RESULTS.reduce((s, r) => s + r.issues.filter(i => i.type === 'TODO').length, 0);
  const errors = RESULTS.reduce((s, r) => s + r.issues.filter(i => i.type === 'PAGE_ERROR' || i.type === 'CONSOLE_ERROR').length, 0);
  const total = RESULTS.reduce((s, r) => s + r.issues.length, 0);
  
  console.log(`Pages tested: ${RESULTS.length}`);
  console.log(`Buttons with no action: ${noAction}`);
  console.log(`Placeholders visible: ${placeholders}`);
  console.log(`TODOs visible: ${todos}`);
  console.log(`Console errors: ${errors}`);
  console.log(`Total issues: ${total}`);
  
  if (total === 0) {
    console.log('\n🎉 ALL CLEAR — Every button works on every page!');
  } else {
    console.log('\n📋 Issues need fixing:');
    for (const r of RESULTS.filter(r => r.issues.length > 0)) {
      for (const issue of r.issues) {
        console.log(`  ${r.page}: [${issue.type}] ${issue.msg}`);
      }
    }
  }
  
  fs.writeFileSync('/tmp/fleetifyapp/click-audit-results.json', JSON.stringify(RESULTS, null, 2));
}

main().catch(console.error);
