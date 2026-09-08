import { beforeEach, describe, expect, it, vi } from 'vitest';
const client = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: client }));
import { loadLegalClaimProjection } from '../legalClaimSources';

const statement = () => ({ settlement_source: 'completed_receipt_allocations_v1', cutoff_date: '2026-09-08',
  included_invoices: [{ id:'invoice', invoice_number:'INV', due_date:'2026-08-01', invoice_month:'2026-08-01',total_amount:1700,paid_amount:500,amount:1200 }],
  included_schedules: [],
  components: { rent_due:1200,legal_extension_rent:0,contractual_compensation:50,damages:25,traffic_violations:300,retention:140,security_deposit_deduction:200 },
  total:1515,
  calculation_details:{ retention_start_date:'2026-09-02',retention_end_date:'2026-09-08',retention_daily_rate:20,contractual_compensation_units:1 },
  traffic_settlement:{ requires_review:false,proof_ready:true,claim_amount:300,rows:[{ penalty_id:'penalty',violation_number:'TV-1',penalty_date:'2026-08-15',disposition:'included',outstanding_amount:300 }] },
});

describe('load canonical financial statement', () => {
  beforeEach(() => vi.resetAllMocks());
  it('loads rent, traffic, all amounts and retention detail in one RPC without cached invoice reads',async()=>{
    client.rpc.mockResolvedValue({data:statement(),error:null});
    const projection=await loadLegalClaimProjection('contract','company','2026-09-08');
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith('calculate_legal_claim_statement_v4',expect.objectContaining({p_contract_id:'contract',p_company_id:'company',p_as_of_date:'2026-09-08'}));
    expect(client.from).not.toHaveBeenCalled();
    expect(projection.rows[0]).toMatchObject({total_amount:1700,paid_amount:500});
    expect(projection.trafficViolations?.[0]).toMatchObject({id:'penalty',total_amount:300});
    expect(projection.summary.authoritativeAmounts).toMatchObject({overdueRent:1200,total:1515,securityDepositDeduction:200});
    expect(projection.summary.authoritativeRetention).toEqual({days:7,amount:140,from:'2026-09-02',to:'2026-09-08'});
    expect(projection.summary.authoritativeCompensationUnits).toBe(1);
  });
  it('does not fall back to cached balances after a reconciliation error',async()=>{
    client.rpc.mockResolvedValue({data:null,error:{message:'Invoice receipts require reconciliation'}});
    await expect(loadLegalClaimProjection('contract','company','2026-09-08')).rejects.toThrow('تحتاج الفواتير');
    expect(client.from).not.toHaveBeenCalled();
    expect(client.rpc).toHaveBeenCalledTimes(1);
  });
  it('refuses a conflicting retention period even if the total is arithmetically valid',async()=>{
    const value=statement();value.calculation_details.retention_end_date='2026-09-09';
    client.rpc.mockResolvedValue({data:value,error:null});
    await expect(loadLegalClaimProjection('contract','company','2026-09-08')).rejects.toThrow('تعويض الاحتباس');
  });
  it('rejects traffic detail that disagrees with the component despite a matching grand total',async()=>{
    const value=statement();value.components.traffic_violations=400;value.total+=100;
    client.rpc.mockResolvedValue({data:value,error:null});
    await expect(loadLegalClaimProjection('contract','company','2026-09-08')).rejects.toThrow('تفاصيل الأجرة والمخالفات');
  });
  it('rejects a compensated claim without a verified count of units',async()=>{
    const value=statement();value.calculation_details.contractual_compensation_units=0;
    client.rpc.mockResolvedValue({data:value,error:null});
    await expect(loadLegalClaimProjection('contract','company','2026-09-08')).rejects.toThrow('وحدات التعويض');
  });
});


describe('actionable reconciliation messages', () => {
  it('distinguishes invoice cancellation from waiving the underlying traffic claim', async () => {
    client.rpc.mockResolvedValue({ data:null, error:{ message:'تعذر اعتماد مطالبة المخالفات', hint:'LEGAL_TRAFFIC_RECONCILIATION_REQUIRED',
      details:JSON.stringify({rows:[{disposition:'review',review_reasons:['missing_or_mislinked_active_traffic_invoice']}]}) } });
    await expect(loadLegalClaimProjection('contract','company','2026-09-09')).rejects.toThrow('إلغاء الفاتورة وحده لا يثبت إسقاط المخالفة');
  });
});


describe('disclosed invoice service coverage', () => {
  it('preserves server service dates independently of the prepaid due date', async () => {
    const value={...statement(),service_period_version:'invoice_coverage_v1'};
    value.included_invoices=value.included_invoices.map(row=>({...row,service_period_start:'2026-08-10',service_period_end:'2026-08-20'}));
    client.rpc.mockResolvedValue({data:value,error:null});
    const projection=await loadLegalClaimProjection('contract','company','2026-09-08');
    expect(projection.rows[0]).toMatchObject({due_date:'2026-08-01',service_period_start:'2026-08-10',service_period_end:'2026-08-20',total_amount:1700,paid_amount:500});
  });
  it('rejects incomplete disclosed coverage instead of inferring a different period',async()=>{
    client.rpc.mockResolvedValue({data:{...statement(),service_period_version:'invoice_coverage_v1'},error:null});
    await expect(loadLegalClaimProjection('contract','company','2026-09-08')).rejects.toThrow('تفاصيل الأجرة');
  });
});
