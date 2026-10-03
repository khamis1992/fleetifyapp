import { describe, expect, it, vi, beforeEach } from 'vitest';
import { webcrypto } from 'node:crypto';
import { Blob as NodeBlob } from 'node:buffer';
import { portfolioCsv, portfolioDocumentPath, portfolioSummary, storageDocumentLocation } from '@/utils/insolvencyPortfolioRules';
import { buildInsolvencyPortfolioZip, portfolioReportHtml } from '@/utils/insolvencyPortfolioExport';
import type { InsolvencyPortfolio, PortfolioRow } from '@/types/insolvencyPortfolio';

const state = vi.hoisted(() => ({ tables: {} as Record<string, PortfolioRow[]>, calls: [] as Array<{ table: string; filters: Array<[string, string]> }>, failPage: false, countChange: false }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const call = { table, filters: [] as Array<[string, string]> };
  state.calls.push(call);
  let from = 0, to = 499;
  const query = {
    select: () => query,
    eq: (column: string, value: string) => { call.filters.push([column, value]); return query; },
    lte: (column: string, value: string) => { call.filters.push([column, value]); return query; },
    order: () => query,
    range: (start: number, end: number) => { from = start; to = end; return query; },
    then: (resolve: (value: unknown) => unknown) => {
      const data = state.tables[table] || [];
      return Promise.resolve(state.failPage && from > 0 ? { data: null, count: data.length, error: { message: 'next page denied' } } : { data: data.slice(from, to + 1), count: data.length + (state.countChange && from > 0 ? 1 : 0), error: null }).then(resolve);
    },
  };
  return query;
} } }));
vi.mock('@/services/financialStatementPackage', () => ({ listFinancialStatementPackages: vi.fn(async () => []) }));
import { PORTFOLIO_REGISTERS, readInsolvencyPortfolio, readPortfolioRegister } from '@/services/insolvencyPortfolio';

const COMPANY = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const cutoff = '2026-09-30';
function basePortfolio(): InsolvencyPortfolio {
  return { companyId: COMPANY, cutoff, startedAt: '2026-10-01T01:00:00Z', completedAt: '2026-10-01T01:00:01Z', registers: [], documents: [], savedStatements: [] };
}

beforeEach(() => { state.tables = { companies: [{ id: COMPANY, name: 'Synthetic company', currency: 'QAR' }] }; state.calls = []; state.failPage = false; state.countChange = false; });

describe('complete isolated portfolio registers', () => {
  it('reads 1205 rows, filters company, and preserves inactive rows', async () => {
    state.tables.vehicles = Array.from({ length: 1205 }, (_, i) => ({ id: `v${i}`, company_id: COMPANY, is_active: i !== 1000, book_value: i ? null : 0 }));
    const result = await readPortfolioRegister(PORTFOLIO_REGISTERS.find(spec => spec.key === 'vehicles')!, COMPANY, cutoff);
    expect(result.rows).toHaveLength(1205);
    expect(result.rows[0].book_value).toBe(0);
    expect(result.rows[1000].is_active).toBe(false);
    expect(state.calls).toHaveLength(4);
    expect(state.calls.every(call => call.filters.some(([key, value]) => key === 'company_id' && value === COMPANY))).toBe(true);
  });
  it.each(['denied', 'changed', 'duplicate', 'wrong company'])('rejects %s pages without reporting partial success', async mode => {
    state.tables.vehicles = Array.from({ length: 1005 }, (_, i) => ({ id: `v${i}`, company_id: COMPANY }));
    if (mode === 'denied') state.failPage = true;
    if (mode === 'changed') state.countChange = true;
    if (mode === 'duplicate') state.tables.vehicles[1000].id = 'v0';
    if (mode === 'wrong company') state.tables.vehicles[1000].company_id = OTHER;
    await expect(readPortfolioRegister(PORTFOLIO_REGISTERS.find(spec => spec.key === 'vehicles')!, COMPANY, cutoff)).rejects.toThrow();
  });
  it('validates both entry and account owners for lines', async () => {
    state.tables.journal_entry_lines = [{ id: 'l1', journal_entries: { company_id: COMPANY }, chart_of_accounts: { company_id: OTHER } }];
    await expect(readPortfolioRegister(PORTFOLIO_REGISTERS.find(spec => spec.key === 'journal_entry_lines')!, COMPANY, cutoff)).rejects.toThrow();
    expect(state.calls[0].filters).toContainEqual(['journal_entries.company_id', COMPANY]);
    expect(state.calls[0].filters).toContainEqual(['chart_of_accounts.company_id', COMPANY]);
  });
  it('rejects balanced but truncated journal lines against header totals', async () => {
    state.tables.journal_entries = [{ id: 'j1', company_id: COMPANY, total_debit: 100, total_credit: 100 }];
    state.tables.journal_entry_lines = [
      { id: 'l1', journal_entry_id: 'j1', debit_amount: 50, credit_amount: 0, journal_entries: { company_id: COMPANY }, chart_of_accounts: { company_id: COMPANY } },
      { id: 'l2', journal_entry_id: 'j1', debit_amount: 0, credit_amount: 50, journal_entries: { company_id: COMPANY }, chart_of_accounts: { company_id: COMPANY } },
    ];
    await expect(readInsolvencyPortfolio(COMPANY, cutoff)).rejects.toThrow('مجاميعه');
  });
});

