/**
 * Payments Summary Hook
 * Provides unified payment metrics and overdue payments data for the payments dashboard
 *
 * Metrics calculated:
 * - total_outstanding: Sum of (total_amount - paid_amount) for all active/pending contracts
 * - overdue_amount: Sum of remaining amounts where end_date < now
 * - overdue_count: Count of overdue contracts
 * - due_this_week: Sum of amounts due in next 7 days
 * - paid_this_month: Sum of payments.amount for current month
 * - overdue_payments: Array of overdue payment objects with contract details
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { differenceInDays, addDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

export interface OverduePayment {
  id: string;
  contract_number: string;
  customer_name: string;
  amount: number;
  due_date: string;
  days_overdue: number;
}

export interface PaymentsSummary {
  total_outstanding: number;
  overdue_amount: number;
  overdue_count: number;
  due_this_week: number;
  paid_this_month: number;
  overdue_payments: OverduePayment[];
}

export function usePaymentsSummary() {
  const { companyId, isAuthenticating, authError } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ["payments-summary", companyId],
    queryFn: async (): Promise<PaymentsSummary> => {
      if (!companyId) {
        throw new Error("معرف الشركة مطلوب");
      }

      // Get all active/pending contracts with payment info
      const { data: contracts, error: contractsError } = await supabase
        .from("contracts")
        .select(
          `
          id,
          contract_number,
          customer_id,
          contract_amount,
          total_paid,
          end_date,
          customers(
            id,
            first_name_ar,
            last_name_ar,
            company_name_ar,
            customer_type
          )
        `
        )
        .eq("company_id", companyId)
        .in("status", ["active", "pending"]);

      if (contractsError) {
        console.error("❌ Error fetching contracts for payments summary:", contractsError);
        throw contractsError;
      }

      const now = new Date();
      const oneWeekFromNow = addDays(now, 7);

      let total_outstanding = 0;
      let overdue_amount = 0;
      let overdue_count = 0;
      let due_this_week = 0;
      const overdue_payments: OverduePayment[] = [];

      // Calculate metrics from contracts
      for (const contract of contracts || []) {
        const totalAmount = contract.contract_amount || 0;
        const paidAmount = contract.total_paid || 0;
        const remaining = totalAmount - paidAmount;

        // Add to total outstanding
        total_outstanding += remaining;

        const endDate = new Date(contract.end_date);
        const daysOverdue = differenceInDays(now, endDate);

        // Check if overdue
        if (daysOverdue > 0 && remaining > 0) {
          overdue_amount += remaining;
          overdue_count++;

          // Get customer name
          const customer = contract.customers as any;
          let customerName = "غير محدد";
          if (customer) {
            if (customer.customer_type === "company") {
              customerName = customer.company_name_ar || "شركة غير محددة";
            } else {
              const firstName = customer.first_name_ar || "";
              const lastName = customer.last_name_ar || "";
              customerName = `${firstName} ${lastName}`.trim() || "عميل غير محدد";
            }
          }

          overdue_payments.push({
            id: contract.id,
            contract_number: contract.contract_number,
            customer_name: customerName,
            amount: remaining,
            due_date: contract.end_date,
            days_overdue: daysOverdue,
          });
        }

        // Check if due this week
        if (isWithinInterval(endDate, { start: now, end: oneWeekFromNow }) && remaining > 0) {
          due_this_week += remaining;
        }
      }

      // Get paid this month from payments table
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount")
        .eq("company_id", companyId)
        .gte("payment_date", monthStart.toISOString())
        .lte("payment_date", monthEnd.toISOString());

      if (paymentsError) {
        console.error("❌ Error fetching payments for summary:", paymentsError);
        // Don't throw, just set to 0
      }

      const paid_this_month = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // Sort overdue payments by days overdue (descending)
      overdue_payments.sort((a, b) => b.days_overdue - a.days_overdue);

      return {
        total_outstanding,
        overdue_amount,
        overdue_count,
        due_this_week,
        paid_this_month,
        overdue_payments,
      };
    },
    enabled: !!companyId && !isAuthenticating && !authError,
    refetchInterval: 60000, // Auto-refresh every 60 seconds
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}
