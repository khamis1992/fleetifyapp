import { chromium } from 'playwright';

// Test configuration
const BASE_URL = 'http://localhost:5173';
const TEST_TIMEOUT = 30000;

// Navigation test cases
const NAVIGATION_TESTS = {
  // Main navigation
  'Dashboard': '/dashboard',
  'Customers': '/customers',
  'Customer CRM': '/customers/crm',
  'Fleet': '/fleet',
  'Fleet Maintenance': '/fleet/maintenance',
  'Fleet Dispatch Permits': '/fleet/dispatch-permits',
  'Fleet Traffic Violations': '/fleet/traffic-violations',
  'Fleet Reports': '/fleet/reports',
  'Fleet Vehicle Installments': '/fleet/vehicle-installments',
  'Fleet Reservation System': '/fleet/reservation-system',
  'Contracts': '/contracts',
  'Quotations': '/quotations',
  'Reports': '/reports',
  'Support': '/support',
  'Help': '/help',
  'Profile': '/profile',
  'Settings': '/settings',

  // Finance navigation
  'Finance Chart of Accounts': '/finance/chart-of-accounts',
  'Finance Ledger': '/finance/ledger',
  'Finance Invoices': '/finance/invoices',
  'Finance Treasury': '/finance/treasury',
  'Finance AR Aging': '/finance/ar-aging',
  'Finance Payment Tracking': '/finance/payment-tracking',
  'Finance Reports': '/finance/reports',
  'Finance Vendor Categories': '/finance/vendor-categories',

  // Sales navigation
  'Sales Pipeline': '/sales/pipeline',
  'Sales Leads': '/sales/leads',
  'Sales Orders': '/sales/orders',
  'Sales Analytics': '/sales/analytics',

  // HR navigation
  'HR Employees': '/hr/employees',
  'HR Attendance': '/hr/attendance',
  'HR Payroll': '/hr/payroll',
  'HR Reports': '/hr/reports',
  'HR Settings': '/hr/settings',
  'HR Location Settings': '/hr/location-settings',

  // Inventory navigation
  'Inventory': '/inventory',
  'Inventory Warehouses': '/inventory/warehouses',
  'Inventory Movements': '/inventory/movements',

  // Legal navigation
  'Legal Advisor': '/legal/advisor',
  'Legal Cases': '/legal/cases',
  'Legal Invoice Disputes': '/legal/invoice-disputes',
  'Legal Late Fees': '/legal/late-fees',
  'Legal WhatsApp Reminders': '/legal/whatsapp-reminders',

  // Admin navigation
  'Approvals': '/approvals',
  'Audit Logs': '/audit',
  'Backup': '/backup',
  'Permissions': '/permissions',
  'Subscription': '/subscription',
  'Audit Logs Page': '/audit-logs',

  // Help navigation
  'Help User Guide': '/help/user-guide',
  'Help Dashboard': '/help/dashboard',
  'Help Contracts': '/help/contracts',
  'Help Customers': '/help/customers',
  'Help Finance': '/help/finance',
  'Help Collections': '/help/collections',
  'Help Fleet': '/help/fleet',

  // Other navigation
  'Search': '/search',
  'Import': '/import',
  'Invoice Scanner': '/invoice-scanner',
  'Financial Tracking': '/financial-tracking',
  'Sync Payments Ledger': '/sync-payments-ledger',
  'Payment Registration': '/payment-registration',
  'Quick Payment': '/payments/quick-payment',
  'Performance Dashboard': '/performance',
  'Super Admin': '/super-admin',
  'Demo Trial': '/demo-trial',
  'Hero Demo': '/hero-demo',
  'Native Demo': '/native-demo',
  'Auth': '/auth',
  'Reset Password': '/reset-password',

  // Properties navigation
  'Properties': '/properties',
  'Add Property': '/properties/add',
  'Property Owners': '/owners',
  'Properties Map': '/properties/map',
  'Property Contracts': '/properties/contracts',
  'Property Maintenance': '/properties/maintenance',
  'Tenants': '/tenants',

  // Super admin navigation
  'Super Admin Dashboard': '/super-admin/dashboard',
  'Super Admin Companies': '/super-admin/companies',
  'Super Admin Users': '/super-admin/users',
  'Super Admin Support': '/super-admin/support',
  'Super Admin Payments': '/super-admin/payments',
  'Super Admin Reports': '/super-admin/reports',
  'Super Admin Settings': '/super-admin/settings',
  'Landing Management': '/landing-management',
  'Create Company': '/super-admin/companies/create',

  // Legacy redirects
  'Chart of Accounts Legacy': '/chart-of-accounts',
  'Journal Entries Legacy': '/journal-entries',
  'Payments Legacy': '/payments',
  'Account Mappings Legacy': '/account-mappings',
  'Ledger Legacy': '/ledger',
  'Treasury Legacy': '/treasury',
  'Invoices Legacy': '/invoices',
  'Reports Legacy': '/reports',
};

