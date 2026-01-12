// ============================================================================
// Violation Matching Service
// Handles matching violations to vehicles, contracts, and customers
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import {
  ExtractedViolation,
  MatchedViolation,
  VehicleMatchResult,
  ContractMatchResult,
  MatchConfidence,
  MatchConfidenceInput
} from '@/types/violations';

// ----------------------------------------------------------------------------
// Vehicle Matching
// ----------------------------------------------------------------------------

/**
 * Normalize plate number for matching
 * Handles: whitespace, leading zeros, case sensitivity
 */
function normalizePlateNumber(plate: string): string {
  return plate.trim().replace(/\s+/g, '').toUpperCase();
}

/**
 * Create plate number variations for matching
 * Helps match plates that might have different formatting
 */
function createPlateVariations(plate: string): string[] {
  const normalized = normalizePlateNumber(plate);
  const variations: string[] = [normalized];

  // Remove leading zeros
  const withoutZeros = normalized.replace(/^0+/, '');
  if (withoutZeros !== normalized && withoutZeros.length > 0) {
    variations.push(withoutZeros);
  }

  // Add leading zeros (pad to 6-7 digits)
  if (normalized.length < 7 && /^\d+$/.test(normalized)) {
    const padded = normalized.padStart(7, '0');
    if (padded !== normalized) {
      variations.push(padded);
    }
  }

  return variations;
}

/**
 * Match violation to vehicle by plate number
 */
export async function matchToVehicle(
  plateNumber: string,
  companyId: string
): Promise<VehicleMatchResult> {
  try {
    const variations = createPlateVariations(plateNumber);

    // Try each variation
    for (const plate of variations) {
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model, is_active')
        .eq('company_id', companyId)
        .eq('plate_number', plate)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && vehicle) {
        return {
          vehicle_id: vehicle.id,
          plate_number: vehicle.plate_number,
          confidence: 'high',
          reason: `مطابقة للوحة ${plate}`
        };
      }
    }

    // Try with is_active = false as fallback
    for (const plate of variations) {
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model, is_active')
        .eq('company_id', companyId)
        .eq('plate_number', plate)
        .maybeSingle();

      if (!error && vehicle) {
        return {
          vehicle_id: vehicle.id,
          plate_number: vehicle.plate_number,
          confidence: 'medium',
          reason: `مطابقة للوحة ${plate} (المركبة غير نشطة)`
        };
      }
    }

    return {
      vehicle_id: null,
      plate_number: plateNumber,
      confidence: 'none',
      reason: 'لم يتم العثور على مركبة بهذا الرقم'
    };
  } catch (error) {
    console.error('Error matching vehicle:', error);
    return {
      vehicle_id: null,
      plate_number: plateNumber,
      confidence: 'none',
      reason: `خطأ في البحث: ${error.message}`
    };
  }
}

/**
 * Fetch multiple vehicles at once for batch matching
 */
export async function fetchVehiclesForMatching(companyId: string): Promise<Map<string, string>> {
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, plate_number')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (error || !vehicles) {
    return new Map();
  }

  const plateToVehicleId = new Map<string, string>();

  vehicles.forEach(vehicle => {
    if (vehicle.plate_number) {
      const variations = createPlateVariations(vehicle.plate_number);
      variations.forEach(plate => {
        plateToVehicleId.set(plate, vehicle.id);
      });
    }
  });

  return plateToVehicleId;
}

// ----------------------------------------------------------------------------
// Contract Matching (4-Tier Algorithm)
// ----------------------------------------------------------------------------

/**
 * Calculate match confidence based on match criteria
 */
function calculateMatchConfidence(input: MatchConfidenceInput): MatchConfidence {
  // High confidence: Active contract + exact date match + vehicle + customer
  if (input.has_active_contract && input.date_range_match && input.vehicle_match && input.customer_found) {
    return 'high';
  }

  // High confidence: Active contract + date match (vehicle implied)
  if (input.has_active_contract && input.date_range_match) {
    return 'high';
  }

  // Medium: Date match but not active
  if (input.date_range_match && !input.has_active_contract && input.vehicle_match) {
    return 'medium';
  }

  // Medium: Close date match (within 7 days)
  if (input.days_from_violation !== undefined && input.days_from_violation <= 7) {
    return 'medium';
  }

  // Low: Vehicle match but no date match
  if (input.vehicle_match && !input.date_range_match) {
    return 'low';
  }

  // Low: Closest contract (more than 7 days)
  if (input.days_from_violation !== undefined && input.days_from_violation > 7) {
    return 'low';
  }

  return 'none';
}

