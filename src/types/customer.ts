export interface Customer {
  id: string;
  company_id: string;
  customer_code?: string;
  customer_type: 'individual' | 'corporate';
  first_name?: string;
  last_name?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  company_name?: string;
  company_name_ar?: string;
  email?: string;
  phone: string;
  alternative_phone?: string;
  national_id?: string;
  passport_number?: string;
  license_number?: string;
  address?: string;
  address_ar?: string;
  city?: string;
  country?: string;
  date_of_birth?: string;
  license_expiry?: string;
  national_id_expiry?: string;
  credit_limit?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  is_blacklisted?: boolean;
  blacklist_reason?: string;
  documents?: any;
  notes?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  contracts_count?: number;
  contracts?: any[];
  customer_accounts?: any[];
  // Enhanced properties
  total_contracts?: number;
  active_contracts?: number;
  total_revenue?: number;
  last_contract_date?: string;
}

export interface CustomerFormData {
  customer_code?: string;
  customer_type: 'individual' | 'corporate';
  first_name?: string;
  last_name?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  company_name?: string;
  company_name_ar?: string;
  email?: string;
  phone: string;
  alternative_phone?: string;
  national_id?: string;
  passport_number?: string;
  license_number?: string;
  license_expiry?: string;
  national_id_expiry?: string;
  address?: string;
  address_ar?: string;
  city?: string;
  country?: string;
  date_of_birth?: string;
  credit_limit?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  selectedCompanyId?: string;
}

export interface CustomerFilters {
  customer_type?: 'individual' | 'corporate';
  is_blacklisted?: boolean;
  search?: string;
  customer_code?: string;
  includeInactive?: boolean;
  searchTerm?: string;
  limit?: number;
}

export interface CustomerAccountTransaction {
  transaction_date: string;
  transaction_type: 'payment' | 'invoice';
  description: string;
  reference_number: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  transaction_id: string;
  source_table: string;
}