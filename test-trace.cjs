const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  let stackTraces = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && msg.text().includes('Maximum update depth')) {
      const loc = msg.location();
      stackTraces.push(`File: ${loc.url}:${loc.lineNumber}:${loc.columnNumber}`);
    }
  });
  
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
  
  // Just test one page to get the stack trace
  await page.goto('http://localhost:8080/finance/overview', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);
  
  console.log('Unique stack traces:');
  [...new Set(stackTraces)].forEach(t => console.log(t));
  
  await browser.close();
})();
