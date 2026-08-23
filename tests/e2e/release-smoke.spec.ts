import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../utils/financialTestHelpers';

const hasAuthenticatedTestAccount = Boolean(
  process.env.E2E_TEST_EMAIL?.trim() && process.env.E2E_TEST_PASSWORD,
);

const criticalRoutes = {
  finance: [
    '/finance/overview',
    '/finance/accounting',
    '/finance/reports-analysis',
    '/finance/budgets-centers',
    '/finance/consolidation',
    '/finance/operations/receive-payment',
    '/finance/unified',
    '/finance/accountant-dashboard',
    '/finance/alerts',
    '/finance/invoice-journal-report',
    '/finance/audit-trail',
    '/finance/chart-of-accounts',
    '/finance/general-ledger',
    '/finance/cash-bank',
    '/finance/treasury',
    '/finance/obligations',
    '/finance/monthly-close-audit',
    '/finance/billing',
    '/finance/journal-entries',
    '/finance/assets',
    '/finance/vendors',
    '/finance/purchase-orders',
    '/finance/account-mappings',
    '/finance/accounting-wizard',
    '/finance/cash-receipt',
  ],
  fleet: [
    '/fleet',
    '/fleet/maintenance',
    '/fleet/traffic-violations',
    '/fleet/traffic-violations/import',
    '/fleet/traffic-violations/payments',
    '/fleet/reports',
    '/fleet/dispatch-permits',
    '/fleet/reservations',
    '/fleet/vehicle-installments',
  ],
  legal: [
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
  ],
} as const;

async function expectRouteHealthy(page: Page, route: string): Promise<void> {
  const runtimeErrors: string[] = [];
  const failedResponses: string[] = [];
  const onPageError = (error: Error) => runtimeErrors.push(error.message);
  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  };
  const onResponse = (response: { status: () => number; url: () => string }) => {
    if (response.status() >= 500) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  };

  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  page.on('response', onResponse);

  try {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1_000);

    expect(response?.status(), `Document request failed for ${route}`).toBeLessThan(500);
    expect(page.url(), `Protected route redirected to login: ${route}`).not.toMatch(
      /\/auth(?:[/?#]|$)/,
    );
    await expect(page.locator('body'), `Blank page at ${route}`).not.toBeEmpty();
    await expect(
      page.getByText(/\u062d\u062f\u062b \u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u062a\u0648\u0642\u0639|Something went wrong/i),
      `Fatal error boundary rendered at ${route}`,
    ).toHaveCount(0);
    expect(failedResponses, `Server errors at ${route}`).toEqual([]);
    expect(runtimeErrors, `Browser errors at ${route}`).toEqual([]);
  } finally {
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
    page.off('response', onResponse);
  }
}

test('loads the Arabic login screen', async ({ page }) => {
  await page.goto('/auth', { waitUntil: 'networkidle' });
  // Wait for auth form to load (Auth page has loading states with 3s timeout)
  await page.waitForTimeout(500);
  // Wait for email field with extended timeout
  await expect(page.locator('#email')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

test.describe('authenticated release smoke checks', () => {
  test.setTimeout(5 * 60_000);

  test.skip(
    !hasAuthenticatedTestAccount,
    'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run authenticated release checks.',
  );

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('loads contracts and the two reported contract pages', async ({ page }) => {
    await expectRouteHealthy(page, '/contracts');

    for (const contractNumber of ['LTO2024104', '330']) {
      await expectRouteHealthy(page, `/contracts/${contractNumber}`);
      await expect(page).toHaveURL(new RegExp(`/contracts/${contractNumber}$`));
      await expect(page.getByRole('heading', { name: contractNumber, exact: true })).toBeVisible();
    }
  });

  test('loads the tasks page and system audit agent dashboard', async ({ page }) => {
    await expectRouteHealthy(page, '/tasks');
  });

  for (const [domain, routes] of Object.entries(criticalRoutes)) {
    test(`${domain} critical routes load without runtime or server errors`, async ({ page }) => {
      for (const route of routes) {
        await test.step(route, async () => {
          await expectRouteHealthy(page, route);
        });
      }
    });
  }
});
