import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auditLegacyRentalReceipts, fetchLegacyRentalReceiptAudit, readReceiptAuditPages,
  type AuditReceipt,type AuditPayment,type AuditJournal } from '../legacyRentalReceiptAudit';
const {from,rpc}=vi.hoisted(()=>({from:vi.fn(),rpc:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from,rpc}}));
export const receipt:AuditReceipt={id:'r1',company_id:'co',customer_id:'cu',customer_name:'عميل',contract_id:'c1',invoice_id:null,
  canonical_payment_id:null,total_paid:500,payment_date:'2026-08-10',receipt_number:'R-1'};
const payment:AuditPayment={id:'p1',company_id:'co',customer_id:'cu',contract_id:'c1',invoice_id:null,amount:500,
  payment_date:'2026-08-10',payment_status:'completed',transaction_type:'receipt',idempotency_key:null,
  reference_number:null,journal_entry_id:'j1',payment_number:'P-1'};
const journal:AuditJournal={id:'j1',company_id:'co',reference_id:'r1',reference_type:'rental_payment',status:'posted'};
const check=(r:Partial<AuditReceipt>={},p:AuditPayment[]=[],j:AuditJournal[]=[])=>auditLegacyRentalReceipts('co',[{...receipt,...r}],p,j)[0];
beforeEach(()=>{from.mockReset();rpc.mockReset();});

describe('legacy receipt provenance audit',()=>{
  it('does not equate an amount/date match with a proven payment link',()=>{
    expect(check({},[payment]).status).toBe('review');
    expect(check({},[payment]).paymentId).toBeUndefined();
  });
  it('recognizes direct canonical linkage even without migration references',()=>{
    expect(check({canonical_payment_id:'p1'},[payment])).toMatchObject({status:'linked',paymentId:'p1'});
  });
  it.each(['idempotency_key','reference_number'] as const)('recognizes exact %s without inventing a new payment',key=>{
    expect(check({},[{...payment,[key]:'legacy-rental-receipt:r1'}]).status).toBe('linked');
  });
  it('deduplicates one payment carrying the key in both columns',()=>{
    expect(check({},[{...payment,idempotency_key:'legacy-rental-receipt:r1',reference_number:'legacy-rental-receipt:r1'}]).status).toBe('linked');
  });
  it('retains cancelled payment evidence and never suggests recreating it',()=>{
    expect(check({canonical_payment_id:'p1'},[{...payment,payment_status:'cancelled'}]).status).toBe('cancelled');
    expect(check({},[{...payment,idempotency_key:'legacy-rental-receipt:r1',payment_status:'reversed'}]).status).toBe('cancelled');
  });
  it('does not substitute a keyed candidate for a missing direct payment',()=>{
    expect(check({canonical_payment_id:'missing'},[{...payment,idempotency_key:'legacy-rental-receipt:r1'}]).status).toBe('review');
  });
  it('rejects conflicting canonical/key candidates and duplicate-key records',()=>{
    const keyed={...payment,id:'p2',idempotency_key:'legacy-rental-receipt:r1'};
    expect(check({canonical_payment_id:'p1'},[payment,keyed]).status).toBe('review');
    expect(check({},[keyed,{...keyed,id:'p3'}]).status).toBe('review');
  });
  it('does not use the same payment as independent proof for multiple receipts',()=>{
    const outcomes=auditLegacyRentalReceipts('co',[receipt,{...receipt,id:'r2'}],
      [{...payment,idempotency_key:'legacy-rental-receipt:r1',reference_number:'legacy-rental-receipt:r2'}],[]);
    expect(outcomes.map(item=>item.status)).toEqual(['review','review']);
    expect(outcomes[0].message).toContain('أكثر من سند');
  });
  it.each([
    {customer_id:'other'}, {contract_id:'other'}, {amount:501}, {payment_date:'2026-08-11'},
    {transaction_type:'payment' as AuditPayment['transaction_type']}, {amount:NaN},
    {payment_status:'pending'}, {journal_entry_id:null},
  ])('requires consistent financial identity and completed state %#',change=>{
    expect(check({canonical_payment_id:'p1'},[{...payment,...change}]).status).toBe('review');
  });
  it('preserves historical journal conflicts even if a payment is linked',()=>{
    expect(check({canonical_payment_id:'p1'},[payment],[journal]).status).toBe('review');
    expect(check({},[],[journal]).status).toBe('review');
    expect(check({canonical_payment_id:'p1'},[{...payment,payment_status:'cancelled'}],[journal]).message).toContain('قيد قديم غير معكوس');
    expect(check({canonical_payment_id:'p1'},[payment],[{...journal,status:'reversed'}]).status).toBe('linked');
  });
  it('does not transform invoice summaries or unsupported originals into receipts',()=>{
    expect(check({invoice_id:'i1',total_paid:1000},[{...payment,amount:500},{...payment,id:'p2',amount:500}]).message).toContain('ملخص');
    expect(check().message).toContain('إثبات القبض');
  });
  it('separates zero amounts from invalid money',()=>{
    expect(check({total_paid:0}).status).toBe('no_payment');
    for(const amount of [-1,NaN,Infinity,500.001,Number.MAX_SAFE_INTEGER]) expect(check({total_paid:amount}).status).toBe('review');
  });
  it('rejects any foreign-company source instead of silently omitting it',()=>{
    expect(()=>check({},[{...payment,company_id:'other'}])).toThrow('نطاق الشركة');
    expect(()=>check({company_id:'other'})).toThrow();
    expect(()=>check({},[],[{...journal,company_id:'other'}])).toThrow();
  });
});

