export interface Tenant {
  id: string;
  company_id: string;
  tenant_code: string;
  full_name: string;
  full_name_ar?: string;
  phone?: string;
  email?: string;
  civil_id?: string;
  passport_number?: string;
  nationality: string;
  date_of_birth?: string;
  occupation?: string;
  employer_name?: string;
  monthly_income?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  current_address?: string;
  current_address_ar?: string;
  status: TenantStatus;
  tenant_type: TenantType;
  notes?: string;
  documents?: TenantDocument[];
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export type TenantStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type TenantType = 'individual' | 'company';

export interface TenantDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploaded_at: string;
}

export interface TenantFilters {
  search?: string;
  status?: TenantStatus;
  tenant_type?: TenantType;
  nationality?: string;
}

export interface CreateTenantRequest {
  full_name: string;
  full_name_ar?: string;
  phone?: string;
  email?: string;
  civil_id?: string;
  passport_number?: string;
  nationality?: string;
  date_of_birth?: string;
  occupation?: string;
  employer_name?: string;
  monthly_income?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  current_address?: string;
  current_address_ar?: string;
  tenant_type: TenantType;
  notes?: string;
  documents?: TenantDocument[];
}

export interface UpdateTenantRequest extends Partial<CreateTenantRequest> {
  status?: TenantStatus;
  is_active?: boolean;
}