/**
 * Check if a date falls within contract date range
 */
function isDateInRange(violationDate: Date, startDate: Date | null, endDate: Date | null): boolean {
  const isAfterStart = !startDate || violationDate >= startDate;
  const isBeforeEnd = !endDate || violationDate <= endDate;
  return isAfterStart && isBeforeEnd;
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  return Math.abs(Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Match violation to contract using 4-tier algorithm
 */
export async function matchToContract(
  vehicleId: string,
  violationDate: string
): Promise<ContractMatchResult> {
  try {
    const vDate = new Date(violationDate);

    // Fetch all contracts for this vehicle
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select(`
        id,
        contract_number,
        status,
        start_date,
        end_date,
        customer_id,
        customers (
          id,
          first_name_ar,
          last_name_ar,
          first_name,
          last_name,
          company_name
        )
      `)
      .eq('vehicle_id', vehicleId)
      .order('end_date', { ascending: false });

    if (error || !contracts || contracts.length === 0) {
      return {
        contract_id: null,
        customer_id: null,
        customer_name: null,
        contract_number: null,
        confidence: 'none',
        reason: 'لا يوجد عقود لهذه المركبة'
      };
    }

    // Tier 1: Active contract with date range match
    const activeContractsInRange = contracts.filter(contract => {
      if (contract.status !== 'active') return false;
      const startDate = contract.start_date ? new Date(contract.start_date) : null;
      const endDate = contract.end_date ? new Date(contract.end_date) : null;
      return isDateInRange(vDate, startDate, endDate);
    });

    if (activeContractsInRange.length > 0) {
      // Most recent active contract
      const contract = activeContractsInRange[0];
      const customer = contract.customers as any;
      const customerName = customer?.company_name ||
        `${customer?.first_name_ar || ''} ${customer?.last_name_ar || ''}`.trim() ||
        `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim();

      return {
        contract_id: contract.id,
        customer_id: contract.customer_id,
        customer_name,
        contract_number: contract.contract_number,
        confidence: 'high',
        reason: `عقد نشط (${contract.contract_number})`
      };
    }

    // Tier 2: Any contract with date range match
    const contractsInRange = contracts.filter(contract => {
      const startDate = contract.start_date ? new Date(contract.start_date) : null;
      const endDate = contract.end_date ? new Date(contract.end_date) : null;
      return isDateInRange(vDate, startDate, endDate);
    });

    if (contractsInRange.length > 0) {
      // Prefer active, then most recent
      const contract = contractsInRange[0];
      const customer = contract.customers as any;
      const customerName = customer?.company_name ||
        `${customer?.first_name_ar || ''} ${customer?.last_name_ar || ''}`.trim() ||
        `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim();

      return {
        contract_id: contract.id,
        customer_id: contract.customer_id,
        customer_name,
        contract_number: contract.contract_number,
        confidence: 'medium',
        reason: `عقد (${contract.contract_number}) - ${contract.status === 'active' ? 'نشط' : contract.status}`
      };
    }

    // Tier 3: Most recent contract before violation
    const contractsBefore = contracts
      .filter(contract => {
        const endDate = contract.end_date ? new Date(contract.end_date) : null;
        return endDate && endDate < vDate;
      })
      .sort((a, b) => {
        const dateA = new Date(a.end_date!);
        const dateB = new Date(b.end_date!);
        return dateB.getTime() - dateA.getTime();
      });

    if (contractsBefore.length > 0) {
      const contract = contractsBefore[0];
      const daysDiff = daysBetween(vDate, new Date(contract.end_date!));
      const customer = contract.customers as any;
      const customerName = customer?.company_name ||
        `${customer?.first_name_ar || ''} ${customer?.last_name_ar || ''}`.trim() ||
        `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim();

      return {
        contract_id: contract.id,
        customer_id: contract.customer_id,
        customer_name,
        contract_number: contract.contract_number,
        confidence: daysDiff <= 7 ? 'medium' : 'low',
        reason: `أقرب عقد (${daysDiff} أيام قبل المخالفة)`
      };
    }

    // Tier 4: Last resort - most recent contract overall
    const contract = contracts[0];
    const customer = contract.customers as any;
    const customerName = customer?.company_name ||
      `${customer?.first_name_ar || ''} ${customer?.last_name_ar || ''}`.trim() ||
      `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim();

    return {
      contract_id: contract.id,
      customer_id: contract.customer_id,
      customer_name,
      contract_number: contract.contract_number,
      confidence: 'low',
      reason: 'أحدث عقد متوفر'
    };

  } catch (error) {
    console.error('Error matching contract:', error);
    return {
      contract_id: null,
      customer_id: null,
      customer_name: null,
      contract_number: null,
      confidence: 'none',
      reason: `خطأ في البحث: ${error.message}`
    };
  }
}

// ----------------------------------------------------------------------------
// Full Matching Pipeline
// ----------------------------------------------------------------------------

/**
 * Match a single violation to vehicle, contract, and customer
 */
export async function matchViolation(
  violation: ExtractedViolation,
  companyId: string,
  vehicleCache?: Map<string, string>
): Promise<MatchedViolation> {
  const id = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Step 1: Match to vehicle
  const vehicleMatch = vehicleCache
    ? await matchToVehicleFromCache(violation.plate_number, vehicleCache)
    : await matchToVehicle(violation.plate_number, companyId);

  if (!vehicleMatch.vehicle_id) {
    errors.push(vehicleMatch.reason);
    return {
      ...violation,
      id,
      match_confidence: 'none',
      status: 'error',
      errors,
      warnings
    };
  }

  // Step 2: Match to contract
  const contractMatch = await matchToContract(vehicleMatch.vehicle_id, violation.date);

  // Step 3: Determine overall confidence
  const confidenceInput: MatchConfidenceInput = {
    has_active_contract: contractMatch.confidence === 'high',
    date_range_match: contractMatch.confidence !== 'none',
    vehicle_match: !!vehicleMatch.vehicle_id,
    customer_found: !!contractMatch.customer_id
  };

  const overallConfidence = calculateMatchConfidence(confidenceInput);

  // Step 4: Build result
  const result: MatchedViolation = {
    ...violation,
    id,
    vehicle_id: vehicleMatch.vehicle_id,
    contract_id: contractMatch.contract_id,
    customer_id: contractMatch.customer_id,
    customer_name: contractMatch.customer_name || undefined,
    contract_number: contractMatch.contract_number || undefined,
    match_confidence: overallConfidence,
    status: overallConfidence === 'none' ? 'error' : 'matched',
    errors,
    warnings
  };

  return result;
}

/**
 * Match vehicle using cached plate-to-vehicle map
 */
async function matchToVehicleFromCache(
  plateNumber: string,
  vehicleCache: Map<string, string>
): Promise<VehicleMatchResult> {
  const variations = createPlateVariations(plateNumber);

  for (const plate of variations) {
    const vehicleId = vehicleCache.get(plate);
    if (vehicleId) {
      return {
        vehicle_id: vehicleId,
        plate_number: plate,
        confidence: 'high',
        reason: `مطابقة للوحة ${plate}`
      };
    }
  }

  return {
    vehicle_id: null,
    plate_number: plateNumber,
    confidence: 'none',
    reason: 'لم يتم العثور على مركبة بهذا الرقم'
  };
}

/**
 * Batch match multiple violations
 */
export async function matchViolationsBatch(
  violations: ExtractedViolation[],
  companyId: string
): Promise<MatchedViolation[]> {
  // Build vehicle cache for efficiency
  const vehicleCache = await fetchVehiclesForMatching(companyId);

  // Match all violations
  const results = await Promise.all(
    violations.map(v => matchViolation(v, companyId, vehicleCache))
  );

  return results;
}
