import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { buildMonthlyFinancials, buildRegistrationReport, fleetToday, type FleetLedgerLine, type FleetPeriod, type FleetReportDataset } from './fleetReportModel';

const PAGE_SIZE = 500;
/** An exact count and stable IDs prevent a row cap or failed page becoming a complete report. */
export async function readFleetPages<T extends { id: string }>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null; count?: number | null }>): Promise<T[]> {
  const rows: T[] = [];
  const ids = new Set<string>();
  let expected: number | undefined;
  for (;;) {
    const result = await fetchPage(rows.length, rows.length + PAGE_SIZE - 1);
    if (result.error) throw new Error(result.error.message);
    if (result.count == null || !result.data) throw new Error('تعذر التحقق من شمول التقرير');
    if (expected !== undefined && expected !== result.count) throw new Error('تغير عدد السجلات أثناء القراءة؛ أعد تحديث التقرير');
    expected = result.count;
    for (const row of result.data) {
      if (ids.has(row.id)) throw new Error('تكرر سجل أثناء قراءة الصفحات؛ أعد تحديث التقرير');
      ids.add(row.id); rows.push(row);
    }
    if (rows.length === expected) return rows;
    if (!result.data.length || rows.length > expected) throw new Error('بيانات التقرير غير مكتملة');
  }
}

export async function readFleetReport(client: SupabaseClient<Database>, companyId: string, period: FleetPeriod): Promise<FleetReportDataset> {
  if (!companyId) throw new Error('يجب تحديد الشركة قبل قراءة التقرير');
  const [vehicles, maintenance, rawLines] = await Promise.all([
    readFleetPages((from, to) => client.from('vehicles').select('id,company_id,plate_number,make,model,year,status,is_active,notes,vin_number,purchase_cost,book_value,accumulated_depreciation,daily_rate,monthly_rate', { count: 'exact' }).eq('company_id', companyId).order('id').range(from, to)),
    readFleetPages((from, to) => client.from('vehicle_maintenance').select('id,company_id,vehicle_id,maintenance_number,maintenance_type,status,scheduled_date,completed_date,estimated_cost,actual_cost,description,journal_entry_id', { count: 'exact' }).eq('company_id', companyId).order('id').range(from, to)),
    readFleetPages((from, to) => client.from('journal_entry_lines').select('id,journal_entry_id,debit_amount,credit_amount,entry:journal_entries!journal_entry_lines_journal_entry_id_fkey!inner(company_id,status,entry_date,entry_number),account:chart_of_accounts!journal_entry_lines_account_id_fkey!inner(company_id,account_type,account_code,account_name)', { count: 'exact' }).eq('entry.company_id', companyId).eq('account.company_id', companyId).eq('entry.status', 'posted').in('account.account_type', ['revenue', 'revenues', 'income', 'expense', 'expenses']).gte('entry.entry_date', period.start).lte('entry.entry_date', period.end).order('id').range(from, to)),
  ]);
  if (vehicles.some(v => v.company_id !== companyId) || maintenance.some(m => m.company_id !== companyId)) throw new Error('سجلات خارج نطاق الشركة');
  // These child tables have no company_id column. Limit every page to IDs verified above.
  const insurance: FleetReportDataset['insurance'] = [];
  const documents: FleetReportDataset['documents'] = [];
  for (let offset = 0; offset < vehicles.length; offset += 100) {
    const vehicleIds = vehicles.slice(offset, offset + 100).map(v => v.id);
    const [policies, files] = await Promise.all([
      readFleetPages((from, to) => client.from('vehicle_insurance').select('id,vehicle_id,end_date,insurance_company,is_active', { count: 'exact' }).in('vehicle_id', vehicleIds).order('id').range(from, to)),
      readFleetPages((from, to) => client.from('vehicle_documents').select('id,vehicle_id,document_type,document_name,document_number,expiry_date,is_active', { count: 'exact' }).in('vehicle_id', vehicleIds).order('id').range(from, to)),
    ]);
    if (policies.some(p => !vehicleIds.includes(p.vehicle_id)) || files.some(d => !vehicleIds.includes(d.vehicle_id))) throw new Error('وثائق خارج مركبات الشركة');
    insurance.push(...policies); documents.push(...files);
  }
  const ledgerLines = rawLines as FleetLedgerLine[];
  return { companyId, period, readAt: new Date().toISOString(), vehicles, maintenance, insurance, documents, ledgerLines,
    monthly: buildMonthlyFinancials(ledgerLines, companyId, period), registration: buildRegistrationReport(vehicles, insurance, documents, fleetToday()),
    vehicleFinancials: vehicles.map(v => ({ vehicle_id: v.id, revenue: null, expenses: null, profit: null })) };
}
