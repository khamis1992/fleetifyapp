import { supabase } from '@/integrations/supabase/client';

export async function saveContractVehicleAndExtension(params: {
  companyId: string; contractId: string; expectedUpdatedAt: string;
  vehicleId: string; endDate: string; notes: string | null;
}) {
  const { data, error } = await supabase.rpc('amend_contract_vehicle_and_extension_atomic', {
    p_company_id: params.companyId, p_contract_id: params.contractId,
    p_expected_updated_at: params.expectedUpdatedAt, p_vehicle_id: params.vehicleId,
    p_end_date: params.endDate, p_description: params.notes,
  });
  if (error) throw new Error(error.message);
  const result = data as { success?: boolean; contract_id?: string; vehicle_id?: string; end_date?: string } | null;
  if (!result?.success || result.contract_id !== params.contractId
    || result.vehicle_id !== params.vehicleId || result.end_date !== params.endDate) {
    throw new Error('تعذر تأكيد نتيجة التعديل؛ أعد تحميل العقد للتحقق قبل المحاولة مجددًا.');
  }
  return result;
}

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
