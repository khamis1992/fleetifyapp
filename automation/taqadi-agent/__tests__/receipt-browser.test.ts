import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { TaqadiPortal } from '../taqadi-page';
import type { FilingPayload } from '../types';
import { ManualStopRequestedError } from '../types';

describe('final submission receipt observation', () => {
  let browser: Browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { await browser?.close(); });

  it('recognizes the portal’s إعتماد link and clicks it exactly once', async () => {
    const page = await browser.newPage();
    try {
      await page.setContent(`<a href="#" id="submit">إعتماد</a><main></main><script>
        window.clicks=0;
        document.querySelector('#submit').onclick=(event)=>{event.preventDefault(); window.clicks++;
          document.querySelector('main').textContent='إشعار تقديم الطلب رقم المرجع: 20260098765';};
        </script>`);
      const result = await new TaqadiPortal(page).submitFinal(undefined, undefined, 2_000);
      expect(result.referenceNumber).toBe('20260098765');
      expect(await page.evaluate(() => (window as any).clicks)).toBe(1);
    } finally { await page.close(); }
  });

  it('never clicks approval when persisting the submission boundary fails', async () => {
    const page = await browser.newPage();
    try {
      await page.setContent('<a href="#" onclick="window.clicked=true">إعتماد</a>');
      await expect(new TaqadiPortal(page).submitFinal(async () => {
        throw new Error('database unavailable');
      }, undefined, 500)).rejects.toThrow('database unavailable');
      expect(await page.evaluate(() => Boolean((window as any).clicked))).toBe(false);
    } finally { await page.close(); }
  });

  it('honors a manual stop before the first approval click', async () => {
    const page = await browser.newPage();
    try {
      await page.setContent('<button onclick="window.clicked=true">اعتماد</button>');
      await expect(new TaqadiPortal(page).submitFinal(undefined, undefined, 500,
        async () => { throw new ManualStopRequestedError(); })).rejects.toBeInstanceOf(ManualStopRequestedError);
      expect(await page.evaluate(() => Boolean((window as any).clicked))).toBe(false);
    } finally { await page.close(); }
  });

  it('stops before a delayed confirmation without clicking it or repeating approval', async () => {
    const page = await browser.newPage();
    let checks = 0;
    try {
      await page.setContent(`<button id="approve" onclick="window.clicks=1;document.querySelector('[role=dialog]').style.display='block'">اعتماد</button>
        <main></main><div role="dialog" style="display:none"><button onclick="window.confirmed=true">تأكيد</button></div>`);
      await expect(new TaqadiPortal(page).submitFinal(undefined, undefined, 1_000, async () => {
        if (++checks >= 2) throw new ManualStopRequestedError();
      })).rejects.toBeInstanceOf(ManualStopRequestedError);
      expect(await page.evaluate(() => [(window as any).clicks,Boolean((window as any).confirmed)])).toEqual([1,false]);
    } finally { await page.close(); }
  });

  it('waits for a delayed dialog and then a delayed number without a second click', async () => {
    const page = await browser.newPage();
    try {
      await page.setContent(`<button id="submit">اعتماد نهائي</button><main id="receipt"></main>
        <div role="dialog" style="display:none"><button id="confirm">نعم، اعتماد</button></div>
        <script>
          window.approvals=0; window.confirmations=0;
          document.querySelector('#submit').onclick=()=>{
            window.approvals++; setTimeout(()=>document.querySelector('[role=dialog]').style.display='block',700);
          };
          document.querySelector('#confirm').onclick=()=>{
            window.confirmations++; document.querySelector('#receipt').textContent='إشعار تقديم الطلب رقم المرجع:';
            setTimeout(()=>{
              document.querySelector('#receipt').textContent='إشعار تقديم الطلب رقم المرجع: 20260012345';
              document.querySelector('[role=dialog]').style.display='none';
            },700);
          };
        </script>`);
      let submissionPersisted = false;
      const result = await new TaqadiPortal(page).submitFinal(async () => {
        expect(await page.evaluate(() => (window as any).approvals)).toBe(0);
        submissionPersisted = true;
      }, undefined, 5_000);
      expect(submissionPersisted).toBe(true);
      expect(result.referenceNumber).toBe('20260012345');
      expect(await page.evaluate(() => [(window as any).approvals, (window as any).confirmations])).toEqual([1,1]);
    } finally { await page.close(); }
  });

  it('does not accept an unchanged stale receipt or resubmit after a timeout', async () => {
    const page = await browser.newPage();
    try {
      await page.setContent(`<button onclick="window.clicks=(window.clicks||0)+1">اعتماد نهائي</button>
        <main>إشعار تقديم الطلب رقم المرجع: OLD-12345</main>`);
      await expect(new TaqadiPortal(page).submitFinal(undefined, undefined, 500)).rejects.toMatchObject({ code: 'SUBMISSION_UNCERTAIN' });
      expect(await page.evaluate(() => (window as any).clicks)).toBe(1);
    } finally { await page.close(); }
  });

  it('requires matching contract evidence when recovering an existing portal receipt', async () => {
    const page = await browser.newPage();
    const expected = { contract: { number: 'LTO-123' }, defendant: { idNumber: '12345678901' } } as FilingPayload;
    try {
      await page.setContent('<main>إشعار تقديم الطلب رقم المرجع: REF-12345</main>');
      await expect(new TaqadiPortal(page).readReceipt(expected, 300, true)).rejects.toMatchObject({ code: 'SUBMISSION_UNCERTAIN' });
      await page.setContent('<main>إشعار تقديم الطلب رقم المرجع: REF-12345 رقم العقد: LTO-123</main>');
      expect((await new TaqadiPortal(page).readReceipt(expected, 300, true)).referenceNumber).toBe('REF-12345');
    } finally { await page.close(); }
  });
});
