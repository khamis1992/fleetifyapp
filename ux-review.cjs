const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8080';
const OUT = '/tmp/fleetifyapp/ux-review';
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 768 },
  mobile: { width: 390, height: 844 },
};

// Pages to capture (route, filename)
const PAGES = [
  // Auth & Landing
  { route: '/auth', name: '00-login' },
  { route: '/', name: '01-landing' },
  
  // Main App
  { route: '/dashboard', name: '10-dashboard' },
  
  // Finance
  { route: '/finance/overview', name: '20-finance-overview' },
  { route: '/finance/billing', name: '21-billing' },
  { route: '/finance/treasury', name: '22-treasury' },
  { route: '/finance/general-ledger', name: '23-general-ledger' },
  { route: '/finance/chart-of-accounts', name: '24-chart-of-accounts' },
  { route: '/finance/reports', name: '25-finance-reports' },
  { route: '/finance/budgets', name: '26-budgets' },
  { route: '/finance/cost-centers', name: '27-cost-centers' },
  { route: '/finance/vendors', name: '28-vendors' },
  { route: '/finance/fixed-assets', name: '29-fixed-assets' },
  { route: '/finance/deposits', name: '30-deposits' },
  { route: '/finance/settings', name: '31-finance-settings' },
  
  // Core
  { route: '/customers', name: '40-customers' },
  { route: '/fleet', name: '50-fleet' },
  { route: '/contracts', name: '60-contracts' },
  { route: '/quotations', name: '70-quotations' },
  { route: '/sales/quotes', name: '71-sales-quotes' },
  
  // HR
  { route: '/hr/employees', name: '80-hr-employees' },
  { route: '/hr/payroll', name: '81-hr-payroll' },
  { route: '/hr/attendance', name: '82-hr-attendance' },
  
  // Other
  { route: '/legal/cases', name: '90-legal-cases' },
  { route: '/tasks', name: '100-tasks' },
  { route: '/settings', name: '110-settings' },
  { route: '/reports', name: '120-reports' },
  { route: '/approvals', name: '130-approvals' },
  { route: '/support', name: '140-support' },
];

async function captureAll() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORTS.desktop,
    locale: 'ar-SA',
  });

  // Login first
  const page = await context.newPage();
  console.log('Logging in...');
  await page.goto(BASE + '/auth', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Fill login form
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="بريد"], input[placeholder*="email"], input[placeholder*="Email"]').first();
  const passInput = page.locator('input[type="password"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();
  
  if (await emailInput.count() > 0) {
    await emailInput.fill('khamis-1992@hotmail.com');
    await passInput.fill('123456789');
    await submitBtn.click();
    console.log('Login submitted, waiting for redirect...');
    await page.waitForURL(/dashboard/, { timeout: 15000 }).catch(() => {
      console.log('No redirect, waiting for navigation...');
    });
    await page.waitForTimeout(5000);
    console.log('Current URL:', page.url());
  } else {
    console.log('No login form found, proceeding...');
  }

  // Capture each page
  for (const { route, name } of PAGES) {
    for (const [device, vp] of Object.entries(VIEWPORTS)) {
      if (device !== 'desktop' && ['00-login', '01-landing'].includes(name)) continue;
      
      const page2 = await browser.newPage({ viewport: vp });
      try {
        console.log(`Capturing ${device}/${name}...`);
        await page2.goto(BASE + route, { waitUntil: 'networkidle', timeout: 20000 });
        await page2.waitForTimeout(3000); // Wait for data loading
        
        const dir = path.join(OUT, device);
        fs.mkdirSync(dir, { recursive: true });
        await page2.screenshot({
          path: path.join(dir, `${name}.png`),
          fullPage: device === 'desktop',
        });
        console.log(`  ✅ ${device}/${name}`);
      } catch (err) {
        console.log(`  ❌ ${device}/${name}: ${err.message.slice(0, 80)}`);
      } finally {
        await page2.close();
      }
    }
  }

  await browser.close();
  console.log('Done!');
}

captureAll().catch(console.error);
