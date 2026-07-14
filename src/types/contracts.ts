import type { Database } from '@/integrations/supabase/types'

type ContractRow = Database['public']['Tables']['contracts']['Row']
type CustomerRow = Database['public']['Tables']['customers']['Row']
type VehicleRow = Database['public']['Tables']['vehicles']['Row']

export type ContractCustomer = Pick<
  CustomerRow,
  | 'id'
  | 'customer_code'
  | 'first_name'
  | 'last_name'
  | 'first_name_ar'
  | 'last_name_ar'
  | 'company_name'
  | 'company_name_ar'
  | 'customer_type'
  | 'phone'
  | 'email'
  | 'national_id'
>

export type ContractVehicle = Pick<
  VehicleRow,
  | 'id'
  | 'plate_number'
  | 'make'
  | 'model'
  | 'year'
  | 'color'
  | 'fuel_type'
  | 'vin'
  | 'current_mileage'
  | 'status'
>

type RequiredContractFields =
  | 'id'
  | 'company_id'
  | 'customer_id'
  | 'contract_number'
  | 'contract_date'
  | 'start_date'
  | 'end_date'
  | 'contract_amount'
  | 'monthly_amount'
  | 'created_at'
  | 'updated_at'

/**
 * Application contract model. Core identifiers are always present, while
 * nullable operational fields retain the generated Supabase definitions.
 */
export type Contract = Pick<ContractRow, RequiredContractFields> &
  Partial<Omit<ContractRow, RequiredContractFields | 'contract_type' | 'status'>> & {
    contract_type: ContractType
    status: ContractStatus
    customer?: ContractCustomer | null
    vehicle?: ContractVehicle | null
  }

export type LegalStatus = 
  | 'under_legal_action'
  | 'legal_case_filed'
  | 'in_court'
  | 'judgment_issued'
  | 'execution_phase'
  | 'settled'
  | 'closed'

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
  | 'pending'
  | 'pending_completion'
  | 'active'
  | 'expired'
  | 'expiring_soon'
  | 'suspended'
  | 'cancelled'
  | 'renewed'
  | 'completed'
  | 'closed'
  | 'under_legal_procedure'

export type ContractWithCustomer = Contract & {
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

