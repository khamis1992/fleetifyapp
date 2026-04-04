const { chromium } = require('playwright');
const pages = [
  '/finance/overview','/finance/billing','/finance/treasury','/finance/accounting',
  '/finance/reports','/finance/budgets','/finance/vendors','/finance/fixed-assets',
  '/finance/deposits','/finance/cost-centers','/finance/chart-of-accounts',
  '/finance/general-ledger','/finance/alerts','/finance/payments/quick',
  '/finance/payments/register','/finance/settings','/finance/reports-analysis',
  '/finance/budgets-centers','/finance/unified-payments','/finance/unified-reports',
  '/customers','/fleet','/contracts','/hr/employees','/tasks','/settings',
  '/legal/cases','/reports','/dashboard'
];

(async () => {
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  
  // Login
  await page.goto('http://localhost:8080/auth', {waitUntil:'domcontentloaded', timeout:15000});
  await page.waitForTimeout(3000);
  await page.locator('input[type="email"]').first().fill('khamis-1992@hotmail.com');
  await page.locator('input[type="password"]').first().fill('123456789');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(8000);

  const wrong = [];
  let checked = 0;

  for (const pg of pages) {
    process.stdout.write('.');
    await page.goto('http://localhost:8080'+pg, {waitUntil:'domcontentloaded', timeout:10000}).catch(()=>{});
    await page.waitForTimeout(2000);
    
    const body = await page.locator('body').innerText().catch(()=>'');
    if (body.includes('404 Not Found') || body.includes('الصفحة غير موجودة')) {
      wrong.push({type:'page', page:pg, issue:'404'});
      continue;
    }

    // Collect all links with href starting with /
    const links = await page.locator('a[href^="/"]').all();
    for (const link of links) {
      const href = await link.getAttribute('href').catch(()=>'');
      if (!href || !href.startsWith('/') || href.includes('#')) continue;
      const txt = (await link.innerText().catch(()=>'')).trim().substring(0,40);
      if (!txt) continue;
      
      const resp = await page.goto('http://localhost:8080'+href, {waitUntil:'domcontentloaded', timeout:8000}).catch(()=>null);
      await page.waitForTimeout(1500);
      checked++;
      
      const nb = await page.locator('body').innerText().catch(()=>'');
      const is404 = nb.includes('404 Not Found') || nb.includes('الصفحة غير موجودة');
      const isBlank = nb.length < 80;
      
      if (is404 || isBlank) {
        wrong.push({from:pg, btn:txt, to:href, issue: is404?'404':'blank'});
      }
      
      // Go back
      await page.goto('http://localhost:8080'+pg, {waitUntil:'domcontentloaded', timeout:8000}).catch(()=>{});
      await page.waitForTimeout(1000);
    }
  }

  console.log('\n');
  if (wrong.length === 0) {
    console.log('✅ كل الأزرار تعمل بشكل صحيح!');
    console.log('   الصفحات المفحوصة: ' + pages.length);
    console.log('   الأزرار/الروابط المختبرة: ' + checked);
  } else {
    console.log('❌ أزرار/روابط خاطئة (' + wrong.length + '):');
    wrong.forEach(w => {
      console.log('  ' + (w.page || w.from) + ' → "' + w.btn + '" → ' + w.to + ' [' + w.issue + ']');
    });
  }
  
  await browser.close();
})();
