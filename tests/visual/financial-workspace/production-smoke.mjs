import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try {
  for (const legacyPreference of [false, true]) {
    const page=await browser.newPage({viewport:{width:legacyPreference ? 390 : 1440,height:1000},locale:'en-US'});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    if (legacyPreference) await page.addInitScript(() => localStorage.setItem('fleetify-language','en'));
    await page.goto(`${process.argv[2] || 'http://127.0.0.1:4192'}/auth`);
    await page.locator('input').first().waitFor({timeout:45000});
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveAttribute('lang','ar');
    await expect(page.locator('html')).toHaveAttribute('dir','rtl');
    await expect(page.getByRole('button',{name:'تسجيل الدخول',exact:true})).toBeVisible();
    assert.equal(await page.evaluate(()=>localStorage.getItem('fleetify-language')),'ar');
    assert.deepEqual(errors,[]);
    await page.reload({waitUntil:'networkidle'});
    await expect(page.locator('html')).toHaveAttribute('lang','ar');
    await expect(page.locator('body')).toHaveCSS('direction','rtl');
    assert.deepEqual(errors,[]);
    console.log(`PASS: built application starts and reloads in Arabic/RTL on an English browser (${legacyPreference ? 'legacy English preference, mobile' : 'new session, desktop'}).`);
    await page.close();
  }
} finally { await browser.close(); }
