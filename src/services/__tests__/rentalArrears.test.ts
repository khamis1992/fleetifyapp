import {beforeEach,describe,expect,it,vi} from 'vitest';
import {fetchRentalArrears,parseRentalArrears} from '../rentalArrears';
import {arrearsRow as row,arrearsReview as review,arrearsEnvelope as envelope} from '@/test/fixtures/rentalArrears';
const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc}}));
beforeEach(()=>{rpc.mockReset();});
const parse=(data:unknown)=>parseRentalArrears(data,'company-1','2026-09-04');
describe('canonical arrears response boundary',()=>{
  it('separates reviewed rows without manufacturing a zero balance or fines',()=>{
    const result=parse(envelope([row,review]));
    expect(result.verified[0]).toMatchObject({total_outstanding:500,days_overdue:34,unpaid_months:1});
    expect(result.verified[0]).not.toHaveProperty('total_fines');
    expect(result.review[0]).not.toHaveProperty('total_outstanding');
    expect(result.review[0].review_reasons).toEqual(['incomplete_schedule']);
  });
  it.each([
    null,{}, {...envelope(),company_id:'other'}, {...envelope(),due_as_of:'2026-09-03'},
    {...envelope(),fees_scope:'included'}, {...envelope(),settlement_basis:'receipts'},
    envelope([row,row]),envelope([{...row,paid_amount:'1000'}]),envelope([{...row,outstanding_amount:501}]),
    envelope([{...row,outstanding_amount:0.00000001}]),envelope([{...row,invoiced_amount:1e15}]),
    envelope([{...row,days_overdue:35}]),envelope([{...row,oldest_unpaid_date:'2026-08-32'}]),
    envelope([{...row,unpaid_months:2}]),envelope([{...row,customer_id:null}]),
    envelope([{...review,outstanding_amount:0}]),envelope([{...review,review_reasons:['unknown']}]),
  ])('rejects malformed, cross-scope or inconsistent response %#',data=>expect(()=>parse(data)).toThrow('تعذر التحقق'));
  it('accepts a genuinely empty report',()=>expect(parse(envelope([]))).toEqual({verified:[],review:[]}));
  it('fetches only the exact company/date RPC and never falls back to receipt counts',async()=>{
    rpc.mockResolvedValue({data:envelope(),error:null});expect((await fetchRentalArrears('company-1','2026-09-04')).verified).toHaveLength(1);
    expect(rpc).toHaveBeenCalledExactlyOnceWith('get_canonical_rental_arrears_v1',{p_company_id:'company-1',p_due_as_of:'2026-09-04'});
  });
  it.each(['PGRST202','42883'])('requires deployment on %s instead of silently returning zero',async(code)=>{
    rpc.mockResolvedValue({data:null,error:{code}});await expect(fetchRentalArrears('company-1','2026-09-04')).rejects.toThrow('نشر تحديث');
  });
  it('rejects invalid scope before network access',async()=>{
    await expect(fetchRentalArrears('','2026-09-04')).rejects.toThrow();
    await expect(fetchRentalArrears('company-1','2026-02-30')).rejects.toThrow();expect(rpc).not.toHaveBeenCalled();
  });
});
