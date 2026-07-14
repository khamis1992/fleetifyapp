import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

type Property = Database['public']['Tables']['properties']['Row'];
type PropertyContract = Database['public']['Tables']['property_contracts']['Row'];
type PropertyMaintenance = Database['public']['Tables']['property_maintenance']['Row'];
type PropertyOwner = Database['public']['Tables']['property_owners']['Row'];
type PropertyPayment = Database['public']['Tables']['property_payments']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];

export interface PropertyFinancialData {
  totalRevenue: number;
  monthlyRevenue: number;
  totalProfit: number;
  occupancyRate: number;
  averageRent: number;
  totalProperties: number;
  occupiedProperties: number;
  vacantProperties: number;
  overduePyments: number;
  collectionRate: number;
}

export interface PropertyPerformanceData {
  propertyId: string;
  propertyName: string;
  propertyType: string;
  location: string;
  monthlyRent: number;
  actualRevenue: number;
  occupancyDays: number;
  profitMargin: number;
  maintenanceCosts: number;
  roi: number;
  status: 'occupied' | 'vacant' | 'maintenance' | 'available';
}

export interface OccupancyAnalysis {
  month: string;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  newLeases: number;
  renewals: number;
  terminations: number;
  averageVacancyDays: number;
}

export interface OwnerFinancialStatement {
  ownerId: string;
  ownerName: string;
  totalProperties: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  managementFees: number;
  maintenanceCosts: number;
  propertyTaxes: number;
  insurance: number;
  profitMargin: number;
  properties: Array<{
    propertyId: string;
    propertyName: string;
    monthlyRent: number;
    actualRevenue: number;
    expenses: number;
    netIncome: number;
  }>;
}

