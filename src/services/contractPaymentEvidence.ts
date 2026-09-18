import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { readContractPaymentPages } from './readContractPaymentPages';

type PaymentRow = Database['public']['Tables']['payments']['Row'];
type AllocationRow = Database['public']['Tables']['payment_allocations']['Row'];
export type PaymentApplication = { invoice_id: string | null; amount: number };
export type AttributedContractPayment = PaymentRow & { financial_applications: PaymentApplication[] };
export type ContractPaymentScope = { companyId: string; contractId: string; customerId: string; invoiceIds: string[] };
export type ContractPaymentEvidence = { payments: AttributedContractPayment[]; allocations: AllocationRow[] };
/**
 * Receipts whose persisted identity (customer/company) cannot be proven for
 * this contract are dropped from the attributed read but reported here, so the
 * page shows a review warning instead of failing or silently ignoring them.
 */
export type ContractPaymentEvidenceWithWarnings = ContractPaymentEvidence & { integrityWarnings?: string[] };

/** One cache entry for the header and ledger; display filters never change scope. */
export function contractPaymentEvidenceQueryOptions(scope: ContractPaymentScope) {
  const normalized = { ...scope, invoiceIds: [...new Set(scope.invoiceIds)].sort() };
  return {
    queryKey: ['contract-payments', scope.contractId, scope.companyId, scope.customerId, 'evidence-bundle', normalized.invoiceIds],
    queryFn: () => fetchContractPaymentEvidenceBundle(normalized),
    enabled: Boolean(scope.companyId && scope.contractId && scope.customerId),
    staleTime: 30000,
    gcTime: 300000,
  };
}

const requireScope = (scope: ContractPaymentScope) => {
  if (!scope.companyId?.trim() || !scope.contractId?.trim() || !scope.customerId?.trim()) {
    throw new Error('تعذر تحديد الشركة والعقد والعميل لقراءة الدفعات.');
  }
};

const cents = (value: unknown): number => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') throw new Error('مبلغ دفعة أو تخصيص غير صالح.');
  const number = Number(value);
  const rounded = Math.round(number * 100);
  if (!Number.isFinite(number) || number < 0 || !Number.isSafeInteger(rounded) || Math.abs(number * 100 - rounded) > 0.00001) {
    throw new Error('مبلغ دفعة أو تخصيص غير صالح.');
  }
  return rounded;
};

/** Preserve receipt gross amounts; attach only this contract's applications.
 * Legacy receipts whose identity cannot be proven for this contract are
 * skipped with a warning instead of failing the entire evidence read.
 */
export function attributeContractPayments(
  scope: ContractPaymentScope,
  payments: PaymentRow[],
  allocations: AllocationRow[],
): AttributedContractPayment[] {
  requireScope(scope);
  const invoiceIds = new Set(scope.invoiceIds);
  const activeByPayment = new Map<string, AllocationRow[]>();
  const seenAllocations = new Set<string>();
  const allocationWarnings: string[] = [];
  for (const allocation of allocations) {
    if (allocation.company_id !== scope.companyId || seenAllocations.has(allocation.id)) {
      allocationWarnings.push('تعارض في نطاق أو تكرار تخصيصات الدفعات؛ تم تجاهل السجل المخالف.');
      continue;
    }
    seenAllocations.add(allocation.id);
    if (allocation.is_active) activeByPayment.set(allocation.payment_id, [...(activeByPayment.get(allocation.payment_id) || []), allocation]);
  }
  const seenPayments = new Set<string>();
  const result: AttributedContractPayment[] = [];
  const identityWarnings: string[] = [];
  for (const payment of payments) {
    if (seenPayments.has(payment.id)) {
      identityWarnings.push('دفعة مكررة في نتيجة القراءة؛ احتُسبت مرة واحدة.');
      continue;
    }
    if (payment.company_id !== scope.companyId || payment.customer_id !== scope.customerId) {
      identityWarnings.push(
        `الإيصال ${payment.payment_number || payment.reference_number || payment.id} لا يطابق الشركة أو عميل العقد (سجل قديم)؛ لم يُعتمد في السداد.`,
      );
      continue;
    }
    seenPayments.add(payment.id);
    const applications: PaymentApplication[] = [];
    const active = activeByPayment.get(payment.id) || [];
    const gross = cents(payment.amount);
    const allocated = active.reduce((sum, row) => sum + cents(row.amount), 0);
    if (allocated > gross) throw new Error('مجموع تخصيصات الدفعة يتجاوز مبلغ الإيصال.');
    const completed = ['completed', 'paid', 'success', 'succeeded', 'cleared'].includes(String(payment.payment_status || '').trim().toLowerCase())
      && String(payment.transaction_type || 'receipt').trim().toLowerCase() === 'receipt';
    if (completed) {
      if (active.length) {
        for (const row of active) {
          if (row.allocation_type === 'invoice' && invoiceIds.has(row.target_id)) applications.push({ invoice_id: row.target_id, amount: cents(row.amount) / 100 });
          if (row.allocation_type === 'contract' && row.target_id === scope.contractId) applications.push({ invoice_id: null, amount: cents(row.amount) / 100 });
        }
      } else if (payment.invoice_id && invoiceIds.has(payment.invoice_id)) {
        applications.push({ invoice_id: payment.invoice_id, amount: gross / 100 });
      } else if (!payment.invoice_id && payment.contract_id === scope.contractId) {
        applications.push({ invoice_id: null, amount: gross / 100 });
      }
    }
    result.push({ ...payment, financial_applications: applications });
  }
  if ([...activeByPayment.keys()].some((id) => !seenPayments.has(id))) {
    identityWarnings.push('تخصيص نشط بلا إيصال متاح؛ راجع تخصيصات الدفعات لهذا العقد.');
  }
  return Object.assign(result, {
    integrityWarnings: [...allocationWarnings, ...identityWarnings],
  } as { integrityWarnings: string[] });
}

