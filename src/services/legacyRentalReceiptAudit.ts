import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];
export type AuditReceipt = Pick<Tables['rental_payment_receipts']['Row'],
  'id'|'company_id'|'customer_id'|'customer_name'|'contract_id'|'invoice_id'|'canonical_payment_id'|
  'total_paid'|'payment_date'|'receipt_number'>;
export type AuditPayment = Pick<Tables['payments']['Row'],
  'id'|'company_id'|'customer_id'|'contract_id'|'invoice_id'|'amount'|'payment_date'|'payment_status'|
  'transaction_type'|'idempotency_key'|'reference_number'|'journal_entry_id'|'payment_number'>;
export type AuditJournal = Pick<Tables['journal_entries']['Row'],'id'|'company_id'|'reference_id'|'reference_type'|'status'>;
export type ReceiptAuditFinding = {
  receiptId: string;
  customerName: string;
  receiptNumber: string;
  contractId: string | null;
  status: 'linked'|'cancelled'|'review'|'no_payment';
  message: string;
  paymentId?: string;
};

const normalize = (value: string | null) => (value || '').trim().toLowerCase();
const completed = new Set(['completed','paid','success','succeeded']);
const cancelled = new Set(['cancelled','canceled','reversed','void','voided','deleted']);
const validMoney = (value:number) => Number.isFinite(value) && value>=0
  && Number.isSafeInteger(Math.round(value*100)) && Math.abs(value*100-Math.round(value*100))<0.000001;
const sameMoney = (a: number,b: number) => validMoney(a) && validMoney(b)
  && Math.round(a*100)===Math.round(b*100);

/** An audit decision is never authorization to create money or alter a journal. */
export function auditLegacyRentalReceipts(companyId:string,receipts:AuditReceipt[],payments:AuditPayment[],journals:AuditJournal[]):ReceiptAuditFinding[] {
  if (!companyId.trim() || [...receipts,...payments,...journals].some(row=>row.company_id!==companyId)) {
    throw new Error('تعذر التحقق من نطاق الشركة؛ لم تكتمل المطابقة.');
  }
  const byId=new Map(payments.map(payment=>[payment.id,payment]));
  const byKey=new Map<string,AuditPayment[]>();
  for(const payment of payments) {
    for(const key of new Set([payment.idempotency_key,payment.reference_number].filter((key):key is string=>Boolean(key)))) {
      byKey.set(key,[...(byKey.get(key)||[]),payment]);
    }
  }
  const proofOwners=new Map<string,Set<string>>();
  for(const receipt of receipts) {
    const ids=new Set([receipt.canonical_payment_id,
      ...(byKey.get('legacy-rental-receipt:'+receipt.id)||[]).map(payment=>payment.id)]);
    for(const id of ids) {
      if(!id) continue;
      const owners=proofOwners.get(id)||new Set<string>();
      owners.add(receipt.id);proofOwners.set(id,owners);
    }
  }
  const legacyJournalReceipts=new Set(journals.filter(journal=>journal.reference_type==='rental_payment'
    && !cancelled.has(normalize(journal.status))).map(journal=>journal.reference_id));
  return receipts.map(receipt=>{
    const base={receiptId:receipt.id,receiptNumber:receipt.receipt_number||receipt.id,
      customerName:receipt.customer_name,contractId:receipt.contract_id};
    const review=(message:string):ReceiptAuditFinding=>({...base,status:'review',message});
    if (!validMoney(receipt.total_paid)) return review('مبلغ السند غير صالح؛ يلزم الرجوع إلى المستند الأصلي.');
    // A pointer and migration key disagreeing must not silently select one.
    const keyed=byKey.get('legacy-rental-receipt:'+receipt.id)||[];
    const direct=receipt.canonical_payment_id ? byId.get(receipt.canonical_payment_id) : undefined;
    if (receipt.canonical_payment_id && !direct) return review('رابط الدفعة موجود لكن تعذر العثور عليها ضمن الشركة؛ لا تُنشأ دفعة بديلة.');
    const candidates=[...new Map([...(direct?[direct]:[]),...keyed].map(payment=>[payment.id,payment])).values()];
    if(candidates.length>1) return review('تعارض روابط أو مفاتيح الدفعات؛ يلزم تدقيقها دون ترحيل جديد.');
    const payment=candidates[0];
    if(payment) {
      if((proofOwners.get(payment.id)?.size||0)>1) return review('الدفعة نفسها مستخدمة لإثبات أكثر من سند؛ يلزم تدقيق السندات المكررة.');
      if(payment.customer_id!==receipt.customer_id || payment.contract_id!==receipt.contract_id
        || !sameMoney(payment.amount,receipt.total_paid) || payment.payment_date!==receipt.payment_date
        || normalize(payment.transaction_type)!=='receipt') return review('الدفعة المحددة لا تطابق هوية السند أو قيمته أو تاريخه؛ لا يُعد تشابه المرجع كافيًا.');
      if(legacyJournalReceipts.has(receipt.id)) return review(cancelled.has(normalize(payment.payment_status))
        ? 'الدفعة ملغاة لكن يوجد قيد قديم غير معكوس؛ يلزم فحص الأثر المحاسبي دون إعادة إنشاء الدفعة.'
        : 'يوجد أثر محاسبي قديم مع دفعة مرتبطة؛ يلزم التحقق من عدم ازدواج القيد.');
      if(cancelled.has(normalize(payment.payment_status))) return {...base,status:'cancelled',paymentId:payment.id,
        message:'الدفعة المرتبطة ملغاة أو معكوسة؛ لن يُعاد إنشاؤها من السند.'};
      if(!completed.has(normalize(payment.payment_status))) return review('الدفعة المرتبطة غير مكتملة؛ تُراجع من مسار الدفعات نفسه.');
      if(!payment.journal_entry_id) return review('الدفعة موجودة لكن قيدها المحاسبي يحتاج فحصًا؛ لا تُنشأ دفعة أو قيد من المطابقة التقريبية.');
      return {...base,status:'linked',paymentId:payment.id,message:'وجدت دفعة مطابقة بالرابط أو مفتاح العملية؛ لم يُنشأ أثر مالي جديد.'};
    }
    if(legacyJournalReceipts.has(receipt.id)) return review('يوجد قيد قديم للسند؛ يجب تسويته قبل أي ترحيل حتى لا يتكرر الأثر المالي.');
    if(receipt.total_paid===0) return {...base,status:'no_payment',message:'السند لا يحتوي مبلغًا مدفوعًا؛ لا يمثل دفعة قابلة للترحيل.'};
    if(receipt.invoice_id) return review('السند مرتبط بفاتورة وقد يكون ملخص سداد تراكميًا؛ لا يمكن تحويله إلى دفعة مستقلة بلا إثبات المصدر.');
    return review('لا يوجد رابط دفعة أو مفتاح عملية مثبت؛ يلزم إثبات القبض الأصلي، ولا تكفي مطابقة المبلغ والتاريخ.');
  });
}

