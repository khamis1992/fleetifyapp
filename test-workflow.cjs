const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('console', () => {});

  // Login
  await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);
  const email = await page.$('input[type="email"]') || await page.$('input[name="email"]');
  const pass = await page.$('input[type="password"]');
  if (email && pass) {
    await email.fill('khamis-1992@hotmail.com');
    await pass.fill('123456789');
    const btn = await page.$('button[type="submit"]') || await page.$('button:has-text("تسجيل")');
    if (btn) await btn.click();
    await page.waitForTimeout(5000);
  }

  // Capture key workflow pages
  const shots = [
    ['01-dashboard', '/dashboard'],
    ['02-finance-overview', '/finance/overview'],
    ['03-billing', '/finance/billing'],
    ['04-treasury', '/finance/treasury'],
    ['05-general-ledger', '/finance/general-ledger'],
    ['06-chart-of-accounts', '/finance/chart-of-accounts'],
    ['07-reports', '/finance/reports'],
    ['08-budgets', '/finance/budgets'],
    ['09-cost-centers', '/finance/cost-centers'],
    ['10-vendors', '/finance/vendors'],
    ['11-assets', '/finance/assets'],
    ['12-deposits', '/finance/deposits'],
    ['13-finance-settings', '/finance/settings'],
    ['14-customers', '/customers'],
    ['15-fleet', '/fleet'],
    ['16-contracts', '/contracts'],
    ['17-hr-employees', '/hr/employees'],
    ['18-hr-payroll', '/hr/payroll'],
    ['19-legal-cases', '/legal/cases'],
    ['20-tasks', '/tasks'],
    ['21-settings', '/settings'],
  ];

  for (const [name, url] of shots) {
    try {
      await page.goto('http://localhost:8080' + url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `/tmp/fleetifyapp/screenshots/workflow/${name}.png`, fullPage: false });
      console.log(`✅ ${name}`);
    } catch(e) {
      console.log(`❌ ${name}`);
    }
  }

  // Also capture sidebar navigation for review
  await page.goto('http://localhost:8080/finance/overview', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  // Take a wider screenshot to see sidebar
  await page.screenshot({ path: '/tmp/fleetifyapp/screenshots/workflow/00-sidebar.png', fullPage: false });

  await browser.close();
  console.log('\nDone — 21 screenshots saved');
})();
