import { supabase } from '@/integrations/supabase/client';
import { financeToday, readFinancialPages, requireFinanceCompany } from '@/services/financialReporting';
import { requireInvoiceReportDate } from '@/services/financialInvoiceReports';
import { listFinancialStatementPackages } from '@/services/financialStatementPackage';
import { portfolioNumber, validatePortfolioRows, storageDocumentLocation } from '@/utils/insolvencyPortfolioRules';
import type { InsolvencyPortfolio, PortfolioDocument, PortfolioRegister, PortfolioRow } from '@/types/insolvencyPortfolio';

interface RegisterSpec { key: string; label: string; select?: string; scope?: string; date?: string; posted?: boolean; ownedBy?: { register: string; column: string } }
export const PORTFOLIO_REGISTERS: readonly RegisterSpec[] = [
  { key: 'companies', label: 'بيانات الشركة والعملة', select: 'id,name,name_ar,currency', scope: 'id' },
  { key: 'chart_of_accounts', label: 'دليل الحسابات' },
  { key: 'journal_entries', label: 'رؤوس القيود المرحلة', date: 'entry_date', posted: true },
  { key: 'journal_entry_lines', label: 'خطوط القيود المرحلة', scope: 'journal_entries.company_id', date: 'journal_entries.entry_date', posted: true, select: '*,journal_entries!journal_entry_lines_journal_entry_id_fkey!inner(company_id,entry_date,status),chart_of_accounts!journal_entry_lines_account_id_fkey!inner(company_id,account_code,account_name,account_name_ar,account_type)' },
  { key: 'invoices', label: 'جميع الفواتير وحالاتها', date: 'invoice_date' },
  { key: 'invoice_items', label: 'تفاصيل بنود الفواتير', select: '*,invoices!inner(company_id,invoice_date)', scope: 'invoices.company_id', date: 'invoices.invoice_date' },
  { key: 'payments', label: 'جميع الدفعات وحالاتها', date: 'payment_date' },
  { key: 'payment_allocations', label: 'تخصيص الدفعات الحالي' },
  { key: 'customers', label: 'دليل العملاء والمدينين' },
  { key: 'vendors', label: 'دليل الموردين والدائنين' },
  { key: 'contracts', label: 'العقود وحالاتها الحالية' },
  { key: 'customer_deposits', label: 'تأمينات العملاء' },
  { key: 'vehicles', label: 'الأسطول الكامل بما فيه غير النشط' },
  { key: 'fixed_assets', label: 'الأصول الثابتة الأخرى' },
  { key: 'vehicle_maintenance', label: 'أوامر الصيانة والتكاليف المسجلة' },
  { key: 'vehicle_condition_reports', label: 'تقارير فحص المركبات والأضرار المسجلة' },
  { key: 'traffic_violations', label: 'المخالفات المرورية وتحديد المسؤولية' },
  { key: 'traffic_violation_payments', label: 'دفعات المخالفات' },
  { key: 'penalties', label: 'سجل الغرامات؛ قد يتداخل مع المخالفات' },
  { key: 'vehicle_installments', label: 'اتفاقيات تمويل المركبات' },
  { key: 'contract_vehicles', label: 'ربط المركبات باتفاقيات التمويل ومبالغ التخصيص' },
  { key: 'vehicle_installment_schedules', label: 'جداول أقساط المركبات' },
  { key: 'vehicle_installment_payments', label: 'دفعات أقساط المركبات' },
  { key: 'monthly_obligations', label: 'الالتزامات الشهرية' },
  { key: 'monthly_obligation_installments', label: 'أقساط الالتزامات الشهرية' },
  { key: 'monthly_obligation_payments', label: 'دفعات الالتزامات الشهرية' },
  { key: 'employees', label: 'سجل الموظفين ومستحقاتهم المسجلة' },
  { key: 'banks', label: 'حسابات البنوك وأرصدتها المسجلة' },
  { key: 'bank_transactions', label: 'حركات البنوك المسجلة', date: 'transaction_date' },
  { key: 'bank_statement_imports', label: 'دفعات استيراد كشف البنك' },
  { key: 'bank_statement_lines', label: 'سطور كشوف البنك المستوردة' },
  { key: 'bank_statement_entries', label: 'سجل مطابقة كشف البنك' },
  { key: 'bank_reconciliation_batches', label: 'تسويات البنك المسجلة' },
  { key: 'payroll', label: 'سجل الرواتب', date: 'payroll_date' },
  { key: 'payroll_reviews', label: 'مراجعات الرواتب والتزاماتها' },
  { key: 'payroll_slips', label: 'كشوف مستحقات الرواتب', ownedBy: { register: 'employees', column: 'employee_id' } },
  { key: 'legal_cases', label: 'القضايا والمطالبات والأحكام' },
  { key: 'legal_case_payments', label: 'دفعات ومصاريف القضايا' },
  { key: 'company_legal_documents', label: 'فهرس مستندات الشركة' },
  { key: 'legal_case_documents', label: 'فهرس مستندات القضايا' },
  { key: 'vehicle_documents', label: 'فهرس مستندات المركبات', ownedBy: { register: 'vehicles', column: 'vehicle_id' } },
  { key: 'contract_documents', label: 'فهرس ملفات العقود' },
  { key: 'customer_documents', label: 'فهرس مستندات العملاء المرتبطة بالعقود' },
  { key: 'vendor_documents', label: 'فهرس مستندات الموردين' },
  { key: 'lawsuit_documents', label: 'فهرس مستندات الدعاوى المولدة' },
];

