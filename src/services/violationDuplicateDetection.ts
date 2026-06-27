import { supabase } from '@/integrations/supabase/client';
import {
  DuplicateCheckResult,
  ExtractedViolation,
  MatchedViolation,
} from '@/types/violations';

type PenaltyDuplicate = {
  id: string;
  penalty_number: string;
  vehicle_id: string | null;
  penalty_date: string;
  amount?: number | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

function normalizePenalty(penalty: PenaltyDuplicate | null) {
  if (!penalty) return null;
  return {
    ...penalty,
    violation_number: penalty.penalty_number,
    violation_date: penalty.penalty_date,
    fine_amount: penalty.amount ?? 0,
    total_amount: penalty.amount ?? 0,
  };
}

function noDuplicate(): DuplicateCheckResult {
  return {
    is_duplicate: false,
    duplicate_type: 'none',
    confidence: 'low',
  };
}

export async function checkByReferenceNumber(
  referenceNumber: string,
  companyId: string
): Promise<DuplicateCheckResult> {
  if (!referenceNumber?.trim()) return noDuplicate();

  const { data: existing, error } = await supabase
    .from('penalties')
    .select('id, penalty_number, vehicle_id, penalty_date, amount, status, notes, created_at')
    .eq('company_id', companyId)
    .eq('penalty_number', referenceNumber)
    .maybeSingle();

  if (error || !existing) return noDuplicate();

  return {
    is_duplicate: true,
    existing_violation: normalizePenalty(existing) as any,
    duplicate_type: 'reference_number',
    confidence: 'exact',
  };
}

export async function checkByCompositeKey(
  vehicleId: string,
  violationNumber: string,
  violationDate: string,
  companyId: string
): Promise<DuplicateCheckResult> {
  const { data: existing, error } = await supabase
    .from('penalties')
    .select('id, penalty_number, vehicle_id, penalty_date, amount, status, notes, created_at')
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .eq('penalty_number', violationNumber)
    .eq('penalty_date', violationDate)
    .maybeSingle();

  if (error || !existing) return noDuplicate();

  return {
    is_duplicate: true,
    existing_violation: normalizePenalty(existing) as any,
    duplicate_type: 'composite',
    confidence: 'exact',
  };
}

export async function findSimilar(
  vehicleId: string,
  violationDate: string,
  violationNumber: string,
  companyId: string
): Promise<DuplicateCheckResult> {
  const date = new Date(violationDate);
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 3);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 3);

  const { data: similar, error } = await supabase
    .from('penalties')
    .select('id, penalty_number, vehicle_id, penalty_date, amount, status, notes, created_at')
    .eq('company_id', companyId)
    .eq('vehicle_id', vehicleId)
    .gte('penalty_date', startDate.toISOString().split('T')[0])
    .lte('penalty_date', endDate.toISOString().split('T')[0])
    .limit(5);

  if (error || !similar?.length) return noDuplicate();

  const exactMatch = similar.find((penalty) => penalty.penalty_number === violationNumber);
  if (exactMatch) {
    return {
      is_duplicate: true,
      existing_violation: normalizePenalty(exactMatch) as any,
      duplicate_type: 'composite',
      confidence: 'exact',
    };
  }

  const sameDay = similar.find((penalty) => new Date(penalty.penalty_date).toDateString() === date.toDateString());
  if (sameDay) {
    return {
      is_duplicate: true,
      existing_violation: normalizePenalty(sameDay) as any,
      duplicate_type: 'similar',
      confidence: 'high',
    };
  }

  return noDuplicate();
}

export async function checkByPlateAndDate(
  plateNumber: string,
  violationDate: string,
  violationNumber: string,
  companyId: string
): Promise<DuplicateCheckResult & { vehicle_id?: string }> {
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id')
    .eq('company_id', companyId)
    .eq('plate_number', plateNumber)
    .maybeSingle();

  if (!vehicle?.id) return noDuplicate();

  const result = await checkByCompositeKey(vehicle.id, violationNumber, violationDate, companyId);
  if (result.is_duplicate) return { ...result, vehicle_id: vehicle.id };

  const similar = await findSimilar(vehicle.id, violationDate, violationNumber, companyId);
  return { ...similar, vehicle_id: vehicle.id };
}

