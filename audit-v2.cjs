const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // === DESKTOP (1440x900) ===
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  page.on('console', () => {});

  // Login
  await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);
  const email = await page.$('input[type="email"]') || await page.$('input[name="email"]');
  const pass = await page.$('input[type="password"]');
  if (email && pass) {
    await email.fill('khamis-1992@hotmail.com');
    await pass.fill('123456789');
    const btn = await page.$('button[type="submit"]') || await page.$('button:has-text("تسجيل")');
    if (btn) await btn.click();
    await page.waitForTimeout(6000);
  }

  const desktopPages = [
    ['desktop/00-login', '/auth'],
    ['desktop/01-dashboard', '/dashboard'],
    ['desktop/02-finance-overview', '/finance/overview'],
    ['desktop/03-billing', '/finance/billing'],
    ['desktop/04-treasury', '/finance/treasury'],
    ['desktop/05-general-ledger', '/finance/general-ledger'],
    ['desktop/06-chart-of-accounts', '/finance/chart-of-accounts'],
    ['desktop/07-reports', '/finance/reports'],
    ['desktop/08-budgets', '/finance/budgets'],
    ['desktop/09-cost-centers', '/finance/cost-centers'],
    ['desktop/10-vendors', '/finance/vendors'],
    ['desktop/11-assets', '/finance/fixed-assets'],
    ['desktop/12-deposits', '/finance/deposits'],
    ['desktop/13-finance-settings', '/finance/settings'],
    ['desktop/14-customers', '/customers'],
    ['desktop/15-fleet', '/fleet'],
    ['desktop/16-contracts', '/contracts'],
    ['desktop/17-hr-employees', '/hr/employees'],
    ['desktop/18-hr-payroll', '/hr/payroll'],
    ['desktop/19-legal-cases', '/legal/cases'],
    ['desktop/20-tasks', '/tasks'],
    ['desktop/21-settings', '/settings'],
  ];

  for (const [name, url] of desktopPages) {
    await page.goto('http://localhost:8080' + url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `/tmp/fleetifyapp/audit-v2/${name}.png`, fullPage: false });
    console.log(`✅ ${name}`);
  }

  // === MOBILE (375x812 iPhone X) ===
  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true });
  const mpage = await mobile.newPage();
  mpage.on('console', () => {});

  await mpage.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 20000 });
  await mpage.waitForTimeout(3000);
  const mEmail = await mpage.$('input[type="email"]') || await mpage.$('input[name="email"]');
  const mPass = await mpage.$('input[type="password"]');
  if (mEmail && mPass) {
    await mEmail.fill('khamis-1992@hotmail.com');
    await mPass.fill('123456789');
    const mBtn = await mpage.$('button[type="submit"]') || await mpage.$('button:has-text("تسجيل")');
    if (mBtn) await mBtn.click();
    await mpage.waitForTimeout(6000);
  }

  const mobilePages = [
    ['mobile/01-dashboard', '/dashboard'],
    ['mobile/02-finance-overview', '/finance/overview'],
    ['mobile/03-billing', '/finance/billing'],
    ['mobile/04-treasury', '/finance/treasury'],
    ['mobile/05-general-ledger', '/finance/general-ledger'],
    ['mobile/06-reports', '/finance/reports'],
    ['mobile/07-customers', '/customers'],
    ['mobile/08-fleet', '/fleet'],
    ['mobile/09-hr-employees', '/hr/employees'],
    ['mobile/10-tasks', '/tasks'],
  ];

  for (const [name, url] of mobilePages) {
    await mpage.goto('http://localhost:8080' + url, { waitUntil: 'networkidle', timeout: 20000 });
    await mpage.waitForTimeout(3000);
    await mpage.screenshot({ path: `/tmp/fleetifyapp/audit-v2/${name}.png`, fullPage: false });
    console.log(`📱 ${name}`);
  }

  // === TABLET (768x1024) ===
  const tablet = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const tpage = await tablet.newPage();
  tpage.on('console', () => {});

  await tpage.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 20000 });
  await tpage.waitForTimeout(3000);
  const tEmail = await tpage.$('input[type="email"]') || await tpage.$('input[name="email"]');
  const tPass = await tpage.$('input[type="password"]');
  if (tEmail && tPass) {
    await tEmail.fill('khamis-1992@hotmail.com');
    await tPass.fill('123456789');
    const tBtn = await tpage.$('button[type="submit"]') || await tpage.$('button:has-text("تسجيل")');
    if (tBtn) await tBtn.click();
    await tpage.waitForTimeout(6000);
  }

  const tabletPages = [
    ['tablet/01-dashboard', '/dashboard'],
    ['tablet/02-finance-overview', '/finance/overview'],
    ['tablet/03-billing', '/finance/billing'],
    ['tablet/04-treasury', '/finance/treasury'],
    ['tablet/05-fleet', '/fleet'],
  ];

  for (const [name, url] of tabletPages) {
    await tpage.goto('http://localhost:8080' + url, { waitUntil: 'networkidle', timeout: 20000 });
    await tpage.waitForTimeout(3000);
    await tpage.screenshot({ path: `/tmp/fleetifyapp/audit-v2/${name}.png`, fullPage: false });
    console.log(`📋 ${name}`);
  }

  await browser.close();
  console.log('\n✅ All screenshots captured');
})();
