import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FinancialStatementPackageExportOptions } from '@/types/financialStatementPackage';
import { buildFinancialStatementPackageDocument, buildFinancialStatementPackageWorkbook, getFinancialStatementPackageExportStatus, getMatchingFinancialStatementPackageSnapshot, renderFinancialStatementPackagePages } from '../financialStatementPackageExport';
import { makeFinancialStatementPackageFixture, makeSavedFinancialStatementPackageFixture } from '../../../tests/visual/financial-statement-package/fixtureData';
import sqlPackageFixture from '../../../tests/fixtures/financial-statement-package-sql.json';
import { parseFinancialStatementPackage } from '../financialStatementPackageValidation';

const options = (): FinancialStatementPackageExportOptions => {
  const report = makeFinancialStatementPackageFixture();
  return { report, snapshot: makeSavedFinancialStatementPackageFixture(report, 'approved'), locale: 'en' };
};
const documentFor = (value: FinancialStatementPackageExportOptions) => new DOMParser().parseFromString(buildFinancialStatementPackageDocument(value), 'text/html');
afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren(); });

describe('financial statement package identity and content', () => {
  it('has individual interim statements with separate position and performance comparisons', () => {
    const value = options(); value.snapshot = null;
    const doc = documentFor(value), sections = doc.querySelectorAll('.fsp-source-section');
    expect(doc.querySelector('.fsp-company')?.textContent).toBe(value.report.company.name);
    expect(doc.querySelector('.fsp-package-title')?.textContent).toBe('Interim individual entity financial statements');
    expect(doc.querySelector('.fsp-status')?.textContent).toBe('DRAFT — not approved');
    expect(sections).toHaveLength(9);
    expect(sections[0].textContent).toContain('As at 2025-12-31');
    expect(sections[1].textContent).toContain('from 2025-01-01 to 2025-08-31');
    expect(sections[3].textContent).toContain('Comparative period: from 2025-01-01 to 2025-08-31');
    expect(sections[2].querySelectorAll('thead th')).toHaveLength(8);
    expect(doc.body.textContent).toContain('Commercial registration: TEST-000123');
    expect(doc.body.textContent).toContain('does not by itself establish compliance');
    expect(doc.body.textContent).toContain('not an audit opinion');
    expect(doc.body.textContent).toMatch(/-QAR\s1,000\.00/);
    expect(doc.body.textContent).toMatch(/-QAR\s1,800\.00/);
    expect(doc.body.textContent).toContain('TEST-EVIDENCE-14');
    expect(doc.body.textContent).not.toContain('Al-Araf');
  });

  it('uses Arabic labels, numbered notes and signed money without changing identity', () => {
    const value = options(); value.locale = 'ar';
    const doc = documentFor(value);
    expect(doc.documentElement.dir).toBe('rtl');
    expect(doc.querySelector('.fsp-company')?.textContent).toBe(value.report.company.nameAr);
    expect(doc.querySelector('.fsp-status')?.textContent).toBe('معتمدة داخلياً');
    expect(doc.body.textContent).toContain('الإيضاحات المتممة');
    expect(doc.querySelectorAll('tbody tr')[1].querySelector('.fsp-ref')?.textContent).toBe('5');
  });

  it('escapes company, statement, notes and evidence text', () => {
    const value = options(); value.snapshot = null;
    value.report.company.name = '<img src=x onerror=alert(1)>';
    value.report.position.company = { ...value.report.company };
    value.report.statements[0].rows[0].labelEn = '<script>alert(2)</script>';
    value.report.configuration.notes[0].text = '<iframe src="https://example.com">note</iframe>';
    value.report.configuration.notes[0].evidence = '<svg onload=alert(3)>';
    const doc = documentFor(value);
    expect(doc.querySelectorAll('img,script,iframe,svg')).toHaveLength(0);
    expect(doc.body.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(doc.body.textContent).toContain('<script>alert(2)</script>');
    expect(doc.body.textContent).toContain('<svg onload=alert(3)>');
  });

  it('does not invent a currency for incomplete company metadata', () => {
    const value = options(); value.snapshot = null; value.report.company.currency = ''; value.report.position.company.currency = '';
    const doc = documentFor(value);
    expect(doc.body.textContent).toContain('Currency unspecified');
    expect(doc.body.textContent).not.toContain('QAR');
  });

  it.each([
    ['non-finite value', (value: FinancialStatementPackageExportOptions) => { value.report.statements[0].rows[0].values[0] = Infinity; }],
    ['wrong column count', (value: FinancialStatementPackageExportOptions) => { value.report.statements[0].rows[0].values.pop(); }],
    ['missing note reference', (value: FinancialStatementPackageExportOptions) => { value.report.statements[0].rows[0].noteNumbers = [99]; }],
    ['duplicate row', (value: FinancialStatementPackageExportOptions) => { value.report.statements[0].rows.push(structuredClone(value.report.statements[0].rows[0])); }],
    ['cross-company source', (value: FinancialStatementPackageExportOptions) => { value.report.position.company = { ...value.report.company, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }; }],
    ['incorrect source totals', (value: FinancialStatementPackageExportOptions) => { value.report.position.current.assets += 1; }],
  ])('rejects %s before exporting', (_, mutate) => { const value = options(); mutate(value); expect(() => buildFinancialStatementPackageDocument(value)).toThrow(); });
});

describe('immutable saved statement approval', () => {
  it('accepts exact internally approved snapshot with separate actors', () => {
    const value = options(); expect(getFinancialStatementPackageExportStatus(value)).toBe('approved');
    expect(getMatchingFinancialStatementPackageSnapshot(value)?.id).toBe(value.snapshot!.id);
    const doc = documentFor(value);
    expect(doc.body.textContent).toContain('Synthetic Reviewer');
    expect(doc.body.textContent).toContain('Synthetic Preparer');
    expect(doc.body.textContent).toContain(value.report.fingerprint);
  });

  it('ignores viewer permissions only', () => {
    const value = options(); value.report.permissions = { canSave: false, canApprove: false }; value.report.position.permissions = { canSave: false, canApprove: false };
    expect(getFinancialStatementPackageExportStatus(value)).toBe('approved');
  });

  it.each([
    ['same actor', (value: FinancialStatementPackageExportOptions) => { value.snapshot!.approved_by = value.snapshot!.created_by; }],
    ['missing reviewer', (value: FinancialStatementPackageExportOptions) => { value.snapshot!.approved_by_name = null; }],
    ['missing review time', (value: FinancialStatementPackageExportOptions) => { value.snapshot!.approved_at = null; }],
    ['backdated review', (value: FinancialStatementPackageExportOptions) => { value.snapshot!.approved_at = '2026-09-17T00:00:00Z'; }],
    ['missing review note', (value: FinancialStatementPackageExportOptions) => { value.snapshot!.review_notes = 'short'; }],
    ['wrong company', (value: FinancialStatementPackageExportOptions) => { value.snapshot!.company_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; }],
    ['wrong fingerprint', (value: FinancialStatementPackageExportOptions) => { value.snapshot!.source_fingerprint = 'a'.repeat(64); }],
    ['changed statement value', (value: FinancialStatementPackageExportOptions) => { value.snapshot!.payload.statements[0].rows[0].values[0] = 999; }],
    ['changed note', (value: FinancialStatementPackageExportOptions) => { value.snapshot!.payload.configuration.notes[0].text += ' Changed'; }],
    ['changed finding', (value: FinancialStatementPackageExportOptions) => { value.snapshot!.payload.findings.push({ code: 'test', severity: 'warning', count: 1, messageAr: 'تجربة', messageEn: 'Test', accountIds: [], journalIds: [] }); }],
    ['changed date label', (value: FinancialStatementPackageExportOptions) => { value.snapshot!.payload.statements[1].columns[0].endDate = '2026-08-30'; }],
  ])('cannot label altered %s as approved', (_, mutate) => {
    const value = options(); mutate(value); expect(getMatchingFinancialStatementPackageSnapshot(value)).toBeNull();
    expect(getFinancialStatementPackageExportStatus(value)).toBe('draft');
    expect(documentFor(value).querySelector('.fsp-status')?.textContent).toBe('DRAFT — not approved');
  });

  it('keeps a cancelled snapshot voided and never approved', () => {
    const value = options(); value.snapshot = makeSavedFinancialStatementPackageFixture(value.report, 'voided');
    expect(getFinancialStatementPackageExportStatus(value)).toBe('voided');
    expect(documentFor(value).querySelector('.fsp-status')?.textContent).toBe('VOIDED — not valid for submission');
  });
});

describe('statement workbooks', () => {
  it('writes five statements and five annex sheets with actual numeric values and safe text', async () => {
    const value = options(); value.snapshot = null;
    value.report.statements[0].rows[0].labelEn = '=HYPERLINK("https://example.com")';
    value.report.configuration.notes[0].text = '+unsafe formula';
    const workbook = await buildFinancialStatementPackageWorkbook(value);
    expect(workbook.worksheets).toHaveLength(10);
    const sheet = workbook.getWorksheet('Balance sheet')!;
    expect(sheet.getCell('A6').value).toBe('\'=HYPERLINK("https://example.com")');
    expect(sheet.getCell('C6').value).toBe(1000);
    expect(sheet.getCell('D6').value).toBe(800);
    expect(sheet.getCell('C6').numFmt).toContain('0.00');
    expect(workbook.getWorksheet('Equity current')?.getCell('H6').value).toBe(3600);
    expect(workbook.getWorksheet('Source account appendix')?.getCell('G4').value).toBe(-1000);
    expect(workbook.getWorksheet('Notes to the financial statemen')?.getCell('D2').value ?? workbook.worksheets[5].getCell('D2').value).toBe("'+unsafe formula");
    expect(workbook.worksheets.every(item => item.headerFooter.oddFooter?.includes('DRAFT'))).toBe(true);
    const bytes = await workbook.xlsx.writeBuffer(); expect(new Uint8Array(bytes).slice(0, 4)).toEqual(new Uint8Array([80, 75, 3, 4]));
  });
});

describe('actual SQL package response export', () => {
  const reportFromSQL = () => parseFinancialStatementPackage(structuredClone(sqlPackageFixture), sqlPackageFixture.company.id);

  it.each(['ar', 'en'] as const)('preserves every grouped position and gross cash-flow line in %s without asserting approval', locale => {
    const report = reportFromSQL();
    // A different approved package must not confer approval on this SQL response.
    const doc = documentFor({ report, locale, snapshot: makeSavedFinancialStatementPackageFixture(undefined, 'approved') });
    const sections = Array.from(doc.querySelectorAll('.fsp-source-section'));
    const label = (row: typeof report.statements[number]['rows'][number]) => locale === 'ar' ? row.labelAr : row.labelEn;
    for (const [index, statement] of report.statements.entries()) {
      const renderedRows = Array.from(sections[index].querySelectorAll('tbody tr'));
      expect(renderedRows.map(row => row.querySelector('.fsp-label')?.textContent)).toEqual(statement.rows.map(label));
      expect(renderedRows.map(row => row.querySelector('.fsp-ref')?.textContent)).toEqual(statement.rows.map(row => row.noteNumbers.join(', ')));
    }

    const position = report.statements.find(statement => statement.key === 'position')!;
    const positionRows = Array.from(sections[0].querySelectorAll('tbody tr'));
    expect(position.rows.filter(row => row.kind === 'section').map(row => row.key)).toEqual(['current_assets', 'noncurrent_assets', 'current_liabilities', 'noncurrent_liabilities', 'equity']);
    const expectedSubtotals = ['current_assets_total', 'noncurrent_assets_total', 'current_liabilities_total', 'noncurrent_liabilities_total'];
    expect(position.rows.filter(row => row.kind === 'subtotal').map(row => row.key)).toEqual(expectedSubtotals);
    for (const key of expectedSubtotals) {
      const index = position.rows.findIndex(row => row.key === key);
      expect(positionRows[index].classList.contains('fsp-row-subtotal')).toBe(true);
    }
    // Section titles are headings, not extra balances that could be added into totals.
    for (const row of sections[0].querySelectorAll('.fsp-row-section')) {
      expect(Array.from(row.querySelectorAll('.fsp-number')).map(cell => cell.textContent)).toEqual(['', '']);
    }

    const cash = report.statements.find(statement => statement.key === 'cash_flow')!;
    expect(cash.rows.map(row => row.key)).toEqual([
      'opening', 'operating_receipts_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'operating_payments_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
      'operating', 'investing', 'financing_receipts_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'financing', 'exchange', 'net_change', 'closing', 'ledger_closing', 'difference',
    ]);
    const cashRows = Array.from(sections[4].querySelectorAll('tbody tr'));
    expect(cashRows[1].querySelector('.fsp-label')?.textContent).toBe(locale === 'ar' ? 'مقبوضات — revenue' : 'Receipts — revenue');
    expect(cashRows[2].querySelector('.fsp-label')?.textContent).toBe(locale === 'ar' ? 'مدفوعات — expense' : 'Payments — expense');
    expect(cashRows[3].classList.contains('fsp-row-subtotal')).toBe(true);
    expect(cashRows[5].querySelector('.fsp-label')?.textContent).toBe(locale === 'ar' ? 'مقبوضات — capital' : 'Receipts — capital');
    expect(cashRows[6].classList.contains('fsp-row-subtotal')).toBe(true);
    expect(cashRows[2].querySelector('.fsp-number')?.textContent).toContain('-');
    expect(doc.querySelector('.fsp-status')?.textContent).toBe(locale === 'ar' ? 'مسودة للمراجعة — غير معتمدة' : 'DRAFT — not approved');
    expect(doc.querySelector('.fsp-footer')?.textContent).toContain(locale === 'ar' ? 'معاينة غير محفوظة' : 'Unsaved preview');
    expect(doc.body.textContent).not.toContain('Synthetic Reviewer');
    for (const finding of report.findings) expect(doc.body.textContent).toContain(locale === 'ar' ? finding.messageAr : finding.messageEn);
  });

  it('writes SQL receipts and payments as separate signed Excel numbers with their net subtotal and comparative capital receipt', async () => {
    const workbook = await buildFinancialStatementPackageWorkbook({ report: reportFromSQL(), locale: 'en' });
    const cash = workbook.getWorksheet('Cash flows')!;
    expect([cash.getCell('A7').value, cash.getCell('C7').value, cash.getCell('D7').value]).toEqual(['Receipts — revenue', 400, 200]);
    expect([cash.getCell('A8').value, cash.getCell('C8').value, cash.getCell('D8').value]).toEqual(['Payments — expense', -50, 0]);
    expect([cash.getCell('A9').value, cash.getCell('C9').value, cash.getCell('D9').value]).toEqual(['Net operating cash flows', 350, 200]);
    expect([cash.getCell('A11').value, cash.getCell('C11').value, cash.getCell('D11').value]).toEqual(['Receipts — capital', 0, 1000]);
    expect([cash.getCell('C15').value, cash.getCell('D15').value]).toEqual([1550, 1200]);
    expect(cash.getCell('C8').numFmt).toContain('0.00');
    const position = workbook.getWorksheet('Balance sheet')!;
    expect([position.getCell('A6').value, position.getCell('C6').value]).toEqual(['Current assets', null]);
    expect([position.getCell('A12').value, position.getCell('C12').value, position.getCell('D12').value]).toEqual(['Total current assets', 1550, 1200]);
    expect(position.getCell('A13').value).toBe('Non-current assets');
    expect(workbook.worksheets.every(sheet => sheet.headerFooter.oddFooter?.includes('DRAFT'))).toBe(true);
  });
});

describe('measured pages', () => {
  const mockLayout = () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) { return this.classList.contains('fsp-content') ? 360 : 100; });
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
      if (!this.classList.contains('fsp-content')) return 100;
      const rows = Array.from(this.querySelectorAll('tr'));
      if (rows.length) return rows.reduce((height, row) => height + Math.max(32, Math.ceil((row.querySelector('.fsp-label')?.textContent?.length || 0) / 90) * 18), 0);
      return Array.from(this.children).reduce((height, child) => height + Math.max(28, Math.ceil((child.textContent?.length || 0) / 100) * 18), 0);
    });
  };
  it('paginates the SQL grouped position without losing rows or orphaning group headings', async () => {
    mockLayout();
    const report = parseFinancialStatementPackage(structuredClone(sqlPackageFixture), sqlPackageFixture.company.id);
    const position = report.statements.find(statement => statement.key === 'position')!;
    const rendered = await renderFinancialStatementPackagePages({ report, locale: 'en' });
    try {
      const positionPages = rendered.pages.filter(page => page.querySelector('.fsp-section-title')?.textContent === position.titleEn);
      expect(positionPages.length).toBeGreaterThan(1);
      const rows = positionPages.flatMap(page => Array.from(page.querySelectorAll('tbody tr')));
      expect(rows.map(row => row.querySelector('.fsp-label')?.textContent)).toEqual(position.rows.map(row => row.labelEn));
      positionPages.forEach(page => {
        expect(page.querySelector('tbody tr:last-child')?.classList.contains('fsp-row-section')).toBe(false);
        expect(page.querySelectorAll('thead')).toHaveLength(1);
        expect(page.querySelector('.fsp-status')?.textContent).toBe('DRAFT — not approved');
      });
    } finally { rendered.dispose(); }
  });
  it('repeats company/status/headers and page counts, splits long text without losing figures', async () => {
    mockLayout(); const report = makeFinancialStatementPackageFixture(true);
    const rendered = await renderFinancialStatementPackagePages({ report, locale: 'en' });
    expect(rendered.pages.length).toBeGreaterThan(12);
    expect(rendered.pages.filter(page => page.classList.contains('fsp-landscape')).length).toBeGreaterThanOrEqual(3);
    rendered.pages.forEach((page, index) => {
      expect(page.querySelector('.fsp-company')?.textContent).toBe(report.company.name);
      expect(page.querySelector('.fsp-status')?.textContent).toBe('DRAFT — not approved');
      expect(page.querySelector('.fsp-page-count')?.textContent).toBe(`Page ${index + 1} of ${rendered.pages.length}`);
      expect(page.querySelector('.fsp-hash')?.textContent).toBe(report.fingerprint);
      const body = page.querySelector<HTMLElement>('.fsp-content')!;
      expect(body.scrollHeight).toBeLessThanOrEqual(body.clientHeight + 1);
      if (page.querySelector('table')) expect(page.querySelectorAll('thead')).toHaveLength(1);
    });
    const labels = rendered.pages.flatMap(page => Array.from(page.querySelectorAll('.fsp-label'))).map(label => label.textContent?.replaceAll(' (continued)', '') || '').join('');
    expect(labels).toContain(report.statements[0].rows[1].labelEn);
    expect(rendered.element.querySelector('style.fsp-layout-styles')?.textContent).toContain('width:210mm');
    rendered.dispose(); expect(document.querySelector('.fsp-document')).toBeNull();
  });

  it('scopes the LTR/RTL direction against the app-wide RTL stylesheet', async () => {
    mockLayout(); const globalStyle = document.createElement('style'); globalStyle.textContent = '*{direction:rtl;text-align:right}'; document.head.appendChild(globalStyle);
    try {
      const rendered = await renderFinancialStatementPackagePages({ report: makeFinancialStatementPackageFixture(), locale: 'en' });
      const root = rendered.element.querySelector('.fsp-document')!;
      expect(getComputedStyle(root).direction).toBe('ltr'); expect(getComputedStyle(root).textAlign).toBe('left');
      expect(getComputedStyle(root.querySelector('.fsp-number')!).direction).toBe('ltr');
      rendered.dispose();
    } finally { globalStyle.remove(); }
  });
});
