// ============================================================================
// React Hook for Violation Matching
// Handles matching violations to vehicles, contracts, and customers
// ============================================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  ExtractedViolation,
  MatchedViolation,
  MatchConfidence,
  ImportProcessingResult
} from '@/types/violations';
import {
  matchToVehicle,
  matchToContract,
  matchViolationsBatch
} from '@/services/violationMatchingService';
import {
  checkByReferenceNumber,
  checkByCompositeKey,
  checkDuplicatesBatch
} from '@/services/violationDuplicateDetection';

export interface UseViolationMatchingOptions {
  companyId: string;
  autoLink?: boolean;
  checkDuplicates?: boolean;
}

export interface UseViolationMatchingResult {
  matchViolation: (violation: ExtractedViolation) => Promise<MatchedViolation>;
  matchViolations: (violations: ExtractedViolation[]) => Promise<MatchedViolation[]>;
  checkDuplicates: (violation: MatchedViolation) => Promise<boolean>;
  processViolations: (violations: ExtractedViolation[]) => Promise<ImportProcessingResult>;
  isProcessing: boolean;
  error: string | null;
}

/**
 * React hook for violation matching operations
 */
export function useViolationMatching(
  options: UseViolationMatchingOptions
): UseViolationMatchingResult {
  const { companyId, autoLink = true, checkDuplicates: checkDups = true } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Match a single violation
   */
  const matchViolation = useCallback(async (
    violation: ExtractedViolation
  ): Promise<MatchedViolation> => {
    if (!autoLink) {
      return {
        ...violation,
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        match_confidence: 'none',
        status: 'extracted',
        errors: [],
        warnings: []
      };
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Match to vehicle
      const vehicleMatch = await matchToVehicle(violation.plate_number, companyId);

      if (!vehicleMatch.vehicle_id) {
        return {
          ...violation,
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          match_confidence: 'none',
          status: 'error',
          errors: [vehicleMatch.reason],
          warnings: []
        };
      }

      // Match to contract
      const contractMatch = await matchToContract(vehicleMatch.vehicle_id, violation.date);

      // Determine overall confidence
      let confidence: MatchConfidence = 'none';
      if (contractMatch.confidence === 'high') {
        confidence = 'high';
      } else if (contractMatch.confidence === 'medium') {
        confidence = 'medium';
      } else if (contractMatch.confidence === 'low') {
        confidence = 'low';
      }

      return {
        ...violation,
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        vehicle_id: vehicleMatch.vehicle_id,
        contract_id: contractMatch.contract_id,
        customer_id: contractMatch.customer_id,
        customer_name: contractMatch.customer_name || undefined,
        contract_number: contractMatch.contract_number || undefined,
        match_confidence: confidence,
        status: 'matched',
        errors: [],
        warnings: []
      };

    } catch (err: any) {
      setError(err.message);
      return {
        ...violation,
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        match_confidence: 'none',
        status: 'error',
        errors: [err.message],
        warnings: []
      };
    } finally {
      setIsProcessing(false);
    }
  }, [companyId, autoLink]);

  /**
   * Match multiple violations in batch
   */
  const matchViolations = useCallback(async (
    violations: ExtractedViolation[]
  ): Promise<MatchedViolation[]> => {
    if (!autoLink) {
      return violations.map((v, i) => ({
        ...v,
        id: `temp_${Date.now()}_${i}`,
        match_confidence: 'none' as const,
        status: 'extracted' as const,
        errors: [],
        warnings: []
      }));
    }

    try {
      setIsProcessing(true);
      setError(null);

      return await matchViolationsBatch(violations, companyId);

    } catch (err: any) {
      setError(err.message);
      return violations.map((v, i) => ({
        ...v,
        id: `temp_${Date.now()}_${i}`,
        match_confidence: 'none' as const,
        status: 'error' as const,
        errors: [err.message],
        warnings: []
      }));
    } finally {
      setIsProcessing(false);
    }
  }, [companyId, autoLink]);

  /**
   * Check if a violation is a duplicate
   */
  const checkDuplicates = useCallback(async (
    violation: MatchedViolation
  ): Promise<boolean> => {
    if (!checkDups || !violation.vehicle_id) {
      return false;
    }

    try {
      // Check by reference number first
      if (violation.reference_number) {
        const refCheck = await checkByReferenceNumber(violation.reference_number, companyId);
        if (refCheck.is_duplicate) {
          return true;
        }
      }

      // Check by composite key
      const compositeCheck = await checkByCompositeKey(
        violation.vehicle_id,
        violation.violation_number,
        violation.date,
        companyId
      );

      return compositeCheck.is_duplicate;

    } catch (err: any) {
      console.error('Error checking duplicates:', err);
      return false;
    }
  }, [companyId, checkDups]);

  /**
   * Process violations: match and check for duplicates
   */
  const processViolations = useCallback(async (
    violations: ExtractedViolation[]
  ): Promise<ImportProcessingResult> => {
    try {
      setIsProcessing(true);
      setError(null);

      // Step 1: Match violations
      const matched = await matchViolationsBatch(violations, companyId);

      // Step 2: Check for duplicates
      let duplicatesFound = 0;
      if (checkDups) {
        const duplicateChecks = await checkDuplicatesBatch(matched, companyId);

        matched.forEach((v, i) => {
          const check = duplicateChecks[i];
          if (check.is_duplicate) {
            v.is_duplicate = true;
            v.existing_violation_id = check.existing_violation?.id;
            duplicatesFound++;
          }
        });
      }

      // Step 3: Calculate statistics
      const successfulMatches = matched.filter(
        v => v.status === 'matched' && !v.is_duplicate
      ).length;
      const partialMatches = matched.filter(
        v => v.status === 'partial' && !v.is_duplicate
      ).length;
      const errors = matched.filter(
        v => v.status === 'error' || v.is_duplicate
      ).length;
      const totalAmount = matched.reduce((sum, v) => sum + v.fine_amount, 0);

      return {
        total_extracted: matched.length,
        successful_matches: successfulMatches,
        partial_matches: partialMatches,
        errors,
        duplicates_found: duplicatesFound,
        violations: matched,
        total_amount: totalAmount
      };

    } catch (err: any) {
      setError(err.message);
      return {
        total_extracted: 0,
        successful_matches: 0,
        partial_matches: 0,
        errors: 0,
        duplicates_found: 0,
        violations: [],
        total_amount: 0
      };
    } finally {
      setIsProcessing(false);
    }
  }, [companyId, checkDups]);

  return {
    matchViolation,
    matchViolations,
    checkDuplicates,
    processViolations,
    isProcessing,
    error
  };
}

