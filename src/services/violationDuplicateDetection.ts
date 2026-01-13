// ============================================================================
// Violation Duplicate Detection Service
// Checks for duplicate violations before import
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import {
  ExtractedViolation,
  DuplicateCheckResult,
  MatchedViolation
} from '@/types/violations';

type TrafficViolation = Database['public']['Tables']['traffic_violations']['Row'];

// ----------------------------------------------------------------------------
// Duplicate Check Types
// ----------------------------------------------------------------------------

/**
 * Check if violation is a duplicate by reference number
 */
export async function checkByReferenceNumber(
  referenceNumber: string,
  companyId: string
): Promise<DuplicateCheckResult> {
  if (!referenceNumber || referenceNumber.trim() === '') {
    return {
      is_duplicate: false,
      duplicate_type: 'none',
      confidence: 'low'
    };
  }

  const { data: existing, error } = await supabase
    .from('traffic_violations')
    .select('*')
    .eq('company_id', companyId)
    .eq('reference_number', referenceNumber)
    .maybeSingle();

  if (error) {
    console.error('Error checking duplicate by reference:', error);
    return {
      is_duplicate: false,
      duplicate_type: 'none',
      confidence: 'low'
    };
  }

  if (existing) {
    return {
      is_duplicate: true,
      existing_violation: existing,
      duplicate_type: 'reference_number',
      confidence: 'exact'
    };
  }

  return {
    is_duplicate: false,
    duplicate_type: 'none',
    confidence: 'low'
  };
}

/**
 * Check if violation is a duplicate by composite key (vehicle + violation_number + date)
 */
export async function checkByCompositeKey(
  vehicleId: string,
  violationNumber: string,
  violationDate: string,
  companyId: string
): Promise<DuplicateCheckResult> {
  const { data: existing, error } = await supabase
    .from('traffic_violations')
    .select('*')
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .eq('violation_number', violationNumber)
    .eq('violation_date', violationDate)
    .maybeSingle();

  if (error) {
    console.error('Error checking duplicate by composite key:', error);
    return {
      is_duplicate: false,
      duplicate_type: 'none',
      confidence: 'low'
    };
  }

  if (existing) {
    return {
      is_duplicate: true,
      existing_violation: existing,
      duplicate_type: 'composite',
      confidence: 'exact'
    };
  }

  return {
    is_duplicate: false,
    duplicate_type: 'none',
    confidence: 'low'
  };
}

/**
 * Find similar violations (fuzzy matching)
 * Checks for violations on same vehicle within a date range
 */
export async function findSimilar(
  vehicleId: string,
  violationDate: string,
  violationNumber: string,
  companyId: string
): Promise<DuplicateCheckResult> {
  // Check for violations within 3 days
  const date = new Date(violationDate);
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 3);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 3);

  const { data: similar, error } = await supabase
    .from('traffic_violations')
    .select('*')
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .gte('violation_date', startDate.toISOString())
    .lte('violation_date', endDate.toISOString())
    .limit(5);

  if (error || !similar || similar.length === 0) {
    return {
      is_duplicate: false,
      duplicate_type: 'none',
      confidence: 'low'
    };
  }

  // Check if any have the same violation number
  const exactMatch = similar.find(
    v => v.violation_number === violationNumber
  );

  if (exactMatch) {
    return {
      is_duplicate: true,
      existing_violation: exactMatch,
      duplicate_type: 'composite',
      confidence: 'exact'
    };
  }

  // Check for very close date match (same day)
  const sameDay = similar.find(v => {
    const vDate = new Date(v.violation_date);
    return vDate.toDateString() === date.toDateString();
  });

  if (sameDay) {
    return {
      is_duplicate: true,
      existing_violation: sameDay,
      duplicate_type: 'similar',
      confidence: 'high'
    };
  }

  return {
    is_duplicate: false,
    duplicate_type: 'none',
    confidence: 'low'
  };
}

/**
 * Check if violation is a duplicate by plate number and date
 * (Used when vehicle_id is not yet known)
 */
