import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { observeTaqadiPage } from '../portal-observer';
import { inferPortalStage } from '../portal-stage';

// Regression cover for the login → case_classification stall: Taqadi renders
// the classification dropdowns with Kendo, which hides the id-bearing
// <select> behind a visible `.k-widget` wrapper. Observing only
// self-visible controls dropped every `tempctype_*` id, so the page scored
// below the inference threshold and was reported as `unknown` — leaving
// waitForPortalStage to time out on a page the operator had already opened.

describe('observeTaqadiPage with Kendo-rendered controls', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('captures ids hidden behind a visible Kendo widget wrapper', async () => {
    await page.setContent(`
      <main>
        <h2>تصنيف الدعوى</h2>
        <div class="form-group">
          <label>درجة التقاضي *</label>
          <span class="k-widget k-dropdown">
            <span class="k-dropdown-wrap"><span class="k-input">اختر</span></span>
            <select id="tempctype_court" style="display:none">
              <option>ابتدائي</option>
            </select>
          </span>
        </div>
        <div class="form-group">
          <label>نوع الدعوى *</label>
          <span class="k-widget k-dropdown">
            <span class="k-dropdown-wrap"><span class="k-input">اختر</span></span>
            <select id="tempctype_category" style="display:none">
              <option>عقود الخدمات التجارية</option>
            </select>
          </span>
        </div>
      </main>
    `);

    const observation = await observeTaqadiPage(page);
    const ids = observation.controls.map((control) => control.id);
    expect(ids).toContain('tempctype_court');
    expect(ids).toContain('tempctype_category');

    const position = inferPortalStage(observation);
    expect(position).toMatchObject({
      stage: 'case_classification',
      confidence: 'high',
    });
  });

  it('resolves the backing id from a widget that only has aria-owns', async () => {
    await page.setContent(`
      <main>
        <h2>تصنيف الدعوى</h2>
        <span class="k-widget k-dropdown" role="combobox"
              aria-owns="tempctype_court_listbox">
          <span class="k-input">ابتدائي</span>
        </span>
      </main>
    `);

    const observation = await observeTaqadiPage(page);
    expect(observation.controls.map((control) => control.id))
      .toContain('tempctype_court');
  });

  it('still ignores controls whose wrapper is hidden too', async () => {
    await page.setContent(`
      <main>
        <span class="k-widget k-dropdown" style="display:none">
          <select id="tempctype_court"><option>ابتدائي</option></select>
        </span>
      </main>
    `);

    const observation = await observeTaqadiPage(page);
    expect(observation.controls).toHaveLength(0);
  });
});
