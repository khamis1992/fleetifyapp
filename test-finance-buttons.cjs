const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // Collect errors
  const errors = [];
  page.on('response', resp => {
    if (resp.status() >= 400) {
      errors.push({ url: resp.url(), status: resp.status() });
    }
  });

  // Login
  await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.locator('input[type="email"]').first().fill('khamis-1992@hotmail.com');
  await page.locator('input[type="password"]').first().fill('123456789');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(6000);

  const financePages = [
    { name: 'Finance Overview', path: '/finance/overview' },
    { name: 'Billing Center', path: '/finance/billing' },
    { name: 'Treasury', path: '/finance/treasury' },
    { name: 'General Ledger', path: '/finance/general-ledger' },
    { name: 'Chart of Accounts', path: '/finance/chart-of-accounts' },
    { name: 'Reports Hub', path: '/reports' },
    { name: 'Budgets', path: '/finance/budgets' },
    { name: 'Cost Centers', path: '/finance/cost-centers' },
    { name: 'Vendors', path: '/finance/vendors' },
    { name: 'Fixed Assets', path: '/finance/fixed-assets' },
    { name: 'Deposits', path: '/finance/deposits' },
    { name: 'Finance Settings', path: '/finance/settings' },
    { name: 'Quick Payment', path: '/finance/payments/quick' },
    { name: 'Payment Register', path: '/finance/payments/register' },
  ];

  for (const fp of financePages) {
    console.log(`\n📊 ${fp.name} (${fp.path})`);
    await page.goto('http://localhost:8080' + fp.path, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // Check if error page
    const body = await page.locator('body').innerText().catch(() => '');
    if (body.includes('404') || body.includes('not found') || body.includes('خطأ') || body.includes('Error')) {
      console.log(`  ❌ ERROR PAGE`);
      continue;
    }

    // Find all buttons and links
    const buttons = await page.locator('button, a[href]').all();
    const brokenButtons = [];
    
    for (const btn of buttons) {
      const text = (await btn.innerText().catch(() => '')).trim().substring(0, 50);
      if (!text || text.length < 2) continue;
      
      // Check href links
      const href = await btn.getAttribute('href').catch(() => null);
      if (href && href.startsWith('/') && !href.includes('#')) {
        const resp = await page.goto('http://localhost:8080' + href, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => null);
        if (resp && resp.status() >= 400) {
          brokenButtons.push({ text, href, status: resp.status() });
        }
        if (resp) {
          const errBody = await page.locator('body').innerText().catch(() => '');
          if (errBody.includes('404') || errBody.includes('not found') || errBody.includes('Error')) {
            brokenButtons.push({ text, href, status: resp.status(), page: 'error page' });
          }
        }
        // Go back
        await page.goto('http://localhost:8080' + fp.path, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);
        continue;
      }
      
      // Check onClick buttons that navigate
      const isVisible = await btn.isVisible().catch(() => false);
      if (!isVisible) continue;
      
      // Skip submit buttons and tab buttons
      const type = await btn.getAttribute('type').catch(() => '');
      const role = await btn.getAttribute('role').catch(() => '');
      if (type === 'submit' || role === 'tab') continue;
      
      // Click and check for navigation or error
      const currentUrl = page.url();
      try {
        await btn.click({ timeout: 2000 });
        await page.waitForTimeout(1500);
        
        const newUrl = page.url();
        if (newUrl !== currentUrl && newUrl !== 'http://localhost:8080' + fp.path) {
          const newBody = await page.locator('body').innerText().catch(() => '');
          if (newBody.includes('404') || newBody.includes('not found') || newBody.includes('Error') || newBody.includes('خطأ')) {
            brokenButtons.push({ text, to: newUrl, page: 'error page' });
          } else {
            console.log(`  ↗️ "${text}" → ${newUrl.replace('http://localhost:8080','')}`);
          }
          // Go back
          await page.goto('http://localhost:8080' + fp.path, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(2000);
        }
      } catch (e) {
        // timeout = probably dialog opened or no action, ignore
      }
    }
    
    if (brokenButtons.length > 0) {
      for (const b of brokenButtons) {
        console.log(`  ❌ "${b.text}" → ${b.href || b.to} [${b.status || b.page}]`);
      }
    } else {
      console.log(`  ✅ All buttons working`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Total HTTP errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('\nHTTP Errors:');
    errors.slice(0, 20).forEach(e => console.log(`  ${e.status} ${e.url}`));
  }

  await browser.close();
}

main().catch(console.error);
