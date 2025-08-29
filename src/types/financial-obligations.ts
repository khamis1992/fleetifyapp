// Types for the enhanced financial tracking system

export interface FinancialObligation {
  id: string;
  company_id: string;
  customer_id: string;
  contract_id?: string | null;
  obligation_type: 'contract_payment' | 'late_fee' | 'penalty' | 'adjustment';
  obligation_number: string;
  due_date: string;
  original_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  priority: 1 | 2 | 3; // 1=high, 2=medium, 3=low
  description?: string | null;
  description_ar?: string | null;
  installment_number?: number | null;
  late_fee_amount: number;
  discount_amount: number;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  due_notification_sent: boolean;
  overdue_notification_sent: boolean;
  last_reminder_date?: string | null;
}

export interface CustomerFinancialBalance {
  id: string;
  company_id: string;
  customer_id: string;
  contract_id?: string | null; // NULL للرصيد الإجمالي
  total_obligations: number;
  total_paid: number;
  remaining_balance: number;
  overdue_amount: number;
  current_amount: number; // المستحق حالياً
  future_amount: number; // المستحق مستقبلاً
  last_payment_date?: string | null;
  last_payment_amount: number;
  credit_limit: number;
  days_overdue: number;
  aging_30_days: number;
  aging_60_days: number;
  aging_90_days: number;
  aging_over_90_days: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialObligationWithDetails extends FinancialObligation {
  customers?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    customer_type: 'individual' | 'company';
  } | null;
  contracts?: {
    id: string;
    contract_number: string;
    contract_amount: number;
  } | null;
}

export interface CustomerFinancialSummary {
  customer_id: string;
  customer_name: string;
  customer_type: 'individual' | 'company';
  total_balance: CustomerFinancialBalance;
  contracts_balances: CustomerFinancialBalance[];
  recent_obligations: FinancialObligationWithDetails[];
  payment_history_summary: {
    total_payments: number;
    last_payment_date?: string;
    last_payment_amount: number;
    average_days_to_pay: number;
  };
}

export interface FinancialDashboardStats {
  total_customers_with_balance: number;
  total_outstanding_amount: number;
  total_overdue_amount: number;
  total_current_due: number;
  aging_analysis: {
    current: number;
    days_30: number;
    days_60: number;
    days_90: number;
    over_90: number;
  };
  top_overdue_customers: Array<{
    customer_id: string;
    customer_name: string;
    overdue_amount: number;
    days_overdue: number;
  }>;
}

export interface PaymentAllocation {
  obligation_id: string;
  allocated_amount: number;
  remaining_amount: number;
  allocation_notes?: string;
}

export interface SmartPaymentAllocationSuggestion {
  payment_amount: number;
  customer_id: string;
  suggested_allocations: PaymentAllocation[];
  allocation_strategy: 'oldest_first' | 'highest_priority' | 'contract_specific' | 'proportional';
  confidence_score: number;
}

export interface FinancialObligationCreationData {
  customer_id: string;
  contract_id?: string;
  obligation_type: 'contract_payment' | 'late_fee' | 'penalty' | 'adjustment';
  due_date: string;
  original_amount: number;
  description?: string;
  description_ar?: string;
  installment_number?: number;
  priority?: 1 | 2 | 3;
  notes?: string;
}

export interface FinancialObligationUpdateData {
  due_date?: string;
  original_amount?: number;
  status?: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  description?: string;
  description_ar?: string;
  late_fee_amount?: number;
  discount_amount?: number;
  notes?: string;
}

// Enhanced payment type with new fields
export interface EnhancedPayment {
  id: string;
  company_id: string;
  customer_id: string;
  contract_id?: string | null;
  obligation_id?: string | null; // New field
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string | null;
  description?: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  auto_allocated: boolean; // New field
  allocation_method: 'manual' | 'auto_oldest' | 'auto_contract'; // New field
  allocation_details: Record<string, any>; // New field
  payment_source: 'manual' | 'bank_transfer' | 'online' | 'cash'; // New field
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}