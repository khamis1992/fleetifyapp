const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // Desktop
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  page.on('console', () => {});

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

  const desktopPages = [
    ['d01-dashboard', 'dashboard'],
    ['d02-sidebar-search', 'finance/overview'],
    ['d03-finance', 'finance/billing'],
    ['d04-treasury', 'finance/treasury'],
    ['d05-customers', 'customers'],
    ['d06-fleet', 'fleet'],
  ];

  for (const [name, url] of desktopPages) {
    await page.goto('http://localhost:8080/' + url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `/tmp/fleetifyapp/audit/final/${name}.png`, fullPage: false });
    console.log(`✅ ${name}`);
  }

  // Mobile
  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true });
  const mpage = await mobile.newPage();
  mpage.on('console', () => {});

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
    ['m02-finance', 'finance/overview'],
    ['m03-billing', 'finance/billing'],
    ['m04-treasury', 'finance/treasury'],
    ['m05-customers', 'customers'],
    ['m06-fleet', 'fleet'],
  ];

  for (const [name, url] of mobilePages) {
    await mpage.goto('http://localhost:8080/' + url, { waitUntil: 'networkidle', timeout: 20000 });
    await mpage.waitForTimeout(2500);
    await mpage.screenshot({ path: `/tmp/fleetifyapp/audit/final/${name}.png`, fullPage: false });
    console.log(`📱 ${name}`);
  }

  await browser.close();
  console.log('\nDone');
})();
