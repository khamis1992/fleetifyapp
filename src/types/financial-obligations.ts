// أنواع البيانات للالتزامات المالية
// Financial obligations data types

export interface FinancialObligation {
  id: string;
  company_id: string;
  contract_id: string;
  customer_id: string;
  obligation_type: 'installment' | 'deposit' | 'fee' | 'penalty' | 'insurance';
  amount: number;
  original_amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid' | 'cancelled';
  paid_amount: number;
  remaining_amount: number;
  days_overdue: number;
  obligation_number?: string;
  description?: string;
  reference_number?: string;
  invoice_id?: string;
  journal_entry_id?: string;
  payment_method?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  customers?: {
    id: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    customer_type: 'individual' | 'company';
    phone?: string;
    email?: string;
  };
  contracts?: {
    id: string;
    contract_number: string;
    contract_amount: number;
    status: string;
  };
}

export interface PaymentAllocation {
  id: string;
  company_id: string;
  payment_id: string;
  obligation_id: string;
  allocated_amount: number;
  remaining_amount: number;
  allocation_type: 'automatic' | 'manual';
  allocation_strategy?: 'fifo' | 'highest_interest' | 'nearest_due' | 'manual';
  allocation_date: string;
  allocation_notes?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  // Relations
  financial_obligations?: FinancialObligation;
  payments?: {
    id: string;
    payment_amount: number;
    payment_date: string;
    payment_method: string;
  };
}

export interface SmartAllocationResult {
  success: boolean;
  allocations: Array<{
    allocation_id: string;
    obligation_id: string;
    obligation_type: string;
    allocated_amount: number;
    due_date: string;
    installment?: number;
  }>;
  total_allocated: number;
  remaining_amount: number;
  credit_balance_created?: number;
  error?: string;
}

export interface ManualAllocationRequest {
  obligation_id: string;
  amount: number;
}

export interface UnpaidObligation {
  id: string;
  contract_id: string;
  obligation_type: string;
  amount: number;
  due_date: string;
  remaining_amount: number;
  days_overdue: number;
  priority_score: number;
}

export type AllocationStrategy = 'fifo' | 'highest_interest' | 'nearest_due' | 'manual';

export interface AllocationStrategyOption {
  value: AllocationStrategy;
  label: string;
  description: string;
}

export const ALLOCATION_STRATEGIES: AllocationStrategyOption[] = [
  {
    value: 'fifo',
    label: 'الأقدم أولاً (FIFO)',
    description: 'تخصيص المدفوعات للالتزامات الأقدم أولاً'
  },
  {
    value: 'highest_interest',
    label: 'أعلى فائدة',
    description: 'تخصيص المدفوعات للالتزامات ذات الفوائد العالية أولاً'
  },
  {
    value: 'nearest_due',
    label: 'أقرب استحقاق',
    description: 'تخصيص المدفوعات للالتزامات المستحقة قريباً أولاً'
  },
  {
    value: 'manual',
    label: 'تخصيص يدوي',
    description: 'تخصيص المدفوعات يدوياً حسب اختيار المستخدم'
  }
];

export const OBLIGATION_TYPE_LABELS: Record<FinancialObligation['obligation_type'], string> = {
  installment: 'قسط',
  deposit: 'دفعة مقدمة',
  fee: 'رسوم',
  penalty: 'غرامة',
  insurance: 'تأمين'
};

export const OBLIGATION_STATUS_LABELS: Record<FinancialObligation['status'], string> = {
  pending: 'معلق',
  paid: 'مدفوع',
  overdue: 'متأخر',
  partially_paid: 'مدفوع جزئياً',
  cancelled: 'ملغي'
};

export const OBLIGATION_STATUS_COLORS: Record<FinancialObligation['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  partially_paid: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-slate-100 text-slate-800'
};

// Additional interfaces for financial components
export interface SmartPaymentAllocationSuggestion {
  payment_amount: number;
  customer_id: string;
  allocation_strategy?: AllocationStrategy;
  confidence_score?: number;
  suggested_allocations: Array<{
    obligation_id: string;
    allocated_amount: number;
    remaining_amount: number;
    allocation_notes: string;
  }>;
}

export interface CustomerFinancialBalance {
  id: string;
  customer_id: string;
  contract_id?: string;
  company_id: string;
  remaining_balance: number;
  overdue_amount: number;
  current_amount: number;
  aging_30_days: number;
  aging_60_days: number;
  aging_90_days: number;
  aging_over_90_days: number;
  days_overdue: number;
  last_payment_date?: string;
  last_payment_amount: number;
  total_paid: number;
  credit_limit: number;
  available_credit: number;
  total_obligations?: number;
  last_updated?: string;
  created_at: string;
  updated_at: string;
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

export interface FinancialObligationWithDetails extends FinancialObligation {
  priority?: 'high' | 'medium' | 'low';
  customers: {
    id: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    customer_type: 'individual' | 'company';
  } | null;
  contracts: {
    id: string;
    contract_number: string;
    contract_amount: number;
    status: string;
  } | null;
}