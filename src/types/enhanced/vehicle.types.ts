/**
 * Enhanced Vehicle Types
 * Comprehensive type definitions to replace 'any' types in vehicle domain
 */

import { BaseEntity, DocumentCollection, Money, Address } from '../core';

// === Vehicle Entity Types ===

export interface Vehicle extends BaseEntity {
  // Basic identification
  plate_number: string;
  vin_number?: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  color_ar?: string;

  // Registration and legal
  registration_number?: string;
  registration_date?: string;
  registration_expiry?: string;
  ownership_status: 'owned' | 'leased' | 'rented' | 'financed';
  legal_owner?: string;

  // Classification
  vehicle_type: 'sedan' | 'suv' | 'truck' | 'van' | 'motorcycle' | 'bus' | 'luxury' | 'economy';
  vehicle_category?: string;
  segment?: 'economy' | 'compact' | 'mid-size' | 'full-size' | 'luxury' | 'suv' | 'truck' | 'van';
  body_type?: string;

  // Technical specifications
  engine_number?: string;
  engine_type: 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'plugin_hybrid';
  transmission_type: 'manual' | 'automatic' | 'cvt' | 'dual_clutch';
  drive_type: 'fwd' | 'rwd' | 'awd' | '4wd';
  fuel_type: 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'lpg' | 'cng';
  fuel_capacity?: number;
  fuel_consumption?: number; // l/100km

  // Capacity and dimensions
  seating_capacity?: number;
  cargo_capacity?: number; // liters
  towing_capacity?: number; // kg
  length?: number; // mm
  width?: number; // mm
  height?: number; // mm
  weight?: number; // kg
  payload_capacity?: number; // kg

  // Performance
  horsepower?: number;
  torque?: number;
  acceleration_0_100?: number; // seconds
  top_speed?: number; // km/h
  fuel_efficiency_rating?: string;

  // Status and availability
  status: 'available' | 'rented' | 'maintenance' | 'out_of_service' | 'reserved' | 'in_transit';
  availability_status: 'immediately_available' | 'available_date' | 'unavailable';
  next_available_date?: string;
  is_active?: boolean;

  // Location and tracking
  current_location?: string;
  gps_tracking_device?: string;
  last_gps_update?: string;
  latitude?: number;
  longitude?: number;

  // Usage metrics
  odometer_reading?: number;
  total_distance_km?: number;
  average_daily_km?: number;
  fuel_level?: number; // percentage
  last_service_mileage?: number;
  next_service_mileage?: number;

  // Financial information
  purchase_date?: string;
  purchase_cost?: number;
  current_value?: number;
  book_value?: number;
  salvage_value?: number;
  depreciation_rate?: number;
  accumulated_depreciation?: number;
  useful_life_years?: number;

  // Lease/Finance information
  lease_start_date?: string;
  lease_end_date?: string;
  monthly_lease_amount?: number;
  lease_company?: string;
  financing_company?: string;
  monthly_payment?: number;
  loan_balance?: number;

  // Insurance
  insurance_policy?: string;
  insurance_company?: string;
  insurance_expiry?: string;
  insurance_coverage?: 'basic' | 'comprehensive' | 'premium';
  insurance_premium?: number;

  // Pricing
  daily_rate?: number;
  weekly_rate?: number;
  monthly_rate?: number;
  yearly_rate?: number;
  deposit_amount?: number;
  minimum_rental_days?: number;
  extra_km_charge?: number;
  included_km_per_day?: number;

  // Minimum pricing enforcement
  minimum_daily_rate?: number;
  minimum_weekly_rate?: number;
  minimum_monthly_rate?: number;
  enforce_minimum_price?: boolean;

  // Features and amenities
  features?: string[];
  safety_features?: string[];
  entertainment_features?: string[];
  comfort_features?: string[];
  accessories?: string[];

  // Maintenance and service
  last_service_date?: string;
  next_service_due?: string;
  service_interval_km?: number;
  service_interval_months?: number;
  warranty_start_date?: string;
  warranty_end_date?: string;
  warranty_provider?: string;

