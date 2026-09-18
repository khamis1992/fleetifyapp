import { beforeEach, expect, it, vi } from 'vitest';
import { cancelTaqadiFilingJob } from '../taqadiAutomation';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
vi.mock('@/services/LawsuitService', () => ({ lawsuitService: {} }));
beforeEach(() => rpc.mockReset());
it('accepts a pending stop without pretending the worker already stopped',async()=>{
  const job={id:'job',company_id:'company',status:'submitting',error_code:'MANUAL_STOP_REQUESTED'};
  rpc.mockResolvedValue({data:job,error:null});
  expect(await cancelTaqadiFilingJob('company','job','stop')).toEqual(job);
});
for (const data of [null,{}, {id:'other',company_id:'company',status:'cancelled'},
  {id:'job',company_id:'other',status:'cancelled'},{id:'job',company_id:'company',status:'submitting'}]) {
  it(`rejects a missing or unrelated stop acknowledgement ${JSON.stringify(data)}`,async()=>{
    rpc.mockResolvedValue({data,error:null});
    await expect(cancelTaqadiFilingJob('company','job','stop')).rejects.toThrow('لم يؤكد النظام طلب الإيقاف');
  });
}
