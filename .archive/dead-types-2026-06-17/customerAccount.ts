export interface CustomerAccountType {
  id: string;
  type_name: string;
  type_name_ar: string;
  account_category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerAccount {
  id: string;
  customer_id: string;
  account_id: string;
  account_type_id?: string;
  is_default: boolean;
  currency: string;
  credit_limit?: number;
  account_purpose?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  account_type?: CustomerAccountType;
  account?: {
    id: string;
    account_code: string;
    account_name: string;
    account_name_ar?: string;
    current_balance?: number;
  } | null;
}

export interface CustomerAccountFormData {
  account_id: string;
  account_type_id: string;
  is_default: boolean;
  currency: string;
  credit_limit?: number;
  account_purpose?: string;
}