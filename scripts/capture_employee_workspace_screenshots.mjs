import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const out = resolve(root, 'docs', 'employee-workspace-screenshots');
const baseUrl = process.env.FLEETIFY_BASE_URL || 'http://localhost:8080';
const email = process.env.FLEETIFY_EMAIL;
const password = process.env.FLEETIFY_PASSWORD;
await mkdir(out, { recursive: true });

async function savePage(page, name) {
  await page.screenshot({ path: resolve(out, name), fullPage: true });
}

async function saveLocator(locator, name) {
  if (await locator.count()) {
    await locator.first().screenshot({ path: resolve(out, name) });
  }
}

async function clickTabIfPresent(page, label) {
  const locator = page.getByRole('tab', { name: new RegExp(label) }).first();
  if (await locator.count()) {
    await locator.click();
    await page.waitForTimeout(1200);
  }
}

async function closeDialog(page) {
  const close = page
    .locator('button[aria-label="Close"], button:has-text("إلغاء"), button:has-text("×")')
    .first();
  if (await close.count()) {
    await close.click().catch(() => {});
    await page.waitForTimeout(700);
  } else {
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(700);
  }
}

async function captureButtonInteraction(page, buttonName, fileName) {
  await gotoAuthenticated(page, '/employee-workspace');
  const button = page.getByRole('button', { name: new RegExp(buttonName) }).first();
  if (!(await button.count())) {
    return;
  }
  await button.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await button.click();
  await page.waitForTimeout(1600);
  const dialog = page.locator('[role="dialog"]').first();
  if (await dialog.count()) {
    await dialog.screenshot({ path: resolve(out, fileName) });
  } else {
    await savePage(page, fileName);
  }
  await closeDialog(page);
}

async function signInIfNeeded(page) {
  const emailField = page
    .locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="البريد"]')
    .first();
  const passwordField = page
    .locator('input[type="password"], input[name="password"], input[placeholder*="password" i], input[placeholder*="كلمة"]')
    .first();

  if ((await emailField.count()) && (await passwordField.count())) {
    if (!email || !password) {
      throw new Error('FLEETIFY_EMAIL and FLEETIFY_PASSWORD are required for authenticated screenshots.');
    }
    await emailField.fill(email);
    await passwordField.fill(password);
    const submit = page.locator('button[type="submit"], button:has-text("تسجيل"), button:has-text("دخول"), button:has-text("Login"), button:has-text("Sign in")').first();
    if (await submit.count()) {
      await submit.click();
    } else {
      await passwordField.press('Enter');
    }
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }
}

async function gotoAuthenticated(page, path) {
  await page.goto(`${baseUrl}${path}`, {
    waitUntil: 'networkidle',
    timeout: 90000,
  });
  await signInIfNeeded(page);
  if (!page.url().includes(path)) {
    await page.goto(`${baseUrl}${path}`, {
      waitUntil: 'networkidle',
      timeout: 90000,
    });
  }
  await page.waitForTimeout(1800);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});

await gotoAuthenticated(page, '/employee-workspace');
await savePage(page, '01-overview-desktop.png');
await saveLocator(page.locator('main, [class*="space-y"]').first(), '06-page-work-areas.png');
await saveLocator(
  page.locator('button').filter({ hasText: /تسجيل مكالمة|تسجيل دفعة|جدولة موعد|ملاحظة جديدة/ }).first().locator('xpath=ancestor::*[contains(@class, "grid")][1]'),
  '07-quick-actions-row.png'
);

for (const [buttonName, file] of [
  ['تسجيل مكالمة', '08-call-dialog.png'],
  ['تسجيل دفعة', '09-payment-action.png'],
  ['جدولة موعد', '10-schedule-dialog.png'],
  ['ملاحظة جديدة', '11-note-dialog.png'],
]) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await captureButtonInteraction(page, buttonName, file);
}

await page.setViewportSize({ width: 390, height: 844 });
await gotoAuthenticated(page, '/employee-workspace');
await savePage(page, '02-overview-mobile.png');

for (const [label, file] of [
  ['التحصيل الشهري', '03-collections-tab.png'],
  ['العقود', '04-contracts-tab.png'],
  ['المهام', '05-tasks-tab.png'],
]) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await gotoAuthenticated(page, '/employee-workspace');
  await clickTabIfPresent(page, label);
  await savePage(page, file);
}

await page.setViewportSize({ width: 390, height: 844 });
await gotoAuthenticated(page, '/');
const workspaceCard = page.getByText('الفريق والمتابعة', { exact: false }).first();
if (await workspaceCard.count()) {
  await workspaceCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const card = page
    .locator('div, section, article')
    .filter({ hasText: 'الفريق والمتابعة' })
    .filter({ hasText: 'مساحة عملي' })
    .first();
  if (await card.count()) {
    await card.screenshot({ path: resolve(out, '00-entry-card.png') });
  } else {
    await savePage(page, '00-entry-card.png');
  }
}

console.log(await page.title());
console.log(page.url());
console.log(out);

await browser.close();
