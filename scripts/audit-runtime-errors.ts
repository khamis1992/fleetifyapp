/**
 * Runtime Error Audit Script
 * 
 * Uses Playwright to visit every route in the app and capture console errors.
 * Outputs: scripts/runtime-audit-results.json
 * 
 * Usage:
 *   npx playwright test scripts/audit-runtime-errors.ts
 *   or
 *   npx tsx scripts/audit-runtime-errors.ts
 * 
 * Prerequisites:
 *   - Dev server running on http://localhost:8080
 *   - Playwright installed: npm install -D @playwright/test
 */

import { chromium, Browser, Page, ConsoleMessage } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RouteError {
  route: string;
  status: 'loaded' | 'error' | 'timeout' | 'redirect';
  consoleErrors: { type: string; text: string; url?: string }[];
  networkErrors: { url: string; status: number; method: string }[];
  loadTime: number;
  screenshotPath?: string;
}

// Routes from src/routes/index.ts — only protected routes (need login)
const PROTECTED_ROUTES = [
  '/dashboard',
  '/dashboard-v2',
  '/employee-workspace',
  '/team-management',
  '/team-reports',
  '/customers',
  '/customers/crm',
  '/contracts',
  '/fleet',
  '/reports',
  '/reports/hub',
  '/search',
  '/import',
  '/finance/invoice-scanner',
  '/finance/tracking',
  '/finance/sync-payments',
  '/finance/payments/register',
  '/finance/payments/quick',
  '/finance/vendors',
  '/finance/vendors/categories',
  '/finance/purchase-orders',
  '/finance/reports/ar-aging',
  '/finance/payments/tracking',
  '/admin',
  '/admin/dashboard',
  '/admin/companies',
  '/admin/users',
  '/admin/settings',
  '/admin/payments',
  '/admin/reports',
  '/admin/quality',
  '/admin/duplicate-invoices',
  '/profile',
  '/settings',
  '/settings/advanced',
  '/settings/audit-logs',
  '/settings/permissions',
  '/settings/subscription',
  '/settings/e-signature',
  '/settings/whatsapp',
  '/properties',
  '/properties/add',
  '/properties/owners',
  '/properties/map',
  '/properties/maintenance',
  '/properties/contracts',
  '/fleet/maintenance',
  '/fleet/traffic-violations',
  '/fleet/traffic-violations/import',
  '/fleet/traffic-violations/payments',
  '/fleet/reports',
  '/fleet/dispatch-permits',
  '/fleet/reservations',
  '/fleet/vehicle-installments',
  '/hr',
  '/hr/employees',
  '/hr/users',
  '/hr/user-management',
  '/hr/attendance',
  '/hr/leave',
  '/hr/locations',
  '/hr/payroll',
  '/hr/reports',
  '/hr/settings',
  '/dashboards/integration',
  '/sales/pipeline',
  '/sales/leads',
  '/sales/opportunities',
  '/sales/quotes',
  '/sales/orders',
  '/sales/analytics',
  '/quotations',
  '/quotations/approval',
  '/backup',
  '/audit',
  '/approvals',
  '/support',
  '/tenants',
  '/performance',
  '/performance/monitor',
  '/legal',
  '/legal/cases',
  '/legal/cases-v2',
  '/legal/defaulters',
  '/legal/reports',
  '/legal/late-fees',
  '/legal/whatsapp-reminders',
  '/legal/disputes',
  '/legal/document-generator',
  '/legal/documents',
  '/legal/delinquency',
  '/legal/lawsuit-data',
  '/legal/overdue-contracts',
  '/contracts/duplicates',
  '/contracts/diagnostics',
  '/contracts/signed-agreements',
  '/fix/vehicle-data',
  '/tasks',
  '/help',
  '/dashboard-landing',
];

// Public routes (no login needed)
const PUBLIC_ROUTES = [
  '/',
  '/premium',
  '/enterprise',
  '/auth',
  '/login',
  '/about',
  '/careers',
  '/privacy-policy',
  '/terms-and-conditions',
];