export async function fetchContractPaymentEvidenceBundle(
  scope: ContractPaymentScope,
): Promise<ContractPaymentEvidenceWithWarnings> {
  requireScope(scope);
  const evidenceWarnings: string[] = [];
  const chunks = (ids: string[]) => Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) => ids.slice(index * 100, index * 100 + 100));
  const invoices = [...new Set(scope.invoiceIds)];
  const readAllocations = (field: 'target_id' | 'payment_id', ids: string[], type?: string) => readContractPaymentPages<AllocationRow>((afterId) => {
    let query = supabase.from('payment_allocations').select('*').eq('company_id', scope.companyId).in(field, ids);
    if (type) query = query.eq('allocation_type', type);
    query = query.order('id', { ascending: true }).limit(200);
    if (afterId) query = query.gt('id', afterId);
    return query;
  });
  const anchors = await readAllocations('target_id', [scope.contractId], 'contract');
  for (const ids of chunks(invoices)) anchors.push(...await readAllocations('target_id', ids, 'invoice'));
  const readPayments = (field: 'contract_id' | 'invoice_id' | 'id', ids: string[]) => readContractPaymentPages<PaymentRow>((afterId) => {
    let query = supabase.from('payments').select('*').eq('company_id', scope.companyId).in(field, ids).order('id', { ascending: true }).limit(200);
    if (afterId) query = query.gt('id', afterId);
    return query;
  });
  const payments = new Map<string, PaymentRow>();
  const merge = (rows: PaymentRow[]) => {
    for (const row of rows) {
      const previous = payments.get(row.id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(row)) throw new Error('تغيرت الدفعة أثناء قراءة بيانات العقد؛ أعد التحميل.');
      payments.set(row.id, row);
    }
  };
  merge(await readPayments('contract_id', [scope.contractId]));
  for (const ids of chunks(invoices)) merge(await readPayments('invoice_id', ids));
  const missing = [...new Set(anchors.map((row) => row.payment_id))].filter((id) => !payments.has(id));
  for (const ids of chunks(missing)) merge(await readPayments('id', ids));
  if (anchors.some((row) => row.is_active && !payments.has(row.payment_id))) {
    evidenceWarnings.push('تخصيص نشط بلا إيصال متاح؛ راجع تخصيصات الدفعات لهذا العقد.');
  }
  const allocations: AllocationRow[] = [];
  for (const ids of chunks([...payments.keys()])) allocations.push(...await readAllocations('payment_id', ids));
  const finalById = new Map(allocations.map((row) => [row.id, row]));
  // A disappeared/deactivated anchor must not revive the legacy gross fallback.
  // This detects observed changes; multiple HTTP reads are still not an atomic snapshot.
  for (const anchor of anchors) {
    if (!payments.has(anchor.payment_id)) continue; // Inactive orphan history contributes nothing.
    const final = finalById.get(anchor.id);
    if (!final || final.payment_id !== anchor.payment_id || final.company_id !== anchor.company_id
      || final.target_id !== anchor.target_id || final.allocation_type !== anchor.allocation_type
      || final.is_active !== anchor.is_active || cents(final.amount) !== cents(anchor.amount)) {
      throw new Error('تغيرت تخصيصات الدفعات أثناء القراءة؛ أعد تحميل بيانات العقد.');
    }
  }
  const attributed = attributeContractPayments(scope, [...payments.values()], allocations);
  const attributedWarnings = (attributed as AttributedContractPayment[] & { integrityWarnings?: string[] }).integrityWarnings || [];
  return {
    payments: attributed, allocations, integrityWarnings: [...evidenceWarnings, ...attributedWarnings],
  };
}

export async function fetchContractPaymentEvidence(scope: ContractPaymentScope): Promise<AttributedContractPayment[]> {
  return (await fetchContractPaymentEvidenceBundle(scope)).payments;
}
