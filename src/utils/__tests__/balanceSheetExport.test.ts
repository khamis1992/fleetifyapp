import { describe, expect, it, vi } from 'vitest';
import type { BalanceSheetExportOptions, SavedBalanceSheet } from '@/types/balanceSheet';
import { buildBalanceSheetDocument, buildBalanceSheetWorkbook, getBalanceSheetExportStatus, getMatchingBalanceSheetSnapshot, renderBalanceSheetPages, safeBalanceSheetSpreadsheetText } from '../balanceSheetExport';
import { makeBalanceSheetFixture } from './balanceSheetFixtures';

function optionsWithSnapshot(): BalanceSheetExportOptions {
  const report = makeBalanceSheetFixture();
  const snapshot: SavedBalanceSheet = {
    id: 'snapshot-a', company_id: report.company.id, as_of_date: report.asOfDate, comparison_date: report.comparisonDate,
    payload: structuredClone(report), source_fingerprint: report.fingerprint, status: 'approved',
    created_by: 'preparer-a', created_by_name: 'Preparatory Accountant', created_at: '2026-09-18T12:01:00Z',
    approved_by: 'reviewer-b', approved_by_name: 'Financial Reviewer', approved_at: '2026-09-18T12:10:00Z',
    notes: 'Prepared with supporting schedules.', review_notes: 'Reconciliations reviewed.',
  };
  return { report, snapshot, locale: 'en' };
}

