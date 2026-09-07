import { useState } from 'react';
import MonthlyRevenueTab from '@/pages/financial-tracking/MonthlyRevenueTab';
import { CustomerCollectionCards } from '@/pages/financial-tracking/CustomerCollectionCards';
import { CustomerOpenInvoices } from '@/pages/financial-tracking/CustomerOpenInvoices';

export function CollectionPreview() {
  const [filter,setFilter]=useState('all');
  const [failed,setFailed]=useState(new URLSearchParams(location.search).has('error'));
  const row={total:960,rent:500,fines:120,advances:300,other:40,count:3};
  const months=[{...row,month:'سبتمبر 2026',monthKey:'2026-09'}];
  const error=failed?new Error('تعذر تحميل ملخص التحصيل من الدفعات.'):null;
  const retry=()=>setFailed(false);
  return <div dir="rtl" className="p-4 space-y-5">
    <p className="text-sm text-muted-foreground">معاينة ببيانات اختبار معزولة</p>
    <CustomerCollectionCards totals={{...row,customer_id:'66666666-6666-4666-8666-666666666666',pending:1000,partial_count:1,last_payment_date:'2026-09-03'}} loading={false} error={error} onRetry={retry}/>
    {!failed && <CustomerOpenInvoices asOf="2026-09-06" invoices={[{invoice_id:'11111111-1111-4111-8111-111111111111',customer_id:'66666666-6666-4666-8666-666666666666',invoice_number:'INV-TEST-01',due_date:'2026-09-01',balance:1000,partial:true}]}/>}
    <MonthlyRevenueTab monthlySummary={months} filteredMonthlySummary={filter==='all'||filter==='2026-09'?months:[]}
      loading={false} error={error} onRetry={retry} selectedMonthFilter={filter} onMonthFilterChange={setFilter}/>
  </div>;
}
