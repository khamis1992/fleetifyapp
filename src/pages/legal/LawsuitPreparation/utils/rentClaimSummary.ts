import type { LawsuitPreparationState, OverdueInvoice } from '../store/types';
import { isTrafficViolationsOnlyScope } from '@/types/legalClaimScope';

const isoDate = (value?: string | null) => value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];

/** Prepaid invoice dates identify the billing month, not the last service day. */
export function summarizeRentClaim(
  rows: OverdueInvoice[],
  contract?: { start_date?: string | null; end_date?: string | null },
) {
  let grossCents = 0;
  let paidCents = 0;
  const starts: string[] = [];
  const ends: string[] = [];
  for (const row of rows) {
    const gross = Math.round(Number(row.total_amount || 0) * 100);
    const paid = Math.round(Number(row.paid_amount || 0) * 100);
    if (!Number.isSafeInteger(gross) || !Number.isSafeInteger(paid)
      || gross < 0 || paid < 0 || paid > gross) {
      throw new Error('تحتاج مبالغ الأجرة والمسددات إلى مطابقة قبل إعداد المذكرة');
    }
    if (gross === paid) continue;
    grossCents += gross;
    paidCents += paid;
    const month = isoDate(row.invoice_month || row.due_date);
    let start = isoDate(row.service_period_start);
    let end = isoDate(row.service_period_end);
    if (row.source !== 'legal_accrual' && month) {
      start ||= `${month.slice(0, 7)}-01`;
      end ||= new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0))
        .toISOString().slice(0, 10);
      const contractStart = isoDate(contract?.start_date);
      const contractEnd = isoDate(contract?.end_date);
      if (contractStart && start < contractStart) start = contractStart;
      if (contractEnd && end > contractEnd) end = contractEnd;
    }
    if (start && end && start <= end) {
      starts.push(start);
      ends.push(end);
    }
  }
  return {
    grossRent: grossCents / 100,
    countedPayments: paidCents / 100,
    netRent: (grossCents - paidCents) / 100,
    periodFrom: starts.sort()[0],
    periodTo: ends.sort().at(-1),
  };
}

/** Called at export/filing boundaries, not during transient React calculations. */
export function assertRentClaimConsistent(state: LawsuitPreparationState): void {
  if (state.financialClaimError) throw new Error(state.financialClaimError);
  if (!state.calculations) throw new Error('لم يكتمل حساب المطالبة بعد');
  const authoritative = state.financialClaimSource?.authoritativeAmounts;
  if (authoritative) {
    for (const key of Object.keys(authoritative) as (keyof typeof authoritative)[]) {
      if (Math.round(state.calculations[key] * 100) !== Math.round(authoritative[key] * 100)) {
        throw new Error('تغيرت مكونات المطالبة؛ حدّث الحساب قبل اعتماد المذكرة');
      }
    }
  }
  const trafficOnly = isTrafficViolationsOnlyScope(state.legalCase?.claim_scope);
  const summary = summarizeRentClaim(trafficOnly ? [] : state.overdueInvoices, state.contract || undefined);
  const expected = trafficOnly ? 0 : Math.round(state.calculations.overdueRent * 100);
  if (!Number.isSafeInteger(expected) || expected !== Math.round(summary.netRent * 100)) {
    throw new Error('لا تتطابق الأجرة مع إجمالي الاستحقاقات ناقص المدفوعات؛ حدّث الحساب قبل إعداد المذكرة');
  }
}