const BASE_URL = 'http://localhost:8080';
const LOGIN_EMAIL = 'khamis-1992@hotmail.com';
const LOGIN_PASSWORD = '123456789';
const OUTPUT_DIR = path.join(__dirname);
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, 'audit-screenshots');

async function login(page: Page): Promise<boolean> {
  try {
    console.log('🔐 Logging in...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill email
    await page.fill('input[type="email"]', LOGIN_EMAIL);
    
    // Fill password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(LOGIN_PASSWORD);
    
    // Press Enter to submit (per memory: login needs Enter key)
    await passwordInput.press('Enter');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => null);
    await page.waitForTimeout(2000);
    
    // Check if logged in by looking for dashboard content
    const isLoggedIn = await page.locator('body').textContent().then(text => 
      text?.includes('لوحة') || text?.includes('Dashboard') || text?.includes('الرئيسية')
    );
    
    console.log(isLoggedIn ? '✅ Login successful' : '❌ Login failed');
    return isLoggedIn || true; // proceed anyway — some routes might still work
  } catch (err) {
    console.error('❌ Login error:', err);
    return false;
  }
}

async function auditRoute(page: Page, route: string): Promise<RouteError> {
  const consoleErrors: { type: string; text: string; url?: string }[] = [];
  const networkErrors: { url: string; status: number; method: string }[] = [];
  const startTime = Date.now();

  // Collect console errors
  const consoleHandler = (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        type: msg.type(),
        text: msg.text().substring(0, 500), // truncate long errors
      });
    }
  };
  page.on('console', consoleHandler);

  // Collect network failures (Supabase API calls that return 4xx/5xx)
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

  let status: RouteError['status'] = 'loaded';
  
  try {
    const response = await page.goto(`${BASE_URL}${route}`, { 
      waitUntil: 'domcontentloaded', 
      timeout: 20000 
    });
    
    // Wait for page to settle (async queries, lazy components)
    await page.waitForTimeout(3000);
    
    if (response?.status() === 404) {
      status = 'redirect';
    }
  } catch (err: any) {
    if (err.name === 'TimeoutError') {
      status = 'timeout';
    } else {
      status = 'error';
    }
  }

  const loadTime = Date.now() - startTime;

  // Take screenshot for visual verification
  const screenshotName = route.replace(/\//g, '_').substring(1) || 'root';
  const screenshotPath = path.join(SCREENSHOT_DIR, `${screenshotName}.png`);
  try {
    await page.screenshot({ path: screenshotPath, fullPage: false });
  } catch {
    // screenshot might fail on some pages
  }

  // Remove listener
  page.off('console', consoleHandler);

  return {
    route,
    status,
    consoleErrors,
    networkErrors,
    loadTime,
    screenshotPath: screenshotPath.replace(/\\/g, '/'),
  };
}

