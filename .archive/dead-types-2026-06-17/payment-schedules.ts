// Types for payment schedules
export interface PaymentSchedule {
  id: string
  company_id: string
  contract_id: string
  installment_number: number
  due_date: string
  amount: number
  status: PaymentScheduleStatus
  description?: string | null
  invoice_id?: string | null
  paid_amount: number
  paid_date?: string | null
  notes?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export type PaymentScheduleStatus = 
  | 'pending'
  | 'overdue'
  | 'paid'
  | 'partially_paid'
  | 'cancelled'

export interface PaymentScheduleCreationData {
  contract_id: string
  installment_number: number
  due_date: string
  amount: number
  description?: string
  notes?: string
}

export interface PaymentScheduleUpdateData {
  due_date?: string
  amount?: number
  status?: PaymentScheduleStatus
  description?: string
  notes?: string
  paid_amount?: number
  paid_date?: string
}

export interface CreateScheduleRequest {
  contract_id: string
  installment_plan: 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
  number_of_installments?: number
  first_payment_date?: string
}

export interface PaymentScheduleWithContract extends PaymentSchedule {
  contracts: {
    id: string
    contract_number: string
    customer_id: string
    contract_amount: number
    customers: {
      id: string
      first_name_ar?: string | null
      last_name_ar?: string | null
      company_name_ar?: string | null
      customer_type: 'individual' | 'company'
    } | null
  } | null
}