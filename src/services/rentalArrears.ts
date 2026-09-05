import { supabase } from '@/integrations/supabase/client';
import { validScheduleDate } from '@/utils/contractScheduleSettlement';

export const rentalArrearsReviewLabels: Record<string,string> = {
  missing_customer:'بيانات العميل غير مكتملة', invalid_contract_period:'مدة العقد غير صالحة',
  duplicate_legal_profile:'أكثر من سجل لحدود المطالبة', invalid_invoice_or_payment:'فاتورة أو دفعة تحتاج مطابقة',
  unclassified_invoice:'نوع الفاتورة يحتاج مطابقة', unknown_invoice_month:'شهر الفاتورة غير محدد',
  outside_rent_cutoff:'فاتورة خارج حدود المطالبة', outside_rent_cutoff_schedule:'قسط خارج حدود المطالبة',
  invalid_schedule:'بيانات أقساط غير صالحة', missing_or_mismatched_invoice:'فاتورة قسط مفقودة أو غير مطابقة',
  duplicate_schedule_month:'أقساط مكررة للشهر نفسه', duplicate_invoice_month:'فواتير مكررة للشهر نفسه',
  incomplete_schedule:'جدول الأقساط غير مكتمل أو لا يطابق قيمة العقد', missing_billing_evidence:'الفواتير وجدول الأقساط غير متوفرين',
};
export interface RentalArrearsIdentity {
  contract_id:string; contract_number:string; customer_id:string|null; customer_name:string;
  customer_phone:string|null;customer_email:string|null;vehicle_id:string|null;vehicle_plate:string|null;
  monthly_rent:number|null;last_payment_date:string|null;
}
export interface VerifiedRentalArrears extends RentalArrearsIdentity {
  customer_id:string;invoiced_amount:number;paid_amount:number;total_outstanding:number;
  oldest_unpaid_date:string;days_overdue:number;unpaid_months:number;
}
export interface RentalArrearsReview extends RentalArrearsIdentity { review_reasons:string[] }
export interface RentalArrearsReport { verified:VerifiedRentalArrears[]; review:RentalArrearsReview[] }
const fail=()=>new Error('تعذر التحقق من تقرير المتأخرات؛ لا يمكن اعتماد الأرصدة أو بدء التحويل من هذه القراءة.');
const object=(v:unknown):v is Record<string,unknown> => typeof v==='object' && v!==null && !Array.isArray(v);
const text=(v:unknown):v is string => typeof v==='string' && v.trim().length>0;
const date=(v:unknown):v is string => typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && validScheduleDate(v)===v;
const money=(v:unknown):number => {
  if(typeof v!=='number'||!Number.isFinite(v)||v<0||v!==Number(v.toFixed(2))||!Number.isSafeInteger(Math.round(v*100))) throw fail();
  return Math.round(v*100);
};
export function parseRentalArrears(data:unknown,companyId:string,dueAsOf:string):RentalArrearsReport {
  if(!text(companyId)||!date(dueAsOf)||!object(data)||data.company_id!==companyId||data.due_as_of!==dueAsOf
    ||data.settlement_basis!=='current_payment_allocations'||data.fees_scope!=='excluded'||!Array.isArray(data.rows)) throw fail();
  const result:RentalArrearsReport={verified:[],review:[]};const ids=new Set<string>();let totalUnits=0;
  for(const row of data.rows) {
    if(!object(row)||!text(row.contract_id)||ids.has(row.contract_id)||!text(row.contract_number)||!text(row.customer_name)
      ||!(row.customer_id===null||text(row.customer_id))||!date(row.cutoff_date)
      ||!['customer_phone','customer_email','vehicle_id','vehicle_plate'].every(k=>row[k]===null||typeof row[k]==='string')
      ||!(row.latest_payment_date===null||date(row.latest_payment_date))
      ||!Number.isSafeInteger(row.invoice_count)||Number(row.invoice_count)<0
      ||!Array.isArray(row.review_reasons)||!row.review_reasons.every(r=>typeof r==='string'&&Object.hasOwn(rentalArrearsReviewLabels,r))) throw fail();
    if(row.monthly_rent!==null) money(row.monthly_rent);
    ids.add(row.contract_id);
    const identity:RentalArrearsIdentity={contract_id:row.contract_id,contract_number:row.contract_number,
      customer_id:row.customer_id as string|null,customer_name:row.customer_name,
      customer_phone:row.customer_phone as string|null,customer_email:row.customer_email as string|null,
      vehicle_id:row.vehicle_id as string|null,vehicle_plate:row.vehicle_plate as string|null,
      monthly_rent:row.monthly_rent as number|null,last_payment_date:row.latest_payment_date as string|null};
    if(row.review_reasons.length>0) {
      if(!['invoiced_amount','paid_amount','outstanding_amount','oldest_unpaid_date','days_overdue','unpaid_months'].every(k=>row[k]===null)) throw fail();
      result.review.push({...identity,review_reasons:[...row.review_reasons]});continue;
    }
    const invoice=money(row.invoiced_amount),paid=money(row.paid_amount),remaining=money(row.outstanding_amount);
    if(!text(row.customer_id)||remaining<=0||invoice!==paid+remaining||!date(row.oldest_unpaid_date)
      ||row.oldest_unpaid_date>=dueAsOf||row.oldest_unpaid_date.slice(8)!=='01'
      ||!Number.isSafeInteger(row.days_overdue)||row.days_overdue!==(Date.parse(dueAsOf+'T00:00:00Z')-Date.parse(row.oldest_unpaid_date+'T00:00:00Z'))/86400000
      ||!Number.isSafeInteger(row.unpaid_months)||Number(row.unpaid_months)<1||Number(row.unpaid_months)>Number(row.invoice_count)) throw fail();
    totalUnits+=remaining;if(!Number.isSafeInteger(totalUnits)) throw fail();
    result.verified.push({...identity,customer_id:row.customer_id,invoiced_amount:invoice/100,paid_amount:paid/100,
      total_outstanding:remaining/100,oldest_unpaid_date:row.oldest_unpaid_date,days_overdue:row.days_overdue as number,unpaid_months:row.unpaid_months as number});
  }
  return result;
}
export async function fetchRentalArrears(companyId:string,dueAsOf:string):Promise<RentalArrearsReport> {
  if(!text(companyId)||!date(dueAsOf)) throw fail();
  const {data,error}=await supabase.rpc('get_canonical_rental_arrears_v1',{p_company_id:companyId,p_due_as_of:dueAsOf});
  if(error) {
    if(['PGRST202','42883'].includes(error.code)) throw new Error('حساب المتأخرات يحتاج نشر تحديث قاعدة البيانات؛ لن نستخدم عدد الإيصالات لتقدير الدين.');
    throw new Error('تعذر قراءة الفواتير وتخصيصات الدفعات؛ لا يعني ذلك عدم وجود متأخرات.');
  }
  return parseRentalArrears(data,companyId,dueAsOf);
}
