import type { Database } from '@/integrations/supabase/types';
import type { ReportFilters } from '../types/reports.types';

type VehicleRow = Database['public']['Tables']['vehicles']['Row'];
type MaintenanceRow = Database['public']['Tables']['vehicle_maintenance']['Row'];
type InsuranceRow = Database['public']['Tables']['vehicle_insurance']['Row'];
type DocumentRow = Database['public']['Tables']['vehicle_documents']['Row'];
export type FleetVehicle = Pick<VehicleRow, 'id' | 'company_id' | 'plate_number' | 'make' | 'model' | 'year' | 'status' | 'is_active' | 'notes' | 'vin_number' | 'purchase_cost' | 'book_value' | 'accumulated_depreciation' | 'daily_rate' | 'monthly_rate'>;
export type FleetMaintenance = Pick<MaintenanceRow, 'id' | 'company_id' | 'vehicle_id' | 'maintenance_number' | 'maintenance_type' | 'status' | 'scheduled_date' | 'completed_date' | 'estimated_cost' | 'actual_cost' | 'description' | 'journal_entry_id'>;
export type FleetInsurance = Pick<InsuranceRow, 'id' | 'vehicle_id' | 'end_date' | 'insurance_company' | 'is_active'>;
export type FleetDocument = Pick<DocumentRow, 'id' | 'vehicle_id' | 'document_type' | 'document_name' | 'document_number' | 'expiry_date' | 'is_active'>;
export interface FleetPeriod { start: string; end: string }
export interface FleetLedgerLine {
  id: string;
  journal_entry_id: string;
  debit_amount: number | null;
  credit_amount: number | null;
  entry: { company_id: string; status: string; entry_date: string; entry_number: string };
  account: { company_id: string; account_type: string; account_code: string; account_name: string };
}
export interface FleetMonthlyFinancials { month: string; revenue: number; expenses: number; result: number; line_count: number }
export type DocumentStatus = 'valid' | 'expiring_soon' | 'expired' | 'none';
export interface VehicleInsuranceRegistrationData {
  id: string; plate_number: string; make: string; model: string; year: number; status: string;
  has_insurance: boolean; insurance_company?: string; insurance_expiry?: string; insurance_status: DocumentStatus;
  has_registration: boolean; registration_number?: string; registration_expiry?: string; registration_status: DocumentStatus;
}
export interface FleetReportDataset {
  companyId: string; period: FleetPeriod; readAt: string;
  vehicles: FleetVehicle[]; maintenance: FleetMaintenance[]; insurance: FleetInsurance[]; documents: FleetDocument[];
  ledgerLines: FleetLedgerLine[]; monthly: FleetMonthlyFinancials[]; registration: VehicleInsuranceRegistrationData[];
  vehicleFinancials: Array<{ vehicle_id: string; revenue: null; expenses: null; profit: null }>;
}

