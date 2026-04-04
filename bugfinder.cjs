#!/usr/bin/env node
/**
 * Infinite Bug Finder - Continuous page-by-page testing and fixing
 * 
 * Loop:
 * 1. Login
 * 2. Visit every page
 * 3. Collect JS errors + render errors + console warnings
 * 4. Report findings
 * 5. Wait for fixes
 * 6. Repeat
 */

const { chromium } = require('playwright');
const fs = require('fs');

const PAGES = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/finance/overview', name: 'Finance Overview' },
  { path: '/finance/billing', name: 'Billing' },
  { path: '/finance/treasury', name: 'Treasury' },
  { path: '/finance/accounting', name: 'Accounting' },
  { path: '/finance/reports', name: 'Finance Reports' },
  { path: '/finance/budgets', name: 'Budgets' },
  { path: '/finance/vendors', name: 'Vendors' },
  { path: '/finance/fixed-assets', name: 'Fixed Assets' },
  { path: '/finance/deposits', name: 'Deposits' },
  { path: '/finance/cost-centers', name: 'Cost Centers' },
  { path: '/finance/chart-of-accounts', name: 'Chart of Accounts' },
  { path: '/finance/general-ledger', name: 'General Ledger' },
  { path: '/finance/alerts', name: 'Alerts' },
  { path: '/finance/settings', name: 'Finance Settings' },
  { path: '/finance/payments/quick', name: 'Quick Payment' },
  { path: '/finance/payments/register', name: 'Payment Register' },
  { path: '/finance/new-entry', name: 'New Journal Entry' },
  { path: '/finance/unified-payments', name: 'Unified Payments' },
  { path: '/finance/unified-reports', name: 'Unified Reports' },
  { path: '/customers', name: 'Customers' },
  { path: '/customers/23872043-2260-45e8-8275-4745a2b18518', name: 'Customer Details' },
  { path: '/fleet', name: 'Fleet' },
  { path: '/fleet/maintenance', name: 'Fleet Maintenance' },
  { path: '/fleet/reservations', name: 'Fleet Reservations' },
  { path: '/fleet/traffic-violations', name: 'Traffic Violations' },
  { path: '/contracts', name: 'Contracts' },
  { path: '/hr/employees', name: 'HR Employees' },
  { path: '/hr/attendance', name: 'HR Attendance' },
  { path: '/hr/payroll', name: 'HR Payroll' },
  { path: '/legal/cases', name: 'Legal Cases' },
  { path: '/tasks', name: 'Tasks' },
  { path: '/settings', name: 'Settings' },
  { path: '/reports', name: 'Reports Hub' },
];