  // Condition assessment
  vehicle_condition: 'excellent' | 'good' | 'fair' | 'poor';
  condition_rating?: number; // 1-10
  last_inspection_date?: string;
  next_inspection_due?: string;

  // Documents and media
  documents: DocumentCollection;
  images?: VehicleImage[];
  videos?: string[];

  // Operational data
  cost_center_id?: string;
  fixed_asset_id?: string;
  journal_entry_id?: string;

  // Metadata
  notes?: string;
  tags?: string[];
  internal_notes?: string;
  qr_code?: string;
  barcode?: string;

  // Relationships (lazy loaded)
  category?: VehicleCategory;
  pricing?: VehiclePricing[];
  maintenance_records?: VehicleMaintenance[];
  insurance_records?: VehicleInsurance[];
  odometer_readings?: OdometerReading[];
  inspection_records?: VehicleInspection[];
  activity_logs?: VehicleActivityLog[];
  traffic_violations?: TrafficViolation[];
  current_contract?: Contract;
  rental_history?: Contract[];
}

export interface VehicleCategory extends BaseEntity {
  name: string;
  name_ar?: string;
  description?: string;
  vehicle_type: string;
  base_daily_rate: number;
  base_weekly_rate: number;
  base_monthly_rate: number;
  security_deposit: number;
  extra_km_charge: number;
  included_km_per_day: number;
  features?: string[];
  requirements?: string[];
  restrictions?: string[];
  is_active: boolean;
  sort_order: number;
}

export interface VehicleImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  caption?: string;
  image_type: 'exterior' | 'interior' | 'dashboard' | 'engine' | 'trunk' | 'damage' | 'document' | 'other';
  is_primary: boolean;
  uploaded_at: string;
  uploaded_by: string;
  file_size: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface VehiclePricing extends BaseEntity {
  vehicle_id: string;
  pricing_type: 'standard' | 'promotional' | 'seasonal' | 'corporate' | 'long_term';

  // Base rates
  daily_rate: number;
  weekly_rate: number;
  monthly_rate: number;
  yearly_rate: number;

  // Rate ranges
  daily_rate_min?: number;
  daily_rate_max?: number;
  weekly_rate_min?: number;
  weekly_rate_max?: number;
  monthly_rate_min?: number;
  monthly_rate_max?: number;
  yearly_rate_min?: number;
  yearly_rate_max?: number;

  // Additional charges
  extra_km_charge: number;
  late_return_hourly_rate?: number;
  cleaning_fee?: number;
  delivery_fee?: number;
  pickup_fee?: number;
  cancellation_fee?: number;

  // Mileage limits
  included_km_daily: number;
  included_km_weekly: number;
  included_km_monthly: number;
  included_km_annual: number;
  mileage_limit_daily?: number;
  mileage_limit_weekly?: number;
  mileage_limit_monthly?: number;

  // Policies
  fuel_policy: 'full_to_full' | 'same_level' | 'prepaid' | 'not_included';
  smoking_policy: 'allowed' | 'not_allowed' | 'with_fine';
  pet_policy: 'allowed' | 'not_allowed' | 'with_fine';
  age_requirement?: number;
  license_requirement?: string;

  // Discounts and surcharges
  weekend_multiplier?: number;
  peak_season_multiplier?: number;
  holiday_surcharge?: number;
  long_term_discount?: number;

  // Validity
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  currency: string;
  minimum_rental_days?: number;
}

// === Maintenance and Service Types ===

export interface VehicleMaintenance extends BaseEntity {
  vehicle_id: string;
  maintenance_number: string;

  // Classification
  maintenance_type: 'routine' | 'repair' | 'inspection' | 'emergency' | 'recall' | 'upgrade';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'engine' | 'transmission' | 'brakes' | 'tires' | 'electrical' | 'body' | 'interior' | 'other';

  // Status tracking
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';

  // Scheduling
  scheduled_date?: string;
  started_date?: string;
  completed_date?: string;
  estimated_duration?: number; // hours
  actual_duration?: number; // hours

  // Work details
  description: string;
  work_performed?: string;
  parts_replaced?: string[];
  fluids_changed?: string[];
  diagnostic_codes?: string[];