export const fleetToday = (now = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qatar', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};
const dateText = (date: Date) => date.toISOString().slice(0, 10);
export function fleetReportPeriod(filters: ReportFilters, today = fleetToday()): FleetPeriod {
  const end = new Date(`${today}T00:00:00Z`);
  const start = new Date(end);
  switch (filters.period) {
    case 'today': break;
    case 'week': start.setUTCDate(start.getUTCDate() - 6); break;
    case 'month': start.setUTCDate(1); break;
    case 'quarter': start.setUTCMonth(Math.floor(start.getUTCMonth() / 3) * 3, 1); break;
    case 'year': start.setUTCMonth(0, 1); break;
    case 'custom': {
      if (!filters.startDate || !filters.endDate) throw new Error('حدد بداية ونهاية الفترة');
      const period = { start: fleetToday(filters.startDate), end: fleetToday(filters.endDate) };
      if (period.start > period.end) throw new Error('بداية الفترة يجب ألا تتجاوز نهايتها');
      return period;
    }
  }
  return { start: dateText(start), end: dateText(end) };
}

export function buildMonthlyFinancials(lines: FleetLedgerLine[], companyId: string, period: FleetPeriod): FleetMonthlyFinancials[] {
  const months = new Map<string, FleetMonthlyFinancials>();
  const cursor = new Date(`${period.start.slice(0, 7)}-01T00:00:00Z`);
  while (dateText(cursor).slice(0, 7) <= period.end.slice(0, 7)) {
    const month = dateText(cursor).slice(0, 7);
    months.set(month, { month, revenue: 0, expenses: 0, result: 0, line_count: 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  for (const line of lines) {
    if (line.entry.company_id !== companyId || line.account.company_id !== companyId) throw new Error('بيانات مالية خارج نطاق الشركة');
    if (line.entry.status !== 'posted' || line.entry.entry_date < period.start || line.entry.entry_date > period.end) throw new Error('قيد خارج الفترة أو غير مرحل');
    const row = months.get(line.entry.entry_date.slice(0, 7));
    if (!row) throw new Error('تاريخ قيد غير صالح');
    const debit = line.debit_amount ?? 0;
    const credit = line.credit_amount ?? 0;
    if (!Number.isFinite(debit) || !Number.isFinite(credit)) throw new Error('مبلغ قيد غير صالح');
    if (['revenue', 'revenues', 'income'].includes(line.account.account_type)) row.revenue += credit - debit;
    else if (['expense', 'expenses'].includes(line.account.account_type)) row.expenses += debit - credit;
    else throw new Error('تصنيف حساب غير مدعوم للأداء المالي');
    row.line_count++;
  }
  return [...months.values()].map(row => {
    const revenue = Math.round((row.revenue + Number.EPSILON) * 100) / 100;
    const expenses = Math.round((row.expenses + Number.EPSILON) * 100) / 100;
    return { ...row, revenue, expenses, result: Math.round((revenue - expenses + Number.EPSILON) * 100) / 100 };
  });
}

export function buildRegistrationReport(vehicles: FleetVehicle[], insurance: FleetInsurance[], documents: FleetDocument[], today: string): VehicleInsuranceRegistrationData[] {
  const soon = new Date(`${today}T00:00:00Z`);
  soon.setUTCDate(soon.getUTCDate() + 30);
  const status = (expiry?: string | null): DocumentStatus => !expiry ? 'none' : expiry < today ? 'expired' : expiry <= dateText(soon) ? 'expiring_soon' : 'valid';
  return vehicles.map(v => {
    const policy = insurance.filter(i => i.vehicle_id === v.id && i.is_active === true).sort((a, b) => (b.end_date ?? '').localeCompare(a.end_date ?? ''))[0];
    const registration = documents.filter(d => d.vehicle_id === v.id && d.document_type === 'registration' && d.is_active === true).sort((a, b) => (b.expiry_date ?? '').localeCompare(a.expiry_date ?? ''))[0];
    return { id: v.id, plate_number: v.plate_number, make: v.make, model: v.model, year: v.year, status: v.status ?? 'غير مسجل',
      has_insurance: !!policy, insurance_company: policy?.insurance_company ?? undefined, insurance_expiry: policy?.end_date ?? undefined, insurance_status: status(policy?.end_date),
      has_registration: !!registration, registration_number: registration?.document_number ?? undefined, registration_expiry: registration?.expiry_date ?? undefined, registration_status: status(registration?.expiry_date) };
  });
}

export const FLEET_REPORT_SCOPE = 'حصر المركبات وجميع أوامر الصيانة الحالية، بما فيها المركبات غير النشطة. الحالات المسجلة لا تثبت الأهلية للتشغيل. القيم الدفترية ليست تقييم بيع. الأداء المالي صافي حركات قيود الشركة المرحّلة خلال الفترة، ولا ينسب إلى مركبة أو يمثل قائمة دخل معتمدة. الأشهر دون أسطر مقيدة تظهر صفر حركة في المصدر؛ لا يثبت ذلك اكتمال الدفاتر. بيانات المركبة غير المتاحة تعرض صراحة. القراءة من استعلامات منفصلة وليست فترة محاسبية مقفلة. الوثائق فهرس بيانات ولا يتضمن نسخها الأصلية.';