export interface TenantAnalysis {
  tenantId: string;
  tenantName: string;
  propertyName: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  totalPaid: number;
  amountDue: number;
  daysOverdue: number;
  paymentHistory: 'excellent' | 'good' | 'poor' | 'defaulted';
  renewalProbability: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PortfolioAnalysis {
  totalValue: number;
  totalRevenue: number;
  totalExpenses: number;
  netOperatingIncome: number;
  averageCapRate: number;
  averageOccupancy: number;
  propertyTypeDistribution: Array<{
    type: string;
    count: number;
    percentage: number;
    avgRent: number;
    avgOccupancy: number;
  }>;
  locationAnalysis: Array<{
    location: string;
    propertyCount: number;
    totalRevenue: number;
    avgRent: number;
    occupancyRate: number;
    marketTrend: 'up' | 'down' | 'stable';
  }>;
  maintenanceAnalysis: {
    totalCosts: number;
    averageCostPerUnit: number;
    maintenanceRequestsCount: number;
    averageResponseTime: number;
  };
}

interface PropertyReportSource {
  properties: Property[];
  contracts: PropertyContract[];
  payments: PropertyPayment[];
  owners: PropertyOwner[];
  maintenance: PropertyMaintenance[];
  tenants: Customer[];
}

const amount = (value: number | null | undefined) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const paymentTotal = (payment: PropertyPayment) =>
  amount(payment.total_amount) || amount(payment.amount) + amount(payment.late_fee);

const isActiveContract = (contract: PropertyContract) =>
  contract.is_active !== false && contract.status === 'active';

const customerName = (customer: Customer | undefined) => {
  if (!customer) return 'غير محدد';
  const arabic = `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim();
  const english = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
  return arabic || english || customer.company_name_ar || customer.company_name || 'غير محدد';
};

const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const nextMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 1);
const dateOnly = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

const overlapsMonth = (contract: PropertyContract, month: Date) => {
  const start = contract.start_date;
  const end = contract.end_date || '9999-12-31';
  return start < dateOnly(nextMonthStart(month)) && end >= dateOnly(monthStart(month));
};

const daysBetween = (start: string, end: string) => {
  const startTime = Date.parse(`${start.slice(0, 10)}T00:00:00Z`);
  const endTime = Date.parse(`${end.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 0;
  return Math.max(0, Math.round((endTime - startTime) / 86_400_000));
};

const clampPercentage = (value: number) => Math.min(100, Math.max(0, value));

export const calculatePropertyReports = ({
  properties,
  contracts,
  payments,
  owners,
  maintenance,
  tenants,
}: PropertyReportSource) => {
  const today = dateOnly(new Date());
  const currentMonth = today.slice(0, 7);
  const activeProperties = properties.filter((property) => property.is_active !== false);
  const activePropertyIds = new Set(activeProperties.map((property) => property.id));
  const activeContracts = contracts.filter(
    (contract) => isActiveContract(contract) && activePropertyIds.has(contract.property_id)
  );
  const occupiedPropertyIds = new Set(activeContracts.map((contract) => contract.property_id));
  const paidPayments = payments.filter((payment) => payment.status === 'paid');
  const totalRevenue = paidPayments.reduce((sum, payment) => sum + paymentTotal(payment), 0);
  const monthlyRevenue = paidPayments
    .filter((payment) => payment.payment_date?.startsWith(currentMonth))
    .reduce((sum, payment) => sum + paymentTotal(payment), 0);
  const totalMaintenanceCosts = maintenance.reduce(
    (sum, item) => sum + amount(item.actual_cost),
    0
  );
  const totalManagementFees = contracts.reduce(
    (sum, contract) => sum + amount(contract.commission_amount),
    0
  );
  const duePayments = payments.filter(
    (payment) => payment.status !== 'cancelled' && payment.due_date <= today
  );
  const collectedDue = duePayments
    .filter((payment) => payment.status === 'paid')
    .reduce((sum, payment) => sum + paymentTotal(payment), 0);
  const totalDue = duePayments.reduce((sum, payment) => sum + paymentTotal(payment), 0);
  const overdueAmount = duePayments
    .filter((payment) => payment.status !== 'paid')
    .reduce((sum, payment) => sum + paymentTotal(payment), 0);
  const occupancyRate = activeProperties.length
    ? (occupiedPropertyIds.size / activeProperties.length) * 100
    : 0;

  const financial: PropertyFinancialData = {
    totalRevenue,
    monthlyRevenue,
    totalProfit: totalRevenue - totalMaintenanceCosts - totalManagementFees,
    occupancyRate,
    averageRent: activeContracts.length
      ? activeContracts.reduce((sum, contract) => sum + amount(contract.rental_amount), 0) /
        activeContracts.length
      : 0,
    totalProperties: activeProperties.length,
    occupiedProperties: occupiedPropertyIds.size,
    vacantProperties: Math.max(0, activeProperties.length - occupiedPropertyIds.size),
    overduePyments: overdueAmount,
    collectionRate: totalDue ? clampPercentage((collectedDue / totalDue) * 100) : 100,
  };

  const contractsByProperty = new Map<string, PropertyContract[]>();
  contracts.forEach((contract) => {
    contractsByProperty.set(contract.property_id, [
      ...(contractsByProperty.get(contract.property_id) || []),
      contract,
    ]);
  });
  const paymentsByContract = new Map<string, PropertyPayment[]>();
  payments.forEach((payment) => {
    paymentsByContract.set(payment.property_contract_id, [
      ...(paymentsByContract.get(payment.property_contract_id) || []),
      payment,
    ]);
  });
  const maintenanceByProperty = new Map<string, PropertyMaintenance[]>();
  maintenance.forEach((item) => {
    maintenanceByProperty.set(item.property_id, [
      ...(maintenanceByProperty.get(item.property_id) || []),
      item,
    ]);
  });

  const performance: PropertyPerformanceData[] = activeProperties.map((property) => {
    const propertyContracts = contractsByProperty.get(property.id) || [];
    const propertyPayments = propertyContracts.flatMap(
      (contract) => paymentsByContract.get(contract.id) || []
    );
    const actualRevenue = propertyPayments
      .filter((payment) => payment.status === 'paid')
      .reduce((sum, payment) => sum + paymentTotal(payment), 0);
    const propertyMaintenance = maintenanceByProperty.get(property.id) || [];
    const maintenanceCosts = propertyMaintenance.reduce(
      (sum, item) => sum + amount(item.actual_cost),
      0
    );
    const managementFees = propertyContracts.reduce(
      (sum, contract) => sum + amount(contract.commission_amount),
      0
    );
    const expenses = maintenanceCosts + managementFees;
    const activeContract = propertyContracts.find(isActiveContract);
    const isUnderMaintenance = propertyMaintenance.some((item) => item.status === 'in_progress');
    const status: PropertyPerformanceData['status'] = activeContract
      ? 'occupied'
      : isUnderMaintenance
        ? 'maintenance'
        : property.property_status === 'available'
          ? 'available'
          : 'vacant';
    const propertyValue = amount(property.sale_price);

    return {
      propertyId: property.id,
      propertyName: property.property_name_ar || property.property_name,
      propertyType: property.property_type || 'غير محدد',
      location: property.address_ar || property.address || 'غير محدد',
      monthlyRent: propertyContracts
        .filter(isActiveContract)
        .reduce((sum, contract) => sum + amount(contract.rental_amount), 0),
      actualRevenue,
      occupancyDays: activeContract
        ? daysBetween(activeContract.start_date, activeContract.end_date || today)
        : 0,
      profitMargin: actualRevenue
        ? ((actualRevenue - expenses) / actualRevenue) * 100
        : 0,
      maintenanceCosts,
      roi: propertyValue ? ((actualRevenue - expenses) / propertyValue) * 100 : 0,
      status,
    };
  });

  const occupancy: OccupancyAnalysis[] = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(new Date().getFullYear(), new Date().getMonth() - 11 + index, 1);
    const occupied = new Set(
      contracts.filter((contract) => overlapsMonth(contract, month)).map((contract) => contract.property_id)
    ).size;
    const key = dateOnly(month).slice(0, 7);
    return {
      month: key,
      totalUnits: activeProperties.length,
      occupiedUnits: occupied,
      vacantUnits: Math.max(0, activeProperties.length - occupied),
      occupancyRate: activeProperties.length ? (occupied / activeProperties.length) * 100 : 0,
      newLeases: contracts.filter((contract) => contract.start_date.startsWith(key)).length,
      renewals: contracts.filter(
        (contract) => contract.auto_renewal === true && contract.start_date.startsWith(key)
      ).length,
      terminations: contracts.filter((contract) => contract.end_date?.startsWith(key)).length,
      averageVacancyDays: 0,
    };
  });

