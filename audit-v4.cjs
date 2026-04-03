const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const pages = [
    ['v4/d01', '/dashboard'],
    ['v4/d02', '/finance/overview'],
    ['v4/d03', '/finance/billing'],
    ['v4/d04', '/finance/treasury'],
    ['v4/d05', '/finance/general-ledger'],
    ['v4/d06', '/finance/budgets'],
    ['v4/d07', '/finance/cost-centers'],
    ['v4/d08', '/hr/employees'],
    ['v4/d09', '/hr/payroll'],
    ['v4/d10', '/legal/cases'],
    ['v4/d11', '/tasks'],
    ['v4/d12', '/customers'],
    ['v4/d13', '/fleet'],
    ['v4/d14', '/contracts'],
    ['v4/d15', '/settings'],
  ];
  const mobile = [
    ['v4/m01', '/dashboard'],
    ['v4/m02', '/finance/billing'],
    ['v4/m03', '/hr/employees'],
    ['v4/m04', '/legal/cases'],
    ['v4/m05', '/tasks'],
    ['v4/m06', '/fleet'],
  ];
  const tablet = [
    ['v4/t01', '/dashboard'],
    ['v4/t02', '/finance/overview'],
  ];

  async function login(ctx) {
    const p = await ctx.newPage();
    p.on('console', () => {});
    await p.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 20000 });
    await p.waitForTimeout(3000);
    const e = await p.$('input[type="email"]') || await p.$('input[name="email"]');
    const pw = await p.$('input[type="password"]');
    if (e && pw) { await e.fill('khamis-1992@hotmail.com'); await pw.fill('123456789'); const b = await p.$('button[type="submit"]') || await p.$('button:has-text("تسجيل")'); if (b) await b.click(); await p.waitForTimeout(6000); }
    return p;
  }

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await login(desktop);
  for (const [name, url] of pages) { await p.goto('http://localhost:8080'+url, {waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(3000); await p.screenshot({path:`/tmp/fleetifyapp/audit-v2/${name}.png`}); console.log('✅ '+name); }

  const mob = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true });
  const mp = await login(mob);
  for (const [name, url] of mobile) { await mp.goto('http://localhost:8080'+url, {waitUntil:'networkidle',timeout:20000}); await mp.waitForTimeout(3000); await mp.screenshot({path:`/tmp/fleetifyapp/audit-v2/${name}.png`}); console.log('📱 '+name); }

  const tab = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const tp = await login(tab);
  for (const [name, url] of tablet) { await tp.goto('http://localhost:8080'+url, {waitUntil:'networkidle',timeout:20000}); await tp.waitForTimeout(3000); await tp.screenshot({path:`/tmp/fleetifyapp/audit-v2/${name}.png`}); console.log('📋 '+name); }

  await browser.close();
  console.log('\n✅ Done');
})();
