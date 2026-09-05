import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { DefaultersList } from '../DefaultersList';

const { mutateAsync }=vi.hoisted(()=>({mutateAsync:vi.fn()}));
vi.mock('@/hooks/usePaymentLegalIntegration',()=>({
  useLatePaymentCustomers:()=>({isLoading:false,error:null,scopeKey:'company-1',data:{review:[],verified:[1,2].map(id=>({
    contract_id:`contract-${id}`,contract_number:`C-${id}`,customer_id:'customer-1',customer_name:'عميل اختبار',
    total_outstanding:1000,days_overdue:60,oldest_unpaid_date:'2026-01-01',unpaid_months:1,monthly_rent:1000,total_fines:0,
  }))}}),
  useAutoCreateLegalCases:()=>({mutateAsync,isPending:false}),
}));
vi.mock('@/components/help/HelpIcon',()=>({HelpIcon:()=>null}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:vi.fn()}}));
afterEach(cleanup);
beforeEach(()=>{mutateAsync.mockReset();});
describe('batch conversion failure feedback',()=>{
  it('keeps only failed contracts selected and displays their individual errors',async()=>{
    mutateAsync.mockResolvedValue({converted:[{contractId:'contract-1'}],failed:[{contractId:'contract-2',message:'تعذر التحقق من نتيجة التحويل'}],ineligible:0});
    render(<DefaultersList/>);
    fireEvent.click(screen.getByRole('button',{name:'تحديد الكل'}));
    fireEvent.click(screen.getByRole('button',{name:'إنشاء قضايا قانونية (2)'}));
    expect(await screen.findByText(/C-2: تعذر التحقق من نتيجة التحويل/)).toBeTruthy();
    expect(screen.getByRole('button',{name:'إنشاء قضايا قانونية (1)'})).toBeTruthy();
    mutateAsync.mockResolvedValue({converted:[{contractId:'contract-2'}],failed:[],ineligible:0});
    fireEvent.click(screen.getByRole('button',{name:'إنشاء قضايا قانونية (1)'}));
    await waitFor(()=>expect(screen.queryByText(/لم يُؤكد تحويل العقود التالية/)).toBeNull());
    expect(mutateAsync.mock.calls[1][0].map((row:{contract_id:string})=>row.contract_id)).toEqual(['contract-2']);
  });
  it('preserves the selection and exposes a batch-level failure',async()=>{
    mutateAsync.mockRejectedValue(new Error('تعذر التحقق من الشركة'));
    render(<DefaultersList/>);
    fireEvent.click(screen.getByRole('button',{name:'تحديد الكل'}));
    fireEvent.click(screen.getByRole('button',{name:'إنشاء قضايا قانونية (2)'}));
    expect(await screen.findByText(/تعذر التحقق من الشركة/)).toBeTruthy();
    expect(screen.getByRole('button',{name:'إنشاء قضايا قانونية (2)'})).toBeTruthy();
  });
});
