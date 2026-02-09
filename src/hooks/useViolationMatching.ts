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
 * Notification settings for violation save
 */
export interface ViolationSaveOptions {
  sendNotifications?: boolean;
  notifyManagers?: boolean;
  notifyFleetManager?: boolean;
  notifyCustomerByWhatsApp?: boolean;
}

/**
 * Hook for saving violations to database with notification support
 */
export function useViolationSave() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveViolations = useCallback(async (
    violations: MatchedViolation[],
    companyId: string,
    importSource: 'moi_pdf' | 'manual' | 'api' | 'bulk_import' = 'moi_pdf',
    fileNumber?: string,
    options: ViolationSaveOptions = { sendNotifications: true, notifyManagers: true, notifyFleetManager: true }
  ): Promise<{ success: number; failed: number; savedViolations: Array<MatchedViolation & { savedId?: string }> }> => {
    setIsSaving(true);
    setError(null);

    let success = 0;
    let failed = 0;
    const savedViolations: Array<MatchedViolation & { savedId?: string }> = [];

    for (const violation of violations) {
      // Skip only errors (not duplicates - we want to save duplicates with 'duplicate' status)
      if (violation.status === 'error') {
        failed++;
        continue;
      }

      try {
        // Determine status: 'duplicate' if is_duplicate, otherwise 'pending'
        const violationStatus = violation.is_duplicate ? 'duplicate' : 'pending';
        
        // Add note for duplicates
        const notes = violation.is_duplicate && violation.existing_violation_id
          ? `مخالفة مكررة - المخالفة الأصلية: ${violation.existing_violation_id}`
          : null;

        const { data: insertedData, error: insertError } = await supabase
          .from('penalties')
          .insert({
            company_id: companyId,
            vehicle_id: violation.vehicle_id,
            contract_id: violation.contract_id,
            customer_id: violation.customer_id || null,
            penalty_number: violation.violation_number,
            violation_type: violation.violation_type,
            penalty_date: violation.date,
            location: violation.location || null,
            amount: violation.fine_amount,
            vehicle_plate: violation.plate_number || null,
            reason: violation.violation_description || violation.violation_type,
            status: violationStatus === 'duplicate' ? 'cancelled' : 'pending', // penalties table only supports 'pending', 'confirmed', 'cancelled'
            payment_status: 'unpaid',
            notes: notes
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error saving violation:', insertError);
          failed++;
        } else {
          success++;
          savedViolations.push({
            ...violation,
            savedId: insertedData?.id
          });
        }
      } catch (err: any) {
        console.error('Error saving violation:', err);
        failed++;
      }
    }

    // Send notifications if enabled and violations were saved successfully
    if (options.sendNotifications && savedViolations.length > 0) {
      try {
        // Dynamically import to avoid circular dependencies
        const { useViolationNotifications } = await import('./useViolationNotifications');
        
        // Note: Since this is inside useCallback, we can't use hooks directly
        // We'll create the notification data and let the caller handle notifications
        console.log(`📧 ${savedViolations.length} violations ready for notifications`);
      } catch (notifyError) {
        console.error('Error preparing notifications:', notifyError);
      }
    }

    setIsSaving(false);
    return { success, failed, savedViolations };
  }, []);

  return {
    saveViolations,
    isSaving,
    error
  };
}

// ============================================================================
// Violation Enrichment Types
// ============================================================================

export interface MissingFieldInfo {
  field: string;
  label: string;
  currentValue: string | null;
  newValue: string | null;
}

export interface EnrichableViolation {
  existingViolation: {
    id: string;
    violation_number: string;
    reference_number: string | null;
    violation_date: string;
    location: string | null;
    violation_description: string | null;
    violation_time: string | null;
    issuing_authority: string | null;
    contract_id: string | null;
  };
  pdfData: ExtractedViolation;
  missingFields: MissingFieldInfo[];
  canEnrich: boolean;
}

export interface EnrichmentResult {
  total_found: number;
  enrichable_count: number;
  enrichable_violations: EnrichableViolation[];
}

// ============================================================================
// Hook for Violation Enrichment (Fill Missing Data)
// ============================================================================