/** Keyset pagination continues until empty, even if the server caps below requested size. */
export async function readReceiptAuditPages<T extends {id:string;company_id:string}>(
  companyId:string,load:(after:string|null)=>PromiseLike<{data:T[]|null;error:unknown}>,
):Promise<T[]> {
  const result:T[]=[];
  let cursor:string|null=null;
  for(let page=0;page<10_000;page+=1) {
    const {data,error}=await load(cursor);
    if(error) throw error;
    if(!Array.isArray(data)) throw new Error('تعذر التحقق من اكتمال صفحات المطابقة.');
    if(data.length===0) return result;
    for(const row of data) {
      if(!row.id || row.company_id!==companyId || (cursor!==null && row.id<=cursor)) {
        throw new Error('تغير ترتيب البيانات أو نطاقها أثناء المطابقة؛ أعد الفحص.');
      }
      cursor=row.id; result.push(row);
    }
  }
  throw new Error('تجاوز الفحص حد القراءة الآمن؛ لم يُعتمد تقرير جزئي.');
}

export async function fetchLegacyRentalReceiptAudit(companyId:string):Promise<ReceiptAuditFinding[]> {
  if(!companyId.trim()) throw new Error('اختر الشركة قبل فحص السندات.');
  const [receipts,payments,journals]=await Promise.all([
    readReceiptAuditPages(companyId,after=>{
      let query=supabase.from('rental_payment_receipts')
        .select('id,company_id,customer_id,customer_name,contract_id,invoice_id,canonical_payment_id,total_paid,payment_date,receipt_number')
        .eq('company_id',companyId).order('id').limit(500);
      if(after) query=query.gt('id',after);
      return query;
    }),
    readReceiptAuditPages(companyId,after=>{
      let query=supabase.from('payments')
        .select('id,company_id,customer_id,contract_id,invoice_id,amount,payment_date,payment_status,transaction_type,idempotency_key,reference_number,journal_entry_id,payment_number')
        .eq('company_id',companyId).order('id').limit(500);
      if(after) query=query.gt('id',after);
      return query;
    }),
    readReceiptAuditPages(companyId,after=>{
      let query=supabase.from('journal_entries').select('id,company_id,reference_id,reference_type,status')
        .eq('company_id',companyId).eq('reference_type','rental_payment').order('id').limit(500);
      if(after) query=query.gt('id',after);
      return query;
    }),
  ]);
  return auditLegacyRentalReceipts(companyId,receipts,payments,journals);
}