async function testNavigation() {
  console.log('🧭 Starting FleetifyApp Navigation Testing');
  console.log(`📊 Total routes to test: ${Object.keys(NAVIGATION_TESTS).length}`);
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Track console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`Console Error: ${msg.text()}`);
    }
  });
  page.on('pageerror', error => {
    consoleErrors.push(`Page Error: ${error.message}`);
  });

  const results = {
    working: [],
    broken: [],
    redirects: [],
    errors: [],
    permissionIssues: [],
    slowLoading: []
  };

  let testCount = 0;
  const totalTests = Object.keys(NAVIGATION_TESTS).length;

  for (const [name, url] of Object.entries(NAVIGATION_TESTS)) {
    testCount++;
    const progress = Math.round((testCount / totalTests) * 100);
    process.stdout.write(`\r🧪 Testing: ${progress}% (${testCount}/${totalTests}) - ${name}`);

    try {
      const startTime = Date.now();
      const response = await page.goto(`${BASE_URL}${url}`, {
        waitUntil: 'networkidle',
        timeout: TEST_TIMEOUT
      });
      const loadTime = Date.now() - startTime;

      if (loadTime > 5000) {
        results.slowLoading.push({
          name,
          url,
          loadTime: `${loadTime}ms`,
          status: response?.status()
        });
      }

      if (response && response.status() === 200) {
        // Check for successful page load
        const content = await page.content();
        const hasError = content.includes('404') ||
                        content.includes('Page not found') ||
                        content.includes('Application error') ||
                        content.includes('Something went wrong');

        if (hasError) {
          results.broken.push({
            name,
            url,
            reason: 'Page shows error content',
            status: response.status()
          });
        } else {
          results.working.push({
            name,
            url,
            loadTime: `${loadTime}ms`,
            status: response.status()
          });
        }
      } else if (response && response.status() === 302) {
        // Check redirect location
        const redirectUrl = response.headers()['location'] || '';
        results.redirects.push({
          name,
          url,
          redirectTo: redirectUrl,
          status: response.status()
        });
        results.working.push({
          name,
          url,
          redirect: `→ ${redirectUrl}`,
          status: response.status()
        });
      } else if (response && response.status() === 401) {
        results.permissionIssues.push({
          name,
          url,
          reason: 'Authentication required',
          status: response.status()
        });
      } else if (response && response.status() === 403) {
        results.permissionIssues.push({
          name,
          url,
          reason: 'Permission denied',
          status: response.status()
        });
      } else {
        results.broken.push({
          name,
          url,
          reason: `HTTP ${response?.status()}`,
          status: response?.status()
        });
      }
    } catch (error) {
      results.broken.push({
        name,
        url,
        reason: error.message,
        error: error.name
      });
    }
  }

  console.log('\n\n✅ Navigation Testing Complete!\n');

  // Print results
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));

  console.log(`\n✅ Working Navigation (${results.working.length}):`);
  if (results.working.length === 0) {
    console.log('  No working navigation found');
  } else {
    results.working.forEach(item => {
      const loadInfo = item.loadTime ? ` (${item.loadTime})` : '';
      const redirectInfo = item.redirect ? ` ${item.redirect}` : '';
      console.log(`  ✓ ${item.name}: ${item.url}${loadInfo}${redirectInfo}`);
    });
  }

  console.log(`\n❌ Broken Navigation (${results.broken.length}):`);
  if (results.broken.length === 0) {
    console.log('  No broken navigation found ✨');
  } else {
    results.broken.forEach(item => {
      console.log(`  ✗ ${item.name}: ${item.url} - ${item.reason}`);
    });
  }

  console.log(`\n🔄 Redirects (${results.redirects.length}):`);
  if (results.redirects.length === 0) {
    console.log('  No redirects found');
  } else {
    results.redirects.forEach(item => {
      console.log(`  ↻ ${item.name}: ${item.url} → ${item.redirectTo}`);
    });
  }

  console.log(`\n🚫 Permission Issues (${results.permissionIssues.length}):`);
  if (results.permissionIssues.length === 0) {
    console.log('  No permission issues found');
  } else {
    results.permissionIssues.forEach(item => {
      console.log(`  🔒 ${item.name}: ${item.url} - ${item.reason}`);
    });
  }

  console.log(`\n🐌 Slow Loading Pages (${results.slowLoading.length}):`);
  if (results.slowLoading.length === 0) {
    console.log('  All pages load quickly ✨');
  } else {
    results.slowLoading.forEach(item => {
      console.log(`  🐌 ${item.name}: ${item.url} (${item.loadTime})`);
    });
  }

  if (consoleErrors.length > 0) {
    console.log(`\n⚠️ Console Errors (${consoleErrors.length}):`);
    consoleErrors.slice(0, 10).forEach(error => {
      console.log(`  ⚠️ ${error}`);
    });
    if (consoleErrors.length > 10) {
      console.log(`  ... and ${consoleErrors.length - 10} more errors`);
    }
  }

  // Statistics
  const total = results.working.length + results.broken.length + results.permissionIssues.length;
  const successRate = Math.round((results.working.length / total) * 100);

  console.log('\n📈 STATISTICS');
  console.log('='.repeat(50));
  console.log(`Total Routes Tested: ${total}`);
  console.log(`Working: ${results.working.length} (${successRate}%)`);
  console.log(`Broken: ${results.broken.length} (${Math.round((results.broken.length / total) * 100)}%)`);
  console.log(`Permission Issues: ${results.permissionIssues.length} (${Math.round((results.permissionIssues.length / total) * 100)}%)`);
  console.log(`Slow Loading: ${results.slowLoading.length}`);

  console.log('\n🎯 RECOMMENDATIONS');
  console.log('='.repeat(50));

  if (results.broken.length > 0) {
    console.log('HIGH PRIORITY:');
    console.log('1. Fix broken routes that return errors or 404');
    console.log('2. Check if route definitions exist in App.tsx');
    console.log('3. Verify page components are properly exported');
  }

  if (results.permissionIssues.length > 0) {
    console.log('MEDIUM PRIORITY:');
    console.log('1. Review authentication and authorization logic');
    console.log('2. Ensure proper role-based access control');
    console.log('3. Add user-friendly error messages for permission denied');
  }

  if (results.slowLoading.length > 0) {
    console.log('PERFORMANCE:');
    console.log('1. Optimize slow-loading pages');
    console.log('2. Implement better loading states');
    console.log('3. Consider code splitting for heavy components');
  }

  if (consoleErrors.length > 0) {
    console.log('TECHNICAL DEBT:');
    console.log('1. Fix console errors for better user experience');
    console.log('2. Review error handling in navigation');
    console.log('3. Implement proper error boundaries');
  }

  await browser.close();
  console.log('\n🎉 Navigation testing completed!');
  process.exit(results.broken.length > 0 ? 1 : 0);
}

// Run the test
testNavigation().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});