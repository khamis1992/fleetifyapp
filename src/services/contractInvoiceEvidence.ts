import { supabase } from '@/integrations/supabase/client';
import type { Invoice } from '@/types/finance.types';
import { readContractPaymentPages } from '@/services/readContractPaymentPages';

export type ContractInvoiceEvidenceScope = {
  companyId: string;
  contractId: string;
  customerId: string;
};

export type ContractInvoiceEvidenceResult = {
  invoices: Invoice[];
  /**
   * Legacy/imported rows whose ownership could not be proven to match this
   * contract's customer but whose link to the contract is still persisted.
   * The page keeps them visible instead of failing the whole read, and
   * surfaces them to the user as review warnings.
   */
  integrityWarnings: string[];
};

export async function fetchContractInvoiceEvidenceResult(
  scope: ContractInvoiceEvidenceScope,
): Promise<ContractInvoiceEvidenceResult> {
  if (!scope.companyId || !scope.contractId || !scope.customerId) {
    throw new Error('تعذر تحديد الشركة والعقد والعميل لقراءة الفواتير.');
  }
  const links = await readContractPaymentPages((afterId) => {
    let query = supabase.from('contract_payment_schedules')
      .select('id,company_id,contract_id,invoice_id').eq('contract_id', scope.contractId)
      .eq('company_id', scope.companyId).not('invoice_id', 'is', null)
      .order('id', { ascending: true }).limit(200);
    if (afterId) query = query.gt('id', afterId);
    return query;
  });
  if (links.some((row) => row.company_id !== scope.companyId || row.contract_id !== scope.contractId)) {
    throw new Error('تعارض في ملكية جدول دفعات العقد.');
  }
  const linkedIds = [...new Set(links.map((row) => row.invoice_id).filter((id): id is string => Boolean(id)))];
  type EvidenceInvoice = Invoice & { contract_id?: string | null };
  const readInvoices = (ids?: string[]) => readContractPaymentPages<EvidenceInvoice>(async (afterId) => {
    let query = supabase.from('invoices').select('*').eq('company_id', scope.companyId);
    query = ids ? query.in('id', ids) : query.eq('contract_id', scope.contractId);
    query = query.order('id', { ascending: true }).limit(200);
    if (afterId) query = query.gt('id', afterId);
    const { data, error } = await query;
    return { data: data as EvidenceInvoice[] | null, error };
  });
  const invoices = new Map((await readInvoices()).map((row) => [row.id, row]));
  const unresolvedIds = linkedIds.filter((id) => !invoices.has(id));
  // Separate bounded IN queries avoid overflowing PostgREST URLs and prevent
  // repeated direct-contract reads in each batch. All branches remain scoped.
  for (let offset = 0; offset < unresolvedIds.length; offset += 100) {
    const ids = unresolvedIds.slice(offset, offset + 100);
    const rows = await readInvoices(ids);
    if (rows.some((row) => !ids.includes(row.id))) throw new Error('استجابة فواتير لا تطابق روابط جدول الدفعات.');
    for (const row of rows) invoices.set(row.id, row);
  }
  const integrityWarnings: string[] = [];
  const scheduleLinked = new Set(linkedIds);
  const keep: EvidenceInvoice[] = [];
  for (const row of invoices.values()) {
    // A row scoped to another company can never be proven ours: dropping it
    // keeps the read safe. Anything else that fails ownership proof is kept
    // only when the contract link itself is already persisted, and flagged.
    if (row.company_id !== scope.companyId) continue;
    const customerMismatch = row.customer_id !== scope.customerId;
    const contractMismatch = Boolean(row.contract_id && row.contract_id !== scope.contractId);
    if (contractMismatch) {
      integrityWarnings.push(
        `الفاتورة ${row.invoice_number} مرتبطة بعقد آخر؛ تم استبعادها من قراءة هذا العقد.`,
      );
      continue;
    }
    if (customerMismatch) {
      if (row.contract_id === scope.contractId || scheduleLinked.has(row.id)) {
        integrityWarnings.push(
          `العميل في الفاتورة ${row.invoice_number} لا يطابق عميل العقد (سجل قديم)؛ تحتاج مطابقة قبل اعتماد أرقامها.`,
        );
        keep.push(row);
      } else {
        integrityWarnings.push(
          `الفاتورة ${row.invoice_number} بلا رابط مثبت إلى العقد؛ تم استبعادها.`,
        );
      }
      continue;
    }
    if (!row.contract_id && !scheduleLinked.has(row.id)) {
      integrityWarnings.push(
        `الفاتورة ${row.invoice_number} بلا رابط مثبت إلى العقد؛ تم استبعادها.`,
      );
      continue;
    }
    keep.push(row);
  }
  for (const id of linkedIds) {
    const row = invoices.get(id);
    if (!row) {
      integrityWarnings.push(`فاتورة مرتبطة بجدول الدفعات غير متاحة: ${id}`);
      continue;
    }
    if (row.company_id !== scope.companyId) {
      integrityWarnings.push(`فاتورة مرتبطة بجدول الدفعات لا تخص الشركة الحالية: ${row.invoice_number || id}`);
    }
  }
  // Preserve all dates/statuses for validation; period exclusions belong to the
  // financial projection, never the source query that feeds its audit.
  const sorted = keep
    .sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || '')) || a.id.localeCompare(b.id));
  return { invoices: sorted, integrityWarnings };
}

/**
 * Back-compat shape: an Invoice[] array carrying an optional
 * `integrityWarnings` property for call sites that read it.
 */
export type ContractInvoiceEvidenceOutput = Invoice[] & { integrityWarnings?: string[] };

export async function fetchContractInvoiceEvidence(
  scope: ContractInvoiceEvidenceScope,
): Promise<ContractInvoiceEvidenceOutput> {
  const { invoices, integrityWarnings } = await fetchContractInvoiceEvidenceResult(scope);
  return Object.assign(invoices, { integrityWarnings });
}