  // Financial information
  estimated_cost?: number;
  actual_cost?: number;
  parts_cost?: number;
  labor_cost?: number;
  tax_amount?: number;
  warranty_covered?: boolean;
  insurance_claim?: boolean;

  // Service provider
  service_provider?: string;
  service_provider_contact?: string;
  technician_name?: string;
  technician_id?: string;

  // Vehicle condition
  mileage_at_service?: number;
  fuel_level_at_service?: number;
  reported_issues?: string[];
  identified_issues?: string[];
  future_recommendations?: string[];

  // Documentation
  invoice_id?: string;
  work_order_number?: string;
  warranty_claim_number?: string;
  photos?: string[];
  documents?: DocumentCollection;

  // Integration
  cost_center_id?: string;
  journal_entry_id?: string;
  scheduled_by?: string;
  assigned_to?: string;
  completed_by?: string;

  // Metadata
  notes?: string;
  internal_notes?: string;
  customer_notified?: boolean;
  next_service_date?: string;
}

export interface OdometerReading extends BaseEntity {
  vehicle_id: string;
  reading_date: string;
  odometer_reading: number;
  fuel_level_percentage?: number;
  fuel_type?: string;

  // Location and context
  location?: string;
  latitude?: number;
  longitude?: number;

  // Documentation
  photo_url?: string;
  document_url?: string;

  // Verification
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  verification_method?: 'manual' | 'photo' | 'gps' | 'automated';

  // Context
  reading_type: 'manual' | 'automated' | 'contract_start' | 'contract_end' | 'maintenance' | 'fuel';
  reference_type?: string;
  reference_id?: string;

  // Additional data
  engine_hours?: number;
  trip_distance?: number;
  average_speed?: number;
  recorded_by?: string;
  notes?: string;
}

export interface VehicleInspection extends BaseEntity {
  vehicle_id: string;
  inspection_date: string;

  // Inspector information
  inspector_name: string;
  inspector_id?: string;
  inspector_company?: string;
  inspection_type: 'pre_rental' | 'post_rental' | 'routine' | 'damage' | 'maintenance' | 'registration' | 'insurance';

  // Overall assessment
  overall_condition: 'excellent' | 'good' | 'fair' | 'poor' | 'unacceptable';
  condition_score?: number; // 1-100
  is_passed: boolean;
  needs_maintenance: boolean;
  safe_to_drive: boolean;

  // Vehicle state during inspection
  mileage_at_inspection?: number;
  fuel_level?: number;
  interior_cleanliness?: 'excellent' | 'good' | 'fair' | 'poor';
  exterior_cleanliness?: 'excellent' | 'good' | 'fair' | 'poor';

  // System condition ratings (1-5 scale)
  engine_condition?: number;
  transmission_condition?: number;
  brake_condition?: number;
  tire_condition?: number;
  battery_condition?: number;
  lights_condition?: number;
  ac_condition?: number;
  suspension_condition?: number;
  exhaust_condition?: number;

  // Detailed condition descriptions
  engine_condition_notes?: string;
  transmission_condition_notes?: string;
  brake_condition_notes?: string;
  tire_condition_notes?: string;
  battery_condition_notes?: string;
  lights_condition_notes?: string;
  ac_condition_notes?: string;
  interior_condition_notes?: string;
  exterior_condition_notes?: string;

  // Issues and recommendations
  identified_issues?: InspectionIssue[];
  repair_recommendations?: string[];
  immediate_attention_required?: string[];
  future_maintenance_suggestions?: string[];

  // Safety and compliance
  safety_equipment_status: 'all_present' | 'some_missing' | 'critical_missing';
  missing_equipment?: string[];
  registration_valid: boolean;
  insurance_valid: boolean;

  // Financial estimates
  estimated_repair_cost?: number;
  estimated_repair_time?: number; // hours

  // Scheduling
  next_inspection_due?: string;
  next_service_due?: string;

  // Documentation
  inspection_certificate_url?: string;
  photos?: InspectionPhoto[];
  videos?: string[];
  checklists?: InspectionChecklist[];

