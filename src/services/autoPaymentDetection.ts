// ============================================================================
// خدمة الكشف عن الدفع التلقائي
// تقارن المخالفات الحالية مع المخالفات المستوردة من PDF
// المخالفات المفقودة = تم دفعها من الشركة
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { ExtractedViolation } from '@/types/violations';

export interface PaidViolation {
  id: string;
  penalty_number: string;
  penalty_date: string;
  vehicle_plate: string | null;
  amount: number;
  customer_id: string | null;
  customer_name?: string;
}

export interface AutoPaymentResult {
  totalExisting: number;
  totalInPDF: number;
  paidByCompany: PaidViolation[];
  matchedCount: number;
  newViolations: number;
}

/**
 * مقارنة المخالفات الحالية غير المدفوعة مع المخالفات المستوردة
 * المخالفات الموجودة في النظام ولكن غير موجودة في PDF = تم دفعها
 */
export async function detectPaidViolations(
  extractedViolations: ExtractedViolation[],
  companyId: string
): Promise<AutoPaymentResult> {
  console.log(`🔍 [AutoPayment] Starting detection with ${extractedViolations.length} extracted violations`);
  
  // استخراج أرقام اللوحات الفريدة من المخالفات المستوردة
  const uniquePlates = new Set(
    extractedViolations
      .map(v => v.plate_number?.trim().toUpperCase())
      .filter(Boolean)
  );
  
  console.log(`🔍 [AutoPayment] Unique plates in PDF: ${Array.from(uniquePlates).join(', ')}`);
  
  if (uniquePlates.size === 0) {
    console.log('⚠️ [AutoPayment] No valid plates found in extracted violations');
    return {
      totalExisting: 0,
      totalInPDF: extractedViolations.length,
      paidByCompany: [],
      matchedCount: 0,
      newViolations: extractedViolations.length
    };
  }

  // جلب المخالفات غير المدفوعة للشركة فقط للوحات المستوردة
  const { data: existingViolations, error } = await supabase
    .from('penalties')
    .select(`
      id,
      penalty_number,
      penalty_date,
      vehicle_plate,
      vehicle_id,
      amount,
      customer_id,
      payment_status,
      customers (
        first_name,
        last_name,
        company_name
      )
    `)
    .eq('company_id', companyId)
    .neq('payment_status', 'paid')
    .in('vehicle_plate', Array.from(uniquePlates)); // فقط للوحات الموجودة في PDF

  if (error) {
    console.error('Error fetching existing violations:', error);
    return {
      totalExisting: 0,
      totalInPDF: extractedViolations.length,
      paidByCompany: [],
      matchedCount: 0,
      newViolations: extractedViolations.length
    };
  }

  console.log(`🔍 [AutoPayment] Found ${existingViolations?.length || 0} unpaid violations in DB for these plates`);

  // إنشاء مجموعة من أرقام المخالفات المستوردة
  const importedNumbers = new Set(
    extractedViolations
      .map(v => v.violation_number?.trim().toLowerCase())
      .filter(Boolean)
  );

  console.log(`🔍 [AutoPayment] Valid violation numbers in PDF: ${importedNumbers.size}`);

  // إنشاء مجموعة من أرقام اللوحات المستوردة مع التواريخ للمطابقة البديلة
  const importedPlateDate = new Set(
    extractedViolations.map(v => 
      `${v.plate_number?.trim().toLowerCase()}_${v.date}`
    )
  );

  // المخالفات المفقودة = تم دفعها
  const paidByCompany: PaidViolation[] = [];
  let matchedCount = 0;

  for (const existing of existingViolations || []) {
    const penaltyNumber = existing.penalty_number?.trim().toLowerCase();
    const plateDate = `${existing.vehicle_plate?.trim().toLowerCase()}_${existing.penalty_date}`;

    // التحقق من وجود المخالفة في PDF
    const isInPDF = 
      (penaltyNumber && importedNumbers.has(penaltyNumber)) ||
      importedPlateDate.has(plateDate);

    if (isInPDF) {
      matchedCount++;
    } else {
      // المخالفة غير موجودة في PDF = تم دفعها
      const customer = existing.customers as any;
      const customerName = customer 
        ? (customer.company_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim())
        : undefined;

      paidByCompany.push({
        id: existing.id,
        penalty_number: existing.penalty_number,
        penalty_date: existing.penalty_date,
        vehicle_plate: existing.vehicle_plate,
        amount: existing.amount,
        customer_id: existing.customer_id,
        customer_name: customerName
      });
    }
  }

  console.log(`✅ [AutoPayment] Detection complete: ${matchedCount} matched, ${paidByCompany.length} paid by company`);

  return {
    totalExisting: existingViolations?.length || 0,
    totalInPDF: extractedViolations.length,
    paidByCompany,
    matchedCount,
    newViolations: extractedViolations.length - matchedCount
  };
}

/**
 * تحديث المخالفات كمدفوعة من الشركة
 */
