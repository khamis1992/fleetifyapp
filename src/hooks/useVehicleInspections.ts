/**
 * useVehicleInspections Hook
 *
 * Purpose: Query vehicle inspections for a contract or vehicle
 * Features:
 * - Fetch all inspections for a contract
 * - Fetch all inspections for a vehicle
 * - Filter by inspection type (check_in, check_out)
 * - Include related customer and vehicle details
 *
 * @module hooks/useVehicleInspections
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

/**
 * Vehicle Inspection Interface
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
  exterior_condition: Array<DamageRecord> | string;
  interior_condition: Array<DamageRecord> | string;
  photo_urls: string[];
  notes: string | null;
  customer_signature: string | null;
  created_at: string;
  
  // Visual inspection fields
  vehicle_type?: string | null;
  visual_inspection_zones?: Array<any>;
  accessories?: Array<string>;
  documents?: Array<string>;
  status?: string | null;

  // Related data
  contract?: {
    id: string;
    contract_number: string;
  };
  vehicle?: {
    id: string;
    plate_number: string;
    make: string;
    model: string;
  };
  inspector?: {
    id: string;
    full_name: string;
  };
}

/**
 * Damage Record Interface
 */
export interface DamageRecord {
  location: string;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  photo_url?: string;
}

/**
 * Hook Options
 */
interface UseVehicleInspectionsOptions {
  contractId?: string;
  vehicleId?: string;
  inspectionType?: 'check_in' | 'check_out';
  enabled?: boolean;
}

/**
 * useVehicleInspections Hook
 *
 * @param options - Query options for filtering inspections
 * @returns React Query result with vehicle inspections data
 *
 * @example
 * // Get all inspections for a contract
 * const { data: inspections } = useVehicleInspections({ contractId: 'xxx' });
 *
 * @example
 * // Get only check-in inspections for a vehicle
 * const { data: checkIns } = useVehicleInspections({
 *   vehicleId: 'xxx',
 *   inspectionType: 'check_in'
 * });
 */
export function useVehicleInspections(options: UseVehicleInspectionsOptions = {}) {
  const { contractId, vehicleId, inspectionType, enabled = true } = options;
  const { currentCompanyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['vehicle-inspections', currentCompanyId, contractId, vehicleId, inspectionType],
    queryFn: async () => {
      if (!currentCompanyId) {
        throw new Error('No company context available');
      }

      // Build the query
      let query = supabase
        .from('vehicle_inspections')
        .select(`
          id,
          company_id,
          contract_id,
          vehicle_id,
          inspection_type,
          inspected_by,
          inspection_date,
          fuel_level,
          odometer_reading,
          cleanliness_rating,
          exterior_condition,
          interior_condition,
          photo_urls,
          notes,
          customer_signature,
          created_at,
          vehicle_type,
          visual_inspection_zones,
          accessories,
          documents,
          status,
          contracts:contract_id (
            id,
            contract_number
          ),
          vehicles:vehicle_id (
            id,
            plate_number,
            make,
            model
          ),
          profiles:inspected_by (
            id,
            full_name
          )
        `)
        .eq('company_id', currentCompanyId)
        .order('inspection_date', { ascending: false });

      // Apply filters
      if (contractId) {
        query = query.eq('contract_id', contractId);
      }

      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId);
      }

      if (inspectionType) {
        query = query.eq('inspection_type', inspectionType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching vehicle inspections:', error);
        throw error;
      }

      // Transform the data to match our interface
      return (data || []).map((inspection: any) => ({
        id: inspection.id,
        company_id: inspection.company_id,
        contract_id: inspection.contract_id,
        vehicle_id: inspection.vehicle_id,
        inspection_type: inspection.inspection_type,
        inspected_by: inspection.inspected_by,
        inspection_date: inspection.inspection_date,
        fuel_level: inspection.fuel_level,
        odometer_reading: inspection.odometer_reading,
        cleanliness_rating: inspection.cleanliness_rating,
        exterior_condition: inspection.exterior_condition || [],
        interior_condition: inspection.interior_condition || [],
        photo_urls: inspection.photo_urls || [],
        notes: inspection.notes,
        customer_signature: inspection.customer_signature,
        created_at: inspection.created_at,
        vehicle_type: inspection.vehicle_type,
        visual_inspection_zones: inspection.visual_inspection_zones || [],
        accessories: inspection.accessories || [],
        documents: inspection.documents || [],
        status: inspection.status,
        contract: inspection.contracts ? {
          id: inspection.contracts.id,
          contract_number: inspection.contracts.contract_number,
        } : undefined,
        vehicle: inspection.vehicles ? {
          id: inspection.vehicles.id,
          plate_number: inspection.vehicles.plate_number,
          make: inspection.vehicles.make,
          model: inspection.vehicles.model,
        } : undefined,
        inspector: inspection.profiles ? {
          id: inspection.profiles.id,
          full_name: inspection.profiles.full_name,
        } : undefined,
      })) as VehicleInspection[];
    },
    enabled: enabled && !!currentCompanyId,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });
}

/**
 * useInspectionComparison Hook
 *
 * Compare check-in and check-out inspections for a contract
 *
 * @param contractId - The contract ID to compare inspections for
 * @returns Comparison data including new damages and fuel/odometer differences
 *
 * @example
 * const { data: comparison } = useInspectionComparison('contract-id');
 */
export function useInspectionComparison(contractId: string) {
  const { currentCompanyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['inspection-comparison', currentCompanyId, contractId],
    queryFn: async () => {
      if (!currentCompanyId || !contractId) {
        throw new Error('Missing required parameters');
      }

      // Fetch both inspections
      const { data: inspections, error } = await supabase
        .from('vehicle_inspections')
        .select('*')
        .eq('company_id', currentCompanyId)
        .eq('contract_id', contractId)
        .order('inspection_date', { ascending: true });

      if (error) {
        console.error('Error fetching inspections for comparison:', error);
        throw error;
      }

      const checkIn = inspections?.find((i) => i.inspection_type === 'check_in');
      const checkOut = inspections?.find((i) => i.inspection_type === 'check_out');

      if (!checkIn || !checkOut) {
        return null;
      }

      // Calculate differences
      const fuelDifference = (checkOut.fuel_level || 0) - (checkIn.fuel_level || 0);
      const odometerDifference = (checkOut.odometer_reading || 0) - (checkIn.odometer_reading || 0);
      const cleanlinessDifference = (checkOut.cleanliness_rating || 0) - (checkIn.cleanliness_rating || 0);

      // Identify new damages (simple comparison - in production, you'd want more sophisticated logic)
      const checkInDamages = [
        ...(checkIn.exterior_condition || []),
        ...(checkIn.interior_condition || []),
      ];
      const checkOutDamages = [
        ...(checkOut.exterior_condition || []),
        ...(checkOut.interior_condition || []),
      ];

      const newDamages = checkOutDamages.filter(
        (outDamage: any) =>
          !checkInDamages.some(
            (inDamage: any) =>
              inDamage.location === outDamage.location &&
              inDamage.description === outDamage.description
          )
      );

      return {
        checkIn,
        checkOut,
        differences: {
          fuel: fuelDifference,
          odometer: odometerDifference,
          cleanliness: cleanlinessDifference,
        },
        newDamages,
        hasNewDamages: newDamages.length > 0,
      };
    },
    enabled: !!currentCompanyId && !!contractId,
  });
}
