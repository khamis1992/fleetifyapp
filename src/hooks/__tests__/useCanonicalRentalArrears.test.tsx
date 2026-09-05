import {renderHook,waitFor,act,cleanup} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {ReactNode} from 'react';
import {useCanonicalRentalArrears} from '../useCanonicalRentalArrears';
import {arrearsEnvelope} from '@/test/fixtures/rentalArrears';
const state=vi.hoisted(()=>({rpc:vi.fn(),companyId:'company-1' as string|null,user:{id:'actor-1'} as {id:string}|null,isInitializing:false}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:state.rpc}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/hooks/useUnifiedCompanyAccess',()=>({useUnifiedCompanyAccess:()=>state}));
let client:QueryClient;
beforeEach(()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-09-04T10:00:00Z'));
  state.companyId='company-1';state.user={id:'actor-1'};state.isInitializing=false;state.rpc.mockReset();
  state.rpc.mockResolvedValue({data:arrearsEnvelope(),error:null});client=new QueryClient({defaultOptions:{queries:{retry:2}}});
});
afterEach(()=>{cleanup();client.clear();vi.useRealTimers();});
const wrapper=({children}:{children:ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>;
describe('company-scoped current arrears hook',()=>{
  it('loads verified invoices through the real parser',async()=>{
    const {result}=renderHook(()=>useCanonicalRentalArrears(),{wrapper});
    await waitFor(()=>expect(result.current.data?.verified[0].total_outstanding).toBe(500));
  });
  it('hides cached debt while refreshing and after an error',async()=>{
    const {result}=renderHook(()=>useCanonicalRentalArrears(),{wrapper});await waitFor(()=>expect(result.current.data).toBeDefined());
    state.rpc.mockResolvedValue({error:{code:'42501'},data:null});
    await act(async()=>{await result.current.refetch();});
    await waitFor(()=>expect(result.current.error?.message).toContain('لا يعني'));
    expect(result.current.data).toBeUndefined();expect(state.rpc).toHaveBeenCalledTimes(2);
  });
  it('does not expose the previous user or company report while the new scope loads',async()=>{
    const {result,rerender}=renderHook(()=>useCanonicalRentalArrears(),{wrapper});await waitFor(()=>expect(result.current.data).toBeDefined());
    state.rpc.mockImplementation(()=>new Promise(()=>{}));state.companyId='company-2';state.user={id:'actor-2'};rerender();
    expect(result.current.data).toBeUndefined();expect(result.current.scopeKey).toContain('actor-2:company-2');expect(result.current.isLoading).toBe(true);
  });
  it('does not fetch or show zero debt without authenticated company scope',()=>{
    state.user=null;const {result}=renderHook(()=>useCanonicalRentalArrears(),{wrapper});
    expect(state.rpc).not.toHaveBeenCalled();expect(result.current.error).toBeTruthy();expect(result.current.data).toBeUndefined();
  });
});
