const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // Desktop
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
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

  // ALL pages - desktop
  const pages = [
    '00-login', 'auth',
    '01-dashboard', 'dashboard',
    '02-finance-overview', 'finance/overview',
    '03-billing-invoices', 'finance/billing',
    '04-billing-payments', 'finance/billing',  // same page, we'll switch tab
    '05-treasury', 'finance/treasury',
    '06-general-ledger', 'finance/general-ledger',
    '07-chart-of-accounts', 'finance/chart-of-accounts',
    '08-reports', 'finance/reports',
    '09-budgets', 'finance/budgets',
    '10-cost-centers', 'finance/cost-centers',
    '11-vendors', 'finance/vendors',
    '12-assets', 'finance/assets',
    '13-deposits', 'finance/deposits',
    '14-finance-settings', 'finance/settings',
    '15-customers', 'customers',
    '16-fleet', 'fleet',
    '17-contracts', 'contracts',
    '18-quotations', 'quotations',
    '19-hr-employees', 'hr/employees',
    '20-hr-payroll', 'hr/payroll',
    '21-legal-cases', 'legal/cases',
    '22-tasks', 'tasks',
    '23-settings', 'settings',
  ];

  for (let i = 0; i < pages.length; i += 2) {
    const name = pages[i];
    const url = pages[i + 1];
    try {
      await page.goto('http://localhost:8080/' + url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `/tmp/fleetifyapp/audit/desktop/${name}.png`, fullPage: false });
      console.log(`✅ ${name}`);
    } catch(e) {
      console.log(`❌ ${name}`);
    }
  }

  // Mobile viewport (375x812 - iPhone X)
  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true });
  const mpage = await mobile.newPage();
  mpage.on('console', () => {});

  // Login mobile
  await mpage.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 20000 });
  await mpage.waitForTimeout(2000);
  const mEmail = await mpage.$('input[type="email"]') || await mpage.$('input[name="email"]');
  const mPass = await mpage.$('input[type="password"]');
  if (mEmail && mPass) {
    await mEmail.fill('khamis-1992@hotmail.com');
    await mPass.fill('123456789');
    const mBtn = await mpage.$('button[type="submit"]') || await mpage.$('button:has-text("تسجيل")');
    if (mBtn) await mBtn.click();
    await mpage.waitForTimeout(5000);
  }

  const mobilePages = [
    ['m01-dashboard', 'dashboard'],
    ['m02-finance-overview', 'finance/overview'],
    ['m03-billing', 'finance/billing'],
    ['m04-treasury', 'finance/treasury'],
    ['m05-general-ledger', 'finance/general-ledger'],
    ['m06-reports', 'finance/reports'],
    ['m07-customers', 'customers'],
    ['m08-fleet', 'fleet'],
  ];

  for (const [name, url] of mobilePages) {
    try {
      await mpage.goto('http://localhost:8080/' + url, { waitUntil: 'networkidle', timeout: 20000 });
      await mpage.waitForTimeout(2500);
      await mpage.screenshot({ path: `/tmp/fleetifyapp/audit/mobile/${name}.png`, fullPage: false });
      console.log(`📱 ${name}`);
    } catch(e) {
      console.log(`📱❌ ${name}`);
    }
  }

  // Tablet (768x1024)
  const tablet = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const tpage = await tablet.newPage();
  tpage.on('console', () => {});

  await tpage.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 20000 });
  await tpage.waitForTimeout(2000);
  const tEmail = await tpage.$('input[type="email"]') || await tpage.$('input[name="email"]');
  const tPass = await tpage.$('input[type="password"]');
  if (tEmail && tPass) {
    await tEmail.fill('khamis-1992@hotmail.com');
    await tPass.fill('123456789');
    const tBtn = await tpage.$('button[type="submit"]') || await tpage.$('button:has-text("تسجيل")');
    if (tBtn) await tBtn.click();
    await tpage.waitForTimeout(5000);
  }

  await tpage.goto('http://localhost:8080/finance/overview', { waitUntil: 'networkidle', timeout: 20000 });
  await tpage.waitForTimeout(2500);
  await tpage.screenshot({ path: '/tmp/fleetifyapp/audit/tablet/t01-finance-overview.png', fullPage: false });
  console.log('📱 t01-finance-overview');

  await browser.close();
  console.log('\nDone — audit screenshots complete');
})();