describe('professional balance sheet export identity and approval', () => {
  it('uses the selected company identity, exact dates, signed balances, and draft status for a preview', () => {
    const html = buildBalanceSheetDocument({ report: makeBalanceSheetFixture(), locale: 'ar' });
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.querySelector('.bs-company')?.textContent).toBe('شركة المثال للتأجير');
    expect(document.body.textContent).toContain('CR-900');
    expect(document.body.textContent).toContain('2026-08-31');
    expect(document.body.textContent).toContain('2025-12-31');
    expect(document.querySelector('.bs-status')?.textContent).toBe('مسودة للمراجعة — غير معتمدة');
    expect(html).not.toContain('Fleetify'); expect(html).not.toContain('146832');
  });

  it('escapes all company, account and note HTML while preserving it as text', () => {
    const options = optionsWithSnapshot();
    options.report.company.name = '<img src=x onerror=alert(1)>';
    options.report.accounts[0].name = '<script>alert(1)</script>';
    options.snapshot!.payload = structuredClone(options.report);
    options.snapshot!.notes = '<iframe src="https://example.com">note</iframe>';
    const document = new DOMParser().parseFromString(buildBalanceSheetDocument(options), 'text/html');
    expect(document.querySelectorAll('script,img,iframe')).toHaveLength(0);
    expect(document.querySelector('.bs-company')?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(document.body.textContent).toContain('<script>alert(1)</script>');
    expect(document.body.textContent).toContain('<iframe src="https://example.com">note</iframe>');
  });

  it('shows internal approval only for the matching saved report with separate actors', () => {
    const options = optionsWithSnapshot();
    expect(getBalanceSheetExportStatus(options)).toBe('approved');
    const html = buildBalanceSheetDocument(options);
    expect(html).toContain('Financial Reviewer'); expect(html).toContain('Preparatory Accountant');
    expect(html).toContain('not an audit opinion'); expect(html).toContain('snapshot-a');
  });

  it.each([
    ['snapshot company', (options: BalanceSheetExportOptions) => { options.snapshot!.company_id = 'company-b'; }],
    ['date', (options: BalanceSheetExportOptions) => { options.snapshot!.as_of_date = '2026-09-01'; }],
    ['comparison', (options: BalanceSheetExportOptions) => { options.snapshot!.comparison_date = null; }],
    ['fingerprint', (options: BalanceSheetExportOptions) => { options.snapshot!.source_fingerprint = 'different'; }],
    ['payload', (options: BalanceSheetExportOptions) => { options.snapshot!.payload.accounts[0].balance += 1; }],
    ['identity', (options: BalanceSheetExportOptions) => { options.snapshot!.payload.company.name = 'Other company'; }],
    ['missing approval time', (options: BalanceSheetExportOptions) => { options.snapshot!.approved_at = null; }],
    ['invalid approval time', (options: BalanceSheetExportOptions) => { options.snapshot!.approved_at = 'bad-date'; }],
    ['backdated approval', (options: BalanceSheetExportOptions) => { options.snapshot!.approved_at = '2026-09-17T10:00:00Z'; }],
    ['missing snapshot id', (options: BalanceSheetExportOptions) => { options.snapshot!.id = ''; }],
  ])('does not claim approval with mismatched or forged %s', (_, mutate) => {
    const options = optionsWithSnapshot(); mutate(options);
    expect(getBalanceSheetExportStatus(options)).toBe('draft');
    const document = new DOMParser().parseFromString(buildBalanceSheetDocument(options), 'text/html');
    expect(document.querySelector('.bs-status')?.textContent).toBe('DRAFT — not approved');
    expect(document.body.textContent).not.toContain('Internally approved by: Financial Reviewer');
  });

  it('retains voided status and never emits its historical approval as current', () => {
    const options = optionsWithSnapshot(); options.snapshot!.status = 'voided'; options.snapshot!.void_reason = 'Replaced following adjustments';
    expect(getBalanceSheetExportStatus(options)).toBe('voided');
    expect(buildBalanceSheetDocument(options)).toContain('VOIDED — not valid for submission');
    expect(buildBalanceSheetDocument(options)).not.toContain('Internally approved by: Financial Reviewer');
  });

  it('does not reject an identical saved financial payload because viewer permissions differ', () => {
    const options = optionsWithSnapshot(); options.report.permissions.canApprove = false;
    expect(getMatchingBalanceSheetSnapshot(options)).toBe(options.snapshot);
  });

  it('includes original reversal and accumulated-results basis, data checks and saved review notes', () => {
    const html = buildBalanceSheetDocument(optionsWithSnapshot());
    expect(html).toContain('Reversal entries'); expect(html).toContain('not necessarily the current year profit');
    expect(html).toContain('Unposted entries'); expect(html).toContain('Reconciliations reviewed.');
  });

  it('rejects incomplete identity and incomplete comparisons instead of exporting a plausible report', () => {
    const options = optionsWithSnapshot(); options.report.company.name = ''; options.report.company.nameAr = null;
    expect(() => buildBalanceSheetDocument(options)).toThrow('Incomplete');
    const comparisonOptions = optionsWithSnapshot(); comparisonOptions.report.comparison = null;
    expect(() => buildBalanceSheetDocument(comparisonOptions)).toThrow('Incomplete balance sheet comparison');
  });

  it('labels a missing currency without substituting the deployment currency', () => {
    const report = makeBalanceSheetFixture(); report.company.currency = '';
    const html = buildBalanceSheetDocument({ report, locale: 'en' });
    expect(html).toContain('Currency unspecified'); expect(html).not.toContain('QAR');
  });

  it('paginates rows and long notes into separate page elements with repeated status and one copy of each amount', async () => {
    // jsdom has no layout: model available page height and wrapped text height.
    // A real browser visual check additionally validates actual font metrics.
    const globalDirection = document.createElement('style');
    globalDirection.textContent = '* { direction: rtl; text-align: right; }';
    document.head.appendChild(globalDirection);
    const clientHeight = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
      const host = this.closest('.balance-sheet-document')?.parentElement;
      const pageStyles = host?.querySelector('style.bs-layout-styles')?.textContent || '';
      return this.classList.contains('bs-content') && pageStyles.includes('height:297mm') ? 500 : 0;
    });
    const scrollHeight = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
      if (!this.classList.contains('bs-content')) return 0;
      let height = 0;
      for (const child of Array.from(this.children)) {
        if (child.tagName === 'TABLE') {
          height += 35;
          for (const row of Array.from(child.querySelectorAll('tbody tr'))) height += Math.max(26, Math.ceil((row.querySelector('.bs-label')?.textContent?.length || 0) / 42) * 17);
        } else height += Math.max(25, Math.ceil((child.textContent?.length || 0) / 80) * 17);
      }
      return height;
    });
    try {
      const options = optionsWithSnapshot();
      options.report.accounts[2].name = 'Long account description '.repeat(90);
      options.snapshot!.payload = structuredClone(options.report);
      options.snapshot!.notes = 'Long preparation note with complete supporting detail. '.repeat(95);
      const result = await renderBalanceSheetPages(options);
      try {
        expect(result.element.querySelector('style.bs-layout-styles')?.textContent).toContain('display:flex;flex-direction:column');
        expect(getComputedStyle(result.pages[0]).display).toBe('flex');
        const documentRoot = result.element.querySelector<HTMLElement>('.balance-sheet-document')!;
        expect(getComputedStyle(documentRoot).direction).toBe('ltr');
        expect(getComputedStyle(documentRoot).textAlign).toBe('left');
        // jsdom exposes the winning inherit keyword rather than resolving it here.
        expect(getComputedStyle(result.pages[0].querySelector('.bs-label')!).direction).toBe('inherit');
        expect(getComputedStyle(result.pages[0].querySelector('.bs-label')!).textAlign).toBe('inherit');
        expect(getComputedStyle(result.pages[0].querySelector('.bs-money')!).direction).toBe('ltr');
        expect(getComputedStyle(result.pages[0].querySelector('.bs-money')!).textAlign).toBe('end');
        expect(getComputedStyle(result.pages[0].querySelector('.bs-code')!).direction).toBe('ltr');
        expect(getComputedStyle(result.pages[0].querySelector('.bs-dates [dir="ltr"]')!).direction).toBe('ltr');
        expect(result.pages.length).toBeGreaterThan(3);
        expect(result.pages.every(page => page.querySelector('.bs-header') && page.querySelector('.bs-footer'))).toBe(true);
        result.pages.forEach((page, index) => {
          expect(page.querySelector('.bs-page-number')?.textContent).toBe(`Page ${index + 1} of ${result.pages.length}`);
          expect(page.querySelector('.bs-status')?.textContent).toBe('Internally approved');
          const content = page.querySelector<HTMLElement>('.bs-content')!;
          expect(content.scrollHeight).toBeLessThanOrEqual(content.clientHeight + 1);
        });
        const moneyCells = result.pages.flatMap(page => Array.from(page.querySelectorAll('.bs-money')).map(cell => cell.textContent));
        expect(moneyCells.filter(value => value === '-QAR\u00a0200.00')).toHaveLength(1);
        const longLabelText = result.pages.flatMap(page => Array.from(page.querySelectorAll('.bs-label')).map(label => label.textContent || ''))
          .filter(text => text.includes('Long account') || text.includes('(continued)')).join('').replaceAll(' (continued)', '');
        expect(longLabelText).toContain(options.report.accounts[2].name);
        expect(result.element.querySelector('.bs-source')).toBeNull();
      } finally { result.dispose(); }
    } finally { clientHeight.mockRestore(); scrollHeight.mockRestore(); globalDirection.remove(); }
  });
});

