import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

type DecisionPriority = 'high' | 'medium' | 'low';
type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface DailyDecisionAction {
  title: string;
  reason: string;
  priority: DecisionPriority;
  route?: string;
}

export interface DailyDecisionRisk {
  title: string;
  impact: string;
  severity: RiskSeverity;
}

export interface DailyDecisionCustomerRisk {
  customerName: string;
  phone?: string | null;
  amount: number;
  invoices: number;
}

export interface DailyDecisionContractItem {
  contractNumber: string;
  customerName: string;
  endDate: string;
  monthlyAmount: number;
  route: string;
}

export interface DailyDecisionVehicleRisk {
  plateNumber: string;
  status: string | null;
  nextServiceDue: string | null;
  maintenanceCost: number;
}

export interface DailyDecisionMetrics {
  generatedFor: string;
  collections: {
    overdueInvoices: number;
    overdueAmount: number;
    expected7Days: number;
    expected30Days: number;
    topCustomers: DailyDecisionCustomerRisk[];
  };
  contracts: {
    activeCount: number;
    endingSoonCount: number;
    overdueCount: number;
    endingSoon: DailyDecisionContractItem[];
  };
  fleet: {
    totalVehicles: number;
    idleVehiclesCount: number;
    maintenanceRiskCount: number;
    statusCounts: Record<string, number>;
    maintenanceRiskVehicles: DailyDecisionVehicleRisk[];
  };
  traffic: {
    unpaidCount: number;
    unpaidAmount: number;
  };
}

export interface DailyDecisionResult {
  summary: string;
  actions: DailyDecisionAction[];
  risks: DailyDecisionRisk[];
  cashflow: {
    next7Days: number;
    next30Days: number;
    note: string;
  };
  generatedAt: string;
  source: 'longcat' | 'local';
  metrics?: DailyDecisionMetrics;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  due_date: string | null;
  total_amount: number;
  balance_due: number | null;
  paid_amount: number | null;
  payment_status: string;
  status: string;
  contract_id: string | null;
  customer_id: string | null;
  customers?: {
    first_name?: string | null;
    last_name?: string | null;
    first_name_ar?: string | null;
    last_name_ar?: string | null;
    phone?: string | null;
  } | null;
  contracts?: {
    contract_number?: string | null;
  } | null;
}

interface ContractRow {
  id: string;
  contract_number: string;
  status: string;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  contract_amount: number;
  balance_due: number | null;
  customer_id: string;
  vehicle_id: string | null;
  customers?: {
    first_name?: string | null;
    last_name?: string | null;
    first_name_ar?: string | null;
    last_name_ar?: string | null;
    phone?: string | null;
  } | null;
  vehicles?: {
    plate_number?: string | null;
    status?: string | null;
  } | null;
}

interface VehicleRow {
  id: string;
  plate_number: string;
  status: string | null;
  is_active: boolean | null;
  last_maintenance_date: string | null;
  next_service_due: string | null;
  total_maintenance_cost: number | null;
  total_operating_cost: number | null;
}

interface PenaltyRow {
  id: string;
  amount: number;
  payment_status: string | null;
  status: string | null;
  penalty_date: string;
  customer_id: string | null;
  contract_id: string | null;
  vehicle_plate: string | null;
}

const TODAY = new Date();

