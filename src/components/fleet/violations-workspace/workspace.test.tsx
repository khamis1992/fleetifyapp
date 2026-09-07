import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { useTrafficViolationsStats } from '@/hooks/useTrafficViolations';
const db=vi.hoisted(()=>({from:vi.fn(),select:vi.fn(),eq:vi.fn(),order:vi.fn(),range:vi.fn(),single:vi.fn(),getUser:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:db.from,auth:{getUser:db.getUser}}}));
describe('traffic violation statistics',()=>{
  it('includes subsequent response pages and retains the company boundary',async()=>{
    for(const fn of [db.from,db.select,db.eq,db.order])fn.mockReturnValue(db);
    db.getUser.mockResolvedValue({data:{user:{id:'user'}}});
    db.single.mockResolvedValue({data:{company_id:'company'}});
    const unpaid={status:'pending',payment_status:'unpaid',amount:100,customer_id:null,contract_id:null};
    db.range.mockResolvedValueOnce({data:Array.from({length:500},()=>unpaid),error:null}).mockResolvedValueOnce({data:[{...unpaid,payment_status:'paid',amount:300}],error:null});
    const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
    const {result}=renderHook(()=>useTrafficViolationsStats(),{wrapper:({children})=><QueryClientProvider client={client}>{children}</QueryClientProvider>});
    await waitFor(()=>expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({total:501,paidCount:1,unpaidCount:500,totalAmount:50300,unpaidAmount:50000});
    expect(db.range.mock.calls).toEqual([[0,499],[500,999]]);
    expect(db.eq.mock.calls.filter(([column])=>column==='company_id')).toEqual([['company_id','company'],['company_id','company']]);
    client.clear();
  });
});