  // Signatures
  inspector_signature?: string;
  customer_signature?: string;
  witness_signature?: string;

  // Metadata
  notes?: string;
  internal_notes?: string;
  weather_conditions?: string;
  inspection_location?: string;
}

export interface InspectionIssue {
  id: string;
  type: 'damage' | 'mechanical' | 'electrical' | 'cosmetic' | 'safety' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  estimated_repair_cost?: number;
  requires_immediate_attention: boolean;
  affects_safety: boolean;
  photos?: string[];
  recommendations?: string[];
}

export interface InspectionPhoto {
  id: string;
  url: string;
  thumbnail_url?: string;
  caption: string;
  photo_type: 'damage' | 'overall' | 'detail' | 'document' | 'before' | 'after';
  issue_id?: string;
  uploaded_at: string;
}

export interface InspectionChecklist {
  id: string;
  category: string;
  items: ChecklistItem[];
  completed: boolean;
  completed_by?: string;
  completed_at?: string;
}

export interface ChecklistItem {
  id: string;
  description: string;
  required: boolean;
  status: 'pass' | 'fail' | 'not_applicable' | 'not_checked';
  notes?: string;
  photos?: string[];
}

// === Traffic and Legal Types ===

export interface TrafficViolation extends BaseEntity {
  vehicle_id: string;
  violation_number: string;

  // Violation details
  violation_date: string;
  violation_time?: string;
  violation_type: string;
  violation_category: 'speeding' | 'parking' | 'documentation' | 'equipment' | 'traffic_rules' | 'other';
  violation_description?: string;
  location?: string;
  city?: string;

  // Financial information
  fine_amount: number;
  currency: string;
  late_fee?: number;
  discount_amount?: number;
  total_amount: number;
  paid_amount?: number;
  balance_amount?: number;

  // Issuing authority
  issuing_authority?: string;
  officer_name?: string;
  officer_badge_number?: string;
  department?: string;

  // Driver information
  driver_name?: string;
  driver_license?: string;
  driver_phone?: string;
  driver_relationship?: 'owner' | 'employee' | 'renter' | 'authorized_driver' | 'unauthorized';

  // Status and processing
  status: 'pending' | 'paid' | 'appealed' | 'cancelled' | 'overdue' | 'in_court' | 'dismissed' | 'duplicate';
  payment_status: 'unpaid' | 'partial' | 'paid' | 'refunded';
  processing_status: 'new' | 'under_review' | 'ready_for_payment' | 'processing_payment' | 'completed';

  // Deadlines and dates
  due_date?: string;
  original_due_date?: string;
  paid_date?: string;
  appeal_deadline?: string;
  court_date?: string;

  // Payment information
  payment_method?: string;
  payment_reference?: string;
  payment_gateway?: string;
  transaction_id?: string;

  // Appeal and court proceedings
  appeal_date?: string;
  appeal_status?: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  appeal_reason?: string;
  court_status?: string;
  case_number?: string;

  // Consequences
  points_deducted?: number;
  license_suspended: boolean;
  suspension_period?: string;
  vehicle_impounded: boolean;
  impound_location?: string;
  impound_start_date?: string;
  impound_release_date?: string;
  impound_fees?: number;

  // Documentation
  photos?: ViolationPhoto[];
  documents?: DocumentCollection;
  evidence_urls?: string[];

  // Assignments and responsibility
  responsible_party?: 'owner' | 'driver' | 'company' | 'renter' | 'disputed';
  cost_center_id?: string;
  invoice_id?: string;

  // Metadata
  notes?: string;
  internal_notes?: string;
  priority: 'low' | 'medium' | 'high';
  reminder_sent?: boolean;
  last_reminder_date?: string;

  // Integration
  external_system_id?: string;
  data_source: 'manual' | 'api' | 'import' | 'scan';
  sync_status: 'synced' | 'pending' | 'failed';
  last_sync_date?: string;
}

export interface ViolationPhoto {
  id: string;
  url: string;
  photo_type: 'vehicle' | 'license_plate' | 'violation_scene' | 'document' | 'damage';
  caption?: string;
  taken_at?: string;
  location?: string;
}

// === Activity and Tracking Types ===

