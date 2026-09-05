import { supabase } from '@/integrations/supabase/client';

/** Notes-only quick save. Financial/identity changes belong to amendment commands. */
export async function saveContractNotes({
  companyId,
  contractId,
  expectedUpdatedAt,
  notes,
}: {
  companyId: string;
  contractId: string;
  expectedUpdatedAt: string;
  notes: string | null;
}) {
  if (!companyId?.trim() || !contractId?.trim() || !expectedUpdatedAt?.trim()) {
    throw new Error('تعذر التحقق من نسخة العقد الحالية؛ أعد تحميل تفاصيل العقد قبل الحفظ.');
  }
  const description = notes === '' ? null : notes;
  const { data, error } = await supabase
    .from('contracts')
    // Never resend dates/amounts/vehicle from a potentially stale form.
    .update({ description })
    .eq('id', contractId)
    .eq('company_id', companyId)
    .eq('updated_at', expectedUpdatedAt)
    .select('id, company_id, description, updated_at')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('لم يُحفظ التعديل: تغير العقد أو لم يعد متاحًا بصلاحياتك. أعد تحميله وراجع أحدث البيانات.');
    }
    throw new Error(error.message || 'تعذر تأكيد حفظ الملاحظات؛ أعد تحميل العقد للتحقق قبل إعادة المحاولة.');
  }
  if (!data || data.id !== contractId || data.company_id !== companyId
    || data.description !== description || !data.updated_at) {
    throw new Error('لم تصل نتيجة حفظ مطابقة للعقد والملاحظات؛ أعد تحميل العقد للتحقق قبل إعادة المحاولة.');
  }
  return data;
}
