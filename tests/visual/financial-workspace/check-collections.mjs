import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4191/finance/collections-preview');
  await page.getByRole('heading',{name:'التحصيل الشهري',exact:true}).waitFor();
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:`docs/reviews/financial-system-2026-09-06/collections-${width}.png`,fullPage:true});
  }
  await page.goto('http://127.0.0.1:4191/finance/collections-preview?error=1');
  await page.getByRole('alert').first().waitFor();
  assert.equal(await page.getByText('960.00 ر.ق',{exact:true}).count(),0);
  await page.getByRole('button',{name:'إعادة المحاولة'}).first().click();
  await page.getByRole('heading',{name:'التحصيل الشهري',exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS: actual collection components, desktop/mobile, read failure and retry; synthetic data only.');
} finally {await browser.close();}
