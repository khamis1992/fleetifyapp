import { supabase } from "@/integrations/supabase/client";

/**
 * Report Data Service
 *
 * This service handles all data fetching operations for reports.
 * Extracted from useReportExport hook for better separation of concerns.
 */

interface DamagePoint {
  x: number;
  y: number;
  severity: 'minor' | 'moderate' | 'severe';
  description?: string;
}

export interface ReportDataOptions {
  moduleType: string;
  filters: Record<string, unknown>;
  conditionReportId?: string;
  damagePoints?: DamagePoint[];
}

export interface ReportDataResult {
  data?: Record<string, unknown>[];
  summary?: Record<string, number | string>;
  conditionReport?: Record<string, unknown>;
  damagePoints?: DamagePoint[];
}

/**
 * Main function to fetch report data based on module type
 */
export const fetchReportData = async (
  options: ReportDataOptions,
  companyId: string
): Promise<ReportDataResult> => {
  try {
    // Fetch data based on module type
    switch (options.moduleType) {
      case 'hr':
        return await fetchHRData(options, companyId);
      case 'fleet':
        return await fetchFleetData(options, companyId);
      case 'customers':
        return await fetchCustomersData(options, companyId);
      case 'legal':
        return await fetchLegalData(options, companyId);
      case 'finance':
        return await fetchFinanceData(options, companyId);
      case 'damage_report':
        return await fetchDamageReportData(options, companyId);
      default:
        return { data: [], summary: {} };
    }
  } catch (error) {
    console.error('Error fetching report data:', error);
    return { data: [], summary: {} };
  }
};

/**
 * Fetch HR/Employee data for reports
 */
export const fetchHRData = async (
  options: ReportDataOptions,
  companyId: string
): Promise<ReportDataResult> => {
  let query = supabase.from('employees').select('*').eq('company_id', companyId);

  if (options.filters?.startDate) {
    query = query.gte('created_at', options.filters.startDate as string);
  }
  if (options.filters?.endDate) {
    query = query.lte('created_at', options.filters.endDate as string);
  }

  const { data: employees } = await query;

  return {
    data: employees || [],
    summary: {
      totalEmployees: employees?.length || 0,
      activeEmployees: employees?.filter((emp: Record<string, unknown>) => emp.account_status === 'active').length || 0,
      departments: [...new Set(employees?.map((emp: Record<string, unknown>) => emp.department))].length || 0
    }
  };
};

/**
 * Fetch Fleet/Vehicle data for reports
 */
export const fetchFleetData = async (
  options: ReportDataOptions,
  companyId: string
): Promise<ReportDataResult> => {
  let query = supabase.from('vehicles').select('*').eq('company_id', companyId);

  if (options.filters?.startDate) {
    query = query.gte('created_at', options.filters.startDate as string);
  }
  if (options.filters?.endDate) {
    query = query.lte('created_at', options.filters.endDate as string);
  }

  const { data: vehicles } = await query;

  return {
    data: vehicles || [],
    summary: {
      totalVehicles: vehicles?.length || 0,
      availableVehicles: vehicles?.filter((v: Record<string, unknown>) => v.status === 'available').length || 0,
      rentedVehicles: vehicles?.filter((v: Record<string, unknown>) => v.status === 'rented').length || 0
    }
  };
};

/**
 * Fetch Customer data for reports
 */
export const fetchCustomersData = async (
  options: ReportDataOptions,
  companyId: string
): Promise<ReportDataResult> => {
  let query = supabase.from('customers').select('*').eq('company_id', companyId);

  if (options.filters?.startDate) {
    query = query.gte('created_at', options.filters.startDate as string);
  }
  if (options.filters?.endDate) {
    query = query.lte('created_at', options.filters.endDate as string);
  }

  const { data: customers } = await query;

  return {
    data: customers || [],
    summary: {
      totalCustomers: customers?.length || 0,
      activeCustomers: customers?.filter((c: Record<string, unknown>) => c.is_active === true).length || 0
    }
  };
};

/**
 * Fetch Legal Cases data for reports
 */
export const fetchLegalData = async (
  options: ReportDataOptions,
  companyId: string
): Promise<ReportDataResult> => {
  let query = supabase.from('legal_cases').select('*').eq('company_id', companyId);

  if (options.filters?.startDate) {
    query = query.gte('created_at', options.filters.startDate as string);
  }
  if (options.filters?.endDate) {
    query = query.lte('created_at', options.filters.endDate as string);
  }

  const { data: cases } = await query;

  return {
    data: cases || [],
    summary: {
      totalCases: cases?.length || 0,
      activeCases: cases?.filter((c: Record<string, unknown>) => c.case_status === 'active').length || 0,
      closedCases: cases?.filter((c: Record<string, unknown>) => c.case_status === 'closed').length || 0
    }
  };
};

/**
 * Fetch Finance/Invoice data for reports
 */
export const fetchFinanceData = async (
  options: ReportDataOptions,
  companyId: string
): Promise<ReportDataResult> => {
  let query = supabase.from('invoices').select('*').eq('company_id', companyId);

  if (options.filters?.startDate) {
    query = query.gte('created_at', options.filters.startDate as string);
  }
  if (options.filters?.endDate) {
    query = query.lte('created_at', options.filters.endDate as string);
  }

  const { data: invoices } = await query;

  return {
    data: invoices || [],
    summary: {
      totalInvoices: invoices?.length || 0,
      totalAmount: invoices?.reduce((sum: number, inv: Record<string, unknown>) => sum + ((inv.total_amount as number) || 0), 0) || 0,
      paidInvoices: invoices?.filter((inv: Record<string, unknown>) => inv.status === 'paid').length || 0
    }
  };
};

/**
 * Fetch Damage Report data for vehicle condition reports
 */
export const fetchDamageReportData = async (
  options: ReportDataOptions,
  companyId: string
): Promise<ReportDataResult> => {
  if (options.conditionReportId) {
    // Fetch specific condition report
    const { data: conditionReport } = await supabase
      .from('vehicle_condition_reports')
      .select(`
        *,
        vehicles (plate_number, make, model, year),
        profiles:inspector_id (full_name)
      `)
      .eq('id', options.conditionReportId)
      .eq('company_id', companyId)
      .single();

    if (conditionReport) {
      return {
        conditionReport,
        damagePoints: options.damagePoints || [],
        summary: {
          totalDamagePoints: options.damagePoints?.length || 0,
          severeDamages: options.damagePoints?.filter(p => p.severity === 'severe').length || 0,
          moderateDamages: options.damagePoints?.filter(p => p.severity === 'moderate').length || 0,
          minorDamages: options.damagePoints?.filter(p => p.severity === 'minor').length || 0
        }
      };
    }
  }
  return { conditionReport: undefined, damagePoints: [], summary: {} };
};
