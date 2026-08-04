/**
 * أدوات مشتركة لسجل التواصل (customer_communications)
 * تُستخدم في مساحة الموظف (تبويب سجل التواصل) وصفحة المهام (تبويب الملاحظات للمدير)
 */

export const callOutcomeLabels: Record<string, string> = {
  answered: 'تم الرد',
  no_answer: 'لم يتم الرد',
  busy: 'مشغول',
  voicemail: 'بريد صوتي',
  wrong_number: 'رقم خاطئ',
};

export const callPurposeLabels: Record<string, string> = {
  payment_reminder: 'تذكير بالدفع',
  contract_renewal: 'تجديد عقد',
  complaint_resolution: 'معالجة شكوى',
  general_inquiry: 'استفسار عام',
  follow_up: 'متابعة',
  other: 'أخرى',
};

export const noteTypeLabels: Record<string, string> = {
  general: 'عامة',
  payment_related: 'متعلقة بالدفع',
  complaint: 'شكوى',
  vehicle_condition: 'حالة المركبة',
  customer_request: 'طلب العميل',
  important: 'مهمة',
  other: 'أخرى',
};

export interface CommunicationLogItem {
  id: string;
  communication_type: 'phone' | 'message' | 'meeting' | 'note';
  communication_date: string;
  communication_time: string;
  duration_minutes: number | null;
  notes: string;
  follow_up_scheduled: boolean | null;
  follow_up_date: string | null;
  customer_id: string;
  contract_id: string | null;
  employee_id?: string;
  ai_summary: string | null;
  attachments: unknown;
}

export const parseCallNotes = (notes?: string | null) => {
  const text = String(notes || '').trim();
  const [firstLine = '', ...rest] = text.split(/\r?\n/);
  const [purposeRaw = '', outcomeRaw = ''] = firstLine.split(' - ');
  const body = rest
    .filter((line) => !line.trim().startsWith('نوع المكالمة:'))
    .join('\n')
    .trim();

  return {
    purpose: callPurposeLabels[purposeRaw.trim()] || purposeRaw.trim() || 'اتصال',
    outcome: callOutcomeLabels[outcomeRaw.trim()] || outcomeRaw.trim() || 'غير محدد',
    body: body || text,
  };
};

export const parseNoteContent = (notes?: string | null) => {
  const text = String(notes || '').trim();
  const match = text.match(/^\[([^\]]+)\](\s*\[مهمة\])?\s*([\s\S]*)$/);
  if (!match) return { typeLabel: 'ملاحظة', important: false, body: text };
  return {
    typeLabel: noteTypeLabels[match[1].trim()] || match[1].trim(),
    important: Boolean(match[2]),
    body: (match[3] || '').trim() || text,
  };
};

export const getCallRecordingPath = (attachments: unknown): string | null => {
  if (!Array.isArray(attachments)) return null;
  const recording = attachments.find(
    (attachment: { type?: string; path?: string } | null) =>
      attachment?.type === 'call_recording' && Boolean(attachment?.path),
  ) as { path?: string } | undefined;
  return recording?.path || null;
};

export const communicationLogDateFormatter = new Intl.DateTimeFormat('ar-QA', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