describe('complete read-only transport',()=>{
  it('continues until an empty page even below the requested API cap',async()=>{
    const load=vi.fn().mockResolvedValueOnce({data:[{id:'1',company_id:'co'}],error:null})
      .mockResolvedValueOnce({data:[{id:'2',company_id:'co'}],error:null}).mockResolvedValueOnce({data:[],error:null});
    expect(await readReceiptAuditPages('co',load)).toHaveLength(2);
    expect(load.mock.calls.map(call=>call[0])).toEqual([null,'1','2']);
  });
  it('throws on late errors, null responses, duplicates or a company mismatch',async()=>{
    const load=vi.fn().mockResolvedValueOnce({data:[{id:'1',company_id:'co'}],error:null}).mockResolvedValueOnce({data:null,error:new Error('failed')});
    await expect(readReceiptAuditPages('co',load)).rejects.toThrow('failed');
    await expect(readReceiptAuditPages('co',()=>Promise.resolve({data:null,error:null}))).rejects.toThrow();
    await expect(readReceiptAuditPages('co',()=>Promise.resolve({data:[{id:'1',company_id:'co'},{id:'1',company_id:'co'}],error:null}))).rejects.toThrow();
    await expect(readReceiptAuditPages('co',()=>Promise.resolve({data:[{id:'1',company_id:'other'}],error:null}))).rejects.toThrow();
  });
  it('reads all three sources with company filters and issues no mutation RPC',async()=>{
    const calls:Array<{table:string;filters:unknown[][];cursor:string|null}>=[];
    from.mockImplementation((table:string)=>{
      const call={table,filters:[] as unknown[][],cursor:null as string|null};calls.push(call);
      const query={select:vi.fn().mockReturnThis(),eq:(...args:unknown[])=>{call.filters.push(args);return query;},
        order:vi.fn().mockReturnThis(),limit:vi.fn().mockReturnThis(),gt:(_key:string,cursor:string)=>{call.cursor=cursor;return query;},
        then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({data:table==='rental_payment_receipts'&&!call.cursor?[receipt]:[],error:null}).then(resolve)};
      return query;
    });
    expect((await fetchLegacyRentalReceiptAudit('co'))[0].status).toBe('review');
    expect(calls).toHaveLength(4);
    calls.forEach(call=>expect(call.filters).toContainEqual(['company_id','co']));
    expect(calls.find(call=>call.table==='journal_entries')?.filters).toContainEqual(['reference_type','rental_payment']);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('does not query an absent company',async()=>{
    await expect(fetchLegacyRentalReceiptAudit('')).rejects.toThrow('الشركة');expect(from).not.toHaveBeenCalled();
  });
});
