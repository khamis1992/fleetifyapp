import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useUnifiedCompanyAccess";

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  moduleType?: string;
  companyId?: string;
}

export const useModuleReportData = (reportId: string, moduleType: string, filters: ReportFilters) => {
  const companyId = useCurrentCompanyId();

  return useQuery({
    queryKey: ['moduleReportData', reportId, moduleType, filters, companyId],
    queryFn: async () => {
      switch (moduleType) {
        case 'hr':
          return await fetchHRReportData(reportId, filters, companyId);
        case 'fleet':
          return await fetchFleetReportData(reportId, filters, companyId);
        case 'customers':
          return await fetchCustomersReportData(reportId, filters, companyId);
        case 'legal':
          return await fetchLegalReportData(reportId, filters, companyId);
        case 'finance':
          return await fetchFinanceReportData(reportId, filters, companyId);
        default:
          return { data: [], summary: {} };
      }
    },
    enabled: !!reportId && !!moduleType
  });
};

const fetchHRReportData = async (reportId: string, filters: ReportFilters, companyId: string) => {
  let query = supabase.from('employees').select('*').eq('company_id', companyId);
  
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data: employees, error } = await query;

  if (error) throw error;

  switch (reportId) {
    case 'employees_summary':
      return {
        data: employees || [],
        summary: {
          totalEmployees: employees?.length || 0,
          activeEmployees: employees?.filter(emp => emp.account_status === 'active').length || 0,
          departments: [...new Set(employees?.map(emp => emp.department))].length || 0
        }
      };
    case 'payroll_summary':
      // Fetch payroll data
      const { data: payroll } = await supabase
        .from('payroll')
        .select('*')
        .eq('company_id', companyId);
      
      return {
        data: payroll || [],
        summary: {
          totalPayroll: payroll?.reduce((sum, p) => sum + ((p.basic_salary || 0) + (p.allowances || 0) - (p.deductions || 0)), 0) || 0,
          employeesPaid: payroll?.length || 0
        }
      };
    default:
      return { data: employees || [], summary: {} };
  }
};

const fetchFleetReportData = async (reportId: string, filters: ReportFilters, companyId: string) => {
  let query = supabase.from('vehicles').select('*').eq('company_id', companyId);
  
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data: vehicles, error } = await query;

  if (error) throw error;

  switch (reportId) {
    case 'vehicles_summary':
      return {
        data: vehicles || [],
        summary: {
          totalVehicles: vehicles?.length || 0,
          availableVehicles: vehicles?.filter(v => v.status === 'available').length || 0,
          rentedVehicles: vehicles?.filter(v => v.status === 'rented').length || 0
        }
      };
    case 'maintenance_summary':
      // Simplify to just return vehicle data for now
      return {
        data: vehicles || [],
        summary: {
          totalVehicles: vehicles?.length || 0,
          maintenanceVehicles: vehicles?.filter(v => v.status === 'maintenance').length || 0
        }
      };
    default:
      return { data: vehicles || [], summary: {} };
  }
};

const fetchCustomersReportData = async (reportId: string, filters: ReportFilters, companyId: string) => {
  let query = supabase.from('customers').select('*').eq('company_id', companyId);
  
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data: customers, error } = await query;

  if (error) throw error;

  switch (reportId) {
    case 'customers_summary':
      return {
        data: customers || [],
        summary: {
          totalCustomers: customers?.length || 0,
          activeCustomers: customers?.filter(c => c.is_active === true).length || 0,
          newCustomers: customers?.filter(c => {
            const createdDate = new Date(c.created_at);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return createdDate > thirtyDaysAgo;
          }).length || 0
        }
      };
    default:
      return { data: customers || [], summary: {} };
  }
};

const fetchLegalReportData = async (reportId: string, filters: ReportFilters, companyId: string) => {
  let query = supabase.from('legal_cases').select('*').eq('company_id', companyId);
  
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data: cases, error } = await query;

  if (error) throw error;

  switch (reportId) {
    case 'cases_summary':
      return {
        data: cases || [],
        summary: {
          totalCases: cases?.length || 0,
          activeCases: cases?.filter(c => c.case_status === 'active').length || 0,
          closedCases: cases?.filter(c => c.case_status === 'closed').length || 0
        }
      };
    default:
      return { data: cases || [], summary: {} };
  }
};

const fetchFinanceReportData = async (reportId: string, filters: ReportFilters, companyId: string) => {
  switch (reportId) {
    case 'invoices_summary':
      let invoiceQuery = supabase.from('invoices').select('*').eq('company_id', companyId);
      
      if (filters.startDate) {
        invoiceQuery = invoiceQuery.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        invoiceQuery = invoiceQuery.lte('created_at', filters.endDate);
      }

      const { data: invoices, error } = await invoiceQuery;
      if (error) throw error;

      return {
        data: invoices || [],
        summary: {
          totalInvoices: invoices?.length || 0,
          totalAmount: invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
          paidInvoices: invoices?.filter(inv => inv.status === 'paid').length || 0
        }
      };
    
    case 'payments_summary':
      let paymentQuery = supabase.from('payments').select('*').eq('company_id', companyId);
      
      if (filters.startDate) {
        paymentQuery = paymentQuery.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        paymentQuery = paymentQuery.lte('created_at', filters.endDate);
      }

      const { data: payments, error: paymentError } = await paymentQuery;
      if (paymentError) throw paymentError;

      return {
        data: payments || [],
        summary: {
          totalPayments: payments?.length || 0,
          totalAmount: payments?.reduce((sum, pay) => sum + (pay.amount || 0), 0) || 0
        }
      };
    
    default:
      return { data: [], summary: {} };
  }
};