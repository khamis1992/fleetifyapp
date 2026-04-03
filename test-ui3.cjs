const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  // Suppress warnings for clean output
  page.on('console', () => {});
  
  // Login
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
  
  const pages = [
    'Finance-Overview', '/finance/overview',
    'Treasury', '/finance/treasury',
    'General-Ledger', '/finance/general-ledger',
    'ChartOfAccounts', '/finance/chart-of-accounts',
    'Reports', '/finance/reports',
    'BillingCenter', '/finance/billing',
    'Budgets', '/finance/budgets',
    'CostCenters', '/finance/cost-centers',
    'Vendors', '/finance/vendors',
    'FixedAssets', '/finance/assets',
    'Deposits', '/finance/deposits',
    'FinanceSettings', '/finance/settings',
  ];
  
  for (let i = 0; i < pages.length; i += 2) {
    const name = pages[i];
    const url = pages[i+1];
    try {
      await page.goto('http://localhost:8080' + url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `/tmp/fleetifyapp/screenshots/${name}.png`, fullPage: false });
      console.log(`✅ ${name}`);
    } catch(e) {
      console.log(`❌ ${name}: ${e.message.substring(0, 60)}`);
    }
  }
  
  await browser.close();
  console.log('Done - all screenshots saved');
})();