describe('portfolio evidence and financial basis', () => {
  it('keeps zero and credits and distinguishes missing balances', () => {
    const portfolio = basePortfolio();
    portfolio.registers = [{ key: 'invoices', label: 'invoices', basis: 'dated_records', readAt: '', rows: [
      { invoice_type: 'sales', balance_due: 0, total_amount: 100, customer_id: 'a' },
      { invoice_type: 'service', balance_due: 123.45, customer_id: 'b' },
      { invoice_type: 'sales', balance_due: -20.25, customer_id: 'c' },
      { invoice_type: 'sales', balance_due: 500, status: 'cancelled', customer_id: 'd' },
      { invoice_type: 'service', balance_due: null, total_amount: 800, customer_id: 'e' },
    ] }];
    expect(portfolioSummary(portfolio)).toMatchObject({ receivables: 123.45, customerCredits: -20.25, missingInvoiceBalances: 1, debtors: 1 });
  });
  it('escapes hostile HTML and spreadsheet formulas and sanitizes archive paths', () => {
    const portfolio = basePortfolio();
    portfolio.companyId = '<script>alert(1)</script>';
    expect(portfolioReportHtml(portfolio)).toContain('&lt;script&gt;');
    expect(portfolioReportHtml(portfolio)).not.toContain('<script>');
    expect(portfolioCsv([{ description: '=HYPERLINK("evil")', amount: -20, book_value: 0 }])).toContain("'=" );
    expect(portfolioCsv([{ amount: -20 }])).toContain('"-20"');
    expect(portfolioDocumentPath({ id: '../id', source: '../case', name: '../../ملف.pdf', category: '', ownerId: null, buckets: [], reference: '', active: true })).not.toContain('../');
  });
  it.each([
    ['Vehicle Condition Diagram', 'contract/report/diagram.png', '', 'Vehicle_Condition_Diagram.png'],
    ['مستند القضية', 'https://example.supabase.co/storage/v1/object/sign/legal-documents/company/file.PDF?token=key.xlsx#unused.zip', '', 'مستند_القضية.pdf'],
    ['statement.PDF', 'company/file.png', '', 'statement.PDF'],
    ['supporting.7z', 'company/file.7z', '', 'supporting.7z'],
    ['a'.repeat(120) + '.pdf', 'company/file.png', '', 'a'.repeat(100) + '.pdf'],
    ['review', 'company/file?name=statement.pdf', '', 'review'],
    ['review', 'company/file.exe', '', 'review'],
    ['review', 'company/file.pdf', '.generated.html.txt', 'review.generated.html.txt'],
    ['review.pdf', 'company/file.pdf', '.generated.html.txt', 'review.pdf.generated.html.txt'],
  ])('preserves the descriptive archive name and safe extension for %s', (name, reference, extension, expected) => {
    expect(portfolioDocumentPath({ id: 'doc', source: 'case', name, reference, category: '', ownerId: null, buckets: [], active: true }, extension)).toBe(`documents/case/doc-${expected}`);
  });
  it('only accepts approved storage buckets on the configured host with safe paths', () => {
    const host = 'https://example.supabase.co';
    expect(storageDocumentLocation(`${host}/storage/v1/object/public/legal-documents/company/report.pdf`, ['legal-documents'], host)).toEqual([{ bucket: 'legal-documents', path: 'company/report.pdf' }]);
    for (const ref of ['https://evil.example/report.pdf', `${host}/storage/v1/object/public/other/company/x.pdf`, '../x.pdf', 'javascript:alert(1)', '/root/x', 'a/%2e%2e/x']) {
      expect(() => storageDocumentLocation(ref, ['legal-documents'], host)).toThrow();
    }
  });
  it('requires company or verified parent ownership for current and legacy storage paths', () => {
    const host = 'https://example.supabase.co';
    for (const reference of [`${COMPANY}/bank.pdf`, 'contract-a/orientation/doc/file.pdf', `legal-packages/${COMPANY}/contract-a/package.zip`, `signed-agreements/${COMPANY}/signed.pdf`, 'vehicle-documents/vehicle-a/registration.pdf']) {
      expect(storageDocumentLocation(reference, ['documents'], host, COMPANY, ['contract-a', 'vehicle-a'])).toHaveLength(1);
    }
    for (const reference of [`${OTHER}/bank.pdf`, 'other-contract/file.pdf', `legal-packages/${COMPANY}/other-contract/package.zip`, 'legal-notices/unverified-job/proof.json', `signed-agreements/${OTHER}/signed.pdf`]) {
      expect(() => storageDocumentLocation(reference, ['documents'], host, COMPANY, ['contract-a'])).toThrow('ملكية');
    }
  });
  it('manifest records actual copies, generated text and failures separately with hashes', async () => {
    vi.stubGlobal('crypto', webcrypto);
    vi.stubGlobal('Blob', NodeBlob);
    const portfolio = basePortfolio();
    portfolio.documents = [
      { id: 'a', source: 'company_legal_documents', name: 'Commercial register', category: 'commercial_register', reference: 'a.pdf', ownerId: COMPANY, buckets: ['legal-documents'], active: true },
      { id: 'b', source: 'legal_case_documents', name: 'missing.pdf', category: 'other', reference: 'b.pdf', ownerId: 'case', buckets: ['legal-documents'], active: true },
      { id: 'c', source: 'lawsuit_documents', name: 'generated', category: 'memo', reference: null, generatedHtml: '<script>unsafe()</script>', ownerId: 'case', buckets: [], active: true },
    ];
    const result = await buildInsolvencyPortfolioZip(portfolio, async doc => { if (doc.id === 'b') throw new Error('Not found'); return new NodeBlob(['actual PDF bytes']) as unknown as Blob; });
    expect(result.failed).toBe(1);
    expect(result.manifest.map(entry => entry.status)).toEqual(['included', 'failed', 'generated']);
    expect(result.manifest[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.manifest[1].archivePath).toBeNull();
    expect(result.manifest[2].archivePath).toMatch(/generated\.html\.txt$/);
    expect(result.manifest[0].archivePath).toBe('documents/company_legal_documents/a-Commercial_register.pdf');
    const { default: JSZip } = await import('jszip');
    const archive = await JSZip.loadAsync(new Uint8Array(await result.blob.arrayBuffer()));
    expect(await archive.file(result.manifest[0].archivePath || '')?.async('string')).toBe('actual PDF bytes');
    vi.unstubAllGlobals();
  });
  it('cancels export if company scope changes during downloading', async () => {
    const portfolio = basePortfolio();
    portfolio.documents = [{ id: 'a', source: 'company', name: 'a', category: 'other', reference: 'a', ownerId: COMPANY, buckets: [], active: true }];
    let sameCompany = true;
    await expect(buildInsolvencyPortfolioZip(portfolio, async () => { sameCompany = false; return new NodeBlob(['data']) as unknown as Blob; }, { assertCurrent: () => { if (!sameCompany) throw new Error('Scope changed'); } })).rejects.toThrow('Scope changed');
  });
  it('includes inactive historical copies with a review flag while preserving missing, failed and generated states', async () => {
    vi.stubGlobal('crypto', webcrypto); vi.stubGlobal('Blob', NodeBlob);
    const portfolio = basePortfolio();
    const historicalState = 'سجل مصدر غير نشط أو محذوف؛ نسخة تاريخية تحتاج مراجعة';
    portfolio.documents = [
      { id: 'historical', source: 'company_legal_documents', name: 'Historical register', category: 'commercial_register', reference: `${COMPANY}/old.pdf`, ownerId: COMPANY, buckets: ['legal-documents'], active: false, recordState: 'superseded' },
      { id: 'missing', source: 'company_legal_documents', name: 'Missing copy', category: 'other', reference: null, ownerId: COMPANY, buckets: [], active: false },
      { id: 'failed', source: 'company_legal_documents', name: 'Unavailable copy', category: 'other', reference: `${COMPANY}/unavailable.pdf`, ownerId: COMPANY, buckets: ['legal-documents'], active: false },
      { id: 'generated', source: 'lawsuit_documents', name: 'Generated text', category: 'memo', reference: null, generatedHtml: '<p>historical memo</p>', ownerId: COMPANY, buckets: [], active: false },
    ];
    const download = vi.fn(async (doc: { id: string }) => { if (doc.id === 'failed') throw new Error('Not found'); return new NodeBlob(['historical PDF bytes']) as unknown as Blob; });
    const result = await buildInsolvencyPortfolioZip(portfolio, download);
    expect(download.mock.calls.map(([doc]) => doc.id)).toEqual(['historical', 'failed']);
    expect(result.manifest.map(entry => entry.status)).toEqual(['included', 'missing_reference', 'failed', 'generated']);
    expect(result.failed).toBe(2);
    expect(result.manifest[0].recordState).toBe(`superseded / ${historicalState}`);
    expect(result.manifest.every(entry => entry.recordState?.includes(historicalState))).toBe(true);
    expect(portfolio.documents[0]).toMatchObject({ active: false, recordState: 'superseded' });
    const { default: JSZip } = await import('jszip');
    const archive = await JSZip.loadAsync(new Uint8Array(await result.blob.arrayBuffer()));
    expect(await archive.file(result.manifest[0].archivePath || '')?.async('string')).toBe('historical PDF bytes');
    const manifestFile = archive.file('attachment-manifest.json');
    if (!manifestFile) throw new Error('Historical copy ZIP has no manifest');
    const manifest = JSON.parse(await manifestFile.async('string'));
    expect(manifest.entries[0]).toMatchObject({ status: 'included', recordState: `superseded / ${historicalState}` });
    expect(await archive.file('lawyer-review.html')?.async('string')).toContain(historicalState);
    expect(result.manifest[3].archivePath).toMatch(/generated\.html\.txt$/);
    vi.unstubAllGlobals();
  });
  it('splits large attachments with one manifest linking every archive part', async () => {
    vi.stubGlobal('crypto', webcrypto); vi.stubGlobal('Blob', NodeBlob);
    const portfolio = basePortfolio();
    portfolio.documents = ['a', 'b', 'c'].map(id => ({ id, source: 'company', name: `${id}.pdf`, category: 'other', reference: id, ownerId: COMPANY, buckets: [], active: true }));
    const parts: Array<{ name: string; blob: Blob }> = [];
    const result = await buildInsolvencyPortfolioZip(portfolio, async () => new NodeBlob(['document data']) as unknown as Blob, { maxAttachmentBytes: 15, onPartReady: (blob, name) => { parts.push({ name, blob }); } });
    expect(parts).toHaveLength(3);
    expect(result.archives.map(item => item.name)).toEqual(parts.map(item => item.name));
    expect(result.manifest.map(item => item.archiveName)).toEqual(parts.map(item => item.name));
    const { default: JSZip } = await import('jszip');
    const part = await JSZip.loadAsync(new Uint8Array(await parts[1].blob.arrayBuffer()));
    expect(await part.file(result.manifest[1].archivePath || '')?.async('string')).toBe('document data');
    vi.unstubAllGlobals();
  });
});
