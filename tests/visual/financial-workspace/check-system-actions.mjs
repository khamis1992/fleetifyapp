import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
const browser = await chromium.launch({headless:true});
const checks=[];
const output='docs/reviews/financial-system-2026-09-06';
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4296/')?route.continue():route.abort());
const goto=path=>page.goto(`http://127.0.0.1:4296${path}`,{waitUntil:'networkidle'});
async function check(name, action) { await action(); checks.push(name); console.log(`PASS ${name}`); }
try {
 await goto('/finance/invoices');
 await check('invoice pagination and selection across pages',async()=>{
   const main=page.locator('main');
   await expect(main.getByText('INV-0025',{exact:true})).toBeVisible();
   await expect(main.getByText('INV-0026',{exact:true})).toHaveCount(0);
   await main.locator('thead').getByRole('checkbox').check();
   await main.getByRole('button',{name:'التالي',exact:true}).click();
   await expect(main.getByText('INV-0031',{exact:true})).toBeVisible();
   await expect(main.locator('thead').getByRole('checkbox')).not.toBeChecked();
   await main.locator('thead').getByRole('checkbox').check();
   await expect(main.getByText('31 محدد',{exact:true})).toBeVisible();
   await main.getByRole('button',{name:'السابق',exact:true}).click();
   await main.locator('thead').getByRole('checkbox').uncheck();
   await expect(main.getByText('6 محدد',{exact:true})).toBeVisible();
   await main.getByRole('button',{name:'التالي',exact:true}).click();
   await expect(main.locator('thead').getByRole('checkbox')).toBeChecked();
 });
 await check('separate pages navigate and browser back restores the previous register',async()=>{
   await page.locator('.finance-sidebar-tree').getByRole('link',{name:'المدفوعات',exact:true}).click();
   await expect(page).toHaveURL(/\/finance\/payments$/);
   await expect(page.locator('main').getByRole('heading',{name:'المدفوعات',exact:true,level:1})).toBeVisible();
   await expect(page.getByRole('tab',{name:'الفواتير',exact:true})).toHaveCount(0);
   await expect(page.locator('main').getByText('PAY-0025',{exact:true})).toBeVisible();
   const downloadPromise=page.waitForEvent('download');
   await page.locator('[data-tour="billing-filters"]').getByRole('button',{name:'تصدير',exact:true}).click();
   await page.getByRole('menuitem',{name:'تصدير CSV',exact:true}).click();
   const download=await downloadPromise;
   expect(download.suggestedFilename()).toBe('payments_export.csv');
   const content=fs.readFileSync(await download.path(),'utf8');
   expect(content).toContain('PAY-0031');
   expect(content).not.toContain('INV-');
   expect(content.trim().split('\n')).toHaveLength(32);
   await page.goBack();
   await expect(page).toHaveURL(/\/finance\/invoices$/);
   await expect(page.locator('main').getByRole('heading',{name:'الفواتير',exact:true,level:1})).toBeVisible();
 });
 await check('invoice form opens without writing',async()=>{
   await page.getByRole('button',{name:'فاتورة جديدة',exact:true}).click();
   await expect(page.getByRole('dialog')).toBeVisible();
   await expect(page.getByRole('dialog')).toHaveCSS('opacity','1');
   await page.screenshot({path:`${output}/finance-invoice-form-1440.png`,animations:'disabled'});
   await page.keyboard.press('Escape');
 });
 await check('legacy invoice deep link opens the requested document',async()=>{
   await goto('/finance/billing?invoice=44444444-4444-4444-8444-000000000031');
   await expect(page.getByRole('dialog')).toBeVisible();
   await expect(page.getByRole('dialog').getByText('INV-0031',{exact:true}).first()).toBeVisible();
   await page.keyboard.press('Escape');
   await expect(page).toHaveURL(/\/finance\/invoices$/);
 });
 await check('financial sidebar search navigates to nested report',async()=>{
   await page.getByRole('textbox',{name:'بحث في الأقسام المالية'}).fill('ميزان المراجعة');
   await page.locator('.finance-sidebar-tree').getByRole('link',{name:'ميزان المراجعة',exact:true}).click();
   await expect(page).toHaveURL(/\/reports\/trial-balance$/);
   await expect(page.locator('.finance-sidebar-tree').getByRole('link',{name:'مكتبة التقارير',exact:true})).toHaveAttribute('aria-current','location');
 });
 await check('report library searches and opens independent reports',async()=>{
   await page.locator('.finance-page-body').getByRole('link',{name:'مكتبة التقارير',exact:true}).click();
   await page.getByRole('textbox',{name:'بحث في التقارير',exact:true}).fill('قائمة الدخل');
   await page.locator('.finance-page-body').getByRole('link',{name:'قائمة الدخل',exact:true}).click();
   await expect(page).toHaveURL(/\/reports\/income-statement$/);
   await page.reload({waitUntil:'networkidle'});
   await expect(page.getByRole('heading',{name:'قائمة الدخل',exact:true,level:1})).toBeVisible();
   await expect(page.locator('.finance-context-bar select')).toHaveCount(0);
 });
 await goto('/finance/journal-entries?action=new');
 await check('journal creation opens from canonical and legacy actions',async()=>{
   await expect(page.getByRole('dialog')).toBeVisible();
   await page.keyboard.press('Escape');
   await expect(page).toHaveURL(/\/journal-entries$/);
   await goto('/finance/new-entry');
   await expect(page.getByRole('dialog')).toBeVisible();
   await page.keyboard.press('Escape');
 });
 await goto('/finance/operations/receive-payment?amount=123');
 await check('daily receipt is a page using the shared form',async()=>{
   await expect(page.locator('.voucher-page')).toBeVisible();
   await expect(page.getByRole('dialog')).toHaveCount(0);
   await expect(page.locator('.voucher-page input[type="number"]').first()).toHaveValue('123');
   await expect(page.getByRole('tab',{name:'تفاصيل الدفعة',exact:true})).toBeVisible();
   await expect(page.getByRole('tab',{name:'الحسابات',exact:true})).toBeVisible();
 });
 await goto('/finance/general-ledger');
 await check('ledger focuses on account balances',async()=>{
   await expect(page.getByRole('heading',{name:'دفتر الأستاذ',exact:true,level:1})).toBeVisible();
   await expect(page.locator('main').getByRole('tab')).toHaveCount(0);
   await expect(page.getByLabel('الأرصدة حتى تاريخ', {exact:true})).toBeVisible();
   await page.getByRole('button',{name:'عرض حركات الصندوق',exact:true}).click();
   const dialog=page.getByRole('dialog');
   await expect(dialog).toBeVisible();
   await expect(dialog.getByText('2026-001',{exact:true})).toBeVisible();
   await expect(dialog.getByText('2026-002',{exact:true})).toBeVisible();
   await expect(dialog.locator('input[type="date"]').nth(1)).not.toHaveValue('');
   await page.keyboard.press('Escape');
   const downloadPromise=page.waitForEvent('download');
   await page.getByRole('button',{name:'تصدير الأرصدة',exact:true}).click();
   const download=await downloadPromise;
   const content=fs.readFileSync(await download.path(),'utf8');
   expect(content).toContain('الصندوق'); expect(content).toContain('1000'); expect(content).not.toContain('Cash');
 });
 await goto('/finance/treasury');
 await check('bank register exposes accounts beyond the first twelve',async()=>{
   await page.locator('main').getByRole('button',{name:'التالي',exact:true}).click();
   await expect(page.locator('main').getByText('بنك تجريبي 14',{exact:true})).toBeVisible();
   await page.getByRole('link',{name:'عرض حركات بنك تجريبي 14',exact:true}).click();
   await expect(page).toHaveURL(/\/treasury\/transactions\?bank=/);
   await expect(page.getByRole('heading',{name:'الحركات المالية',exact:true,level:1})).toBeVisible();
 });
 await page.setViewportSize({width:390,height:844});
 await goto('/finance/treasury');
 await check('bank form fits mobile and stays scrollable',async()=>{
   await page.getByRole('button',{name:'حساب جديد',exact:true}).click();
   const dialog=page.getByRole('dialog');
   await expect(dialog).toBeVisible();
   const box=await dialog.boundingBox();
   expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x+box.width).toBeLessThanOrEqual(391);
   expect(box.height).toBeLessThanOrEqual(813);
   await expect(dialog).toHaveCSS('opacity','1');
   await page.screenshot({path:`${output}/finance-bank-form-390.png`,animations:'disabled'});
   await page.keyboard.press('Escape');
 });
 await check('mobile finance sidebar navigates and closes',async()=>{
   await page.getByRole('button',{name:'فتح القائمة',exact:true}).click();
   const sidebar=page.locator('.sidebar-workspace.is-mobile');
   await sidebar.getByRole('textbox',{name:'بحث في الأقسام المالية'}).fill('الموردون');
   await sidebar.getByRole('link',{name:'الموردون',exact:true}).click();
   await expect(page).toHaveURL(/\/finance\/vendors$/);
   await expect(sidebar).toHaveCount(0);
 });
 expect(await page.evaluate(()=>window.financePreviewCommands)).toEqual([]);
 await check('legacy entry points open their redesigned destinations',async()=>{
   for(const [oldPath,nextPath] of [
     ['/finance/unified','/finance/overview'],
     ['/finance/billing?tab=payments','/finance/payments'],
     ['/finance/payments-dashboard','/finance/payments'],
     ['/finance/accounting?tab=chart','/finance/chart-of-accounts'],
     ['/finance/treasury?tab=reconciliation','/finance/treasury/reconciliation'],
     ['/finance/payments/quick?amount=200','/finance/operations/receive-payment?amount=200'],
     ['/finance/monthly-rent-redirect','/finance/collections/rent'],
     ['/finance/audit-settings?tab=permissions','/finance/settings/permissions'],
   ]) {
     await goto(oldPath);
     await expect(page).toHaveURL(`http://127.0.0.1:4296${nextPath}`);
   }
 });
 expect(errors).toEqual([]);
} finally {
 fs.writeFileSync(`${output}/system-interactions.json`,JSON.stringify({checks,errors},null,2));
 await browser.close();
}
