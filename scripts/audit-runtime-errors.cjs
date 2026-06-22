/**
 * Runtime Error Audit Script (CommonJS version)
 * 
 * Uses Playwright to visit every route and capture console errors.
 * Outputs: scripts/runtime-audit-results.json
 * 
 * Usage: npx tsx --tsconfig tsconfig.audit.json scripts/audit-runtime-errors.ts
 *   or:  node --loader ts-node/esm scripts/audit-runtime-errors.ts
 *   or:  npx tsx scripts/audit-runtime-errors.cts
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const __dirname_script = __dirname;

// Routes from src/routes/index.ts — protected routes (need login)
const PROTECTED_ROUTES = [
  '/dashboard', '/dashboard-v2', '/employee-workspace', '/team-management',
  '/team-reports', '/customers', '/customers/crm', '/contracts', '/fleet',
  '/reports', '/reports/hub', '/search', '/import',
  '/finance/invoice-scanner', '/finance/tracking', '/finance/sync-payments',
  '/finance/payments/register', '/finance/payments/quick',
  '/finance/vendors', '/finance/vendors/categories',
  '/finance/purchase-orders', '/finance/reports/ar-aging',
  '/finance/payments/tracking',
  '/admin', '/admin/dashboard', '/admin/companies', '/admin/users',
  '/admin/settings', '/admin/payments', '/admin/reports', '/admin/quality',
  '/admin/duplicate-invoices',
  '/profile', '/settings', '/settings/advanced', '/settings/audit-logs',
  '/settings/permissions', '/settings/subscription', '/settings/e-signature',
  '/settings/whatsapp',
  '/properties', '/properties/add', '/properties/owners', '/properties/map',
  '/properties/maintenance', '/properties/contracts',
  '/fleet/maintenance', '/fleet/traffic-violations',
  '/fleet/traffic-violations/import', '/fleet/traffic-violations/payments',
  '/fleet/reports', '/fleet/dispatch-permits', '/fleet/reservations',
  '/fleet/vehicle-installments',
  '/hr', '/hr/employees', '/hr/users', '/hr/user-management',
  '/hr/attendance', '/hr/leave', '/hr/locations', '/hr/payroll',
  '/hr/reports', '/hr/settings',
  '/dashboards/integration',
  '/sales/pipeline', '/sales/leads', '/sales/opportunities',
  '/sales/quotes', '/sales/orders', '/sales/analytics',
  '/quotations', '/quotations/approval',
  '/backup', '/audit', '/approvals', '/support', '/tenants',
  '/performance', '/performance/monitor',
  '/legal', '/legal/cases', '/legal/cases-v2', '/legal/defaulters',
  '/legal/reports', '/legal/late-fees', '/legal/whatsapp-reminders',
  '/legal/disputes', '/legal/document-generator', '/legal/documents',
  '/legal/delinquency', '/legal/lawsuit-data', '/legal/overdue-contracts',
  '/contracts/duplicates', '/contracts/diagnostics', '/contracts/signed-agreements',
  '/fix/vehicle-data', '/tasks', '/help', '/dashboard-landing',
];

const PUBLIC_ROUTES = [
  '/', '/premium', '/enterprise', '/auth', '/login',
  '/about', '/careers', '/privacy-policy', '/terms-and-conditions',
];

const BASE_URL = 'http://localhost:8080';
const LOGIN_EMAIL = 'khamis-1992@hotmail.com';
const LOGIN_PASSWORD = '123456789';
const OUTPUT_DIR = __dirname_script;
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, 'audit-screenshots');

async function login(page) {
  try {
    console.log('🔐 Logging in...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', LOGIN_EMAIL);
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(LOGIN_PASSWORD);
    await passwordInput.press('Enter');
    await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => null);
    await page.waitForTimeout(3000);
    console.log('✅ Login done');
    return true;
  } catch (err) {
    console.error('❌ Login error:', err.message);
    return false;
  }
}

async function auditRoute(page, route) {
  const consoleErrors = [];
  const networkErrors = [];
  const startTime = Date.now();

  const consoleHandler = (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        type: msg.type(),
        text: msg.text().substring(0, 500),
      });
    }
  };
  page.on('console', consoleHandler);

  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('supabase') || url.includes('rest/v1')) {
      const status = response.status();
      if (status >= 400) {
        networkErrors.push({
          url: url.substring(0, 200),
          status,
          method: response.request().method(),
        });
      }
    }
  });

  let status = 'loaded';
  try {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
  } catch (err) {
    status = err.name === 'TimeoutError' ? 'timeout' : 'error';
  }

  const loadTime = Date.now() - startTime;

  const screenshotName = route.replace(/\//g, '_').substring(1) || 'root';
  const screenshotPath = path.join(SCREENSHOT_DIR, `${screenshotName}.png`);
  try { await page.screenshot({ path: screenshotPath, fullPage: false }); } catch {}

  page.off('console', consoleHandler);

  return { route, status, consoleErrors, networkErrors, loadTime };
}

async function main() {
  console.log('🚀 Starting runtime audit...');
  console.log(`   Protected: ${PROTECTED_ROUTES.length}, Public: ${PUBLIC_ROUTES.length}`);

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await login(page);

  const results = [];

  console.log('\n📋 Testing protected routes...');
  for (let i = 0; i < PROTECTED_ROUTES.length; i++) {
    const route = PROTECTED_ROUTES[i];
    process.stdout.write(`  [${i + 1}/${PROTECTED_ROUTES.length}] ${route.padEnd(45)} `);
    const result = await auditRoute(page, route);
    results.push(result);
    const errs = result.consoleErrors.length + result.networkErrors.length;
    if (errs > 0) {
      console.log(`❌ ${errs} errors (${result.loadTime}ms)`);
    } else {
      console.log(`✅ (${result.loadTime}ms)`);
    }
  }

  console.log('\n📋 Testing public routes...');
  for (let i = 0; i < PUBLIC_ROUTES.length; i++) {
    const route = PUBLIC_ROUTES[i];
    process.stdout.write(`  [${i + 1}/${PUBLIC_ROUTES.length}] ${route.padEnd(45)} `);
    const result = await auditRoute(page, route);
    results.push(result);
    const errs = result.consoleErrors.length + result.networkErrors.length;
    if (errs > 0) {
      console.log(`❌ ${errs} errors (${result.loadTime}ms)`);
    } else {
      console.log(`✅ (${result.loadTime}ms)`);
    }
  }

  await browser.close();

  // Summary
  const routesWithErrors = results.filter(r => r.consoleErrors.length > 0 || r.networkErrors.length > 0);
  const routesTimedOut = results.filter(r => r.status === 'timeout');
  const routesClean = results.filter(r => r.consoleErrors.length === 0 && r.networkErrors.length === 0);
  const allConsoleErrors = results.flatMap(r => r.consoleErrors.map(e => ({ ...e, route: r.route })));
  const allNetworkErrors = results.flatMap(r => r.networkErrors.map(e => ({ ...e, route: r.route })));

  // Group errors by text
  const errorGroups = {};
  allConsoleErrors.forEach(e => {
    const key = e.text.substring(0, 100);
    if (!errorGroups[key]) errorGroups[key] = { count: 0, routes: [] };
    errorGroups[key].count++;
    if (!errorGroups[key].routes.includes(e.route)) errorGroups[key].routes.push(e.route);
  });

  const summary = {
    totalRoutes: results.length,
    routesClean: routesClean.length,
    routesWithErrors: routesWithErrors.length,
    routesTimedOut: routesTimedOut.length,
    totalConsoleErrors: allConsoleErrors.length,
    totalNetworkErrors: allNetworkErrors.length,
    topErrors: Object.entries(errorGroups)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20)
      .map(([text, info]) => ({ text, count: info.count, routes: info.routes })),
  };

  console.log('\n' + '='.repeat(70));
  console.log('  RUNTIME AUDIT COMPLETE');
  console.log('='.repeat(70));
  console.log(`  Total routes:          ${summary.totalRoutes}`);
  console.log(`  Clean routes:          ${summary.routesClean}`);
  console.log(`  Routes with errors:    ${summary.routesWithErrors}`);
  console.log(`  Routes timed out:      ${summary.routesTimedOut}`);
  console.log(`  Total console errors:  ${summary.totalConsoleErrors}`);
  console.log(`  Total network errors:  ${summary.totalNetworkErrors}`);

  if (summary.topErrors.length > 0) {
    console.log('\n  Top recurring errors:');
    summary.topErrors.forEach((e, i) => {
      console.log(`    ${i + 1}. [${e.count}x on ${e.routes.length} routes] ${e.text.substring(0, 100)}`);
      console.log(`       Routes: ${e.routes.slice(0, 5).join(', ')}${e.routes.length > 5 ? '...' : ''}`);
    });
  }

  if (routesWithErrors.length > 0) {
    console.log('\n  Routes with errors:');
    routesWithErrors.forEach(r => {
      console.log(`    ❌ ${r.route} — ${r.consoleErrors.length} console, ${r.networkErrors.length} network`);
      r.consoleErrors.slice(0, 2).forEach(e => {
        console.log(`       console: ${e.text.substring(0, 120)}`);
      });
      r.networkErrors.slice(0, 2).forEach(e => {
        console.log(`       network: ${e.method} ${e.url.substring(0, 80)} → ${e.status}`);
      });
    });
  }

  console.log('\n' + '='.repeat(70));

  const outputPath = path.join(OUTPUT_DIR, 'runtime-audit-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({ summary, results }, null, 2));
  console.log(`\n✅ Results saved to: ${outputPath}`);
  console.log(`📸 Screenshots: ${SCREENSHOT_DIR}`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });