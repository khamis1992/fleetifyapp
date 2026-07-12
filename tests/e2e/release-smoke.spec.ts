import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../utils/financialTestHelpers';

const hasAuthenticatedTestAccount = Boolean(
  process.env.E2E_TEST_EMAIL?.trim() && process.env.E2E_TEST_PASSWORD,
);

test('loads the Arabic login screen', async ({ page }) => {
  await page.goto('/auth');
  await expect(page.getByRole('heading', { name: 'مرحباً بك' })).toBeVisible();
  await expect(page.getByLabel('البريد الإلكتروني')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'كلمة المرور', exact: true })).toBeVisible();
});

test.describe('authenticated release smoke checks', () => {
  test.skip(
    !hasAuthenticatedTestAccount,
    'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run authenticated release checks.',
  );

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('loads contracts and the two reported contract pages', async ({ page }) => {
    await page.goto('/contracts');
    await expect(page.getByRole('heading', { name: 'إدارة العقود' })).toBeVisible();

    for (const contractNumber of ['LTO2024104', '330']) {
      await page.goto(`/contracts/${contractNumber}`);
      await expect(page).toHaveURL(new RegExp(`/contracts/${contractNumber}$`));
      await expect(page.getByText(contractNumber, { exact: true })).toBeVisible();
      await expect(page.getByText('حدث خطأ غير متوقع')).toHaveCount(0);
    }
  });

  test('loads the tasks page and system audit agent dashboard', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'إدارة المهام' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'وكيل تدقيق النظام' })).toBeVisible();
  });
});
