import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyFilter } from "@/hooks/useCompanyScope";
import {
  calculateRiskScore,
  calculatePenalty,
  calculateMonthsUnpaid,
  getRecommendedAction,
  getRiskLevel,
  type RecommendedAction,
} from "@/utils/delinquency-calculations";
import { toast } from "sonner";

export interface DelinquentCustomer {
  // Customer Info
  customer_id: string;
  customer_name: string;
  customer_code: string;
  customer_type: 'individual' | 'corporate';
  phone: string | null;
  email: string | null;
  credit_limit: number;
  is_blacklisted: boolean;

  // Contract Info
  contract_id: string;
  contract_number: string;
  contract_start_date: string;
  monthly_rent: number;
  vehicle_id: string | null;
  vehicle_plate: string | null;

  // Payment Status
  months_unpaid: number;
  overdue_amount: number;
  last_payment_date: string | null;
  last_payment_amount: number;
  actual_payments_count: number;
  expected_payments_count: number;

  // Penalties
  days_overdue: number;
  late_penalty: number;

  // Traffic Violations
  violations_count: number;
  violations_amount: number;

  // Total Debt
  total_debt: number;

  // Risk Assessment
  risk_score: number;
  risk_level: string;
  risk_level_en: string;
  risk_color: string;
  recommended_action: RecommendedAction;

  // Legal History
  has_previous_legal_cases: boolean;
  previous_legal_cases_count: number;

  // Metadata (from table)
  id?: string;
  last_updated_at?: string;
  first_detected_at?: string;
  is_active?: boolean;
}

interface UseDelinquentCustomersFilters {
  riskLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MONITOR';
  overduePeriod?: '<30' | '30-60' | '60-90' | '>90';
  hasViolations?: boolean;
  search?: string;
  useCachedData?: boolean; // Default: true, use cached table data
}

/**
 * Hook to fetch delinquent customers from cached table (updated daily by cron job)
 * Falls back to dynamic calculation if table doesn't exist or useCachedData is false
 */