export async function checkByPlateAndDate(
  plateNumber: string,
  violationDate: string,
  violationNumber: string,
  companyId: string
): Promise<DuplicateCheckResult & { vehicle_id?: string }> {
  // First find the vehicle
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id')
    .eq('company_id', companyId)
    .eq('plate_number', plateNumber)
    .single();

  if (!vehicle) {
    return {
      is_duplicate: false,
      duplicate_type: 'none',
      confidence: 'low'
    };
  }

  // Check for duplicates
  const { data: existing, error } = await supabase
    .from('traffic_violations')
    .select('*')
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicle.id)
    .eq('violation_date', violationDate)
    .maybeSingle();

  if (error) {
    return {
      is_duplicate: false,
      duplicate_type: 'none',
      confidence: 'low'
    };
  }

  if (existing) {
    if (existing.violation_number === violationNumber) {
      return {
        is_duplicate: true,
        existing_violation: existing,
        vehicle_id: vehicle.id,
        duplicate_type: 'composite',
        confidence: 'exact'
      };
    }

    return {
      is_duplicate: true,
      existing_violation: existing,
      vehicle_id: vehicle.id,
      duplicate_type: 'similar',
      confidence: 'high'
    };
  }

  return {
    is_duplicate: false,
    duplicate_type: 'none',
    confidence: 'low',
    vehicle_id: vehicle.id
  };
}

// ----------------------------------------------------------------------------
// Batch Duplicate Checking (Optimized)
// ----------------------------------------------------------------------------

/**
 * Check multiple violations for duplicates - OPTIMIZED VERSION
 * Fetches all existing violations once and checks in-memory
 * Returns array of duplicate check results with same indices as input
 */
export async function checkDuplicatesBatch(
  violations: MatchedViolation[],
  companyId: string
): Promise<DuplicateCheckResult[]> {
  // Fast path: if no violations, return empty
  if (violations.length === 0) {
    return [];
  }

  console.log(`🔍 Checking duplicates for ${violations.length} violations...`);

  // Collect all violation numbers and vehicle IDs for batch lookup
  const violationNumbers = violations
    .map(v => v.violation_number)
    .filter((v): v is string => !!v);

  // Fetch all existing violations with matching violation_numbers in one query
  const { data: existingViolations, error } = await supabase
    .from('traffic_violations')
    .select('id, violation_number, reference_number, vehicle_id, violation_date')
    .eq('company_id', companyId)
    .in('violation_number', violationNumbers.slice(0, 1000)); // Limit to 1000 for query safety

  if (error) {
    console.error('Error fetching existing violations for duplicate check:', error);
    // Return no duplicates if we can't check
    return violations.map(() => ({
      is_duplicate: false,
      duplicate_type: 'none' as const,
      confidence: 'low' as const
    }));
  }

  // Build lookup maps for O(1) access
  const byViolationNumber = new Map<string, typeof existingViolations[0]>();
  const byCompositeKey = new Map<string, typeof existingViolations[0]>();

  (existingViolations || []).forEach(v => {
    if (v.violation_number) {
      byViolationNumber.set(v.violation_number, v);
    }
    // Composite key: vehicle_id + violation_number + date
    if (v.vehicle_id && v.violation_number && v.violation_date) {
      const key = `${v.vehicle_id}|${v.violation_number}|${v.violation_date}`;
      byCompositeKey.set(key, v);
    }
  });

  console.log(`✅ Built lookup maps: ${byViolationNumber.size} by number, ${byCompositeKey.size} by composite`);

  // Check each violation against the maps
  const results: DuplicateCheckResult[] = violations.map(violation => {
    // Skip violations without vehicle_id
    if (!violation.vehicle_id) {
      return {
        is_duplicate: false,
        duplicate_type: 'none' as const,
        confidence: 'low' as const
      };
    }

    // Check by violation number
    const byNumber = byViolationNumber.get(violation.violation_number);
    if (byNumber) {
      return {
        is_duplicate: true,
        existing_violation: byNumber as any,
        duplicate_type: 'reference_number' as const,
        confidence: 'exact' as const
      };
    }

    // Check by composite key
    const compositeKey = `${violation.vehicle_id}|${violation.violation_number}|${violation.date}`;
    const byComposite = byCompositeKey.get(compositeKey);
    if (byComposite) {
      return {
        is_duplicate: true,
        existing_violation: byComposite as any,
        duplicate_type: 'composite' as const,
        confidence: 'exact' as const
      };
    }

    // No duplicate found
    return {
      is_duplicate: false,
      duplicate_type: 'none' as const,
      confidence: 'low' as const
    };
  });

  const duplicateCount = results.filter(r => r.is_duplicate).length;
  console.log(`✅ Found ${duplicateCount} duplicates out of ${violations.length} violations`);

  return results;
}