// A narrow read-only boundary for heterogeneous registers. Table names are fixed above.
interface PortfolioQuery extends PromiseLike<{ data: PortfolioRow[] | null; error: { message: string } | null; count: number | null }> {
  select(columns: string, options?: { count?: 'exact'; head?: boolean }): PortfolioQuery;
  eq(column: string, value: string): PortfolioQuery;
  in(column: string, values: string[]): PortfolioQuery;
  lte(column: string, value: string): PortfolioQuery;
  order(column: string): PortfolioQuery;
  range(from: number, to: number): PortfolioQuery;
}
const reader = supabase as unknown as { from(table: string): PortfolioQuery };

export async function readPortfolioRegister(spec: RegisterSpec, companyId: string, cutoff: string, parentRegister?: PortfolioRegister): Promise<PortfolioRegister> {
  requireFinanceCompany(companyId);
  requireInvoiceReportDate(cutoff);
  if (!PORTFOLIO_REGISTERS.some(item => item === spec)) throw new Error('سجل حافظة غير معتمد');
  const payroll = spec.key === 'payroll_slips';
  const parent = spec.ownedBy;
  if (parent && parentRegister?.key !== parent.register) throw new Error(payroll ? 'يلزم التحقق من موظفي الشركة قبل قراءة قسائم الرواتب' : 'يلزم التحقق من مركبات الشركة قبل قراءة مستنداتها');
  const parentIds: string[] = [];
  if (parent && parentRegister) {
    validatePortfolioRows(parentRegister.rows, companyId);
    parentIds.push(...parentRegister.rows.map(row => String(row.id)));
  }
  const readBatch = async (ownerIds?: string[]) => {
    let expected: number | undefined;
    const makeQuery = (options?: { count?: 'exact'; head?: boolean }) => {
      let query = reader.from(spec.key).select(spec.select || '*', options);
      if (parent) {
        if (!ownerIds?.length) throw new Error('لا يمكن قراءة السجلات التابعة دون مالكين مثبتين');
        query = query.in(parent.column, ownerIds);
      } else {
        query = query.eq(spec.scope || 'company_id', companyId);
      }
      if (spec.date) query = query.lte(spec.date, cutoff);
      if (spec.posted) query = query.eq(spec.key === 'journal_entries' ? 'status' : 'journal_entries.status', 'posted');
      if (spec.key === 'journal_entry_lines') query = query.eq('chart_of_accounts.company_id', companyId);
      return query;
    };
    const rows = await readFinancialPages<PortfolioRow>(async (from, to) => {
      // Exact counts of the large ledger are costly under RLS. Count at both boundaries,
      // and still verify every page, unique ID, parent, and journal total in between.
      const query = makeQuery(from === 0 ? { count: 'exact' } : undefined).order('id').range(from, to);
      const result = await query;
      if (result.error) throw new Error(`${spec.label}: ${result.error.message}`);
      if ((expected === undefined && result.count == null) || (result.count != null && (!Number.isInteger(result.count) || result.count < 0 || (expected !== undefined && result.count !== expected)))) throw new Error(`${spec.label}: تغير عدد السجلات أو تعذر التحقق منه؛ أعد التحميل`);
      if (result.count != null) expected = result.count;
      return { ...result, count: expected };
    });
    const finalCount = await makeQuery({ count: 'exact', head: true });
    if (finalCount.error) throw new Error(`${spec.label}: ${finalCount.error.message}`);
    if (finalCount.count !== expected) throw new Error(`${spec.label}: تغير سجل البيانات أثناء القراءة؛ أعد التحميل`);
    if (rows.length !== expected) throw new Error(`${spec.label}: عدد الصفوف لا يطابق العدد الكامل`);
    return rows;
  };
  const rows: PortfolioRow[] = [];
  if (parent) {
    // These tables have no foreign key for PostgREST embedding. Restrict each query
    // to parent IDs already verified for this company; never issue an unscoped read.
    for (let index = 0; index < parentIds.length; index += 100) {
      const ownerIds = parentIds.slice(index, index + 100);
      const batch = await readBatch(ownerIds);
      if (batch.some(row => typeof row[parent.column] !== 'string' || !ownerIds.includes(row[parent.column] as string))) throw new Error(payroll ? 'قسيمة راتب خارج موظفي الشركة المحددة' : 'مستند مركبة خارج مركبات الشركة المحددة');
      rows.push(...batch);
    }
    const ids = new Set<string>();
    for (const row of rows) {
      if (typeof row.id !== 'string' || ids.has(row.id)) throw new Error('سجل تابع مكرر أو بلا معرف');
      ids.add(row.id);
    }
  } else {
    rows.push(...await readBatch());
    validatePortfolioRows(rows, companyId, spec.scope);
  }
  const exportRows = rows.map(row => Object.fromEntries(Object.entries(row).filter(([column]) => !/(?:encrypted|password|credential|access_token|refresh_token|api_key|secret|encryption_iv)/i.test(column))));
  return { key: spec.key, label: spec.label, basis: spec.posted ? 'posted_ledger' : spec.date ? 'dated_records' : 'current_records', rows: exportRows, readAt: new Date().toISOString() };
}

