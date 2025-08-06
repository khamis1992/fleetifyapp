// Types for vehicle installments system
export interface VehicleInstallment {
  id: string
  company_id: string
  vendor_id: string
  vehicle_id: string
  agreement_number: string
  total_amount: number
  down_payment: number
  installment_amount: number
  number_of_installments: number
  interest_rate?: number
  start_date: string
  end_date: string
  status: VehicleInstallmentStatus
  notes?: string
  agreement_date: string
  created_by?: string
  created_at: string
  updated_at: string
}

export type VehicleInstallmentStatus = 'draft' | 'active' | 'completed' | 'cancelled'

export interface VehicleInstallmentSchedule {
  id: string
  company_id: string
  installment_id: string
  installment_number: number
  due_date: string
  amount: number
  interest_amount?: number
  principal_amount?: number
  status: VehicleInstallmentScheduleStatus
  paid_amount?: number
  paid_date?: string
  payment_reference?: string
  notes?: string
  invoice_id?: string
  journal_entry_id?: string
  created_at: string
  updated_at: string
}

export type VehicleInstallmentScheduleStatus = 'pending' | 'paid' | 'overdue' | 'partially_paid'

export interface VehicleInstallmentWithDetails extends VehicleInstallment {
  vehicles: {
    id: string
    license_plate: string
    model: string
    make: string
    year: number
  } | null
  customers: {
    id: string
    first_name?: string
    last_name?: string
    company_name?: string
    customer_type: 'individual' | 'company'
  } | null
}

export interface VehicleInstallmentCreateData {
  vendor_id: string
  vehicle_id: string
  agreement_number: string
  total_amount: number
  down_payment: number
  installment_amount: number
  number_of_installments: number
  interest_rate?: number
  start_date: string
  end_date: string
  notes?: string
  agreement_date: string
}

export interface VehicleInstallmentPaymentData {
  schedule_id: string
  paid_amount: number
  payment_reference?: string
  notes?: string
  payment_date?: string
}

export interface VehicleInstallmentSummary {
  total_agreements: number
  active_agreements: number
  completed_agreements: number
  total_amount: number
  total_paid: number
  total_outstanding: number
  overdue_count: number
  overdue_amount: number
}