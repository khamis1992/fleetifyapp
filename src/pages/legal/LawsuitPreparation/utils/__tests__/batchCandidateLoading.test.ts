import { describe, expect, it, vi, beforeEach } from 'vitest';
const mocks=vi.hoisted(()=>({from:vi.fn(),load:vi.fn(),range:vi.fn(),eq:vi.fn(),order:vi.fn(),data:[] as unknown[],error:null as unknown}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:mocks.from}}));
vi.mock('../../../utils/legalQueueClaims',()=>({loadLegalQueueClaims:mocks.load}));
import { listBatchCandidates } from '../batchFiling';
beforeEach(()=>{
 vi.clearAllMocks();mocks.error=null;
 mocks.data=Array.from({length:26},(_,n)=>({id:'c'+n,contract_number:'C'+n,status:'active',customer_id:null}));
 mocks.load.mockResolvedValue(new Map());
 mocks.from.mockImplementation((table:string)=>{
  const query:any={select:()=>query,eq:(...args:unknown[])=>{mocks.eq(...args);return query;},order:(...args:unknown[])=>{mocks.order(...args);return query;},in:()=>query,
   range:(...args:unknown[])=>{mocks.range(...args);return Promise.resolve({data:mocks.data,error:mocks.error});},
   then:(resolve:any)=>Promise.resolve({data:[],error:null}).then(resolve)};
  return query;
 });
});
describe('batch candidate page loading',()=>{
 it('reads one extra company-scoped contract but calculates only the current page',async()=>{
  const page=await listBatchCandidates('company',2);
  expect(mocks.eq).toHaveBeenCalledWith('company_id','company');expect(mocks.order).toHaveBeenCalledWith('id');expect(mocks.range).toHaveBeenCalledWith(50,75);
  expect(mocks.load).toHaveBeenCalledWith('company',Array.from({length:25},(_,n)=>'c'+n));
  expect(page.hasMore).toBe(true);expect(page.items).toHaveLength(25);
  expect(page.items.every(row=>row.totalRemaining===null&&Boolean(row.financialReview))).toBe(true);
 });
 it('ends pagination on a partial page and never calls claim readers for an empty page',async()=>{
  mocks.data=[];expect(await listBatchCandidates('company')).toEqual({items:[],hasMore:false});expect(mocks.load).not.toHaveBeenCalled();
 });
 it('rejects an invalid range before reading data and propagates query failures',async()=>{
  await expect(listBatchCandidates('company',-1)).rejects.toThrow('نطاق');expect(mocks.from).not.toHaveBeenCalled();
  mocks.error=new Error('database unavailable');await expect(listBatchCandidates('company')).rejects.toThrow('database unavailable');expect(mocks.load).not.toHaveBeenCalled();
 });
});