describe('balance sheet spreadsheet data', () => {
  it('keeps numerical negatives and comparisons, emits all audit/check sheets, and avoids formula cells', async () => {
    const options = optionsWithSnapshot();
    options.report.accounts[0].name = '=HYPERLINK("https://example.com")';
    options.snapshot!.payload = structuredClone(options.report);
    const workbook = await buildBalanceSheetWorkbook(options);
    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(['Financial position', 'Issue metadata', 'Data checks', 'Account details']);
    const rows = workbook.getWorksheet('Financial position')!.getSheetValues() as unknown[][];
    const depreciation = rows.find(row => row?.[1] === '1202')!;
    expect(depreciation[3]).toBe(-200); expect(depreciation[4]).toBe(-100);
    const formulaName = rows.find(row => row?.[1] === '1101')!;
    expect(formulaName[2]).toBe('\'=HYPERLINK("https://example.com")');
    const comparisonOnly = rows.find(row => row?.[1] === '1102')!;
    expect(comparisonOnly[3]).toBe(0); expect(comparisonOnly[4]).toBe(50);
    expect(workbook.getWorksheet('Issue metadata')!.getSheetValues().flat().join(' ')).toContain('CR-900');
    expect(workbook.getWorksheet('Data checks')!.getRow(2).getCell(3).value).toBe(2);
    workbook.eachSheet(sheet => sheet.eachRow(row => row.eachCell(cell => expect(cell.type).not.toBe(6))));
    const bytes = await workbook.xlsx.writeBuffer(); expect(bytes.byteLength).toBeGreaterThan(1000);
  }, 20_000);

  it.each(['=1+1', '+SUM(A1)', '-DDE', '@IMPORT', ' \t=1'])('escapes formula-like spreadsheet text %j', value => {
    expect(safeBalanceSheetSpreadsheetText(value)).toBe(`'${value}`);
  });
});