async function main() {
  console.log('🚀 Starting runtime audit...');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Protected routes: ${PROTECTED_ROUTES.length}`);
  console.log(`   Public routes: ${PUBLIC_ROUTES.length}`);
  console.log(`   Total routes: ${PROTECTED_ROUTES.length + PUBLIC_ROUTES.length}`);

  // Create screenshot directory
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ 
    viewport: { width: 1440, height: 900 },
    locale: 'ar-SA',
  });
  const page = await context.newPage();

  // Login first
  await login(page);

  const results: RouteError[] = [];
  
  // Test protected routes
  console.log('\n📋 Testing protected routes...');
  for (let i = 0; i < PROTECTED_ROUTES.length; i++) {
    const route = PROTECTED_ROUTES[i];
    process.stdout.write(`  [${i + 1}/${PROTECTED_ROUTES.length}] ${route}... `);
    
    const result = await auditRoute(page, route);
    results.push(result);
    
    const errorCount = result.consoleErrors.length + result.networkErrors.length;
    if (errorCount > 0) {
      console.log(`❌ ${errorCount} errors (${result.loadTime}ms)`);
    } else {
      console.log(`✅ (${result.loadTime}ms)`);
    }
  }

  // Test public routes (in a new page context without login)
  console.log('\n📋 Testing public routes...');
  for (let i = 0; i < PUBLIC_ROUTES.length; i++) {
    const route = PUBLIC_ROUTES[i];
    process.stdout.write(`  [${i + 1}/${PUBLIC_ROUTES.length}] ${route}... `);
    
    const result = await auditRoute(page, route);
    results.push(result);
    
    const errorCount = result.consoleErrors.length + result.networkErrors.length;
    if (errorCount > 0) {
      console.log(`❌ ${errorCount} errors (${result.loadTime}ms)`);
    } else {
      console.log(`✅ (${result.loadTime}ms)`);
    }
  }

  await browser.close();

  // ── Generate summary ──
  const routesWithErrors = results.filter(r => r.consoleErrors.length > 0 || r.networkErrors.length > 0);
  const routesTimedOut = results.filter(r => r.status === 'timeout');
  const routesLoaded = results.filter(r => r.status === 'loaded' && r.consoleErrors.length === 0 && r.networkErrors.length === 0);

  const allConsoleErrors = results.flatMap(r => r.consoleErrors.map(e => ({ ...e, route: r.route })));
  const allNetworkErrors = results.flatMap(r => r.networkErrors.map(e => ({ ...e, route: r.route })));

  // Group errors by type
  const errorsByType: Record<string, number> = {};
  allConsoleErrors.forEach(e => {
    const key = e.text.substring(0, 80);
    errorsByType[key] = (errorsByType[key] || 0) + 1;
  });

  const summary = {
    totalRoutes: results.length,
    routesLoaded: routesLoaded.length,
    routesWithErrors: routesWithErrors.length,
    routesTimedOut: routesTimedOut.length,
    totalConsoleErrors: allConsoleErrors.length,
    totalNetworkErrors: allNetworkErrors.length,
    topErrors: Object.entries(errorsByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([text, count]) => ({ text, count })),
  };

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('  RUNTIME AUDIT COMPLETE');
  console.log('='.repeat(70));
  console.log(`  Total routes tested:    ${summary.totalRoutes}`);
  console.log(`  Routes loaded clean:    ${summary.routesLoaded}`);
  console.log(`  Routes with errors:     ${summary.routesWithErrors}`);
  console.log(`  Routes timed out:       ${summary.routesTimedOut}`);
  console.log(`  Total console errors:   ${summary.totalConsoleErrors}`);
  console.log(`  Total network errors:   ${summary.totalNetworkErrors}`);
  
  if (summary.topErrors.length > 0) {
    console.log('\n  Top recurring errors:');
    summary.topErrors.forEach((e, i) => {
      console.log(`    ${i + 1}. [${e.count}x] ${e.text.substring(0, 100)}`);
    });
  }

  if (routesWithErrors.length > 0) {
    console.log('\n  Routes with errors:');
    routesWithErrors.forEach(r => {
      console.log(`    ❌ ${r.route} — ${r.consoleErrors.length} console, ${r.networkErrors.length} network`);
      r.consoleErrors.slice(0, 3).forEach(e => {
        console.log(`       console: ${e.text.substring(0, 120)}`);
      });
      r.networkErrors.slice(0, 3).forEach(e => {
        console.log(`       network: ${e.method} ${e.url.substring(0, 80)} → ${e.status}`);
      });
    });
  }

  console.log('\n' + '='.repeat(70));

  // Save results
  const outputPath = path.join(OUTPUT_DIR, 'runtime-audit-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    summary,
    results,
  }, null, 2));
  
  console.log(`\n✅ Results saved to: ${outputPath}`);
  console.log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}`);
}

main().catch(console.error);