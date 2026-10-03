import type { supabase } from '@/integrations/supabase/client';
import type { LegalCase } from '@/hooks/useLegalCases';

type LegalClient = Pick<typeof supabase, 'from'>;

export interface LegalCaseFilters {
  contract_id?: string;
  case_status?: string;
  exclude_cancelled?: boolean;
  case_type?: string;
  case_direction?: 'filed_by_us' | 'filed_against_us';
  priority?: string;
  client_id?: string;
  lawyer_id?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function collectLegalPages<T extends { id: string | number }>(
  loadPage: (offset: number, pageSize: number) => Promise<{ data: T[]; count: number | null }>,
  pageSize = 500,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('حجم صفحة التصدير غير صالح');
  const rows: T[] = [];
  const seen = new Set<string | number>();
  let expectedCount: number | undefined;
  while (expectedCount === undefined || rows.length < expectedCount) {
    const page = await loadPage(rows.length, pageSize);
    if (page.count === null || !Number.isInteger(page.count) || page.count < 0) {
      throw new Error('تعذر تأكيد عدد سجلات التصدير؛ أعد المحاولة');
    }
    if (expectedCount === undefined) expectedCount = page.count;
    if (page.count !== expectedCount) throw new Error('تغير عدد السجلات أثناء التصدير؛ أعد المحاولة');
    if (page.data.length === 0 && rows.length < expectedCount) throw new Error('لم تُحمّل جميع سجلات التصدير');
    for (const row of page.data) {
      if (seen.has(row.id)) throw new Error('تكررت سجلات أثناء التصدير؛ أعد المحاولة');
      seen.add(row.id);
      rows.push(row);
    }
    if (rows.length > expectedCount) throw new Error('لا يطابق عدد السجلات نتيجة التصدير');
  }
  return rows;
}

export async function loadLegalCasesPage(client: LegalClient, companyId: string, filters: LegalCaseFilters = {}, offsetOverride?: number) {
  if (!companyId) throw new Error('تعذر تحديد الشركة');
  const pageSize = filters.pageSize ?? 50;
  const page = filters.page ?? 1;
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1) throw new Error('صفحة القضايا غير صالحة');
  let query = client.from('legal_cases').select(`
    *,
    contract:contracts!legal_cases_contract_id_fkey(
      id,contract_number,customer_id,
      customer:customers!fk_contracts_customer_id(
        id,first_name,last_name,first_name_ar,last_name_ar,company_name,company_name_ar,customer_type,phone
      )
    )
  `, { count: 'exact' }).eq('company_id', companyId);
  if (filters.contract_id) query = query.eq('contract_id', filters.contract_id);
  if (filters.case_status) query = query.eq('case_status', filters.case_status);
  if (filters.exclude_cancelled) query = query.or('case_status.is.null,case_status.not.in.(cancelled,canceled)');
  if (filters.case_type) query = query.eq('case_type', filters.case_type);
  if (filters.case_direction) query = query.eq('case_direction', filters.case_direction);
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.client_id) query = query.eq('client_id', filters.client_id);
  if (filters.lawyer_id) query = query.eq('primary_lawyer_id', filters.lawyer_id);
  if (filters.search) {
    // Keep filter delimiters in user-entered text from creating extra PostgREST conditions.
    const search = filters.search.replace(/[(),]/g, ' ').replace(/[%_]/g, '\\$&');
    query = query.or(`case_title.ilike.%${search}%,case_number.ilike.%${search}%,client_name.ilike.%${search}%`);
  }
  const offset = offsetOverride ?? (page - 1) * pageSize;
  const { data, error, count } = await query.order('hearing_date', { ascending: true, nullsFirst: false }).order('id', { ascending: true }).range(offset, offset + pageSize - 1);
  if (error) throw error;
  const rows = (data ?? []) as unknown as LegalCase[];
  if (rows.some(row => row.company_id !== companyId)) throw new Error('تعذر تأكيد نطاق الشركة للقضايا');
  return { data: rows, count };
}

export async function loadAllLegalCases(client: LegalClient, companyId: string, filters: LegalCaseFilters = {}) {
  return collectLegalPages<LegalCase>(async (offset, pageSize) => loadLegalCasesPage(client, companyId, {
    ...filters, page: 1, pageSize,
  }, offset));
}

export interface LegalAttachmentMetadata {
  id: string;
  caseId: string;
  title: string;
  type: string;
  source: 'case' | 'lawsuit_preparation';
  hasFileReference: boolean;
  declaredOriginal: boolean | null;
}

export async function loadLegalAttachmentMetadata(client: LegalClient, companyId: string, caseIds: string[]): Promise<LegalAttachmentMetadata[]> {
  if (!companyId) throw new Error('تعذر تحديد الشركة');
  const records: LegalAttachmentMetadata[] = [];
  const uniqueIds = [...new Set(caseIds)];
  for (let start = 0; start < uniqueIds.length; start += 100) {
    const batchIds = uniqueIds.slice(start, start + 100);
    const [caseDocuments, generatedDocuments] = await Promise.all([
      collectLegalPages(async (offset, size) => {
        const result = await client.from('legal_case_documents')
          .select('id,case_id,company_id,document_title,document_type,file_path,is_original', { count: 'exact' })
          .eq('company_id', companyId).in('case_id', batchIds).is('deleted_at', null)
          .order('id', { ascending: true }).range(offset, offset + size - 1);
        if (result.error) throw result.error;
        return { data: result.data ?? [], count: result.count };
      }),
      collectLegalPages(async (offset, size) => {
        const result = await client.from('lawsuit_documents')
          .select('id,legal_case_id,company_id,document_name,document_type,file_url,html_content', { count: 'exact' })
          .eq('company_id', companyId).in('legal_case_id', batchIds)
          .order('id', { ascending: true }).range(offset, offset + size - 1);
        if (result.error) throw result.error;
        return { data: result.data ?? [], count: result.count };
      }),
    ]);
    for (const document of caseDocuments) {
      if (document.company_id !== companyId || !batchIds.includes(document.case_id)) throw new Error('مرفق خارج نطاق الشركة أو القضية');
      records.push({ id: document.id, caseId: document.case_id, title: document.document_title, type: document.document_type, source: 'case', hasFileReference: Boolean(document.file_path), declaredOriginal: document.is_original });
    }
    for (const document of generatedDocuments) {
      if (document.company_id !== companyId || !document.legal_case_id || !batchIds.includes(document.legal_case_id)) throw new Error('مرفق خارج نطاق الشركة أو القضية');
      records.push({ id: document.id, caseId: document.legal_case_id, title: document.document_name, type: document.document_type, source: 'lawsuit_preparation', hasFileReference: Boolean(document.file_url || document.html_content), declaredOriginal: null });
    }
  }
  return records;
}
