import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { useRelinkViolations } from '../useRelinkViolations';
const service=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:service}));
describe('assignment service adapter',()=>{
  it('preserves the Supabase receiver and reports a missing migration clearly',async()=>{
    service.rpc.mockImplementation(function(this:unknown){
      expect(this).toBe(service);
      return Promise.resolve({data:null,error:{message:'Could not find the function in the schema cache'}});
    });
    const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
    const {result}=renderHook(()=>useRelinkViolations('company'),{wrapper:({children})=><QueryClientProvider client={client}>{children}</QueryClientProvider>});
    await waitFor(()=>expect(result.current.preview.isError).toBe(true));
    expect(result.current.preview.error?.message).toContain('بانتظار نشر تحديث قاعدة البيانات');
    expect(service.rpc).toHaveBeenCalledWith('preview_customer_violation_assignments_v1',{p_company_id:'company'});
    client.clear();
  });
});