export interface VehicleActivityLog extends BaseEntity {
  vehicle_id: string;
  activity_type: string;
  activity_category: 'usage' | 'maintenance' | 'inspection' | 'legal' | 'financial' | 'administrative' | 'other';

  // Activity details
  description?: string;
  activity_date: string;
  activity_time?: string;
  duration_minutes?: number;

  // Location
  location?: string;
  latitude?: number;
  longitude?: number;
  address?: string;

  // Usage metrics
  mileage?: number;
  mileage_start?: number;
  mileage_end?: number;
  fuel_consumed?: number;
  fuel_level_start?: number;
  fuel_level_end?: number;

  // Financial information
  cost_amount?: number;
  currency?: string;
  cost_center_id?: string;

  // People involved
  performed_by?: string;
  supervised_by?: string;
  customer_id?: string;
  driver_id?: string;

  // References
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  contract_id?: string;
  maintenance_id?: string;

  // Status and outcome
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  outcome?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;

  // Documentation
  attachments?: string[];
  photos?: string[];
  documents?: DocumentCollection;

  // Metadata
  notes?: string;
  internal_notes?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  visibility?: 'public' | 'internal' | 'restricted';
}

// === Form Data Types ===

export interface VehicleFormData {
  // Basic identification
  plate_number: string;
  vin_number?: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  color_ar?: string;

  // Registration
  registration_number?: string;
  registration_date?: string;
  registration_expiry?: string;
  ownership_status?: 'owned' | 'leased' | 'rented' | 'financed';
  legal_owner?: string;

  // Classification
  vehicle_type?: string;
  vehicle_category?: string;
  segment?: string;
  body_type?: string;

  // Technical specifications
  engine_number?: string;
  engine_type?: string;
  transmission_type?: string;
  drive_type?: string;
  fuel_type?: string;
  fuel_capacity?: number;
  fuel_consumption?: number;

  // Capacity
  seating_capacity?: number;
  cargo_capacity?: number;
  towing_capacity?: number;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  payload_capacity?: number;

  // Performance
  horsepower?: number;
  torque?: number;
  acceleration_0_100?: number;
  top_speed?: number;
  fuel_efficiency_rating?: string;

  // Status
  status?: string;
  is_active?: boolean;
  current_location?: string;

  // Usage metrics
  odometer_reading?: number;
  fuel_level?: number;
  last_service_mileage?: number;
  next_service_mileage?: number;

  // Financial information
  purchase_date?: string;
  purchase_cost?: number;
  current_value?: number;
  salvage_value?: number;
  depreciation_rate?: number;
  useful_life_years?: number;

  // Lease/Finance
  lease_start_date?: string;
  lease_end_date?: string;
  monthly_lease_amount?: number;
  lease_company?: string;

  // Insurance
  insurance_policy?: string;
  insurance_company?: string;
  insurance_expiry?: string;
  insurance_coverage?: string;

  // Pricing
  daily_rate?: number;
  weekly_rate?: number;
  monthly_rate?: number;
  yearly_rate?: number;
  deposit_amount?: number;
  extra_km_charge?: number;
  included_km_per_day?: number;

  // Minimum pricing
  minimum_daily_rate?: number;
  minimum_weekly_rate?: number;
  minimum_monthly_rate?: number;
  enforce_minimum_price?: boolean;

  // Features
  features?: string[];
  safety_features?: string[];
  entertainment_features?: string[];
  comfort_features?: string[];

  // Maintenance
  last_service_date?: string;
  next_service_due?: string;
  service_interval_km?: number;
  service_interval_months?: number;
  warranty_start_date?: string;
  warranty_end_date?: string;

  // Condition
  vehicle_condition?: string;
  condition_rating?: number;
  last_inspection_date?: string;
  next_inspection_due?: string;

  // Documents and media
  documents?: DocumentCollection;
  images?: File[];
  selectedCompanyId?: string;

  // Other
  notes?: string;
  tags?: string[];
  internal_notes?: string;
  cost_center_id?: string;
  fixed_asset_id?: string;
}

