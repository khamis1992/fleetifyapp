import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRentalMonthSummary, parseRentalMonthSummary } from '../rentalMonthSummary';
const { rpc } = vi.hoisted(() => ({rpc:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc}}));
const row={contract_id:'contract-1',customer_id:'customer-1',contract_number:'C-1',customer_name:'عميل',
  invoice_count:1,invoiced_amount:1500,paid_amount:500,outstanding_amount:1000,receipt_count:1,
  latest_payment_date:'2026-09-02',review_reasons:[]};
const ack={company_id:'company-1',month:'2026-08',rows:[row]};
beforeEach(()=>{rpc.mockReset();});
describe('rental month summary boundary',()=>{
  it('calls only the read-only RPC with exact company and first day',async()=>{
    rpc.mockResolvedValue({data:ack,error:null});
    expect(await fetchRentalMonthSummary('company-1','2026-08')).toEqual([row]);
    expect(rpc).toHaveBeenCalledExactlyOnceWith('get_canonical_rental_month_summary_v1',{p_company_id:'company-1',p_month:'2026-08-01'});
  });
  it.each(['PGRST202','42883'])('reports missing deployment %s without legacy fallback',async(code)=>{
    rpc.mockResolvedValue({data:null,error:{code}});
    await expect(fetchRentalMonthSummary('company-1','2026-08')).rejects.toThrow('نشر تحديث');
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it('does not turn a request error into an empty report',async()=>{
    rpc.mockResolvedValue({data:null,error:{code:'42501'}});
    await expect(fetchRentalMonthSummary('company-1','2026-08')).rejects.toThrow('فشل القراءة');
  });
  it.each([
    null, {}, {...ack,company_id:'other'}, {...ack,month:'2026-09'}, {...ack,rows:null},
    {...ack,rows:[row,row]}, {...ack,rows:[{...row,paid_amount:'500'}]},
    {...ack,rows:[{...row,paid_amount:Infinity}]}, {...ack,rows:[{...row,outstanding_amount:-1}]},
    {...ack,rows:[{...row,receipt_count:1.5}]}, {...ack,rows:[{...row,review_reasons:['unknown_code']}]},
  ])('rejects invalid or cross-scope acknowledgement %#',data=>{
    expect(()=>parseRentalMonthSummary(data,'company-1','2026-08')).toThrow('اكتمال');
  });
  it('preserves review states and allows an explicitly empty verified envelope',()=>{
    expect(parseRentalMonthSummary({...ack,rows:[]},'company-1','2026-08')).toEqual([]);
    expect(parseRentalMonthSummary({...ack,rows:[{...row,review_reasons:['missing_monthly_invoice']}]},'company-1','2026-08')[0].review_reasons).toEqual(['missing_monthly_invoice']);
  });
  it.each([
    {paid_amount:500.001}, {paid_amount:0.00000001,outstanding_amount:1500}, {outstanding_amount:999.99},
    {invoiced_amount:1499.99}, {paid_amount:1600,outstanding_amount:0},
    {invoiced_amount:1e15}, {invoice_count:Number.MAX_SAFE_INTEGER+1},
    {latest_payment_date:'2026-02-30'}, {latest_payment_date:'2026-13-01'},
    {contract_id:' '}, {customer_id:' '},
  ])('rejects an apparently verified but inconsistent row %j',change=>{
    expect(()=>parseRentalMonthSummary({...ack,rows:[{...row,...change}]},'company-1','2026-08')).toThrow('اكتمال');
  });
  it('checks conservation in currency units, not binary floating point',()=>{
    const fractional={...row,invoiced_amount:0.3,paid_amount:0.1,outstanding_amount:0.2};
    expect(parseRentalMonthSummary({...ack,rows:[fractional]},'company-1','2026-08')).toEqual([fractional]);
  });
  it('retains explicitly quarantined overpayment without presenting it as verified',()=>{
    const review={...row,paid_amount:2000,outstanding_amount:0,review_reasons:['invalid_invoice_or_payment']};
    expect(parseRentalMonthSummary({...ack,rows:[review]},'company-1','2026-08')).toEqual([review]);
  });
  it('rejects unsafe aggregate totals even when each contract amount is safe',()=>{
    const large={...row,invoiced_amount:50000000000000,paid_amount:0,outstanding_amount:50000000000000};
    expect(()=>parseRentalMonthSummary({...ack,rows:[large,{...large,contract_id:'contract-2'}]},'company-1','2026-08')).toThrow('اكتمال');
  });
  it.each(['','2026-13','2026-00','2026-8','2026-08-01'])('rejects invalid month %s before calling server',async(month)=>{
    await expect(fetchRentalMonthSummary('company-1',month)).rejects.toThrow(); expect(rpc).not.toHaveBeenCalled();
  });
});
