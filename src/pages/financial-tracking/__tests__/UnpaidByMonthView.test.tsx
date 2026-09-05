import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UnpaidByMonthView from '../UnpaidByMonthView';
const { rpc }=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc}}));
const row={contract_id:'contract-1',customer_id:'customer-1',contract_number:'C-1',customer_name:'عميل اختبار',
  invoice_count:1,invoiced_amount:1500,paid_amount:500,outstanding_amount:1000,receipt_count:1,
  latest_payment_date:'2026-09-02',review_reasons:[] as string[]};
let client:QueryClient;
const view=(companyId:string|null='company-1')=><QueryClientProvider client={client}><MemoryRouter><UnpaidByMonthView companyId={companyId}/></MemoryRouter></QueryClientProvider>;
const respond=(rows:unknown[])=>rpc.mockImplementation(async(_name:string,args:{p_company_id:string;p_month:string})=>({
  error:null,data:{company_id:args.p_company_id,month:args.p_month.slice(0,7),rows},
}));
beforeEach(()=>{rpc.mockReset();client=new QueryClient({defaultOptions:{queries:{retry:false}}});});
afterEach(()=>{cleanup();client.clear();vi.useRealTimers();});
describe('monthly report mounted with actual hook and service',()=>{
  it('renders canonical partial balance and keeps different contracts separate',async()=>{
    respond([row,{...row,contract_id:'contract-2',contract_number:'C-2',paid_amount:0,outstanding_amount:1500}]);
    render(view());
    expect(await screen.findByText('C-1')).toBeTruthy(); expect(screen.getByText('C-2')).toBeTruthy();
    expect(screen.getByText(/المتبقي للفواتير المتحققة: 2,500.00/)).toBeTruthy();
    expect(screen.getByText('دفع جزئي')).toBeTruthy();
  });
  it('excludes unverified rows from totals and never declares all customers paid',async()=>{
    respond([{...row,review_reasons:['missing_monthly_invoice']}]);render(view());
    expect(await screen.findByText('فاتورة الشهر غير موجودة')).toBeTruthy();
    expect(screen.getByText(/المتبقي للفواتير المتحققة: 0.00/)).toBeTruthy();
    expect(screen.getAllByText('غير معتمد')).toHaveLength(3);
    expect(screen.queryByText(/جميع العملاء دفعوا/)).toBeNull();
  });
  it('shows a deployment error, not zero debt, when RPC is unavailable',async()=>{
    rpc.mockResolvedValue({data:null,error:{code:'PGRST202'}});render(view());
    expect(await screen.findByRole('alert')).toHaveTextContent('نشر تحديث قاعدة البيانات');
    expect(screen.queryByText(/المتبقي للفواتير المتحققة/)).toBeNull();
  });
  it('shows unclassified service invoices for review without counting them as settled or collectible',async()=>{
    respond([{...row,review_reasons:['unclassified_service_invoice']}]);render(view());
    expect(await screen.findByText('فاتورة خدمة تحتاج مطابقة مع قسط الإيجار')).toBeTruthy();
    expect(screen.getByText(/المتبقي للفواتير المتحققة: 0.00/)).toBeTruthy();
    expect(screen.getAllByText('غير معتمد')).toHaveLength(3);
    expect(screen.queryByText(/لا يوجد رصيد متبقٍ/)).toBeNull();
  });
  it('does not hide the final dirham of an otherwise verified invoice',async()=>{
    respond([{...row,paid_amount:1499.99,outstanding_amount:0.01}]);render(view());
    expect(await screen.findByText('C-1')).toBeTruthy();
    expect(screen.getByText(/المتبقي للفواتير المتحققة: 0.01/)).toBeTruthy();
    expect(screen.queryByText(/لا يوجد رصيد متبقٍ/)).toBeNull();
  });
  it('does not request data without a company',()=>{
    render(view(null));expect(screen.getByText('اختر الشركة لعرض التقرير.')).toBeTruthy();expect(rpc).not.toHaveBeenCalled();
  });
  it('defaults to the Qatar month when UTC is still in the previous month',()=>{
    vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-08-31T21:30:00Z'));
    respond([]);render(view());
    expect(screen.getByLabelText('شهر الفاتورة — وليس تاريخ دفعها')).toHaveValue('2026-09');
    expect(rpc).toHaveBeenCalledWith('get_canonical_rental_month_summary_v1',{p_company_id:'company-1',p_month:'2026-09-01'});
  });
  it('hides a previously loaded total when refresh returns inconsistent balances',async()=>{
    respond([row]);render(view());await screen.findByText('C-1');
    respond([{...row,outstanding_amount:999}]);fireEvent.click(screen.getByText('تحديث التقرير'));
    expect(await screen.findByRole('alert')).toHaveTextContent('لم تُعتمد الأرصدة');
    expect(screen.queryByText('C-1')).toBeNull();
    expect(screen.queryByText(/المتبقي للفواتير المتحققة/)).toBeNull();
    expect(screen.queryByText(/لا يوجد رصيد متبق/)).toBeNull();
  });
  it('changes month scope and refreshes after an explicit retry',async()=>{
    respond([row]);render(view());await screen.findByText('C-1');
    fireEvent.change(screen.getByLabelText('شهر الفاتورة — وليس تاريخ دفعها'),{target:{value:'2025-06'}});
    await waitFor(()=>expect(rpc).toHaveBeenLastCalledWith('get_canonical_rental_month_summary_v1',{p_company_id:'company-1',p_month:'2025-06-01'}));
    await screen.findByText('C-1');respond([]);
    fireEvent.click(screen.getByText('تحديث التقرير'));
    expect(await screen.findByText('لا توجد عقود أو فواتير ضمن نطاق هذا الشهر.')).toBeTruthy();
  });
  it('does not expose a previous company report while the new company loads',async()=>{
    respond([row]);const rendered=render(view());await screen.findByText('C-1');
    rpc.mockImplementation(()=>new Promise(()=>{}));rendered.rerender(view('company-2'));
    expect(screen.queryByText('C-1')).toBeNull();
    expect(await screen.findByRole('status')).toHaveTextContent('جاري التحقق');
  });
});