const STATE_FILE = '/tmp/bugfinder-state.json';

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } 
  catch { return { round: 0, totalFixed: 0, history: [] }; }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const findings = {};
  const consoleWarnings = {};
  
  page.on('pageerror', err => {
    const url = page.url().replace('http://localhost:8080', '') || 'unknown';
    const msg = err.message.substring(0, 200);
    // Filter out known non-issues
    if (msg.includes('Download the React DevTools') || msg.includes('AudioContext')) return;
    if (!findings[url]) findings[url] = [];
    // Deduplicate
    if (!findings[url].some(f => f.includes(msg.substring(0, 50)))) {
      findings[url].push(msg);
    }
  });
  
  page.on('console', msg => {
    if (msg.type() !== 'warning') return;
    const url = page.url().replace('http://localhost:8080', '') || 'unknown';
    const text = msg.text();
    // Filter known warnings
    if (text.includes('Download the React DevTools') || text.includes('PWA') || text.includes('Service Worker')) return;
    if (text.includes('children with the same key') || text.includes('Encountered two children')) return;
    if (!consoleWarnings[url]) consoleWarnings[url] = [];
    if (!consoleWarnings[url].some(w => w.includes(text.substring(0, 50)))) {
      consoleWarnings[url].push(text.substring(0, 150));
    }
  });

  // Login
  console.log('🔐 Logging in...');
  await page.goto('http://localhost:8080/auth', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  await page.locator('input[type="email"]').first().fill('khamis-1992@hotmail.com');
  await page.locator('input[type="password"]').first().fill('123456789');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(8000);

  // Audit each page
  console.log(`\n🔍 Auditing ${PAGES.length} pages...\n`);
  
  for (let i = 0; i < PAGES.length; i++) {
    const { path, name } = PAGES[i];
    process.stdout.write(`  [${i + 1}/${PAGES.length}] ${name}... `);
    
    findings[path] = [];
    consoleWarnings[path] = [];
    
    try {
      await page.goto('http://localhost:8080' + path, { waitUntil: 'domcontentloaded', timeout: 12000 });
    } catch {
      findings[path].push('PAGE_LOAD_TIMEOUT');
    }
    
    await page.waitForTimeout(4000);
    
    // Check for render errors
    const body = await page.locator('body').innerText().catch(() => '');
    if (body.includes('Something went wrong') || body.includes('Application error')) {
      if (!findings[path].some(f => f.includes('RENDER'))) findings[path].push('RENDER_ERROR: Something went wrong');
    }
    if (body.includes('خطأ') && body.length < 600) {
      if (!findings[path].some(f => f.includes('ARABIC_ERROR'))) findings[path].push('RENDER_ERROR: Arabic error page');
    }
    
    // Check for blank pages
    if (body.length < 100 && !path.includes('/legal')) {
      findings[path].push('BLANK_PAGE (content < 100 chars)');
    }
    
    // Summary
    const errors = findings[path].filter(f => !f.includes('RENDER') || f.includes('PAGE_LOAD'));
    const renderErrors = findings[path].filter(f => f.includes('RENDER'));
    const warns = consoleWarnings[path];
    
    if (renderErrors.length > 0) {
      console.log(`❌ CRASH (${renderErrors.length} errors)`);
      renderErrors.forEach(e => console.log(`       ${e.substring(0, 120)}`));
    } else if (errors.length > 0) {
      console.log(`⚠️ ${errors.length} JS errors`);
      errors.forEach(e => console.log(`       ${e.substring(0, 120)}`));
    } else if (warns.length > 2) {
      console.log(`(${warns.length} warnings)`);
    } else {
      console.log('✅');
    }
  }
  
  await browser.close();
  
  // Generate report
  const brokenPages = Object.entries(findings).filter(([_, errs]) => 
    errs.some(e => e.includes('RENDER') || e.includes('BLANK') || e.includes('is not defined'))
  );
  
  const pagesWithErrors = Object.entries(findings).filter(([_, errs]) => errs.length > 0);
  
  const report = {
    timestamp: new Date().toISOString(),
    total: PAGES.length,
    clean: PAGES.length - brokenPages.length,
    broken: brokenPages.length,
    withWarnings: pagesWithErrors.length - brokenPages.length,
    brokenPages: brokenPages.map(([path, errs]) => ({ path, errors: errs })),
    pagesWithErrors: pagesWithErrors.map(([path, errs]) => ({ path, errors: errs })),
    consoleWarnings: Object.entries(consoleWarnings).filter(([_, w]) => w.length > 0)
      .map(([path, warns]) => ({ path, warnings: warns })),
  };
  
  return report;
}

// Main
(async () => {
  const state = loadState();
  state.round++;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 BUG FINDER — Round #${state.round}`);
  console.log(`   Previously fixed: ${state.totalFixed} issues`);
  console.log(`${'='.repeat(60)}\n`);
  
  const report = await runAudit();
  
  // Save report
  const reportFile = `/tmp/bugfinder-report-r${state.round}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 REPORT — Round #${state.round}`);
  console.log(`   Total pages:    ${report.total}`);
  console.log(`   Clean:          ${report.clean} ✅`);
  console.log(`   With warnings:  ${report.withWarnings} ⚠️`);
  console.log(`   BROKEN:         ${report.broken} ❌`);
  
  if (report.broken > 0) {
    console.log(`\n❌ BROKEN PAGES:`);
    report.brokenPages.forEach(({ path, errors }) => {
      console.log(`   ${path}`);
      errors.forEach(e => console.log(`     → ${e.substring(0, 150)}`));
    });
  }
  
  if (report.pagesWithErrors.length > 0 && report.broken === 0) {
    console.log(`\n⚠️ PAGES WITH JS ERRORS (non-breaking):`);
    report.pagesWithErrors.forEach(({ path, errors }) => {
      console.log(`   ${path} (${errors.length} errors)`);
    });
  }
  
  console.log(`\n💾 Report saved: ${reportFile}`);
  console.log(`${'='.repeat(60)}\n`);
  
  // Update state
  state.lastReport = reportFile;
  state.history.push({ round: state.round, broken: report.broken, warnings: report.withWarnings });
  saveState(state);
  
  // Output summary for next step
  if (report.broken > 0) {
    console.log('🛠️  NEXT: Fix the broken pages above, then re-run this script.');
    console.log('   Command: node /tmp/bugfinder.cjs');
  } else if (report.withWarnings > 0) {
    console.log('✨ Good! No broken pages. Consider fixing JS warnings.');
    console.log('   Run again after fixes: node /tmp/bugfinder.cjs');
  } else {
    console.log('🎉 ALL CLEAR! No errors found on any page.');
  }
})();
