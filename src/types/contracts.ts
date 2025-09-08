// أنواع البيانات للعقود
export interface Contract {
  id: string
  company_id: string
  customer_id: string
  vehicle_id?: string | null
  contract_number: string
  contract_type: ContractType
  contract_date: string
  start_date: string
  end_date: string
  contract_amount: number
  monthly_amount: number
  description?: string | null
  terms?: string | null
  status: ContractStatus
  created_by: string
  cost_center_id?: string | null
  journal_entry_id?: string | null
  total_paid?: number
  balance_due?: number
  payment_status?: 'unpaid' | 'partial' | 'paid' | 'overdue'
  last_payment_date?: string | null
  late_fine_amount?: number
  days_overdue?: number
  created_via?: string
  created_at: string
  updated_at: string
}

export type ContractType = 
  | 'rental'
  | 'daily_rental'
  | 'weekly_rental'
  | 'monthly_rental'
  | 'yearly_rental'
  | 'rent_to_own'

export type ContractStatus = 
  | 'draft'
  | 'under_review'
  | 'active'
  | 'expired'
  | 'suspended'
  | 'cancelled'
  | 'renewed'

export interface ContractWithCustomer extends Contract {
  customers: {
    id: string
    first_name_ar?: string | null
    last_name_ar?: string | null
    company_name_ar?: string | null
    customer_type: 'individual' | 'company'
  } | null
}

export interface ContractCreationData {
  customer_id: string
  vehicle_id?: string | null
  contract_number?: string
  contract_type: ContractType
  contract_date?: string
  start_date: string
  end_date: string
  contract_amount: number
  monthly_amount?: number
  description?: string
  terms?: string
  cost_center_id?: string | null
  created_by?: string
}

export interface ContractValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface ContractCreationResult {
  success: boolean
  contract_id?: string
  contract_number?: string
  journal_entry_id?: string
  journal_entry_number?: string
  warnings?: string[]
  requires_manual_entry?: boolean
  errors?: string[]
  error?: string
  error_code?: string
  error_message?: string
}

export interface JournalEntryResult {
  success: boolean
  journal_entry_id?: string
  journal_entry_number?: string
  amount?: number
  entry_type?: string
  error_code?: string
  error_message?: string
}

export interface CustomerEligibilityResult {
  eligible: boolean
  reason: string
}

export interface VehicleAvailabilityResult {
  available: boolean
  reason: string
}

export interface AccountMappingResult {
  success: boolean
  created: string[]
  existing: string[]
  errors: string[]
}

