import { describe, expect, it } from 'vitest';
import { collectLegalPages, loadAllLegalCases, loadLegalAttachmentMetadata, loadLegalCasesPage } from '../legalCaseQueries';

type Row = Record<string, unknown> & { id: string };
function mockClient(tables: Record<string, Row[]>, failTable?: string) {
  const calls: Array<{ table: string; filters: Array<[string, unknown]>; range: number[]; orders: string[]; or: string[] }> = [];
  const client = { from(table: string) {
    const call = { table, filters: [] as Array<[string, unknown]>, range: [] as number[], orders: [] as string[], or: [] as string[] };
    calls.push(call);
    let rows = [...(tables[table] || [])];
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => { call.filters.push([key, value]); rows = rows.filter(row => row[key] === value); return query; },
      in: (key: string, values: unknown[]) => { call.filters.push([key, values]); rows = rows.filter(row => values.includes(row[key])); return query; },
      is: (key: string, value: unknown) => { call.filters.push([key, value]); rows = rows.filter(row => row[key] === value); return query; },
      or: (value: string) => { call.or.push(value); if (value.includes('cancelled')) rows = rows.filter(row => !['cancelled', 'canceled'].includes(String(row.case_status))); return query; },
      order: (key: string) => { call.orders.push(key); return query; },
      range: async (from: number, to: number) => { call.range = [from, to]; return { data: rows.slice(from, to + 1), count: rows.length, error: table === failTable ? new Error('attachment read denied') : null }; },
    };
    return query;
  } } as unknown as Parameters<typeof loadAllLegalCases>[0];
  return { client, calls };
}

describe('complete scoped legal exports', () => {
  it('loads more than the server row limit and keeps company, direction and current filters on every page', async () => {
    const rows = Array.from({ length: 1205 }, (_, index) => ({ id: String(index), company_id: 'company-a', case_direction: 'filed_against_us', case_type: 'other', case_status: 'active' }));
    rows.push({ id: 'different-company', company_id: 'company-b', case_direction: 'filed_against_us', case_type: 'other', case_status: 'active' });
    rows.push({ id: 'outgoing', company_id: 'company-a', case_direction: 'filed_by_us', case_type: 'other', case_status: 'active' });
    rows.push({ id: 'cancelled', company_id: 'company-a', case_direction: 'filed_against_us', case_type: 'other', case_status: 'cancelled' });
    const { client, calls } = mockClient({ legal_cases: rows });
    const data = await loadAllLegalCases(client, 'company-a', { case_direction: 'filed_against_us', case_type: 'other', exclude_cancelled: true, page: 7, pageSize: 20 });
    expect(data).toHaveLength(1205);
    expect(calls.map(call => call.range)).toEqual([[0, 499], [500, 999], [1000, 1499]]);
    for (const call of calls) {
      expect(call.filters).toContainEqual(['company_id', 'company-a']);
      expect(call.filters).toContainEqual(['case_direction', 'filed_against_us']);
      expect(call.filters).toContainEqual(['case_type', 'other']);
      expect(call.orders).toEqual(['hearing_date', 'id']);
      expect(call.or).toEqual(['case_status.is.null,case_status.not.in.(cancelled,canceled)']);
    }
  });

  it('keeps the visible page query bounded and applies the same direction filter', async () => {
    const { client, calls } = mockClient({ legal_cases: [] });
    await loadLegalCasesPage(client, 'company-a', { page: 3, pageSize: 20, case_direction: 'filed_against_us', search: 'claim,(case)' });
    expect(calls[0].range).toEqual([40, 59]);
    expect(calls[0].filters).toContainEqual(['company_id', 'company-a']);
    expect(calls[0].or[0]).not.toContain('(case)');
  });

  it('refuses unscoped queries before reading anything', async () => {
    const { client, calls } = mockClient({});
    await expect(loadAllLegalCases(client, '')).rejects.toThrow('الشركة');
    await expect(loadLegalAttachmentMetadata(client, '', ['case-a'])).rejects.toThrow('الشركة');
    expect(calls).toHaveLength(0);
  });

  it('fails rather than silently exporting a truncated or changed result', async () => {
    await expect(collectLegalPages(async () => ({ data: [], count: 1 }))).rejects.toThrow('جميع');
    await expect(collectLegalPages(async offset => ({ data: [{ id: String(offset) }], count: offset ? 3 : 2 }), 1)).rejects.toThrow('تغير');
    await expect(collectLegalPages(async () => ({ data: [{ id: 'same' }], count: 2 }), 1)).rejects.toThrow('تكررت');
    await expect(collectLegalPages(async () => ({ data: [], count: null }))).rejects.toThrow('عدد');
  });

  it('loads attachment metadata across pages without exposing storage URLs or treating it as included', async () => {
    const attachments = Array.from({ length: 605 }, (_, index) => ({ id: String(index), case_id: 'case-a', company_id: 'company-a', document_title: 'document', document_type: 'evidence', file_path: 'private/path.pdf', is_original: true, deleted_at: null }));
    attachments.push({ ...attachments[0], id: 'foreign', company_id: 'company-b' });
    const { client, calls } = mockClient({ legal_case_documents: attachments, lawsuit_documents: [{ id: 'generated', legal_case_id: 'case-a', company_id: 'company-a', document_name: 'memo', document_type: 'memo', file_url: 'https://private/signed', html_content: null }] });
    const result = await loadLegalAttachmentMetadata(client, 'company-a', ['case-a']);
    expect(result).toHaveLength(606);
    expect(result.find(row => row.id === 'generated')).toMatchObject({ declaredOriginal: null, hasFileReference: true, source: 'lawsuit_preparation' });
    expect(JSON.stringify(result)).not.toContain('private');
    expect(calls.filter(call => call.table === 'legal_case_documents').map(call => call.range)).toEqual([[0, 499], [500, 999]]);
    for (const call of calls) expect(call.filters).toContainEqual(['company_id', 'company-a']);
  });

  it('rejects the complete export metadata if one document source cannot be read', async () => {
    const { client } = mockClient({ legal_case_documents: [], lawsuit_documents: [] }, 'lawsuit_documents');
    await expect(loadLegalAttachmentMetadata(client, 'company-a', ['case-a'])).rejects.toThrow('attachment read denied');
  });
});
