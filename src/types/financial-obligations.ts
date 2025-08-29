// أنواع البيانات للالتزامات المالية
// Financial obligations data types

export interface FinancialObligation {
  id: string;
  company_id: string;
  contract_id: string;
  customer_id: string;
  obligation_type: 'installment' | 'deposit' | 'fee' | 'penalty' | 'insurance';
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid' | 'cancelled';
  paid_amount: number;
  remaining_amount: number;
  days_overdue: number;
  description?: string;
  reference_number?: string;
  invoice_id?: string;
  journal_entry_id?: string;
  payment_method?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: string;
  company_id: string;
  payment_id: string;
  obligation_id: string;
  allocated_amount: number;
  allocation_type: 'automatic' | 'manual';
  allocation_strategy?: 'fifo' | 'highest_interest' | 'nearest_due' | 'manual';
  allocation_date: string;
  notes?: string;
  created_by?: string;
  created_at: string;
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
  cancelled: 'bg-gray-100 text-gray-800'
};