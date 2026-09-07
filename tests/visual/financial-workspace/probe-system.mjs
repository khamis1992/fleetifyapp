import { chromium } from '@playwright/test';
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')console.log('console-error',message.text().slice(0,500));});
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4296/')?route.continue():route.abort());
 await page.goto('http://127.0.0.1:4296/finance/billing',{waitUntil:'domcontentloaded',timeout:60000});
 await page.getByRole('heading',{name:'الفوترة والتحصيل',exact:true}).waitFor({timeout:45000}).catch(error=>console.log('heading-timeout',error.message));
 console.log(JSON.stringify({errors,body:(await page.locator('body').innerText()).slice(0,7500)}));
 await page.screenshot({path:'docs/reviews/financial-system-2026-09-06/system-probe.png',fullPage:true});
} finally {await browser.close();}
