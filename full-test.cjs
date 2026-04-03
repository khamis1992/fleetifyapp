const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const results = { passed: [], failed: [], total: 0 };
  
  const browser = await chromium.launch({ headless: true });
  
  async function testPage(ctx, name, url, checks = []) {
    results.total++;
    const page = await ctx.newPage();
    page.on('pageerror', (err) => {
      results.failed.push(`${name}: JS Error: ${err.message}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('Failed to load resource') && !msg.text().includes('favicon')) {
        results.failed.push(`${name}: Console Error: ${msg.text().substring(0, 100)}`);
      }
    });
    
    try {
      const resp = await page.goto('http://localhost:8080' + url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      
      if (resp && resp.status() === 200) {
        // Run checks
        for (const check of checks) {
          const result = await page.evaluate(check.fn);
          if (!result) {
            results.failed.push(`${name}: ${check.desc}`);
          }
        }
        
        // Check for React error boundaries
        const hasError = await page.locator('text=Something went wrong').count();
        if (hasError > 0) {
          results.failed.push(`${name}: React Error Boundary`);
        }
        
        // Check page has content
        const bodyText = await page.locator('body').textContent();
        if (bodyText.length < 50) {
          results.failed.push(`${name}: Empty page`);
        }
        
        results.passed.push(name);
      } else {
        results.failed.push(`${name}: HTTP ${resp?.status()}`);
      }
    } catch (err) {
      results.failed.push(`${name}: ${err.message.substring(0, 80)}`);
    }
    
    await page.close();
  }

  // 1. Login first
  console.log('🔐 Logging in...');
  const loginCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const loginPage = await loginCtx.newPage();
  await loginPage.goto('http://localhost:8080/auth', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await loginPage.waitForTimeout(5000);
  
  const email = await loginPage.$('input[type="email"]') || await loginPage.$('input[name="email"]');
  const pass = await loginPage.$('input[type="password"]');
  
  if (email && pass) {
    await email.fill('khamis-1992@hotmail.com');
    await pass.fill('123456789');
    const btn = await loginPage.$('button[type="submit"]') || await loginPage.$('button:has-text("تسجيل")');
    if (btn) await btn.click();
    await loginPage.waitForTimeout(6000);
    
    // Check login success
    const currentUrl = loginPage.url();
    if (currentUrl.includes('/auth')) {
      console.log('❌ LOGIN FAILED');
    } else {
      console.log(`✅ Login successful → ${currentUrl}`);
      results.passed.push('Login');
      results.total++;
    }
  }
  await loginPage.close();
  await loginCtx.close();

  // 2. Save cookies
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dp = await desktop.newPage();
  dp.on('pageerror', (err) => results.failed.push(`Desktop: ${err.message.substring(0, 80)}`));
  dp.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('Failed to load'))
      results.failed.push(`Desktop: ${msg.text().substring(0, 100)}`);
  });
  
  await dp.goto('http://localhost:8080/auth', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dp.waitForTimeout(2000);
  const e2 = await dp.$('input[type="email"]') || await dp.$('input[name="email"]');
  const p2 = await dp.$('input[type="password"]');
  if (e2 && p2) { await e2.fill('khamis-1992@hotmail.com'); await p2.fill('123456789'); const b = await dp.$('button[type="submit"]'); if (b) await b.click(); await dp.waitForTimeout(6000); }

  // 3. Test all desktop pages
  console.log('\n🖥️ Desktop pages...');
  const pages = [
    '/dashboard', '/finance/overview', '/finance/billing', '/finance/treasury',
    '/finance/general-ledger', '/finance/chart-of-accounts', '/finance/reports',
    '/finance/budgets', '/finance/cost-centers', '/finance/vendors',
    '/finance/fixed-assets', '/finance/deposits', '/finance/settings',
    '/customers', '/fleet', '/contracts', '/quotations',
    '/hr/employees', '/hr/payroll', '/hr/attendance',
    '/legal/cases', '/tasks', '/settings',
  ];
  
  for (const url of pages) {
    try {
      results.total++;
      const name = url.split('/').pop() || url;
      const resp = await dp.goto('http://localhost:8080' + url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await dp.waitForTimeout(2500);
      
      const hasError = await dp.locator('text=Something went wrong').count();
      const bodyText = await dp.locator('body').textContent();
      const isEmpty = bodyText.length < 50;
      
      if (resp && resp.status() === 200 && hasError === 0 && !isEmpty) {
        results.passed.push(name);
        console.log(`  ✅ ${name}`);
      } else {
        const issue = hasError > 0 ? 'Error Boundary' : isEmpty ? 'Empty' : `HTTP ${resp?.status()}`;
        results.failed.push(`Desktop ${name}: ${issue}`);
        console.log(`  ❌ ${name} — ${issue}`);
      }
    } catch (err) {
      results.failed.push(`Desktop ${url}: ${err.message.substring(0, 80)}`);
      console.log(`  ❌ ${url} — ${err.message.substring(0, 60)}`);
    }
  }
  await dp.close();

  // 4. Test mobile pages
  console.log('\n📱 Mobile pages...');
  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true });
  const mp = await mobile.newPage();
  mp.on('pageerror', (err) => results.failed.push(`Mobile: ${err.message.substring(0, 80)}`));
  
  await mp.goto('http://localhost:8080/auth', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await mp.waitForTimeout(2000);
  const me = await mp.$('input[type="email"]') || await mp.$('input[name="email"]');
  const mpa = await mp.$('input[type="password"]');
  if (me && mpa) { await me.fill('khamis-1992@hotmail.com'); await mpa.fill('123456789'); const mb = await mp.$('button[type="submit"]'); if (mb) await mb.click(); await mp.waitForTimeout(6000); }

  const mobilePages = ['/dashboard', '/finance/overview', '/finance/billing', '/finance/treasury',
    '/finance/general-ledger', '/finance/reports', '/customers', '/fleet', '/hr/employees', '/tasks'];
  
  for (const url of mobilePages) {
    try {
      results.total++;
      const name = url.split('/').pop();
      const resp = await mp.goto('http://localhost:8080' + url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await mp.waitForTimeout(2500);
      
      // Check bottom nav exists
      const bottomNav = await mp.locator('nav[aria-label*="التنقل"]').count();
      const hasError = await mp.locator('text=Something went wrong').count();
      const bodyText = await mp.locator('body').textContent();
      
      if (resp && resp.status() === 200 && hasError === 0 && bodyText.length > 50) {
        results.passed.push(`mobile/${name}`);
        console.log(`  ✅ ${name}${bottomNav > 0 ? ' (nav ✓)' : ' (no nav ⚠️)'}`);
        if (bottomNav === 0) results.failed.push(`Mobile ${name}: No bottom nav`);
      } else {
        const issue = hasError > 0 ? 'Error Boundary' : `HTTP ${resp?.status()}`;
        results.failed.push(`Mobile ${name}: ${issue}`);
        console.log(`  ❌ ${name} — ${issue}`);
      }
    } catch (err) {
      results.failed.push(`Mobile ${url}: ${err.message.substring(0, 80)}`);
      console.log(`  ❌ ${url}`);
    }
  }
  await mp.close();

  // 5. Test tablet
  console.log('\n📋 Tablet pages...');
  const tablet = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const tp = await tablet.newPage();
  tp.on('pageerror', (err) => results.failed.push(`Tablet: ${err.message.substring(0, 80)}`));
  
  await tp.goto('http://localhost:8080/auth', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await tp.waitForTimeout(2000);
  const te = await tp.$('input[type="email"]') || await tp.$('input[name="email"]');
  const tpa = await tp.$('input[type="password"]');
  if (te && tpa) { await te.fill('khamis-1992@hotmail.com'); await tpa.fill('123456789'); const tb = await tp.$('button[type="submit"]'); if (tb) await tb.click(); await tp.waitForTimeout(6000); }

  for (const url of ['/dashboard', '/finance/overview', '/fleet', '/hr/employees']) {
    try {
      results.total++;
      const name = url.split('/').pop();
      const resp = await tp.goto('http://localhost:8080' + url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await tp.waitForTimeout(2500);
      
      if (resp && resp.status() === 200) {
        results.passed.push(`tablet/${name}`);
        console.log(`  ✅ ${name}`);
      } else {
        results.failed.push(`Tablet ${name}: HTTP ${resp?.status()}`);
        console.log(`  ❌ ${name}`);
      }
    } catch (err) {
      results.failed.push(`Tablet ${url}: ${err.message.substring(0, 80)}`);
      console.log(`  ❌ ${url}`);
    }
  }
  await tp.close();

  await browser.close();

  // Report
  console.log('\n' + '='.repeat(50));
  console.log(`📊 RESULTS: ${results.passed.length}/${results.total} passed (${Math.round(results.passed.length/results.total*100)}%)`);
  console.log('='.repeat(50));
  
  if (results.failed.length > 0) {
    console.log('\n❌ FAILURES:');
    results.failed.forEach(f => console.log(`  • ${f}`));
  }
  
  // Save results
  fs.writeFileSync('/tmp/fleetifyapp/test-results.json', JSON.stringify(results, null, 2));
  console.log('\nResults saved to /tmp/fleetifyapp/test-results.json');
})();
