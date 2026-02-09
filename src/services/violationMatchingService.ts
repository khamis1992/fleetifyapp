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

  // Add leading zeros (pad to 6, 7, and 8 digits)
  if (normalized.length < 8 && /^\d+$/.test(normalized)) {
    // Pad to 6 digits
    if (normalized.length < 6) {
      const padded6 = normalized.padStart(6, '0');
      if (!variations.includes(padded6)) {
        variations.push(padded6);
      }
    }
    
    // Pad to 7 digits
    if (normalized.length < 7) {
      const padded7 = normalized.padStart(7, '0');
      if (!variations.includes(padded7)) {
        variations.push(padded7);
      }
    }
    
    // Pad to 8 digits
    const padded8 = normalized.padStart(8, '0');
    if (!variations.includes(padded8)) {
      variations.push(padded8);
    }
  }

  // Add original plate with spaces removed (in case it was stored with spaces)
  const noSpaces = plate.replace(/\s+/g, '');
  if (noSpaces !== normalized && !variations.includes(noSpaces)) {
    variations.push(noSpaces);
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
    const normalizedVariations = variations.map(v => normalizePlateNumber(v));

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

    // Try matching via plate history (old plates linked to the same vehicle)
    const { data: historyMatch, error: historyError } = await supabase
      .from('vehicle_plate_history')
      .select('vehicle_id, old_plate_number, new_plate_number, changed_at')
      .eq('company_id', companyId)
      .in('old_plate_normalized', normalizedVariations)
      .order('changed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!historyError && historyMatch?.vehicle_id) {
      return {
        vehicle_id: historyMatch.vehicle_id,
        plate_number: historyMatch.new_plate_number || plateNumber,
        confidence: 'medium',
        reason: `مطابقة عبر سجل اللوحات (اللوحة القديمة: ${historyMatch.old_plate_number})`
      };
    }

    // Try partial/fuzzy match using ilike (plate number may contain the number)
    const numericOnly = normalizePlateNumber(plateNumber).replace(/\D/g, '');
    if (numericOnly.length >= 3) {
      // Try exact numeric match first
      const { data: exactNumericMatch, error: exactNumericError } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model, is_active')
        .eq('company_id', companyId)
        .or(`plate_number.eq.${numericOnly},plate_number.eq.0${numericOnly},plate_number.eq.00${numericOnly}`)
        .limit(1)
        .maybeSingle();

      if (!exactNumericError && exactNumericMatch) {
        return {
          vehicle_id: exactNumericMatch.id,
          plate_number: exactNumericMatch.plate_number,
          confidence: 'high',
          reason: `مطابقة رقمية للوحة ${exactNumericMatch.plate_number}`
        };
      }

      // Try partial match as last resort
      const { data: partialMatch, error: partialError } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model, is_active')
        .eq('company_id', companyId)
        .ilike('plate_number', `%${numericOnly}%`)
        .limit(1)
        .maybeSingle();

      if (!partialError && partialMatch) {
        return {
          vehicle_id: partialMatch.id,
          plate_number: partialMatch.plate_number,
          confidence: 'low',
          reason: `مطابقة جزئية للرقم ${numericOnly} مع اللوحة ${partialMatch.plate_number}`
        };
      }
    }

    // Log the failed search for debugging
    console.warn(`⚠️ Failed to find vehicle with plate: "${plateNumber}". Tried variations:`, variations);

    return {
      vehicle_id: null,
      plate_number: plateNumber,
      confidence: 'none',
      reason: `لم يتم العثور على مركبة بهذا الرقم (${plateNumber})`
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
  // جلب جميع المركبات (نشطة وغير نشطة) لضمان مطابقة المخالفات
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, plate_number')
    .eq('company_id', companyId);

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
      // إضافة الأرقام فقط كمفتاح إضافي للبحث الجزئي
      const numericOnly = vehicle.plate_number.replace(/\D/g, '');
      if (numericOnly.length >= 3) {
        plateToVehicleId.set(numericOnly, vehicle.id);
      }
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
        customer_name: customerName,
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
        customer_name: customerName,
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
        customer_name: customerName,
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
      customer_name: customerName,
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

  // بحث بالأرقام فقط (إزالة الأحرف)
  const numericOnly = normalizePlateNumber(plateNumber).replace(/\D/g, '');
  if (numericOnly.length >= 3) {
    const vehicleId = vehicleCache.get(numericOnly);
    if (vehicleId) {
      return {
        vehicle_id: vehicleId,
        plate_number: numericOnly,
        confidence: 'medium',
        reason: `مطابقة بالرقم ${numericOnly}`
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
 * Fetch all contracts with customer info for batch matching
 */
async function fetchContractsForMatching(companyId: string): Promise<Map<string, any[]>> {
  console.log('📋 Fetching contracts for batch matching...');
  
  const { data: contracts, error } = await supabase
    .from('contracts')
    .select(`
      id,
      contract_number,
      status,
      start_date,
      end_date,
      vehicle_id,
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
    .eq('company_id', companyId)
    .order('end_date', { ascending: false });

  if (error || !contracts) {
    console.error('Error fetching contracts:', error);
    return new Map();
  }

  // Group contracts by vehicle_id
  const contractsByVehicle = new Map<string, any[]>();
  contracts.forEach(contract => {
    if (contract.vehicle_id) {
      const existing = contractsByVehicle.get(contract.vehicle_id) || [];
      existing.push(contract);
      contractsByVehicle.set(contract.vehicle_id, existing);
    }
  });

  console.log(`✅ Loaded ${contracts.length} contracts for ${contractsByVehicle.size} vehicles`);
  return contractsByVehicle;
}

/**
 * Match violation to contract using cached contracts (in-memory)
 */
function matchToContractFromCache(
  vehicleId: string,
  violationDate: string,
  contractsCache: Map<string, any[]>
): ContractMatchResult {
  const contracts = contractsCache.get(vehicleId);
  
  if (!contracts || contracts.length === 0) {
    return {
      contract_id: null,
      customer_id: null,
      customer_name: null,
      contract_number: null,
      confidence: 'none',
      reason: 'لا يوجد عقود لهذه المركبة'
    };
  }

  const vDate = new Date(violationDate);

  // Helper function to extract customer name
  const getCustomerName = (contract: any): string => {
    const customer = contract.customers as any;
    return customer?.company_name ||
      `${customer?.first_name_ar || ''} ${customer?.last_name_ar || ''}`.trim() ||
      `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() ||
      '';
  };

  // Helper function to check if date is in range
  const isInRange = (startDate: string | null, endDate: string | null): boolean => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const afterStart = !start || vDate >= start;
    const beforeEnd = !end || vDate <= end;
    return afterStart && beforeEnd;
  };

  // Tier 1: Active contract with date range match
  const activeInRange = contracts.find(c => 
    c.status === 'active' && isInRange(c.start_date, c.end_date)
  );
  if (activeInRange) {
    return {
      contract_id: activeInRange.id,
      customer_id: activeInRange.customer_id,
      customer_name: getCustomerName(activeInRange),
      contract_number: activeInRange.contract_number,
      confidence: 'high',
      reason: `عقد نشط (${activeInRange.contract_number})`
    };
  }

  // Tier 2: Any contract with date range match
  const inRange = contracts.find(c => isInRange(c.start_date, c.end_date));
  if (inRange) {
    return {
      contract_id: inRange.id,
      customer_id: inRange.customer_id,
      customer_name: getCustomerName(inRange),
      contract_number: inRange.contract_number,
      confidence: 'medium',
      reason: `عقد (${inRange.contract_number}) - ${inRange.status === 'active' ? 'نشط' : inRange.status}`
    };
  }

  // Tier 3: Most recent contract
  const mostRecent = contracts[0];
  return {
    contract_id: mostRecent.id,
    customer_id: mostRecent.customer_id,
    customer_name: getCustomerName(mostRecent),
    contract_number: mostRecent.contract_number,
    confidence: 'low',
    reason: 'أحدث عقد متوفر'
  };
}

/**
 * Batch match multiple violations - OPTIMIZED VERSION
 * Fetches all data once, then matches in-memory
 */
export async function matchViolationsBatch(
  violations: ExtractedViolation[],
  companyId: string
): Promise<MatchedViolation[]> {
  console.log(`🚀 Starting batch matching for ${violations.length} violations...`);
  
  // Step 1: Build vehicle cache for efficiency
  console.log('📋 Step 1: Loading vehicles...');
  const vehicleCache = await fetchVehiclesForMatching(companyId);
  console.log(`✅ Loaded ${vehicleCache.size} vehicle plate variations`);

  // Step 2: Fetch all contracts with customers
  console.log('📋 Step 2: Loading contracts...');
  const contractsCache = await fetchContractsForMatching(companyId);

  // Step 3: Match all violations in-memory (no DB calls)
  console.log('📋 Step 3: Matching violations...');
  const results: MatchedViolation[] = [];
  
  for (let i = 0; i < violations.length; i++) {
    const violation = violations[i];
    const id = `temp_${Date.now()}_${i}`;
    
    // Match to vehicle
    const vehicleMatch = await matchToVehicleFromCache(violation.plate_number, vehicleCache);
    
    if (!vehicleMatch.vehicle_id) {
      results.push({
        ...violation,
        id,
        match_confidence: 'none',
        status: 'error',
        errors: [vehicleMatch.reason],
        warnings: []
      });
      continue;
    }

    // Match to contract (in-memory)
    const contractMatch = matchToContractFromCache(
      vehicleMatch.vehicle_id,
      violation.date,
      contractsCache
    );

    // Determine overall confidence
    const overallConfidence: MatchConfidence = 
      contractMatch.confidence === 'high' ? 'high' :
      contractMatch.confidence === 'medium' ? 'medium' :
      contractMatch.confidence === 'low' ? 'low' : 'none';

    results.push({
      ...violation,
      id,
      vehicle_id: vehicleMatch.vehicle_id,
      contract_id: contractMatch.contract_id,
      customer_id: contractMatch.customer_id,
      customer_name: contractMatch.customer_name || undefined,
      contract_number: contractMatch.contract_number || undefined,
      match_confidence: overallConfidence,
      status: overallConfidence === 'none' ? 'error' : 'matched',
      errors: [],
      warnings: []
    });

    // Log progress every 100 violations
    if ((i + 1) % 100 === 0) {
      console.log(`📊 Matched ${i + 1}/${violations.length} violations...`);
    }
  }

  const matched = results.filter(r => r.status === 'matched').length;
  const errors = results.filter(r => r.status === 'error').length;
  console.log(`✅ Batch matching complete: ${matched} matched, ${errors} errors`);

  return results;
}