  const ownersById = new Map(owners.map((owner) => [owner.id, owner]));
  const ownerStatements: OwnerFinancialStatement[] = owners.map((owner) => {
    const ownerProperties = activeProperties.filter((property) => property.owner_id === owner.id);
    const details = ownerProperties.map((property) => {
      const report = performance.find((item) => item.propertyId === property.id);
      const propertyContracts = contractsByProperty.get(property.id) || [];
      const managementFees = propertyContracts.reduce(
        (sum, contract) => sum + amount(contract.commission_amount),
        0
      );
      const expenses = (report?.maintenanceCosts || 0) + managementFees;
      return {
        propertyId: property.id,
        propertyName: property.property_name_ar || property.property_name,
        monthlyRent: report?.monthlyRent || 0,
        actualRevenue: report?.actualRevenue || 0,
        expenses,
        netIncome: (report?.actualRevenue || 0) - expenses,
      };
    });
    const ownerContracts = ownerProperties.flatMap(
      (property) => contractsByProperty.get(property.id) || []
    );
    const managementFees = ownerContracts.reduce(
      (sum, contract) => sum + amount(contract.commission_amount),
      0
    );
    const maintenanceCosts = details.reduce(
      (sum, detail) => sum + (performance.find((item) => item.propertyId === detail.propertyId)?.maintenanceCosts || 0),
      0
    );
    const ownerRevenue = details.reduce((sum, detail) => sum + detail.actualRevenue, 0);
    const totalExpenses = managementFees + maintenanceCosts;

    return {
      ownerId: owner.id,
      ownerName: owner.full_name_ar || owner.full_name,
      totalProperties: ownerProperties.length,
      totalRevenue: ownerRevenue,
      totalExpenses,
      netIncome: ownerRevenue - totalExpenses,
      managementFees,
      maintenanceCosts,
      propertyTaxes: 0,
      insurance: 0,
      profitMargin: ownerRevenue ? ((ownerRevenue - totalExpenses) / ownerRevenue) * 100 : 0,
      properties: details,
    };
  });