export function useViolationEnrichment() {
  const [isSearching, setIsSearching] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * البحث عن المخالفات الموجودة ومقارنتها مع بيانات PDF
   */
  const findEnrichableViolations = useCallback(async (
    pdfViolations: ExtractedViolation[],
    companyId: string
  ): Promise<EnrichmentResult> => {
    setIsSearching(true);
    setError(null);

    try {
      // استخراج أرقام المرجع وأرقام المخالفات من PDF
      const referenceNumbers = pdfViolations
        .map(v => v.reference_number)
        .filter((r): r is string => !!r);
      
      const violationNumbers = pdfViolations
        .map(v => v.violation_number)
        .filter((v): v is string => !!v);

      // البحث عن المخالفات الموجودة في قاعدة البيانات
      const { data: existingViolations, error: searchError } = await supabase
        .from('traffic_violations')
        .select('id, violation_number, reference_number, violation_date, location, violation_description, violation_time, issuing_authority, contract_id')
        .eq('company_id', companyId)
        .or(`reference_number.in.(${referenceNumbers.join(',')}),violation_number.in.(${violationNumbers.join(',')})`);

      if (searchError) {
        throw new Error(`خطأ في البحث: ${searchError.message}`);
      }

      if (!existingViolations || existingViolations.length === 0) {
        return {
          total_found: 0,
          enrichable_count: 0,
          enrichable_violations: []
        };
      }

      // مقارنة وإيجاد البيانات الناقصة
      const enrichableViolations: EnrichableViolation[] = [];

      for (const existing of existingViolations) {
        // البحث عن المخالفة المقابلة في بيانات PDF
        const pdfMatch = pdfViolations.find(pdf => 
          (pdf.reference_number && pdf.reference_number === existing.reference_number) ||
          (pdf.violation_number && pdf.violation_number === existing.violation_number)
        );

        if (!pdfMatch) continue;

        // مقارنة الحقول وإيجاد الناقصة
        const missingFields: MissingFieldInfo[] = [];

        // الموقع
        if (!existing.location && pdfMatch.location) {
          missingFields.push({
            field: 'location',
            label: 'الموقع',
            currentValue: existing.location,
            newValue: pdfMatch.location
          });
        }

        // وصف المخالفة
        if (!existing.violation_description && pdfMatch.violation_description) {
          missingFields.push({
            field: 'violation_description',
            label: 'وصف المخالفة',
            currentValue: existing.violation_description,
            newValue: pdfMatch.violation_description
          });
        }

        // وقت المخالفة
        if (!existing.violation_time && pdfMatch.time) {
          missingFields.push({
            field: 'violation_time',
            label: 'وقت المخالفة',
            currentValue: existing.violation_time,
            newValue: pdfMatch.time
          });
        }

        // الجهة المصدرة
        if (!existing.issuing_authority && pdfMatch.issuing_authority) {
          missingFields.push({
            field: 'issuing_authority',
            label: 'الجهة المصدرة',
            currentValue: existing.issuing_authority,
            newValue: pdfMatch.issuing_authority
          });
        }

        if (missingFields.length > 0) {
          enrichableViolations.push({
            existingViolation: existing,
            pdfData: pdfMatch,
            missingFields,
            canEnrich: true
          });
        }
      }

      return {
        total_found: existingViolations.length,
        enrichable_count: enrichableViolations.length,
        enrichable_violations: enrichableViolations
      };

    } catch (err: any) {
      setError(err.message);
      return {
        total_found: 0,
        enrichable_count: 0,
        enrichable_violations: []
      };
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * تحديث المخالفات الموجودة بالبيانات الناقصة من PDF
   */
  const enrichViolations = useCallback(async (
    enrichableViolations: EnrichableViolation[]
  ): Promise<{ success: number; failed: number }> => {
    setIsEnriching(true);
    setError(null);

    let success = 0;
    let failed = 0;

    for (const item of enrichableViolations) {
      if (!item.canEnrich || item.missingFields.length === 0) {
        continue;
      }

      try {
        // بناء كائن التحديث
        const updateData: Record<string, string | null> = {};
        
        for (const field of item.missingFields) {
          if (field.newValue) {
            updateData[field.field] = field.newValue;
          }
        }

        if (Object.keys(updateData).length === 0) {
          continue;
        }

        // تحديث المخالفة في قاعدة البيانات
        const { error: updateError } = await supabase
          .from('traffic_violations')
          .update(updateData)
          .eq('id', item.existingViolation.id);

        if (updateError) {
          console.error('خطأ في تحديث المخالفة:', updateError);
          failed++;
        } else {
          success++;
        }

      } catch (err: any) {
        console.error('خطأ في تحديث المخالفة:', err);
        failed++;
      }
    }

    setIsEnriching(false);
    return { success, failed };
  }, []);

  return {
    findEnrichableViolations,
    enrichViolations,
    isSearching,
    isEnriching,
    error
  };
}