export const useDailyDecisionCenter = () => {
  const { companyId, isInitializing } = useUnifiedCompanyAccess();
  const todayKey = useMemo(() => formatDate(TODAY), []);

  return useQuery({
    queryKey: ['daily-decision-center', companyId, todayKey],
    enabled: !!companyId && !isInitializing,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<DailyDecisionResult> => {
      if (!companyId) {
        throw new Error('Company is not ready');
      }

      const metrics = await collectDecisionMetrics(companyId);

      try {
        const { data, error } = await supabase.functions.invoke('daily-decision-center', {
          body: { metrics, locale: 'ar-QA' },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data?.summary && Array.isArray(data?.actions)) {
          return {
            ...(data as DailyDecisionResult),
            metrics,
          };
        }
      } catch (error) {
        console.warn('[useDailyDecisionCenter] Falling back to local decision center:', error);
      }

      return buildLocalDecision(metrics);
    },
  });
};

async function collectDecisionMetrics(companyId: string): Promise<DailyDecisionMetrics> {
  const today = startOfDay(new Date());
  const in7Days = addDays(today, 7);
  const in30Days = addDays(today, 30);

  const [invoicesResult, contractsResult, vehiclesResult, penaltiesResult] = await Promise.all([
    supabase
      .from('invoices')
      .select(`
        id, invoice_number, due_date, total_amount, balance_due, paid_amount, payment_status, status, contract_id, customer_id,
        customers(first_name, last_name, first_name_ar, last_name_ar, phone),
        contracts(contract_number)
      `)
      .eq('company_id', companyId)
      .in('payment_status', ['unpaid', 'partial', 'pending', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(500),
    supabase
      .from('contracts')
      .select(`
        id, contract_number, status, start_date, end_date, monthly_amount, contract_amount, balance_due, customer_id, vehicle_id,
        customers(first_name, last_name, first_name_ar, last_name_ar, phone),
        vehicles(plate_number, status)
      `)
      .eq('company_id', companyId)
      .in('status', ['active', 'pending', 'overdue'])
      .order('end_date', { ascending: true })
      .limit(500),
    supabase
      .from('vehicles')
      .select('id, plate_number, status, is_active, last_maintenance_date, next_service_due, total_maintenance_cost, total_operating_cost')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .limit(500),
    supabase
      .from('penalties')
      .select('id, amount, payment_status, status, penalty_date, customer_id, contract_id, vehicle_plate')
      .eq('company_id', companyId)
      .limit(500),
  ]);

  if (invoicesResult.error) throw invoicesResult.error;
  if (contractsResult.error) throw contractsResult.error;
  if (vehiclesResult.error) throw vehiclesResult.error;

  const invoices = (invoicesResult.data || []) as unknown as InvoiceRow[];
  const contracts = (contractsResult.data || []) as unknown as ContractRow[];
  const vehicles = (vehiclesResult.data || []) as VehicleRow[];
  const penalties = penaltiesResult.error ? [] : ((penaltiesResult.data || []) as PenaltyRow[]);

  const openInvoices = invoices.filter((invoice) => getInvoiceBalance(invoice) > 0);
  const overdueInvoices = openInvoices.filter((invoice) => {
    if (!invoice.due_date) return false;
    return new Date(invoice.due_date) < today;
  });
  const expected7Days = sumBalances(openInvoices.filter((invoice) => isDateWithin(invoice.due_date, today, in7Days)));
  const expected30Days = sumBalances(openInvoices.filter((invoice) => isDateWithin(invoice.due_date, today, in30Days)));

  const contractsEndingSoon = contracts.filter((contract) => isDateWithin(contract.end_date, today, in30Days));
  const overdueContracts = contracts.filter((contract) => contract.status === 'overdue' || Number(contract.balance_due || 0) > 0);
  const idleVehicles = vehicles.filter((vehicle) => ['available', 'inactive', 'out_of_service'].includes(String(vehicle.status || '')));
  const maintenanceRiskVehicles = vehicles
    .filter((vehicle) => Number(vehicle.total_maintenance_cost || 0) > 0 || isDateWithin(vehicle.next_service_due, today, in30Days))
    .sort((a, b) => Number(b.total_maintenance_cost || 0) - Number(a.total_maintenance_cost || 0))
    .slice(0, 5);
  const unpaidPenalties = penalties.filter((penalty) => !['paid', 'completed'].includes(String(penalty.payment_status || penalty.status || '').toLowerCase()));

  return {
    generatedFor: formatDate(today),
    collections: {
      overdueInvoices: overdueInvoices.length,
      overdueAmount: sumBalances(overdueInvoices),
      expected7Days,
      expected30Days,
      topCustomers: aggregateInvoicesByCustomer(overdueInvoices).slice(0, 5),
    },
    contracts: {
      activeCount: contracts.filter((contract) => contract.status === 'active').length,
      endingSoonCount: contractsEndingSoon.length,
      overdueCount: overdueContracts.length,
      endingSoon: contractsEndingSoon.slice(0, 5).map((contract) => ({
        contractNumber: contract.contract_number,
        customerName: getCustomerName(contract.customers),
        endDate: contract.end_date,
        monthlyAmount: contract.monthly_amount,
        route: `/contracts/${contract.contract_number}`,
      })),
    },
    fleet: {
      totalVehicles: vehicles.length,
      idleVehiclesCount: idleVehicles.length,
      maintenanceRiskCount: maintenanceRiskVehicles.length,
      statusCounts: countBy(vehicles, (vehicle) => String(vehicle.status || 'unknown')),
      maintenanceRiskVehicles: maintenanceRiskVehicles.map((vehicle) => ({
        plateNumber: vehicle.plate_number,
        status: vehicle.status,
        nextServiceDue: vehicle.next_service_due,
        maintenanceCost: vehicle.total_maintenance_cost || 0,
      })),
    },
    traffic: {
      unpaidCount: unpaidPenalties.length,
      unpaidAmount: unpaidPenalties.reduce((sum, penalty) => sum + Number(penalty.amount || 0), 0),
    },
  };
}

function buildLocalDecision(metrics: DailyDecisionMetrics): DailyDecisionResult {
  const actions: DailyDecisionAction[] = [];
  const risks: DailyDecisionRisk[] = [];
  const overdueAmount = Number(metrics.collections.overdueAmount || 0);

  if (metrics.collections.overdueInvoices > 0) {
    actions.push({
      title: `متابعة ${metrics.collections.overdueInvoices} فاتورة متأخرة`,
      reason: `قيمة المتأخرات الحالية ${formatQar(overdueAmount)}`,
      priority: overdueAmount > 50000 ? 'high' : 'medium',
      route: '/legal/delinquency',
    });
    risks.push({
      title: 'تأخر التحصيل',
      impact: 'قد يضغط على السيولة إذا لم يتم التواصل مع العملاء اليوم',
      severity: overdueAmount > 100000 ? 'critical' : 'high',
    });
  }

  if (metrics.contracts.endingSoonCount > 0) {
    actions.push({
      title: `تجديد أو مراجعة ${metrics.contracts.endingSoonCount} عقد`,
      reason: 'توجد عقود تنتهي خلال 30 يومًا',
      priority: 'medium',
      route: '/contracts',
    });
  }

  if (metrics.fleet.maintenanceRiskCount > 0) {
    actions.push({
      title: `مراجعة ${metrics.fleet.maintenanceRiskCount} مركبة تحتاج متابعة`,
      reason: 'يوجد مؤشر صيانة أو تكلفة تشغيلية مرتفعة',
      priority: 'medium',
      route: '/fleet/maintenance',
    });
  }

  if (metrics.traffic.unpaidCount > 0) {
    actions.push({
      title: `تحصيل ${metrics.traffic.unpaidCount} مخالفة مرورية`,
      reason: `قيمة المخالفات غير المدفوعة ${formatQar(metrics.traffic.unpaidAmount)}`,
      priority: metrics.traffic.unpaidAmount > 10000 ? 'high' : 'medium',
      route: '/legal/delinquency',
    });
    risks.push({
      title: 'مخالفات غير مدفوعة',
      impact: 'تراكم المخالفات قد يرفع تكلفة العقد ويؤخر الإقفال',
      severity: metrics.traffic.unpaidAmount > 10000 ? 'high' : 'medium',
    });
  }

  if (metrics.fleet.idleVehiclesCount > 0) {
    actions.push({
      title: `تحسين تشغيل ${metrics.fleet.idleVehiclesCount} مركبة`,
      reason: 'توجد مركبات متاحة أو غير نشطة يمكن رفع عائدها',
      priority: 'low',
      route: '/fleet',
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: 'المؤشرات مستقرة اليوم',
      reason: 'لا تظهر بيانات اليوم إجراءات عاجلة',
      priority: 'low',
      route: '/dashboard',
    });
  }

  if (risks.length === 0) {
    risks.push({
      title: 'مخاطر منخفضة',
      impact: 'استمر في مراقبة التحصيل والعقود بشكل يومي',
      severity: 'low',
    });
  }

  return {
    summary: 'تم تجهيز قرارات اليوم من بيانات التحصيل والعقود والأسطول المتاحة.',
    actions: actions.slice(0, 5),
    risks: risks.slice(0, 5),
    cashflow: {
      next7Days: metrics.collections.expected7Days,
      next30Days: metrics.collections.expected30Days,
      note: 'التوقع مبني على الفواتير المفتوحة حسب تواريخ الاستحقاق.',
    },
    generatedAt: new Date().toISOString(),
    source: 'local',
    metrics,
  };
}

function aggregateInvoicesByCustomer(invoices: InvoiceRow[]) {
  const rows = new Map<string, { customerName: string; phone?: string | null; amount: number; invoices: number }>();

  invoices.forEach((invoice) => {
    const key = invoice.customer_id || 'unknown';
    const current = rows.get(key) || {
      customerName: getCustomerName(invoice.customers),
      phone: invoice.customers?.phone,
      amount: 0,
      invoices: 0,
    };
    current.amount += getInvoiceBalance(invoice);
    current.invoices += 1;
    rows.set(key, current);
  });

  return Array.from(rows.values()).sort((a, b) => b.amount - a.amount);
}

function getCustomerName(customer?: InvoiceRow['customers'] | ContractRow['customers']) {
  const name = [
    customer?.first_name_ar || customer?.first_name,
    customer?.last_name_ar || customer?.last_name,
  ].filter(Boolean).join(' ');
  return name || 'عميل غير محدد';
}

function getInvoiceBalance(invoice: InvoiceRow) {
  return Number(invoice.balance_due ?? Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)));
}

function sumBalances(invoices: InvoiceRow[]) {
  return invoices.reduce((sum, invoice) => sum + getInvoiceBalance(invoice), 0);
}

function isDateWithin(dateValue: string | null | undefined, start: Date, end: Date) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  return date >= start && date <= end;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function formatQar(value: number) {
  return `${Number(value || 0).toLocaleString('ar-QA')} ر.ق`;
}
