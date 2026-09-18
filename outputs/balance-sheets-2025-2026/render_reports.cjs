const { chromium } = require('C:/Users/khamis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:794,height:1123},deviceScaleFactor:1});
  await page.route('**/*',route=>route.abort());
  for (const date of ['2025-12-31','2026-08-31']) {
    await page.setContent(fs.readFileSync(path.join(__dirname,`balance-sheet-${date}-draft.html`),'utf8'),{waitUntil:'load'});
    await page.evaluate(()=>document.fonts.ready);
    const output=path.join(__dirname,`balance-sheet-${date}-draft.pdf`);
    await page.pdf({path:output,format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="width:100%;font-family:Arial;font-size:8px;text-align:center;color:#667085;"><span class="pageNumber"></span> / <span class="totalPages"></span> — DRAFT — '+date+'</div>',margin:{bottom:'14mm'}});
    console.log(output);
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
