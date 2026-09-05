export const arrearsRow={
  contract_id:'contract-1',contract_number:'C-1',customer_id:'customer-1',customer_name:'عميل اختبار',
  customer_phone:null,customer_email:null,vehicle_id:null,vehicle_plate:null,monthly_rent:1500,
  cutoff_date:'2026-09-04',invoiced_amount:1500,paid_amount:1000,outstanding_amount:500,
  oldest_unpaid_date:'2026-08-01',days_overdue:34,unpaid_months:1,invoice_count:1,
  latest_payment_date:'2026-09-02',review_reasons:[] as string[],
};
export const arrearsReview={...arrearsRow,contract_id:'review-1',contract_number:'REVIEW-1',
  invoiced_amount:null,paid_amount:null,outstanding_amount:null,oldest_unpaid_date:null,days_overdue:null,unpaid_months:null,
  review_reasons:['incomplete_schedule'],
};
export const arrearsEnvelope=(rows:unknown[]=[arrearsRow])=>({company_id:'company-1',due_as_of:'2026-09-04',
  settlement_basis:'current_payment_allocations',fees_scope:'excluded',rows});
