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
  nationality?: string;
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
  nationality?: string;
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
  page?: number;
  pageSize?: number;
}

export interface CustomerAccountTransaction {
  transaction_date: string;
  transaction_type: 'payment' | 'invoice' | 'opening_balance' | 'journal_debit' | 'journal_credit';
  description: string;
  reference_number: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  transaction_id: string;
  source_table: string;
}

/**
 * Driver License interface for customer license tracking
 */
export interface DriverLicense {
  id: string;
  company_id: string;
  customer_id: string;
  license_number: string;
  issue_date?: string;
  expiry_date: string;
  issuing_country: string;
  front_image_url?: string;
  back_image_url?: string;
  verification_status: 'pending' | 'verified' | 'rejected' | 'expired';
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/**
 * Form data for creating/updating driver licenses
 */
export interface DriverLicenseFormData {
  license_number: string;
  issue_date?: string;
  expiry_date: string;
  issuing_country: string;
  notes?: string;
  front_image?: File;
  back_image?: File;
}

/**
 * Expiring license notification
 */
export interface ExpiringLicense {
  license_id: string;
  customer_id: string;
  customer_name: string;
  license_number: string;
  expiry_date: string;
  days_until_expiry: number;
  company_id: string;
}