/**
 * Hook for saving violations to database
 */
export function useViolationSave() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveViolations = useCallback(async (
    violations: MatchedViolation[],
    companyId: string,
    importSource: 'moi_pdf' | 'manual' | 'api' | 'bulk_import' = 'moi_pdf',
    fileNumber?: string
  ): Promise<{ success: number; failed: number }> => {
    setIsSaving(true);
    setError(null);

    let success = 0;
    let failed = 0;

    for (const violation of violations) {
      // Skip errors and duplicates
      if (violation.status === 'error' || violation.is_duplicate) {
        failed++;
        continue;
      }

      try {
        const { error: insertError } = await supabase
          .from('traffic_violations')
          .insert({
            company_id: companyId,
            vehicle_id: violation.vehicle_id,
            contract_id: violation.contract_id,
            violation_number: violation.violation_number,
            reference_number: violation.reference_number || null,
            violation_date: violation.date,
            violation_time: violation.time || null,
            violation_type: violation.violation_type,
            violation_description: violation.violation_description || null,
            location: violation.location || null,
            fine_amount: violation.fine_amount,
            total_amount: violation.total_amount || violation.fine_amount,
            issuing_authority: violation.issuing_authority || null,
            status: 'pending',
            match_confidence: violation.match_confidence,
            import_source: importSource,
            file_number: fileNumber || null
          });

        if (insertError) {
          console.error('Error saving violation:', insertError);
          failed++;
        } else {
          success++;
        }
      } catch (err: any) {
        console.error('Error saving violation:', err);
        failed++;
      }
    }

    setIsSaving(false);
    return { success, failed };
  }, []);

  return {
    saveViolations,
    isSaving,
    error
  };
}
