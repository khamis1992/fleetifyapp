const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // Desktop
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  page.on('console', () => {});
  await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);
  const email = await page.$('input[type="email"]') || await page.$('input[name="email"]');
  const pass = await page.$('input[type="password"]');
  if (email && pass) { await email.fill('khamis-1992@hotmail.com'); await pass.fill('123456789'); const btn = await page.$('button[type="submit"]') || await page.$('button:has-text("تسجيل")'); if (btn) await btn.click(); await page.waitForTimeout(6000); }

  const pages = [
    ['v3/00-dashboard', '/dashboard'],
    ['v3/01-finance-overview', '/finance/overview'],
    ['v3/02-billing', '/finance/billing'],
    ['v3/03-treasury', '/finance/treasury'],
    ['v3/04-general-ledger', '/finance/general-ledger'],
    ['v3/05-budgets', '/finance/budgets'],
    ['v3/06-cost-centers', '/finance/cost-centers'],
    ['v3/07-hr-employees', '/hr/employees'],
    ['v3/08-hr-payroll', '/hr/payroll'],
    ['v3/09-legal-cases', '/legal/cases'],
    ['v3/10-tasks', '/tasks'],
    ['v3/11-customers', '/customers'],
    ['v3/12-fleet', '/fleet'],
  ];

  for (const [name, url] of pages) {
    await page.goto('http://localhost:8080' + url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `/tmp/fleetifyapp/audit-v2/${name}.png`, fullPage: false });
    console.log(`✅ ${name}`);
  }

  // Mobile
  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true });
  const mp = await mobile.newPage();
  mp.on('console', () => {});
  await mp.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 20000 });
  await mp.waitForTimeout(3000);
  const me = await mp.$('input[type="email"]') || await mp.$('input[name="email"]');
  const mpa = await mp.$('input[type="password"]');
  if (me && mpa) { await me.fill('khamis-1992@hotmail.com'); await mpa.fill('123456789'); const mb = await mp.$('button[type="submit"]') || await mp.$('button:has-text("تسجيل")'); if (mb) await mb.click(); await mp.waitForTimeout(6000); }

  const mobilePages = [
    ['v3/m01-dashboard', '/dashboard'],
    ['v3/m02-billing', '/finance/billing'],
    ['v3/m03-hr-employees', '/hr/employees'],
    ['v3/m04-legal-cases', '/legal/cases'],
    ['v3/m05-tasks', '/tasks'],
    ['v3/m06-fleet', '/fleet'],
  ];

  for (const [name, url] of mobilePages) {
    await mp.goto('http://localhost:8080' + url, { waitUntil: 'networkidle', timeout: 20000 });
    await mp.waitForTimeout(3000);
    await mp.screenshot({ path: `/tmp/fleetifyapp/audit-v2/${name}.png`, fullPage: false });
    console.log(`📱 ${name}`);
  }

  // Tablet
  const tablet = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const tp = await tablet.newPage();
  tp.on('console', () => {});
  await tp.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 20000 });
  await tp.waitForTimeout(3000);
  const te = await tp.$('input[type="email"]') || await tp.$('input[name="email"]');
  const tpa = await tp.$('input[type="password"]');
  if (te && tpa) { await te.fill('khamis-1992@hotmail.com'); await tpa.fill('123456789'); const tb = await tp.$('button[type="submit"]') || await tp.$('button:has-text("تسجيل")'); if (tb) await tb.click(); await tp.waitForTimeout(6000); }

  const tabletPages = [
    ['v3/t01-dashboard', '/dashboard'],
    ['v3/t02-finance', '/finance/overview'],
    ['v3/t03-hr', '/hr/employees'],
  ];

  for (const [name, url] of tabletPages) {
    await tp.goto('http://localhost:8080' + url, { waitUntil: 'networkidle', timeout: 20000 });
    await tp.waitForTimeout(3000);
    await tp.screenshot({ path: `/tmp/fleetifyapp/audit-v2/${name}.png`, fullPage: false });
    console.log(`📋 ${name}`);
  }

  await browser.close();
  console.log('\n✅ Done');
})();
