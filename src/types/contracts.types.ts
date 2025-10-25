/**
 * Contract-related TypeScript interfaces
 * Phase 2 UX Improvements - Contract Drafts
 * Phase 4 UX Improvements - Vehicle Inspections
 */

export interface ContractDraft {
  id: string;
  company_id: string;
  user_id: string;
  draft_data: Record<string, unknown>; // JSON object with contract form data
  customer_id?: string | null;
  vehicle_id?: string | null;
  draft_name?: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface ContractDraftInput {
  draft_data: Record<string, unknown>;
  customer_id?: string | null;
  vehicle_id?: string | null;
  draft_name?: string | null;
}

export interface ContractDraftUpdateInput {
  draft_data?: Record<string, unknown>;
  customer_id?: string | null;
  vehicle_id?: string | null;
  draft_name?: string | null;
}

/**
 * Vehicle Inspection Interfaces
 * Task 4.2: Vehicle Check-In/Check-Out Workflow
 */

export interface VehicleInspection {
  id: string;
  company_id: string;
  contract_id: string;
  vehicle_id: string;
  inspection_type: 'check_in' | 'check_out';
  inspected_by: string | null;
  inspection_date: string;
  fuel_level: number | null;
  odometer_reading: number | null;
  cleanliness_rating: number | null;
  exterior_condition: DamageRecord[];
  interior_condition: DamageRecord[];
  photo_urls: string[];
  notes: string | null;
  customer_signature: string | null;
  created_at: string;
}

export interface DamageRecord {
  location: string;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  photo_url?: string;
}

export interface InspectionComparison {
  checkIn: VehicleInspection;
  checkOut: VehicleInspection;
  differences: {
    fuel: number;
    odometer: number;
    cleanliness: number;
  };
  newDamages: DamageRecord[];
  hasNewDamages: boolean;
}
