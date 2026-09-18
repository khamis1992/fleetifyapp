// Uses the repository's Playwright dependency; Python runtime has no Playwright package.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const output='docs/reviews/financial-system-2026-09-06';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  for(const [lang,width] of [['ar',1440],['ar',390],['en',1440],['en',390]]) {
    await page.setViewportSize({width,height:1000});
    await page.goto(`http://127.0.0.1:4191/?lang=${lang}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading',{level:1,name:lang==='ar'?'المركز المالي':'Finance workspace',exact:true}).waitFor();
    assert.equal(await page.locator('main').getAttribute('dir'),lang==='ar'?'rtl':'ltr');
    assert.equal(await page.locator('h1').evaluate(el=>getComputedStyle(el).direction),lang==='ar'?'rtl':'ltr');
    assert.equal(await page.locator('.lucide').evaluateAll(icons=>icons.every(icon=>icon.getBoundingClientRect().height<32)),true,'Icons must not inherit chart sizing');
    await page.locator('summary').click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false,`Overflow ${lang}/${width}`);
    await page.screenshot({path:`${output}/workspace-${lang}-${width}.png`,fullPage:true});
  }
  await page.goto('http://127.0.0.1:4191/?lang=en&state=error');
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByText('Posted revenue this month',{exact:true}).count(),0);
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await page.getByText('Posted revenue this month',{exact:true}).waitFor();
  await page.getByRole('button',{name:/Contracts/}).click();
  assert.equal(new URL(page.url()).pathname,'/contracts');
  await page.goto('http://127.0.0.1:4191/?lang=en&state=loading');
  await page.getByText('Reading financial records…',{exact:true}).waitFor();
  assert.equal(await page.getByText('Posted revenue this month',{exact:true}).count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: Arabic/English desktop/mobile, no overflow, errors/retry, loading and department navigation. Fixture data only.');
} finally { await browser.close(); }