export async function markViolationsAsPaidByCompany(
  violationIds: string[]
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const id of violationIds) {
    const { error } = await supabase
      .from('penalties')
      .update({
        payment_status: 'paid',
        paid_by_company: true,
        company_paid_date: new Date().toISOString(),
        customer_payment_status: 'unpaid', // العميل لم يسدد بعد
        updated_at: new Date().toISOString(),
        notes: (await supabase
          .from('penalties')
          .select('notes')
          .eq('id', id)
          .single()
        ).data?.notes 
          ? `${(await supabase.from('penalties').select('notes').eq('id', id).single()).data?.notes}\n[تم الدفع تلقائياً من الشركة]`
          : '[تم الدفع تلقائياً من الشركة]'
      })
      .eq('id', id);

    if (error) {
      console.error(`Error updating violation ${id}:`, error);
      failed++;
    } else {
      success++;
    }
  }

  return { success, failed };
}

/**
 * تحديث المخالفات كمدفوعة من الشركة (نسخة محسّنة)
 * تستخدم الحقول الموجودة حالياً مع إضافة ملاحظة للتوضيح
 */
export async function markViolationsAsPaidByCompanyBatch(
  violationIds: string[]
): Promise<{ success: number; failed: number }> {
  if (violationIds.length === 0) {
    return { success: 0, failed: 0 };
  }

  const now = new Date().toISOString();
  let success = 0;
  let failed = 0;

  // تحديث كل مخالفة على حدة لإضافة الملاحظة
  for (const id of violationIds) {
    try {
      // جلب الملاحظات الحالية
      const { data: current } = await supabase
        .from('penalties')
        .select('notes')
        .eq('id', id)
        .single();

      const existingNotes = current?.notes || '';
      const newNote = `[${new Date().toLocaleDateString('ar-QA')}] تم الدفع تلقائياً من الشركة - العميل مطالب بالسداد`;
      const updatedNotes = existingNotes 
        ? `${existingNotes}\n${newNote}`
        : newNote;

      // تحديث المخالفة
      const { error } = await supabase
        .from('penalties')
        .update({
          payment_status: 'paid',
          notes: updatedNotes,
          updated_at: now
        })
        .eq('id', id);

      if (error) {
        console.error(`Error updating violation ${id}:`, error);
        failed++;
      } else {
        success++;
      }
    } catch (err) {
      console.error(`Exception updating violation ${id}:`, err);
      failed++;
    }
  }

  console.log(`✅ Marked ${success} violations as paid by company (${failed} failed)`);

  return { success, failed };
}

/**
 * الحصول على المخالفات المدفوعة من الشركة والتي لم يسددها العميل
 */
export async function getCompanyPaidUnpaidByCustomer(
  companyId: string
): Promise<PaidViolation[]> {
  const { data, error } = await supabase
    .from('penalties')
    .select(`
      id,
      penalty_number,
      penalty_date,
      vehicle_plate,
      amount,
      customer_id,
      customers (
        first_name,
        last_name,
        company_name
      )
    `)
    .eq('company_id', companyId)
    .eq('paid_by_company', true)
    .eq('customer_payment_status', 'unpaid');

  if (error) {
    console.error('Error fetching company paid violations:', error);
    return [];
  }

  return (data || []).map(v => {
    const customer = v.customers as any;
    return {
      id: v.id,
      penalty_number: v.penalty_number,
      penalty_date: v.penalty_date,
      vehicle_plate: v.vehicle_plate,
      amount: v.amount,
      customer_id: v.customer_id,
      customer_name: customer 
        ? (customer.company_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim())
        : undefined
    };
  });
}

/**
 * الحصول على إحصائيات المخالفات المدفوعة من الشركة
 */
export async function getCompanyPaidStats(
  companyId: string
): Promise<{
  totalPaidByCompany: number;
  totalAmount: number;
  unpaidByCustomer: number;
  unpaidAmount: number;
  paidByCustomer: number;
  recoveredAmount: number;
}> {
  const { data: paidByCompany, error } = await supabase
    .from('penalties')
    .select('amount, customer_payment_status')
    .eq('company_id', companyId)
    .eq('paid_by_company', true);

  if (error || !paidByCompany) {
    return {
      totalPaidByCompany: 0,
      totalAmount: 0,
      unpaidByCustomer: 0,
      unpaidAmount: 0,
      paidByCustomer: 0,
      recoveredAmount: 0
    };
  }

  const totalAmount = paidByCompany.reduce((sum, v) => sum + (v.amount || 0), 0);
  const unpaidByCustomer = paidByCompany.filter(v => v.customer_payment_status === 'unpaid');
  const paidByCustomer = paidByCompany.filter(v => v.customer_payment_status === 'paid');

  return {
    totalPaidByCompany: paidByCompany.length,
    totalAmount,
    unpaidByCustomer: unpaidByCustomer.length,
    unpaidAmount: unpaidByCustomer.reduce((sum, v) => sum + (v.amount || 0), 0),
    paidByCustomer: paidByCustomer.length,
    recoveredAmount: paidByCustomer.reduce((sum, v) => sum + (v.amount || 0), 0)
  };
}
