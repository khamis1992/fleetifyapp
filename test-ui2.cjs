const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  const warnings = new Set();
  page.on('console', msg => {
    if (msg.type() === 'warning' && msg.text().includes('Maximum update depth')) {
      const text = msg.text().substring(0, 300);
      if (!warnings.has(text)) {
        warnings.add(text);
        console.log('⚠️', text);
      }
    }
  });
  
  // Login first
  await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  const email = await page.$('input[type="email"]') || await page.$('input[name="email"]');
  const pass = await page.$('input[type="password"]');
  if (email && pass) {
    await email.fill('khamis-1992@hotmail.com');
    await pass.fill('123456789');
    const btn = await page.$('button[type="submit"]') || await page.$('button:has-text("تسجيل")');
    if (btn) await btn.click();
    await page.waitForTimeout(4000);
  }
  
  // Check each page briefly
  const urls = [
    '/finance/overview', '/finance/treasury', '/finance/general-ledger',
    '/finance/chart-of-accounts', '/finance/reports', '/finance/billing',
    '/finance/budgets', '/finance/cost-centers', '/finance/vendors',
    '/finance/assets', '/finance/deposits', '/finance/settings'
  ];
  
  for (const url of urls) {
    console.log(`\n📄 ${url}`);
    warnings.clear();
    try {
      await page.goto('http://localhost:8080' + url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(3000);
      
      if (warnings.size > 0) {
        console.log(`  ❌ INFINITE LOOP: ${warnings.size} unique warnings`);
      } else {
        console.log(`  ✅ OK`);
      }
    } catch(e) {
      console.log(`  ❌ Error: ${e.message.substring(0, 80)}`);
    }
  }
  
  await browser.close();
  console.log('\nDone');
})();
