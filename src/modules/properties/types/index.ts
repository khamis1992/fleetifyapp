// أنواع البيانات لوحدة العقارات

export type PropertyType = 
  | 'residential' 
  | 'commercial' 
  | 'industrial' 
  | 'land'
  | 'warehouse'
  | 'office'
  | 'retail'
  | 'villa'
  | 'apartment'
  | 'building';

export type PropertyStatus = 
  | 'available'
  | 'rented' 
  | 'for_sale'
  | 'maintenance'
  | 'reserved'
  | 'sold';

export type PropertyCondition = 
  | 'excellent'
  | 'very_good'
  | 'good'
  | 'fair'
  | 'needs_renovation';

export interface Property {
  id: string;
  company_id: string;
  property_code: string;
  property_name: string;
  property_name_ar?: string;
  description?: string;
  description_ar?: string;
  property_type: string;
  property_status: string;
  
  // الموقع
  address?: string;
  address_ar?: string;
  floor_number?: number;
  
  // التفاصيل المادية
  area_sqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking_spaces?: number;
  total_floors?: number;
  
  // التفاصيل المالية
  rental_price?: number;
  sale_price?: number;
  currency?: string;
  
  // معلومات إضافية
  furnished?: boolean;
  features?: any;
  location_coordinates?: any;
  
  // الوثائق والصور
  images?: string[];
  documents?: string[];
  
  // إدارة العقار
  owner_id?: string;
  manager_id?: string;
  
  // تواريخ
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  is_active?: boolean;
  
  // العلاقات
  property_owners?: PropertyOwner;
  property_contracts?: PropertyContract[];
}

export interface PropertyOwner {
  id: string;
  company_id: string;
  owner_code: string;
  full_name: string;
  full_name_ar?: string;
  civil_id: string;
  phone: string;
  email?: string;
  address?: string;
  address_ar?: string;
  
  // معلومات مالية
  account_id?: string;
  
  // تواريخ
  created_at: string;
  updated_at: string;
  is_active: boolean;
  
  // العلاقات
  properties?: Property[];
}

export interface PropertyContract {
  id: string;
  company_id: string;
  property_id: string;
  tenant_id?: string;
  contract_number: string;
  contract_type: string;
  
  // تواريخ العقد
  start_date: string;
  end_date?: string;
  
  // التفاصيل المالية
  rental_amount?: number;
  deposit_amount?: number;
  security_deposit?: number;
  commission_amount?: number;
  late_fee_rate?: number;
  
  // شروط العقد
  terms?: string;
  terms_ar?: string;
  payment_frequency?: string;
  payment_day?: number;
  grace_period_days?: number;
  renewal_period?: number;
  
  // حالة العقد
  status?: string;
  
  // معلومات إضافية
  utilities_included?: boolean;
  maintenance_responsibility?: string;
  insurance_required?: boolean;
  auto_renewal?: boolean;
  currency?: string;
  notes?: string;
  
  // تواريخ
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  is_active?: boolean;
  
  // العلاقات
  properties?: Property;
  property_tenants?: PropertyTenant;
  property_payments?: PropertyPayment[];
}

export interface PropertyTenant {
  id: string;
  company_id: string;
  tenant_code: string;
  full_name: string;
  full_name_ar?: string;
  civil_id: string;
  phone: string;
  email?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  
  // معلومات العمل
  employer?: string;
  employer_ar?: string;
  job_title?: string;
  monthly_salary?: number;
  
  // معلومات مالية
  account_id?: string;
  
  // تواريخ
  created_at: string;
  updated_at: string;
  is_active: boolean;
  
  // العلاقات
  contracts?: PropertyContract[];
}

export interface PropertyPayment {
  id: string;
  company_id: string;
  property_id: string;
  contract_id: string;
  tenant_id: string;
  
  // تفاصيل الدفع
  payment_number: string;
  payment_type: 'rent' | 'deposit' | 'commission' | 'maintenance' | 'penalty';
  amount: number;
  due_date: string;
  payment_date?: string;
  
  // حالة الدفع
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_method?: 'cash' | 'bank_transfer' | 'check' | 'card';
  
  // معلومات إضافية
  notes?: string;
  reference_number?: string;
  
  // تواريخ
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // العلاقات
  property?: Property;
  contract?: PropertyContract;
  tenant?: PropertyTenant;
}

// نوع للبحث والفلترة
export interface PropertySearchFilters {
  search?: string;
  property_type?: PropertyType | PropertyType[];
  property_status?: PropertyStatus | PropertyStatus[];
  property_condition?: PropertyCondition;
  area?: string;
  min_rent?: number;
  max_rent?: number;
  min_area?: number;
  max_area?: number;
  rooms_count?: number;
  owner_id?: string;
  furnished?: boolean;
  has_parking?: boolean;
  has_elevator?: boolean;
}

// نوع لإحصائيات العقارات
export interface PropertyStats {
  total_properties: number;
  available_properties: number;
  rented_properties: number;
  for_sale_properties: number;
  maintenance_properties: number;
  total_monthly_rent: number;
  total_yearly_rent: number;
  occupancy_rate: number;
  average_rent_per_sqm: number;
  properties_by_type: Record<PropertyType, number>;
  properties_by_area: Record<string, number>;
}