  const tenantsById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  const propertyById = new Map(activeProperties.map((property) => [property.id, property]));
  const tenantAnalysis: TenantAnalysis[] = contracts
    .filter((contract) => Boolean(contract.tenant_id))
    .map((contract) => {
      const contractPayments = paymentsByContract.get(contract.id) || [];
      const paid = contractPayments
        .filter((payment) => payment.status === 'paid')
        .reduce((sum, payment) => sum + paymentTotal(payment), 0);
      const payable = contractPayments
        .filter((payment) => payment.status !== 'cancelled' && payment.due_date <= today)
        .reduce((sum, payment) => sum + paymentTotal(payment), 0);
      const overduePayments = contractPayments.filter(
        (payment) => payment.status !== 'paid' && payment.status !== 'cancelled' && payment.due_date < today
      );
      const amountDue = overduePayments.reduce((sum, payment) => sum + paymentTotal(payment), 0);
      const daysOverdue = overduePayments.reduce(
        (maximum, payment) => Math.max(maximum, daysBetween(payment.due_date, today)),
        0
      );
      const paidRatio = payable ? clampPercentage((paid / payable) * 100) : 100;
      const paymentHistory: TenantAnalysis['paymentHistory'] =
        daysOverdue > 90 ? 'defaulted' : paidRatio >= 95 ? 'excellent' : paidRatio >= 80 ? 'good' : 'poor';
      const riskLevel: TenantAnalysis['riskLevel'] =
        daysOverdue > 60 || paidRatio < 60 ? 'high' : daysOverdue > 0 || paidRatio < 90 ? 'medium' : 'low';
      const tenantId = contract.tenant_id as string;
      const property = propertyById.get(contract.property_id);

      return {
        tenantId,
        tenantName: customerName(tenantsById.get(tenantId)),
        propertyName: property?.property_name_ar || property?.property_name || 'غير محدد',
        leaseStart: contract.start_date,
        leaseEnd: contract.end_date || '',
        monthlyRent: amount(contract.rental_amount),
        totalPaid: paid,
        amountDue,
        daysOverdue,
        paymentHistory,
        renewalProbability: Math.round(paidRatio),
        riskLevel,
      };
    });

  const typeGroups = new Map<string, Property[]>();
  const locationGroups = new Map<string, Property[]>();
  activeProperties.forEach((property) => {
    const type = property.property_type || 'غير محدد';
    const location = property.address_ar || property.address || 'غير محدد';
    typeGroups.set(type, [...(typeGroups.get(type) || []), property]);
    locationGroups.set(location, [...(locationGroups.get(location) || []), property]);
  });
  const completedMaintenance = maintenance.filter(
    (item) => item.completion_date && item.requested_date
  );
  const totalValue = activeProperties.reduce((sum, property) => sum + amount(property.sale_price), 0);
  const totalExpenses = totalMaintenanceCosts + totalManagementFees;
  const portfolio: PortfolioAnalysis = {
    totalValue,
    totalRevenue,
    totalExpenses,
    netOperatingIncome: totalRevenue - totalExpenses,
    averageCapRate: totalValue ? ((totalRevenue - totalExpenses) / totalValue) * 100 : 0,
    averageOccupancy: occupancyRate,
    propertyTypeDistribution: Array.from(typeGroups.entries()).map(([type, items]) => {
      const reports = items.map((property) => performance.find((item) => item.propertyId === property.id));
      return {
        type,
        count: items.length,
        percentage: activeProperties.length ? (items.length / activeProperties.length) * 100 : 0,
        avgRent: items.length
          ? reports.reduce((sum, report) => sum + (report?.monthlyRent || 0), 0) / items.length
          : 0,
        avgOccupancy: items.length
          ? (reports.filter((report) => report?.status === 'occupied').length / items.length) * 100
          : 0,
      };
    }),
    locationAnalysis: Array.from(locationGroups.entries()).map(([location, items]) => {
      const reports = items.map((property) => performance.find((item) => item.propertyId === property.id));
      return {
        location,
        propertyCount: items.length,
        totalRevenue: reports.reduce((sum, report) => sum + (report?.actualRevenue || 0), 0),
        avgRent: items.length
          ? reports.reduce((sum, report) => sum + (report?.monthlyRent || 0), 0) / items.length
          : 0,
        occupancyRate: items.length
          ? (reports.filter((report) => report?.status === 'occupied').length / items.length) * 100
          : 0,
        marketTrend: 'stable' as const,
      };
    }),
    maintenanceAnalysis: {
      totalCosts: totalMaintenanceCosts,
      averageCostPerUnit: activeProperties.length
        ? totalMaintenanceCosts / activeProperties.length
        : 0,
      maintenanceRequestsCount: maintenance.length,
      averageResponseTime: completedMaintenance.length
        ? completedMaintenance.reduce(
            (sum, item) =>
              sum + daysBetween(item.requested_date, item.completion_date as string),
            0
          ) / completedMaintenance.length
        : 0,
    },
  };

