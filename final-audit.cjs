const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  async function login(vp) {
    const ctx = await browser.newContext(vp);
    const p = await ctx.newPage();
    p.on('console', () => {});
    await p.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 20000 });
    await p.waitForTimeout(3000);
    const e = await p.$('input[type="email"]') || await p.$('input[name="email"]');
    const pw = await p.$('input[type="password"]');
    if (e && pw) { await e.fill('khamis-1992@hotmail.com'); await pw.fill('123456789'); const b = await p.$('button[type="submit"]') || await p.$('button:has-text("تسجيل")'); if (b) await b.click(); await p.waitForTimeout(6000); }
    return p;
  }
  
  const p = await login({ viewport: { width: 1440, height: 900 } });
  const urls = ['/dashboard','/finance/overview','/finance/billing','/finance/treasury','/finance/general-ledger','/finance/budgets','/finance/cost-centers','/hr/employees','/hr/payroll','/legal/cases','/tasks','/customers','/fleet','/contracts','/settings'];
  for (let i = 0; i < urls.length; i++) { await p.goto('http://localhost:8080'+urls[i], {waitUntil:'networkidle',timeout:20000}); await p.waitForTimeout(3000); await p.screenshot({path:`/tmp/fleetifyapp/final/desktop/${String(i).padStart(2,'0')}.png`}); console.log(`✅ ${urls[i]}`); }

  const mp = await login({ viewport: { width: 375, height: 812 }, isMobile: true });
  const murls = ['/dashboard','/finance/billing','/finance/treasury','/hr/employees','/legal/cases','/tasks','/customers','/fleet'];
  for (let i = 0; i < murls.length; i++) { await mp.goto('http://localhost:8080'+murls[i], {waitUntil:'networkidle',timeout:20000}); await mp.waitForTimeout(3000); await mp.screenshot({path:`/tmp/fleetifyapp/final/mobile/${String(i).padStart(2,'0')}.png`}); console.log(`📱 ${murls[i]}`); }

  const tp = await login({ viewport: { width: 768, height: 1024 } });
  const turls = ['/dashboard','/finance/overview','/fleet','/hr/employees'];
  for (let i = 0; i < turls.length; i++) { await tp.goto('http://localhost:8080'+turls[i], {waitUntil:'networkidle',timeout:20000}); await tp.waitForTimeout(3000); await tp.screenshot({path:`/tmp/fleetifyapp/final/tablet/${String(i).padStart(2,'0')}.png`}); console.log(`📋 ${turls[i]}`); }

  await browser.close();
  console.log('\n✅ All done');
})();
