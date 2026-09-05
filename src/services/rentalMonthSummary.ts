import { supabase } from '@/integrations/supabase/client';
import { validScheduleDate } from '@/utils/contractScheduleSettlement';

export interface RentalMonthSummaryRow {
  contract_id: string;
  customer_id: string | null;
  contract_number: string;
  customer_name: string;
  invoice_count: number;
  invoiced_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  receipt_count: number;
  latest_payment_date: string | null;
  review_reasons: string[];
}

export const rentalMonthReviewLabels: Record<string, string> = {
  missing_monthly_invoice: 'فاتورة الشهر غير موجودة',
  invalid_invoice_or_payment: 'بيانات فاتورة أو دفعة تحتاج مطابقة',
  missing_customer: 'بيانات العميل غير مكتملة',
  outside_contract_period: 'تعارض مع مدة العقد',
  schedule_amount_mismatch: 'قيمة الفواتير لا تطابق جدول الأقساط',
  unknown_invoice_month: 'توجد فاتورة غير محددة الشهر',
  unclassified_service_invoice: 'فاتورة خدمة تحتاج مطابقة مع قسط الإيجار',
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const validMonth = (month: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
const invalidResponse = () => new Error('تعذر التحقق من اكتمال تقرير السداد؛ لم تُعتمد الأرصدة المعروضة.');
const currencyUnits = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw invalidResponse();
  const scaled = value * 100;
  const units = Math.round(scaled);
  // Values arrive as JSON numbers from NUMERIC, not client arithmetic. Do not
  // let a fixed epsilon silently round a tiny positive sub-cent balance to zero.
  if (!Number.isSafeInteger(units) || value !== Number(value.toFixed(2))) throw invalidResponse();
  return units;
};

export function parseRentalMonthSummary(data: unknown, companyId: string, month: string): RentalMonthSummaryRow[] {
  if (!companyId.trim() || !validMonth(month) || !isObject(data)
    || data.company_id !== companyId || data.month !== month || !Array.isArray(data.rows)) throw invalidResponse();
  const ids = new Set<string>();
  const verifiedTotals = [0, 0, 0];
  return data.rows.map((row: unknown) => {
    if (!isObject(row) || typeof row.contract_id !== 'string' || !row.contract_id.trim()
      || ids.has(row.contract_id) || typeof row.contract_number !== 'string'
      || typeof row.customer_name !== 'string'
      || !(row.customer_id === null || (typeof row.customer_id === 'string' && row.customer_id.trim()))
      || !(row.latest_payment_date === null || (typeof row.latest_payment_date === 'string'
        && /^\d{4}-\d{2}-\d{2}$/.test(row.latest_payment_date) && validScheduleDate(row.latest_payment_date) !== null))
      || !['invoice_count','receipt_count','invoiced_amount','paid_amount','outstanding_amount'].every(
        key => typeof row[key] === 'number' && Number.isFinite(row[key]) && row[key] >= 0,
      )
      || !Number.isSafeInteger(row.invoice_count) || !Number.isSafeInteger(row.receipt_count)
      || !Array.isArray(row.review_reasons)
      || !row.review_reasons.every(reason => typeof reason === 'string' && Object.hasOwn(rentalMonthReviewLabels,reason))) {
      throw invalidResponse();
    }
    const amounts = [row.invoiced_amount, row.paid_amount, row.outstanding_amount].map(currencyUnits);
    // An explicitly quarantined overpayment may not conserve at the contract
    // level (invoice remainders are individually clamped). Keep it for review,
    // never promote it into verified totals or silently net it against debt.
    if (row.review_reasons.length === 0) {
      if (amounts[0] !== amounts[1] + amounts[2]) throw invalidResponse();
      for (let index = 0; index < amounts.length; index++) {
        verifiedTotals[index] += amounts[index];
        if (!Number.isSafeInteger(verifiedTotals[index])) throw invalidResponse();
      }
    }
    ids.add(row.contract_id);
    return row as unknown as RentalMonthSummaryRow;
  });
}

export async function fetchRentalMonthSummary(companyId: string, month: string): Promise<RentalMonthSummaryRow[]> {
  if (!companyId.trim() || !validMonth(month)) throw invalidResponse();
  const { data, error } = await supabase.rpc('get_canonical_rental_month_summary_v1', {
    p_company_id: companyId, p_month: `${month}-01`,
  });
  if (error) {
    if (['PGRST202','42883'].includes(error.code)) {
      throw new Error('تقرير السداد الجديد يحتاج نشر تحديث قاعدة البيانات؛ لن نستخدم سندات القبض القديمة لحساب المديونية.');
    }
    throw new Error('تعذر تحميل تقرير السداد. أعد المحاولة؛ لا يمكن اعتبار فشل القراءة عدم وجود مديونية.');
  }
  return parseRentalMonthSummary(data,companyId,month);
}