  return {
    financial,
    performance,
    occupancy,
    owners: ownerStatements.filter((statement) => ownersById.has(statement.ownerId)),
    tenants: tenantAnalysis,
    portfolio,
  };
};

const fetchPropertyReportSource = async (companyId: string): Promise<PropertyReportSource> => {
  const [properties, contracts, payments, owners, maintenance] = await Promise.all([
    supabase.from('properties').select('*').eq('company_id', companyId),
    supabase.from('property_contracts').select('*').eq('company_id', companyId),
    supabase.from('property_payments').select('*').eq('company_id', companyId),
    supabase.from('property_owners').select('*').eq('company_id', companyId),
    supabase.from('property_maintenance').select('*').eq('company_id', companyId),
  ]);

  const failed = [properties, contracts, payments, owners, maintenance].find(
    (result) => result.error
  );
  if (failed?.error) throw failed.error;

  const tenantIds = [
    ...new Set((contracts.data || []).map((contract) => contract.tenant_id).filter(Boolean)),
  ] as string[];
  const tenantsResult = tenantIds.length
    ? await supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .in('id', tenantIds)
    : { data: [] as Customer[], error: null };
  if (tenantsResult.error) throw tenantsResult.error;

  return {
    properties: properties.data || [],
    contracts: contracts.data || [],
    payments: payments.data || [],
    owners: owners.data || [],
    maintenance: maintenance.data || [],
    tenants: tenantsResult.data || [],
  };
};

export const usePropertyReports = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['property-reports-summary']),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      return calculatePropertyReports(await fetchPropertyReportSource(companyId));
    },
    enabled: Boolean(companyId),
    staleTime: 5 * 60 * 1000,
  });
};

export const usePropertyFinancialReport = (startDate?: string, endDate?: string) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['property-financial-report', startDate, endDate]),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      let query = supabase
        .from('property_payments')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'paid');
      if (startDate) query = query.gte('payment_date', startDate);
      if (endDate) query = query.lte('payment_date', endDate);
      const { data, error } = await query;
      if (error) throw error;
      const rows = data || [];
      const totalRevenue = rows.reduce((sum, payment) => sum + paymentTotal(payment), 0);
      return {
        totalRevenue,
        avgRent: rows.length ? totalRevenue / rows.length : 0,
        paymentsCount: rows.length,
        data: rows,
      };
    },
    enabled: Boolean(companyId),
  });
};

export const usePropertyOccupancyReport = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['property-occupancy-report']),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      const [propertiesResult, contractsResult] = await Promise.all([
        supabase.from('properties').select('*').eq('company_id', companyId),
        supabase.from('property_contracts').select('*').eq('company_id', companyId),
      ]);
      if (propertiesResult.error) throw propertiesResult.error;
      if (contractsResult.error) throw contractsResult.error;
      const properties = (propertiesResult.data || []).filter(
        (property) => property.is_active !== false
      );
      const occupiedIds = new Set(
        (contractsResult.data || []).filter(isActiveContract).map((contract) => contract.property_id)
      );
      return {
        totalProperties: properties.length,
        occupiedProperties: occupiedIds.size,
        vacantProperties: Math.max(0, properties.length - occupiedIds.size),
        occupancyRate: properties.length ? (occupiedIds.size / properties.length) * 100 : 0,
        properties,
        contracts: contractsResult.data || [],
      };
    },
    enabled: Boolean(companyId),
  });
};

export const usePropertyPortfolioReport = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['property-portfolio-report']),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      const report = calculatePropertyReports(await fetchPropertyReportSource(companyId));
      return {
        ...report.portfolio,
        propertyCount: report.financial.totalProperties,
        activeContracts: report.financial.occupiedProperties,
        occupancyRate: report.financial.occupancyRate,
        typeDistribution: Object.fromEntries(
          report.portfolio.propertyTypeDistribution.map((item) => [
            item.type,
            { count: item.count, totalRevenue: 0 },
          ])
        ),
        properties: report.performance,
      };
    },
    enabled: Boolean(companyId),
  });
};
