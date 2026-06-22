/**
 * CSV Contract Upload Type Definitions
 *
 * Centralized type definitions for contract CSV upload functionality.
 * Extracted from useContractCSVUpload hook for better reusability.
 */

export interface CSVUploadResults {
  total: number;
  successful: number;
  failed: number;
  customersCreated?: number;
  contractsCreated?: number;
  errors: Array<{ row: number; message: string; customerName?: string }>;
  warnings?: Array<{ row: number; message: string; customerName?: string }>;
}

export interface CSVRow {
  rowNumber?: number;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  vehicle_id?: string;
  vehicle_number?: string;
  plate_number?: string;
  contract_number?: string;
  contract_type?: string;
  contract_date?: string;
  start_date?: string;
  end_date?: string;
  contract_amount?: string | number;
  monthly_amount?: string | number;
  cost_center_id?: string;
  cost_center_code?: string;
  cost_center_name?: string;
  description?: string;
  terms?: string;
  [key: string]: unknown;
}

export interface CustomerData {
  company_id: string;
  is_active: boolean;
  is_blacklisted: boolean;
  credit_limit: number;
  city: string;
  country: string;
  phone: string;
  created_by?: string;
  notes: string;
  customer_type: 'individual' | 'corporate';
  company_name?: string;
  company_name_ar?: string;
  first_name?: string;
  last_name?: string;
  first_name_ar?: string;
  last_name_ar?: string;
}

export interface ContractPreprocessData extends CSVRow {
  _customerCreated?: boolean;
}

export interface ContractPayload {
  company_id: string;
  customer_id: string;
  vehicle_id: string | null;
  cost_center_id: string | null;
  contract_number: string;
  contract_type: string;
  contract_date: string;
  start_date: string;
  end_date: string;
  contract_amount: number;
  monthly_amount: number;
  description: string | null;
  terms: string | null;
  status: 'draft' | 'cancelled';
  created_by?: string;
}

export interface SmartUploadOptions {
  upsert?: boolean;
  targetCompanyId?: string;
  autoCreateCustomers?: boolean;
  autoCompleteDates?: boolean;
  autoCompleteType?: boolean;
  autoCompleteAmounts?: boolean;
  dryRun?: boolean;
  archiveFile?: boolean;
  originalFile?: File;
}

export interface CustomerQueryResult {
  id: string;
  customer_type: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface CostCenterQueryResult {
  id: string;
  center_code?: string;
  center_name?: string;
  center_name_ar?: string;
}

export interface VehicleQueryResult {
  id: string;
  plate_number: string;
}
