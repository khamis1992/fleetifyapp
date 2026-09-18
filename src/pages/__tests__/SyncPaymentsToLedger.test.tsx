import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import SyncPaymentsToLedger from '../SyncPaymentsToLedger';
const fixture=vi.hoisted(()=>({companyId:'co1' as string|null,fetch:vi.fn(),paymentHook:vi.fn(),rpc:vi.fn()}));
vi.mock('@/hooks/useUnifiedCompanyAccess',()=>({useUnifiedCompanyAccess:()=>({companyId:fixture.companyId})}));
vi.mock('@/services/legacyRentalReceiptAudit',()=>({fetchLegacyRentalReceiptAudit:fixture.fetch}));
vi.mock('@/hooks/business/usePaymentOperations',()=>({usePaymentOperations:fixture.paymentHook}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:fixture.rpc}}));
const result={receiptId:'r1',receiptNumber:'R-1',customerName:'عميل الاختبار',contractId:'c1',status:'review',message:'يلزم إثبات المصدر'};
let client:QueryClient;
const view=()=><QueryClientProvider client={client}><MemoryRouter><SyncPaymentsToLedger/></MemoryRouter></QueryClientProvider>;
beforeEach(()=>{fixture.companyId='co1';fixture.fetch.mockReset();fixture.paymentHook.mockClear();fixture.rpc.mockClear();
  client=new QueryClient({defaultOptions:{queries:{retry:false}}});});
afterEach(()=>{cleanup();client.clear();});
describe('legacy receipt audit page',()=>{
  it('runs a read-only audit on demand, not an automatic migration',async()=>{
    fixture.fetch.mockResolvedValue([result]);render(view());
    expect(fixture.fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('فحص السندات دون تعديل مالي'));
    expect(await screen.findByText('R-1')).toBeTruthy();
    expect(fixture.fetch).toHaveBeenCalledExactlyOnceWith('co1');
    expect(fixture.paymentHook).not.toHaveBeenCalled();expect(fixture.rpc).not.toHaveBeenCalled();
    expect(screen.getByText(/هذا الفحص لا ينشئ دفعات/)).toBeTruthy();
  });
  it('reports a failed read without presenting a partial or successful reconciliation',async()=>{
    fixture.fetch.mockRejectedValue(new Error('second payment page failed'));render(view());
    fireEvent.click(screen.getByText('فحص السندات دون تعديل مالي'));
    expect(await screen.findByText(/تعذر إكمال قراءة بيانات المطابقة/)).toBeTruthy();
    expect(screen.queryByText(/تم فحص/)).toBeNull();
  });
  it('blocks double click while reading and ignores an old company completion',async()=>{
    let finish!:(value:unknown)=>void;
    fixture.fetch.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
    const mounted=render(view());fireEvent.click(screen.getByText('فحص السندات دون تعديل مالي'));
    await waitFor(()=>expect(fixture.fetch).toHaveBeenCalledTimes(1));
    expect(screen.getByText('جاري فحص السندات…')).toBeDisabled();
    fixture.companyId='co2';mounted.rerender(view());finish([result]);
    await waitFor(()=>expect(client.getQueryData(['legacy-rental-receipt-audit','co1'])).toEqual([result]));
    expect(screen.queryByText('R-1')).toBeNull();expect(screen.queryByText(/تم فحص/)).toBeNull();
  });
  it('renders all loaded rows through pagination instead of truncating at 100',async()=>{
    fixture.fetch.mockResolvedValue(Array.from({length:101},(_,i)=>({...result,receiptId:'r'+i,receiptNumber:'REC-'+i})));render(view());
    fireEvent.click(screen.getByText('فحص السندات دون تعديل مالي'));await screen.findByText('REC-0');
    expect(screen.queryByText('REC-100')).toBeNull();
    fireEvent.click(screen.getByText('التالي'));expect(screen.getByText('REC-100')).toBeTruthy();
    expect(screen.queryByText('REC-0')).toBeNull();
  });
  it('does not read without a company',()=>{
    fixture.companyId=null;render(view());expect(screen.getByText('فحص السندات دون تعديل مالي')).toBeDisabled();
    expect(fixture.fetch).not.toHaveBeenCalled();
  });
});
