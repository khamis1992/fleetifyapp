import type { LegalCase } from '@/hooks/useLegalCases';
import type { LegalAttachmentMetadata } from '@/services/legalCaseQueries';

export const legalDirectionLabel = (value?: string | null) => value === 'filed_by_us' ? 'مرفوعة من الشركة' : value === 'filed_against_us' ? 'مرفوعة على الشركة' : 'غير محدد';

export function parseLegalClaimAmount(value: string | number): number {
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('أدخل قيمة المطالبة بالريال وبحد أقصى منزلتين عشريتين؛ أدخل صفرًا للمطالبة غير المالية');
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount > Number.MAX_SAFE_INTEGER / 100) throw new Error('قيمة المطالبة غير صالحة');
  return amount;
}

export function legalCaseExportRows(cases: LegalCase[], attachments: LegalAttachmentMetadata[], title: (item: LegalCase) => string, party: (item: LegalCase) => string) {
  return [
    ['معرف القضية', 'رقم القضية', 'العنوان', 'الطرف الآخر', 'case_direction', 'اتجاه الدعوى', 'النوع', 'الحالة', 'case_value: قيمة المطالبة (ر.ق) وليست حكمًا', 'outcome_type', 'outcome_amount: مبلغ النتيجة/الحكم (ر.ق)', 'outcome_amount_type', 'payment_direction', 'outcome_payment_status', 'تاريخ النتيجة', 'مرجع القيد القضائي', 'المحكمة', 'موعد الجلسة', 'عدد سجلات المستندات', 'معلومات المستندات', 'نطاق المستندات'],
    ...cases.map(item => {
      const documents = attachments.filter(document => document.caseId === item.id);
      return [item.id, item.case_number, title(item), party(item), item.case_direction, legalDirectionLabel(item.case_direction), item.case_type, item.case_status, item.case_value, item.outcome_type, item.outcome_amount, item.outcome_amount_type, item.payment_direction, item.outcome_payment_status, item.outcome_date, item.outcome_journal_entry_id, item.court_name, item.hearing_date, documents.length, JSON.stringify(documents), 'فهرس معلومات فقط؛ لا يشمل ملفات المستندات أو أصولها'];
    }),
  ];
}

/** UTF-8 CSV with spreadsheet-formula neutralization for user-entered fields. */
export function legalCaseCsv(rows: Array<Array<string | number | null | undefined>>) {
  return '\uFEFF' + rows.map(row => row.map(value => {
    const raw = String(value ?? '');
    const safe = typeof value === 'number' ? raw : /^[\s]*[=+@-]/.test(raw) || /^[\t\r\n]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n');
}

export function downloadLegalCases(csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `جميع-القضايا-حسب-الفلاتر-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
