import { useQuery } from "@tanstack/react-query";
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
}

interface UseDelinquentCustomersFilters {
  riskLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MONITOR';
  overduePeriod?: '<30' | '30-60' | '60-90' | '>90';
  hasViolations?: boolean;
  search?: string;
}

export const useDelinquentCustomers = (filters?: UseDelinquentCustomersFilters) => {
  const { user } = useAuth();
  const companyFilter = useCompanyFilter();

  return useQuery({
    queryKey: ['delinquent-customers', companyFilter, filters],
    queryFn: async (): Promise<DelinquentCustomer[]> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get user's profile to access company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

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
        .eq('company_id', profile.company_id)
        .eq('status', 'active')
        .order('start_date', { ascending: true });

      const { data: contracts, error: contractsError } = await contractsQuery;

      if (contractsError) throw contractsError;
      if (!contracts || contracts.length === 0) return [];

      // Step 2: Get all payments for these contracts
      const customerIds = contracts.map(c => c.customer_id);

      const { data: payments } = await supabase
        .from('payments')
        .select('customer_id, amount, payment_date, payment_status')
        .eq('company_id', profile.company_id)
        .in('customer_id', customerIds)
        .in('payment_status', ['completed', 'paid', 'approved'])
        .order('payment_date', { ascending: false });

      // Step 3: Get traffic violations for these customers
      const { data: violations } = await supabase
        .from('traffic_violations')
        .select('customer_id, fine_amount, status')
        .eq('company_id', profile.company_id)
        .in('customer_id', customerIds)
        .neq('status', 'paid');

      // Step 4: Get legal cases history for these customers
      const { data: legalCases } = await supabase
        .from('legal_cases')
        .select('client_id, case_status')
        .eq('company_id', profile.company_id)
        .in('client_id', customerIds);

      // Step 5: Process each contract to identify delinquent customers
      const today = new Date();
      const delinquentCustomers: DelinquentCustomer[] = [];

      for (const contract of contracts) {
        const customer = contract.customers;
        if (!customer) continue;

        // Calculate expected payments
        const contractStartDate = new Date(contract.start_date);
        const monthsSinceStart = Math.floor(
          (today.getTime() - contractStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        const expectedPayments = Math.max(0, monthsSinceStart);

        // Get actual payments for this customer
        const customerPayments = payments?.filter(p => p.customer_id === contract.customer_id) || [];
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
        const customerViolations = violations?.filter(v => v.customer_id === contract.customer_id) || [];
        const violationsCount = customerViolations.length;
        const violationsAmount = customerViolations.reduce((sum, v) => sum + (v.fine_amount || 0), 0);

        // Get legal history
        const customerLegalCases = legalCases?.filter(lc => lc.client_id === contract.customer_id) || [];
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
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
};