export const useDelinquentCustomers = (filters?: UseDelinquentCustomersFilters) => {
  const { user } = useAuth();
  const companyFilter = useCompanyFilter();
  const useCached = filters?.useCachedData !== false; // Default to true

  return useQuery({
    queryKey: ['delinquent-customers', companyFilter, filters, useCached],
    queryFn: async (): Promise<DelinquentCustomer[]> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get company_id from companyFilter or profile
      let companyId: string | undefined;
      
      if (companyFilter?.company_id) {
        companyId = companyFilter.company_id;
      } else {
        // Fallback: Get user's profile to access company_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (!profile?.company_id) throw new Error('Company not found');
        companyId = profile.company_id;
      }

      if (!companyId) throw new Error('Company not found');

      // Try to fetch from cached table first if enabled
      if (useCached) {
        try {
          let query = supabase
            .from('delinquent_customers')
            .select('*')
            .eq('company_id', companyId)
            .eq('is_active', true)
            .order('risk_score', { ascending: false });

          // Apply filters
          if (filters?.riskLevel) {
            query = query.eq('risk_level', filters.riskLevel);
          }

          if (filters?.overduePeriod) {
            switch (filters.overduePeriod) {
              case '<30':
                query = query.lt('days_overdue', 30);
                break;
              case '30-60':
                query = query.gte('days_overdue', 30).lt('days_overdue', 60);
                break;
              case '60-90':
                query = query.gte('days_overdue', 60).lt('days_overdue', 90);
                break;
              case '>90':
                query = query.gte('days_overdue', 90);
                break;
            }
          }

          if (filters?.hasViolations !== undefined) {
            if (filters.hasViolations) {
              query = query.gt('violations_count', 0);
            } else {
              query = query.eq('violations_count', 0);
            }
          }

          const { data: cachedData, error: cachedError } = await query;

          // If cached data exists and no error, use it
          if (!cachedError && cachedData && cachedData.length > 0) {
            // Apply search filter if provided
            let filteredData = cachedData;
            if (filters?.search) {
              const searchLower = filters.search.toLowerCase();
              filteredData = cachedData.filter((c: any) =>
                c.customer_name?.toLowerCase().includes(searchLower) ||
                c.customer_code?.toLowerCase().includes(searchLower) ||
                c.contract_number?.toLowerCase().includes(searchLower) ||
                (c.vehicle_plate && c.vehicle_plate.toLowerCase().includes(searchLower))
              );
            }

            // Convert to DelinquentCustomer format
            return filteredData.map((row: any) => ({
              customer_id: row.customer_id,
              customer_name: row.customer_name,
              customer_code: row.customer_code || '',
              customer_type: row.customer_type || 'individual',
              phone: row.phone,
              email: row.email,
              credit_limit: row.credit_limit || 0,
              is_blacklisted: row.is_blacklisted || false,
              contract_id: row.contract_id,
              contract_number: row.contract_number,
              contract_start_date: row.contract_start_date,
              monthly_rent: row.monthly_rent || 0,
              vehicle_id: row.vehicle_id,
              vehicle_plate: row.vehicle_plate,
              months_unpaid: row.months_unpaid || 0,
              overdue_amount: row.overdue_amount || 0,
              last_payment_date: row.last_payment_date,
              last_payment_amount: row.last_payment_amount || 0,
              actual_payments_count: row.actual_payments_count || 0,
              expected_payments_count: row.expected_payments_count || 0,
              days_overdue: row.days_overdue || 0,
              late_penalty: row.late_penalty || 0,
              violations_count: row.violations_count || 0,
              violations_amount: row.violations_amount || 0,
              total_debt: row.total_debt || 0,
              risk_score: row.risk_score || 0,
              risk_level: row.risk_level || 'MONITOR',
              risk_level_en: row.risk_level_en || 'Monitor',
              risk_color: row.risk_color || 'green',
              recommended_action: getRecommendedAction(row.days_overdue || 0, row.risk_score || 0),
              has_previous_legal_cases: row.has_previous_legal_cases || false,
              previous_legal_cases_count: row.previous_legal_cases_count || 0,
              id: row.id,
              last_updated_at: row.last_updated_at,
              first_detected_at: row.first_detected_at,
              is_active: row.is_active,
            }));
          }

          // If table exists but empty, fall back to dynamic calculation
          console.warn('Delinquent customers table is empty, falling back to dynamic calculation');
        } catch (error) {
          console.warn('Error fetching from cached table, falling back to dynamic calculation:', error);
          // Fall through to dynamic calculation
        }
      }

      // Fallback: Dynamic calculation (original logic)
      return calculateDelinquentCustomersDynamically(companyId, filters);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes - data is updated daily by cron
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Dynamic calculation fallback (original implementation)
 */
async function calculateDelinquentCustomersDynamically(
  companyId: string,
  filters?: UseDelinquentCustomersFilters
): Promise<DelinquentCustomer[]> {
  // Step 1: Get all active contracts with customer and vehicle info
  let contractsQuery = supabase
    .from('contracts')
    .select(`
      id,
      contract_number,
      start_date,
      monthly_rent,
      vehicle_id,
      customer_id,
      customers!inner(
        id,
        customer_code,
        first_name,
        last_name,
        company_name,
        customer_type,
        phone,
        email,
        credit_limit,
        is_blacklisted
      ),
      vehicles(
        id,
        plate_number
      )
    `)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('start_date', { ascending: true });

  const { data: contracts, error: contractsError } = await contractsQuery;

  if (contractsError) {
    console.error('Error fetching contracts:', contractsError);
    if (contractsError.code === 'PGRST116' || contractsError.message?.includes('relation') || contractsError.message?.includes('does not exist')) {
      console.warn('Database relation not found, returning empty array');
      return [];
    }
    throw contractsError;
  }
  
  if (!contracts || contracts.length === 0) return [];

  // Step 2: Get all payments for these contracts
  const customerIds = contracts.map(c => c.customer_id).filter(Boolean);
  
  if (customerIds.length === 0) return [];

  let payments: any[] = [];
  let violations: any[] = [];
  let legalCases: any[] = [];

  // Get payments (handle errors gracefully)
  try {
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('customer_id, amount, payment_date, payment_status')
      .eq('company_id', companyId)
      .in('customer_id', customerIds)
      .in('payment_status', ['completed', 'paid', 'approved'])
      .order('payment_date', { ascending: false });
    
    if (!paymentsError && paymentsData) {
      payments = paymentsData;
    }
  } catch (error) {
    console.warn('Error fetching payments:', error);
  }

  // Step 3: Get traffic violations for these customers (handle errors gracefully)
  try {
    const { data: violationsData, error: violationsError } = await supabase
      .from('traffic_violations')
      .select('customer_id, fine_amount, status')
      .eq('company_id', companyId)
      .in('customer_id', customerIds)
      .neq('status', 'paid');
    
    if (!violationsError && violationsData) {
      violations = violationsData;
    }
  } catch (error) {
    console.warn('Error fetching violations:', error);
  }

  // Step 4: Get legal cases history for these customers (handle errors gracefully)
  try {
    const { data: legalCasesData, error: legalCasesError } = await supabase
      .from('legal_cases')
      .select('client_id, case_status')
      .eq('company_id', companyId)
      .in('client_id', customerIds);
    
    if (!legalCasesError && legalCasesData) {
      legalCases = legalCasesData;
    }
  } catch (error) {
    console.warn('Error fetching legal cases:', error);
  }

  // Step 5: Process each contract to identify delinquent customers
  const today = new Date();
  const delinquentCustomers: DelinquentCustomer[] = [];

  for (const contract of contracts) {
    try {
      const customer = contract.customers;
      if (!customer || !contract.customer_id) continue;

      // Validate contract data
      if (!contract.start_date) continue;

      // Calculate expected payments
      const contractStartDate = new Date(contract.start_date);
      if (isNaN(contractStartDate.getTime())) continue; // Invalid date
      
      const monthsSinceStart = Math.floor(
        (today.getTime() - contractStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      const expectedPayments = Math.max(0, monthsSinceStart);

      // Get actual payments for this customer
      const customerPayments = (payments || []).filter(p => p && p.customer_id === contract.customer_id);
      const actualPayments = customerPayments.length;

      // Calculate months unpaid
      const monthsUnpaid = expectedPayments - actualPayments;

      // Skip if customer is not delinquent (paid all expected months)
      if (monthsUnpaid <= 0) continue;

      // Calculate overdue amount
      const overdueAmount = monthsUnpaid * (contract.monthly_rent || 0);

      // Calculate days overdue (from last expected payment date)
      const lastExpectedPaymentDate = new Date(today);
      lastExpectedPaymentDate.setDate(5); // Assume payments due on 5th of each month
      if (today.getDate() < 5) {
        lastExpectedPaymentDate.setMonth(lastExpectedPaymentDate.getMonth() - 1);
      }
      const daysOverdue = Math.floor((today.getTime() - lastExpectedPaymentDate.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate penalty
      const latePenalty = calculatePenalty(overdueAmount, daysOverdue);

      // Get violations for this customer
      const customerViolations = (violations || []).filter(v => v && v.customer_id === contract.customer_id);
      const violationsCount = customerViolations.length;
      const violationsAmount = customerViolations.reduce((sum, v) => sum + (v?.fine_amount || 0), 0);

      // Get legal history
      const customerLegalCases = (legalCases || []).filter(lc => lc && lc.client_id === contract.customer_id);
      const hasPreviousLegalCases = customerLegalCases.length > 0;
      const previousLegalCasesCount = customerLegalCases.length;

      // Calculate risk score
      const riskScore = calculateRiskScore({
        daysOverdue,
        overdueAmount,
        creditLimit: customer.credit_limit || 0,
        violationsCount,
        missedPayments: monthsUnpaid,
        totalExpectedPayments: expectedPayments,
        hasPreviousLegalCases,
      });

      // Get risk level
      const riskLevel = getRiskLevel(riskScore);

      // Get recommended action
      const recommendedAction = getRecommendedAction(daysOverdue, riskScore);

      // Calculate total debt
      const totalDebt = overdueAmount + latePenalty + violationsAmount;

      // Get last payment info
      const lastPayment = customerPayments[0];

      // Build delinquent customer object
      const delinquentCustomer: DelinquentCustomer = {
        customer_id: contract.customer_id,
        customer_name: customer.customer_type === 'individual'
          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
          : customer.company_name || '',
        customer_code: customer.customer_code || '',
        customer_type: customer.customer_type || 'individual',
        phone: customer.phone,
        email: customer.email,
        credit_limit: customer.credit_limit || 0,
        is_blacklisted: customer.is_blacklisted || false,

        contract_id: contract.id,
        contract_number: contract.contract_number || '',
        contract_start_date: contract.start_date,
        monthly_rent: contract.monthly_rent || 0,
        vehicle_id: contract.vehicle_id,
        vehicle_plate: contract.vehicles?.plate_number || null,

        months_unpaid: monthsUnpaid,
        overdue_amount: overdueAmount,
        last_payment_date: lastPayment?.payment_date || null,
        last_payment_amount: lastPayment?.amount || 0,
        actual_payments_count: actualPayments,
        expected_payments_count: expectedPayments,

        days_overdue: Math.max(0, daysOverdue),
        late_penalty: latePenalty,

        violations_count: violationsCount,
        violations_amount: violationsAmount,

        total_debt: totalDebt,

        risk_score: riskScore,
        risk_level: riskLevel.label,
        risk_level_en: riskLevel.labelEn,
        risk_color: riskLevel.color,
        recommended_action: recommendedAction,

        has_previous_legal_cases: hasPreviousLegalCases,
        previous_legal_cases_count: previousLegalCasesCount,
      };

      delinquentCustomers.push(delinquentCustomer);
    } catch (error) {
      console.warn(`Error processing contract ${contract.id}:`, error);
      continue;
    }
  }

  // Apply filters
  let filteredCustomers = delinquentCustomers;

  if (filters?.riskLevel) {
    filteredCustomers = filteredCustomers.filter(c => 
      c.risk_level_en.toUpperCase() === filters.riskLevel
    );
  }

  if (filters?.overduePeriod) {
    filteredCustomers = filteredCustomers.filter(c => {
      const days = c.days_overdue;
      switch (filters.overduePeriod) {
        case '<30': return days < 30;
        case '30-60': return days >= 30 && days < 60;
        case '60-90': return days >= 60 && days < 90;
        case '>90': return days >= 90;
        default: return true;
      }
    });
  }

  if (filters?.hasViolations !== undefined) {
    filteredCustomers = filteredCustomers.filter(c =>
      filters.hasViolations ? c.violations_count > 0 : c.violations_count === 0
    );
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    filteredCustomers = filteredCustomers.filter(c =>
      c.customer_name.toLowerCase().includes(searchLower) ||
      c.customer_code.toLowerCase().includes(searchLower) ||
      c.contract_number.toLowerCase().includes(searchLower) ||
      (c.vehicle_plate && c.vehicle_plate.toLowerCase().includes(searchLower))
    );
  }

  // Sort by risk score (highest first)
  filteredCustomers.sort((a, b) => b.risk_score - a.risk_score);

  return filteredCustomers;
}

/**
 * Hook to manually refresh delinquent customers table
 */
export const useRefreshDelinquentCustomers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyFilter = useCompanyFilter();

  return useMutation({
    mutationFn: async (companyId?: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      let targetCompanyId = companyId;
      
      if (!targetCompanyId) {
        if (companyFilter?.company_id) {
          targetCompanyId = companyFilter.company_id;
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('user_id', user.id)
            .single();

          if (!profile?.company_id) throw new Error('Company not found');
          targetCompanyId = profile.company_id;
        }
      }

      // Call the update function
      const { data, error } = await supabase.rpc('update_delinquent_customers', {
        p_company_id: targetCompanyId || null
      });

      if (error) throw error;

      return data;
    },
    onSuccess: (result) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['delinquent-customers'] });
      
      const processed = result?.[0]?.processed_count || 0;
      const added = result?.[0]?.added_count || 0;
      const updated = result?.[0]?.updated_count || 0;
      const removed = result?.[0]?.removed_count || 0;

      toast.success(
        `تم تحديث قائمة العملاء المتخلفين: ${processed} معالج، ${added} جديد، ${updated} محدث، ${removed} محذوف`
      );
    },
    onError: (error: unknown) => {
      console.error('Error refreshing delinquent customers:', error);
      toast.error('حدث خطأ أثناء تحديث قائمة العملاء المتخلفين');
    },
  });
};