export function portfolioDocuments(registers: PortfolioRegister[]): PortfolioDocument[] {
  const owned = new Set(registers.flatMap(register => ['contracts', 'customers', 'vehicles', 'legal_cases', 'vendors'].includes(register.key) ? register.rows.map(row => String(row.id)) : []));
  const referenceOwner = (value: unknown) => {
    if (typeof value !== 'string') return null;
    try {
      const path = /^https?:\/\//i.test(value) ? decodeURIComponent(new URL(value).pathname.replace(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/[^/]+\//, '')) : value;
      const segments = path.split('/');
      const id = segments[0] === 'legal-packages' ? segments[2] : ['vehicle-documents', 'customer-documents', 'customer_documents'].includes(segments[0]) ? segments[1] : segments[0];
      return owned.has(id) ? id : null;
    } catch { return null; }
  };
  const specs = [
    { source: 'company_legal_documents', field: 'file_url', owner: 'company_id', buckets: ['legal-documents'] },
    { source: 'legal_case_documents', field: 'file_path', owner: 'case_id', buckets: ['legal-documents', 'documents'] },
    { source: 'vehicle_documents', field: 'document_url', owner: 'vehicle_id', buckets: ['documents', 'contract-documents'] },
    { source: 'contract_documents', field: 'file_path', owner: 'contract_id', buckets: ['contract-documents', 'documents', 'vehicle-condition-diagrams'] },
    { source: 'customer_documents', field: 'file_path', owner: 'customer_id', buckets: ['documents'] },
    { source: 'vendor_documents', field: 'document_url', owner: 'vendor_id', buckets: ['documents'] },
    { source: 'lawsuit_documents', field: 'file_url', owner: 'legal_case_id', buckets: ['contract-documents', 'legal-documents', 'documents'] },
  ];
  return specs.flatMap(spec => (registers.find(register => register.key === spec.source)?.rows || []).map(row => ({
    id: String(row.id), source: spec.source,
    name: String(row.document_name || row.file_name || row.document_title_ar || row.document_title || row.title_ar || row.title || row.id),
    category: String(row.document_type || 'other'), ownerId: typeof row[spec.owner] === 'string' ? row[spec.owner] as string : null,
    reference: typeof row[spec.field] === 'string' ? row[spec.field] as string : null,
    buckets: spec.buckets,
    generatedHtml: spec.source === 'lawsuit_documents' && typeof row.html_content === 'string' ? row.html_content : undefined,
    verifiedOwnerIds: [...new Set([row.contract_id, row.customer_id, row.vehicle_id, row.case_id, row.legal_case_id, row.vendor_id, referenceOwner(row[spec.field])].filter((value): value is string => typeof value === 'string' && owned.has(value)))],
    referenceOwnerId: referenceOwner(row[spec.field]),
    expectedBytes: portfolioNumber(row.file_size),
    recordState: [row.legal_evidence_state, row.legal_identity_match_status, row.ai_match_status, row.processing_status,
      referenceOwner(row[spec.field]) && ![row.contract_id, row.customer_id, row.vehicle_id, row.case_id, row.legal_case_id, row.vendor_id].includes(referenceOwner(row[spec.field])) ? 'ارتباط المسار لا يطابق سجل المستند؛ نسخة للشركة تحتاج مراجعة الربط' : null,
    ].filter(value => typeof value === 'string').join(' / ') || null,
    active: row.is_active !== false && row.deleted_at == null,
  })));
}