export async function checkDuplicatesBatch(
  violations: MatchedViolation[],
  companyId: string
): Promise<DuplicateCheckResult[]> {
  if (violations.length === 0) return [];

  const violationNumbers = violations.map((violation) => violation.violation_number).filter(Boolean);
  if (violationNumbers.length === 0) return violations.map(() => noDuplicate());

  const { data: existingViolations, error } = await supabase
    .from('penalties')
    .select('id, penalty_number, vehicle_id, penalty_date, amount, status, notes, created_at')
    .eq('company_id', companyId)
    .in('penalty_number', violationNumbers.slice(0, 1000));

  if (error) {
    console.error('Error fetching existing penalties for duplicate check:', error);
    return violations.map(() => noDuplicate());
  }

  const byNumber = new Map<string, PenaltyDuplicate>();
  const byCompositeKey = new Map<string, PenaltyDuplicate>();

  (existingViolations || []).forEach((penalty) => {
    byNumber.set(penalty.penalty_number, penalty);
    if (penalty.vehicle_id && penalty.penalty_number && penalty.penalty_date) {
      byCompositeKey.set(`${penalty.vehicle_id}|${penalty.penalty_number}|${penalty.penalty_date}`, penalty);
    }
  });

  return violations.map((violation) => {
    const numberMatch = byNumber.get(violation.violation_number);
    if (numberMatch) {
      return {
        is_duplicate: true,
        existing_violation: normalizePenalty(numberMatch) as any,
        duplicate_type: 'reference_number',
        confidence: 'exact',
      };
    }

    const compositeMatch = byCompositeKey.get(`${violation.vehicle_id}|${violation.violation_number}|${violation.date}`);
    if (compositeMatch) {
      return {
        is_duplicate: true,
        existing_violation: normalizePenalty(compositeMatch) as any,
        duplicate_type: 'composite',
        confidence: 'exact',
      };
    }

    return noDuplicate();
  });
}

export async function checkDuplicatesForExtracted(
  violations: ExtractedViolation[],
  companyId: string
): Promise<DuplicateCheckResult[]> {
  const results: DuplicateCheckResult[] = [];

  for (const violation of violations) {
    const numberCheck = await checkByReferenceNumber(violation.violation_number, companyId);
    if (numberCheck.is_duplicate) {
      results.push(numberCheck);
      continue;
    }

    results.push(await checkByPlateAndDate(violation.plate_number, violation.date, violation.violation_number, companyId));
  }

  return results;
}

export async function markAsDuplicate(
  violationId: string,
  originalViolationId: string
): Promise<void> {
  await supabase
    .from('penalties')
    .update({
      notes: `Duplicate of violation: ${originalViolationId}`,
      status: 'cancelled',
    })
    .eq('id', violationId);
}

export async function getDuplicateViolations(companyId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('penalties')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'cancelled')
    .ilike('notes', '%Duplicate of violation:%');

  if (error) {
    console.error('Error fetching duplicate penalties:', error);
    return [];
  }

  return (data || []).map(normalizePenalty);
}

export async function cleanupDuplicates(companyId: string): Promise<number> {
  const duplicates = await getDuplicateViolations(companyId);
  if (duplicates.length === 0) return 0;

  const { error } = await supabase
    .from('penalties')
    .update({ status: 'pending' })
    .eq('company_id', companyId)
    .eq('status', 'cancelled')
    .ilike('notes', '%Duplicate of violation:%');

  if (error) {
    console.error('Error cleaning up duplicate penalties:', error);
    return 0;
  }

  return duplicates.length;
}

export async function getDuplicateStatistics(
  companyId: string
): Promise<{
  total_duplicates: number;
  by_type: Record<string, number>;
  recent_duplicates: any[];
}> {
  const duplicates = await getDuplicateViolations(companyId);
  const byType: Record<string, number> = {};

  duplicates.forEach((violation) => {
    const type = violation.notes?.includes('composite') ? 'composite' : 'reference_number';
    byType[type] = (byType[type] || 0) + 1;
  });

  return {
    total_duplicates: duplicates.length,
    by_type: byType,
    recent_duplicates: duplicates.slice(0, 10),
  };
}
