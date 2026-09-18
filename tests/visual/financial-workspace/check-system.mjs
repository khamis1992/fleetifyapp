import { chromium } from '@playwright/test';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const source = fs.readFileSync('src/components/finance/workspace/financeNavigation.ts','utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module = {exports:{}};
const aliasModule={exports:{}};
const aliasCompiled=ts.transpileModule(fs.readFileSync('src/components/finance/workspace/financeRouteAliases.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('require','module','exports',aliasCompiled)(require,aliasModule,aliasModule.exports);
new Function('require','module','exports',compiled)(name=>name==='./financeRouteAliases'?aliasModule.exports:require(name),module,module.exports);
const destinations=module.exports.allFinanceDestinations;
const subset=process.argv[2];
const items=subset ? destinations.filter(item=>item.id.includes(subset)) : destinations;
const output='docs/reviews/financial-system-2026-09-06';
const results=[];
const browser=await chromium.launch({headless:true});
try {
 for(const width of [1440,390]) {
  const page=await browser.newPage({viewport:{width,height:1000},locale:'en-US'});
  await page.addInitScript(() => { localStorage.setItem('fleetify-language', 'en'); localStorage.removeItem('fleetify-language-source'); });
  await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4296/')?route.continue():route.abort());
  for(const item of items) {
   const errors=[];
   const onError=error=>errors.push(error.message);
   page.on('pageerror',onError);
   try {
    await page.goto(`http://127.0.0.1:4296${item.href}`,{waitUntil:'networkidle',timeout:25000});
    await page.locator('.finance-page-body').waitFor({timeout:5000});
    const englishText=await page.evaluate(()=>{
      const values=new Set();
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      while(walker.nextNode()) {
        const node=walker.currentNode, parent=node.parentElement;
        if(!parent || ['SCRIPT','STYLE','OPTION'].includes(parent.tagName) || !parent.checkVisibility()) continue;
        const value=node.textContent.trim();
        if(/[a-zA-Z]{3}/.test(value)) values.add(value);
      }
      return [...values];
    });
    if (!item.parentId) { const h1=page.locator(".finance-page-body h1"); if(await h1.count() === 0) errors.push("Missing page heading"); }
    const body=await page.locator('.finance-page-body').innerText();
    const sizes=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,main:document.querySelector('main')?.getBoundingClientRect().toJSON()}));
    const commands=await page.evaluate(()=>window.financePreviewCommands || []);
    const unexpectedEnglish=englishText.filter(value=>/[a-zA-Z]{3}/.test(value
      .replace(/\b[^\s]+@[^\s]+|\b(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.(?:com|online|test)\b/gi,'')
      .replace(/\b(?:INV|PAY|REC|SUP|CON|CC|FA|BNK)-[A-Z0-9-]+\b/g,'')
      .replace(/\b(?:PDF|CSV|XLSX|PNG|JPG|JPEG|JSON|QAR|SAR|USD|EUR|KWD|Ctrl|ESC)\b|\b[1-5]xxx\b/g,'')));
    const arabic=await page.evaluate(()=>document.documentElement.lang==='ar' && document.documentElement.dir==='rtl');
    const entry={id:item.id,width,englishText,unexpectedEnglish,arabic,href:item.href,errors,commands,empty:body.trim().length<12,overflow:sizes.scroll>width+2,sizes,excerpt:body.slice(0,350)};
    results.push(entry);
    if(entry.errors.length || entry.overflow || entry.empty || commands.length || unexpectedEnglish.length || !arabic) console.log(JSON.stringify(entry));
    else console.log(`PASS ${width} ${item.id}`);
    if(['reports','ledger','receive','entries','invoices','chart','treasury','report-trial-balance','calculator','vendors','budgets','integrity','assets','payments'].includes(item.id)) await page.screenshot({path:`${output}/finance-${item.id}-${width}.png`});
   } catch(error) {results.push({id:item.id,width,href:item.href,errors:[error.message]});console.log(`FAIL ${width} ${item.id}: ${error.message.slice(0,150)}`);}
   page.off('pageerror',onError);
  }
  await page.close();
 }
} finally {
 fs.writeFileSync(`${output}/system-route-check${subset?`-${subset}`:''}.json`,JSON.stringify(results,null,2));
 await browser.close();
}
const failures=results.filter(row=>row.errors.length || row.overflow || row.empty || row.commands?.length || row.unexpectedEnglish?.length || row.arabic === false);
console.log(JSON.stringify({checked:results.length,failures:failures.map(row=>`${row.width}:${row.id}`)}));
process.exitCode=failures.length?1:0;