export interface VehicleMaintenanceFormData {
  vehicle_id: string;
  maintenance_number?: string;
  maintenance_type: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  description: string;
  scheduled_date?: string;
  estimated_cost?: number;
  estimated_duration?: number;
  service_provider?: string;
  service_provider_contact?: string;
  technician_name?: string;
  notes?: string;
  work_performed?: string;
  parts_replaced?: string[];
  fluids_changed?: string[];
  photos?: File[];
  documents?: DocumentCollection;
  cost_center_id?: string;
  invoice_id?: string;
}

// === Filter and Search Types ===

export interface VehicleFilters {
  search?: string;
  vehicle_type?: string;
  vehicle_category?: string;
  make?: string;
  model?: string;
  year?: number;
  year_min?: number;
  year_max?: number;
  status?: string;
  availability_status?: string;
  ownership_status?: string;
  engine_type?: string;
  transmission_type?: string;
  fuel_type?: string;
  location?: string;
  city?: string;
  country?: string;

  // Financial filters
  daily_rate_min?: number;
  daily_rate_max?: number;
  purchase_cost_min?: number;
  purchase_cost_max?: number;

  // Technical filters
  seating_capacity_min?: number;
  seating_capacity_max?: number;
  fuel_capacity_min?: number;
  fuel_capacity_max?: number;

  // Date filters
  registration_expiry_before?: string;
  registration_expiry_after?: string;
  insurance_expiry_before?: string;
  insurance_expiry_after?: string;
  next_service_due_before?: string;

  // Boolean filters
  has_gps?: boolean;
  has_camera?: boolean;
  requires_maintenance?: boolean;
  has_active_contract?: boolean;

  // Feature filters
  features?: string[];
  safety_features?: string[];

  // Pagination and sorting
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// === Analytics and Reporting Types ===

export interface VehicleMetrics {
  total_vehicles: number;
  active_vehicles: number;
  available_vehicles: number;
  rented_vehicles: number;
  maintenance_vehicles: number;
  out_of_service_vehicles: number;

  // Utilization
  average_utilization_rate: number;
  peak_utilization_rate: number;
  low_utilization_vehicles: number;

  // Financial
  total_fleet_value: number;
  average_daily_rate: number;
  total_monthly_revenue: number;
  maintenance_cost_percentage: number;

  // Performance
  average_age_years: number;
  average_km_per_vehicle: number;
  fuel_efficiency_average: number;

  // Maintenance
  vehicles_due_service: number;
  overdue_maintenance_vehicles: number;
  average_maintenance_cost: number;

  // Compliance
  vehicles_with_valid_insurance: number;
  vehicles_with_valid_registration: number;
  expiring_documents_30_days: number;

  // Breakdown by type
  vehicles_by_type: Record<string, number>;
  vehicles_by_make: Record<string, number>;
  vehicles_by_status: Record<string, number>;
  vehicles_by_location: Record<string, number>;
}

export interface VehiclePerformanceReport {
  vehicle_id: string;
  period_start: string;
  period_end: string;

  // Utilization metrics
  total_days_available: number;
  total_days_rented: number;
  utilization_rate: number;
  total_revenue: number;
  daily_average_revenue: number;

  // Cost metrics
  total_maintenance_cost: number;
  total_fuel_cost: number;
  total_insurance_cost: number;
  total_other_costs: number;
  net_profit: number;
  profit_margin: number;

  // Usage metrics
  total_km_driven: number;
  average_km_per_day: number;
  average_km_per_rental: number;
  fuel_consumption_total: number;
  fuel_efficiency_actual: number;

  // Maintenance metrics
  maintenance_events: number;
  average_maintenance_cost: number;
  days_in_maintenance: number;
  maintenance_downtime_percentage: number;

  // Customer satisfaction
  average_customer_rating: number;
  complaints_count: number;
  positive_reviews_count: number;

  // Comparison
  utilization_vs_fleet_average: number;
  revenue_vs_fleet_average: number;
  cost_vs_fleet_average: number;
  efficiency_vs_fleet_average: number;
}

// === Lazy-loaded relationship types ===
interface Contract {
  id: string;
  contract_number: string;
  customer_id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
}