export async function readInsolvencyPortfolio(companyId: string, cutoff: string, onProgress?: (done: number, total: number) => void): Promise<InsolvencyPortfolio> {
  requireFinanceCompany(companyId);
  requireInvoiceReportDate(cutoff);
  if (cutoff > financeToday()) throw new Error('لا يمكن استخراج حافظة بتاريخ مستقبلي');
  const startedAt = new Date().toISOString();
  const registers: PortfolioRegister[] = [];
  let done = 0;
  onProgress?.(0, PORTFOLIO_REGISTERS.length);
  // Limit load while reading every page. Each failed register aborts the extraction.
  for (let index = 0; index < PORTFOLIO_REGISTERS.length; index += 4) {
    registers.push(...await Promise.all(PORTFOLIO_REGISTERS.slice(index, index + 4).map(async spec => {
      const register = await readPortfolioRegister(spec, companyId, cutoff, registers.find(item => item.key === spec.ownedBy?.register));
      onProgress?.(++done, PORTFOLIO_REGISTERS.length);
      return register;
    })));
  }
  const savedStatements = await listFinancialStatementPackages(companyId);
  if (registers.find(register => register.key === 'companies')?.rows.length !== 1) throw new Error('تعذر التحقق من سجل الشركة المختارة');
  const heads = registers.find(register => register.key === 'journal_entries')?.rows;
  const lines = registers.find(register => register.key === 'journal_entry_lines')?.rows;
  if (!heads || !lines) throw new Error('دفتر الأستاذ غير مكتمل');
  const byHead = new Map<string, PortfolioRow[]>();
  for (const line of lines) {
    const list = byHead.get(String(line.journal_entry_id)) || [];
    list.push(line); byHead.set(String(line.journal_entry_id), list);
  }
  const ids = new Set(heads.map(head => head.id));
  for (const head of heads) {
    const entryLines = byHead.get(String(head.id)) || [];
    if (entryLines.length < 2) throw new Error('قيد مرحل بلا خطوط مكتملة؛ راجع دفتر الأستاذ قبل تصدير الحافظة');
    const cents = (value: unknown) => {
      const amount = portfolioNumber(value);
      if (amount == null) throw new Error('مبلغ قيد غير متوفر؛ تعذر التحقق من اكتمال دفتر الأستاذ');
      return Math.round(amount * 100);
    };
    const sum = (key: string) => entryLines.reduce((total, line) => total + cents(line[key]), 0);
    if (sum('debit_amount') !== sum('credit_amount') || sum('debit_amount') !== cents(head.total_debit) || sum('credit_amount') !== cents(head.total_credit)) throw new Error('خطوط القيد لا تتطابق مع مجاميعه أو غير متوازنة؛ يلزم مراجعة المحاسب');
  }
  if ([...byHead.keys()].some(id => !ids.has(id))) throw new Error('تغيرت القيود أثناء القراءة؛ أعد تحميل الحافظة');
  return { companyId, cutoff, startedAt, completedAt: new Date().toISOString(), registers, documents: portfolioDocuments(registers), savedStatements: savedStatements as unknown as PortfolioRow[] };
}

export async function downloadPortfolioDocument(doc: PortfolioDocument, companyId: string): Promise<Blob> {
  requireFinanceCompany(companyId);
  if (!doc.reference) throw new Error('المستند بلا ملف محفوظ');
  const storageUrl = supabase.storage.from('legal-documents').getPublicUrl('_').data.publicUrl;
  const locations = storageDocumentLocation(doc.reference, doc.buckets, storageUrl, companyId, doc.verifiedOwnerIds);
  for (const location of locations) {
    const { data, error } = await supabase.storage.from(location.bucket).download(location.path);
    if (!error && data && data.size > 0) return data;
  }
  throw new Error('تعذر تنزيل الملف المحفوظ أو الملف فارغ؛ يحتاج إعادة إرفاق');
}

