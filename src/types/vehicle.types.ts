/**
 * Vehicle Module Type Definitions
 *
 * Centralized type definitions for all vehicle and fleet-related entities.
 * Extracted from useVehicles hook for better reusability and maintainability.
 */

export interface Vehicle {
  id: string;
  company_id: string;
  category_id?: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  color_ar?: string;
  vin_number?: string;
  registration_number?: string;
  insurance_policy?: string;
  insurance_expiry?: string;
  license_expiry?: string;
  status?: 'available' | 'rented' | 'maintenance' | 'out_of_service' | 'reserved';
  odometer_reading?: number;
  fuel_level?: number;
  location?: string;
  daily_rate?: number;
  weekly_rate?: number;
  monthly_rate?: number;
  deposit_amount?: number;
  notes?: string;
  images?: string[] | Record<string, unknown>[];
  features?: string[];
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  // Enhanced vehicle fields
  vin?: string;
  engine_number?: string;
  fuel_capacity?: number;
  seating_capacity?: number;
  transmission_type?: string;
  drive_type?: string;
  vehicle_category?: string;
  registration_date?: string;
  registration_expiry?: string;
  inspection_due_date?: string;
  warranty_start_date?: string;
  warranty_end_date?: string;
  current_location?: string;
  gps_tracking_device?: string;
  safety_features?: string[];
  entertainment_features?: string[];
  comfort_features?: string[];
  vehicle_condition?: string;
  fuel_type?: string;
  ownership_status?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  monthly_lease_amount?: number;
  lease_company?: string;
  expected_depreciation_rate?: number;
  total_fuel_cost?: number;
  average_fuel_consumption?: number;
  total_distance_km?: number;
  vehicle_documents?: Record<string, unknown>[];
  emergency_contact_info?: Record<string, unknown>;
  maintenance_schedule?: Record<string, unknown>[];
  performance_metrics?: Record<string, unknown>;
  // Legacy fields for backward compatibility
  transmission?: string;
  body_type?: string;
  current_mileage?: number;
  last_service_mileage?: number;
  next_service_mileage?: number;
  purchase_date?: string;
  purchase_cost?: number;
  useful_life_years?: number;
  residual_value?: number;
  depreciation_method?: string;
  annual_depreciation_rate?: number;
  accumulated_depreciation?: number;
  book_value?: number;
  fixed_asset_id?: string;
  cost_center_id?: string;
  last_maintenance_date?: string;
  // Additional financial integration fields
  journal_entry_id?: string;
  salvage_value?: number;
  // Minimum pricing fields
  minimum_rental_price?: number;
  minimum_daily_rate?: number;
  minimum_weekly_rate?: number;
  minimum_monthly_rate?: number;
  enforce_minimum_price?: boolean;
}

export interface VehiclePricing {
  id: string;
  vehicle_id: string;
  daily_rate: number;
  weekly_rate: number;
  monthly_rate: number;
  annual_rate: number;
  daily_rate_min?: number;
  daily_rate_max?: number;
  weekly_rate_min?: number;
  weekly_rate_max?: number;
  monthly_rate_min?: number;
  monthly_rate_max?: number;
  annual_rate_min?: number;
  annual_rate_max?: number;
  extra_km_charge?: number;
  included_km_daily?: number;
  included_km_weekly?: number;
  included_km_monthly?: number;
  included_km_annual?: number;
  security_deposit?: number;
  currency: string;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Enhanced pricing fields from migration
  mileage_limit_daily?: number;
  mileage_limit_weekly?: number;
  mileage_limit_monthly?: number;
  excess_mileage_rate?: number;
  late_return_hourly_rate?: number;
  cleaning_fee?: number;
  fuel_policy?: string;
  cancellation_fee?: number;
  peak_season_multiplier?: number;
  weekend_multiplier?: number;
}

export interface VehicleInsurance {
  id: string;
  vehicle_id: string;
  insurance_company: string;
  policy_number: string;
  coverage_type: string;
  coverage_amount?: number;
  deductible_amount?: number;
  premium_amount: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  policy_document_url?: string;
  notes?: string;
  is_active: boolean;
}

export interface VehicleMaintenance {
  id: string;
  vehicle_id: string;
  company_id: string;
  maintenance_number: string;
  maintenance_type: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date?: string;
  started_date?: string;
  completed_date?: string;
  estimated_cost?: number;
  actual_cost?: number;
  mileage_at_service?: number;
  service_provider?: string;
  service_provider_contact?: string;
  warranty_until?: string;
  parts_replaced?: string[];
  cost_center_id?: string;
  invoice_id?: string;
  journal_entry_id?: string;
  created_by?: string;
  assigned_to?: string;
  notes?: string;
  attachments?: Record<string, unknown>[];
}

export interface OdometerReading {
  id: string;
  vehicle_id: string;
  company_id: string;
  reading_date: string;
  odometer_reading: number;
  fuel_level_percentage?: number;
  notes?: string;
  recorded_by?: string;
  location?: string;
  photo_url?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleInspection {
  id: string;
  vehicle_id: string;
  company_id: string;
  inspection_date: string;
  inspector_name: string;
  inspection_type: string;
  overall_condition: string;
  mileage_at_inspection?: number;
  engine_condition?: string;
  transmission_condition?: string;
  brake_condition?: string;
  tire_condition?: string;
  battery_condition?: string;
  lights_condition?: string;
  ac_condition?: string;
  interior_condition?: string;
  exterior_condition?: string;
  safety_equipment_status?: string;
  identified_issues?: string[];
  repair_recommendations?: string[];
  estimated_repair_cost?: number;
  next_inspection_due?: string;
  inspection_certificate_url?: string;
  photos?: string[] | Record<string, unknown>[];
  is_passed: boolean;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TrafficViolation {
  id: string;
  vehicle_id: string;
  company_id: string;
  violation_number: string;
  violation_date: string;
  violation_time?: string;
  violation_type: string;
  violation_description?: string;
  location?: string;
  fine_amount: number;
  late_fee?: number;
  total_amount: number;
  currency: string;
  issuing_authority?: string;
  officer_name?: string;
  status: 'pending' | 'paid' | 'appealed' | 'cancelled' | 'overdue';
  due_date?: string;
  paid_date?: string;
  payment_method?: string;
  payment_reference?: string;
  discount_applied?: number;
  driver_name?: string;
  driver_license?: string;
  driver_phone?: string;
  court_date?: string;
  court_status?: string;
  appeal_date?: string;
  appeal_status?: string;
  vehicle_impounded: boolean;
  impound_location?: string;
  impound_release_date?: string;
  photos?: string[] | Record<string, unknown>[];
  documents?: Record<string, unknown>[];
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleActivityLog {
  id: string;
  vehicle_id: string;
  company_id: string;
  activity_type: string;
  description?: string;
  activity_date: string;
  activity_time?: string;
  mileage?: number;
  location?: string;
  performed_by?: string;
  cost_amount?: number;
  cost_center_id?: string;
  reference_document?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