/**
 * Check duplicates for extracted violations (before vehicle matching)
 */
export async function checkDuplicatesForExtracted(
  violations: ExtractedViolation[],
  companyId: string
): Promise<DuplicateCheckResult[]> {
  const results: DuplicateCheckResult[] = [];

  for (const violation of violations) {
    // Check by reference number first
    if (violation.reference_number) {
      const refCheck = await checkByReferenceNumber(
        violation.reference_number,
        companyId
      );

      if (refCheck.is_duplicate) {
        results.push(refCheck);
        continue;
      }
    }

    // Check by plate and date
    const plateCheck = await checkByPlateAndDate(
      violation.plate_number,
      violation.date,
      violation.violation_number,
      companyId
    );

    results.push(plateCheck);
  }

  return results;
}

// ----------------------------------------------------------------------------
// Duplicate Management
// ----------------------------------------------------------------------------

/**
 * Mark violation as duplicate
 */
export async function markAsDuplicate(
  violationId: string,
  originalViolationId: string
): Promise<void> {
  await supabase
    .from('traffic_violations')
    .update({
      notes: `Duplicate of violation: ${originalViolationId}`,
      status: 'duplicate'
    })
    .eq('id', violationId);
}

/**
 * Get all violations marked as duplicates
 */
export async function getDuplicateViolations(
  companyId: string
): Promise<TrafficViolation[]> {
  const { data, error } = await supabase
    .from('traffic_violations')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'duplicate');

  if (error) {
    console.error('Error fetching duplicate violations:', error);
    return [];
  }

  return data || [];
}

/**
 * Clean up duplicate violations (remove duplicate marks)
 */
export async function cleanupDuplicates(companyId: string): Promise<number> {
  const { data: duplicates } = await supabase
    .from('traffic_violations')
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'duplicate');

  if (!duplicates || duplicates.length === 0) {
    return 0;
  }

  // Reset duplicate violations to pending status
  const { error } = await supabase
    .from('traffic_violations')
    .update({ status: 'pending' })
    .eq('company_id', companyId)
    .eq('status', 'duplicate');

  if (error) {
    console.error('Error cleaning up duplicates:', error);
    return 0;
  }

  return duplicates.length;
}

// ----------------------------------------------------------------------------
// Duplicate Statistics
// ----------------------------------------------------------------------------

/**
 * Get duplicate statistics
 */
export async function getDuplicateStatistics(
  companyId: string
): Promise<{
  total_duplicates: number;
  by_type: Record<string, number>;
  recent_duplicates: TrafficViolation[];
}> {
  const { data: duplicates, error } = await supabase
    .from('traffic_violations')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !duplicates) {
    return {
      total_duplicates: 0,
      by_type: {},
      recent_duplicates: []
    };
  }

  // Count by duplicate type (from notes field)
  const byType: Record<string, number> = {};
  duplicates.forEach(v => {
    const type = v.notes?.includes('reference_number') ? 'reference_number' :
                 v.notes?.includes('composite') ? 'composite' : 'similar';
    byType[type] = (byType[type] || 0) + 1;
  });

  return {
    total_duplicates: duplicates.length,
    by_type: byType,
    recent_duplicates: duplicates.slice(0, 10)
  };
}
