/**
 * Taqadi Integration Service
 * Unified service for extracting, validating, and preparing data for Taqadi submission
 *
 * Usage:
 * ```typescript
 * import { taqadiService } from '@/services/taqidi';
 *
 * // Extract and validate data for a contract
 * const result = await taqadiService.prepareForSubmission(contractId, companyId);
 *
 * if (result.validation.canSubmit) {
 *   // Data is ready for Taqadi
 *   console.log('Ready to submit:', result.data);
 * } else {
 *   // Show validation errors
 *   console.log('Errors:', result.validation.errors);
 * }
 * ```
 */

import { supabase } from '@/integrations/supabase/client';
import { taqadiDataExtractor } from './TaqadiDataExtractor';
import { taqadiValidator } from './TaqadiValidator';
import type {
  TaqadiSubmissionData,
  ValidationResult,
  ExtractionOptions,
} from './TaqadiTypes';

// ==========================================
// Preparation Result
// ==========================================

/**
 * Result of data preparation
 */
export interface PreparationResult {
  success: boolean;
  data?: TaqadiSubmissionData;
  validation?: ValidationResult;
  error?: string;
  metadata: {
    contractId: string;
    preparedAt: string;
    duration: number; // milliseconds
  };
}

// ==========================================
// Service Class
// ==========================================

class TaqadiService {
  /**
   * Prepare complete data for Taqadi submission
   * This is the main entry point for the service
   *
   * @param contractId - Fleetify contract ID
   * @param companyId - Company ID
   * @param options - Extraction options
   * @returns Preparation result with data and validation
   */
  async prepareForSubmission(
    contractId: string,
    companyId: string,
    options: Partial<ExtractionOptions> = {}
  ): Promise<PreparationResult> {
    const startTime = Date.now();

    try {
      // Validate inputs
      if (!contractId || !companyId) {
        throw new Error('contractId and companyId are required');
      }

      // Prepare extraction options
      const extractionOptions: ExtractionOptions = {
        includeViolations: true,
        includeInvoices: true,
        generateDocuments: false,
        companyId,
        ...options,
      };

      // Extract data
      const data = await taqadiDataExtractor.extractForSubmission(
        contractId,
        extractionOptions
      );

      // Validate data
      const validation = taqadiValidator.validate(data);

      // Attach validation to data
      data.validation = validation;

      const duration = Date.now() - startTime;

      return {
        success: true,
        data,
        validation,
        metadata: {
          contractId,
          preparedAt: new Date().toISOString(),
          duration,
        },
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        metadata: {
          contractId,
          preparedAt: new Date().toISOString(),
          duration,
        },
      };
    }
  }

  /**
   * Quick check if a contract is ready for Taqadi submission
   * Returns completion percentage and critical errors
   *
   * @param contractId - Fleetify contract ID
   * @param companyId - Company ID
   * @returns Quick validation result
   */
  async quickCheck(
    contractId: string,
    companyId: string
  ): Promise<{
    ready: boolean;
    score: number;
    criticalErrors: string[];
    missingDocuments: string[];
  }> {
    const result = await this.prepareForSubmission(contractId, companyId);

    if (!result.success || !result.validation) {
      return {
        ready: false,
        score: 0,
        criticalErrors: [result.error || 'فشل التحقق'],
        missingDocuments: [],
      };
    }

    const criticalErrors = result.validation.errors
      .filter(e => e.severity === 'critical')
      .map(e => e.message);

    const missingDocuments = result.validation.errors
      .filter(e => e.field.startsWith('documents') || e.field.includes('documents.'))
      .map(e => e.message);

    return {
      ready: result.validation.canSubmit,
      score: result.validation.score,
      criticalErrors,
      missingDocuments,
    };
  }

  /**
   * Export data for browser automation
   * Converts submission data to format suitable for browser automation scripts
   *
   * @param data - Taqadi submission data
   * @returns Formatted data for automation
   */
  exportForAutomation(data: TaqadiSubmissionData): {
    fields: Record<string, string | number>;
    documents: Array<{ name: string; url: string; type: string }>;
    metadata: Record<string, any>;
  } {
    // Flatten data for easy field access
    const fields: Record<string, string | number> = {
      // Plaintiff fields
      'plaintiff_name': data.plaintiff.companyNameArabic,
      'plaintiff_cr': data.plaintiff.commercialRegisterNumber,
      'plaintiff_address': data.plaintiff.address,
      'plaintiff_phone': data.plaintiff.phone,
      'plaintiff_email': data.plaintiff.email,
      'plaintiff_iban': data.plaintiff.iban,
      'plaintiff_rep_name': data.plaintiff.representativeName,
      'plaintiff_rep_id': data.plaintiff.representativeId,
      'plaintiff_rep_position': data.plaintiff.representativePosition,

      // Defendant fields
      'defendant_name': data.defendant.fullName,
      'defendant_type': data.defendant.type,
      'defendant_id': data.defendant.idNumber || '',
      'defendant_address': data.defendant.address || '',
      'defendant_phone': data.defendant.phone || '',
      'defendant_contract': data.defendant.contractNumber || '',
      'defendant_vehicle': data.defendant.vehicle
        ? `${data.defendant.vehicle.make} ${data.defendant.vehicle.model} ${data.defendant.vehicle.year} - ${data.defendant.vehicle.plateNumber}`
        : '',

      // Case fields
      'case_title': data.case.caseTitle,
      'case_facts': data.case.facts,
      'case_claims': data.case.claims,

      // Amount fields
      'amount_principal': data.case.amounts.principalAmount,
      'amount_late_fees': data.case.amounts.lateFees || 0,
      'amount_violations': data.case.amounts.violationsFines || 0,
      'amount_other': data.case.amounts.otherFees || 0,
      'amount_total': data.case.amounts.totalAmount,
      'amount_words': data.case.amounts.amountInWords,
      'currency': data.case.amounts.currency,

      // Date fields
      'date_incident': data.case.dates.incidentDate || '',
      'date_claim': data.case.dates.claimDate,
    };

    // Collect documents
    const documents: Array<{ name: string; url: string; type: string }> = [];

    // Plaintiff documents
    if (data.plaintiff.documents.commercialRegister) {
      documents.push({
        name: 'السجل التجاري',
        url: data.plaintiff.documents.commercialRegister,
        type: 'commercial_register',
      });
    }
    if (data.plaintiff.documents.ibanCertificate) {
      documents.push({
        name: 'شهادة IBAN',
        url: data.plaintiff.documents.ibanCertificate,
        type: 'iban_certificate',
      });
    }
    if (data.plaintiff.documents.representativeId) {
      documents.push({
        name: 'صورة هوية الممثل',
        url: data.plaintiff.documents.representativeId,
        type: 'representative_id',
      });
    }

    // Case documents
    if (data.case.documents.explanatoryMemo) {
      documents.push({
        name: 'المذكرة الشارحة',
        url: data.case.documents.explanatoryMemo,
        type: 'explanatory_memo',
      });
    }
    if (data.case.documents.claimsStatement) {
      documents.push({
        name: 'كشف المطالبات',
        url: data.case.documents.claimsStatement,
        type: 'claims_statement',
      });
    }

    // Metadata
    const metadata = {
      contractId: data.metadata.contractId,
      extractedAt: data.metadata.extractedAt,
      version: data.metadata.version,
      validationScore: data.validation?.score || 0,
      canSubmit: data.validation?.canSubmit || false,
    };

    return { fields, documents, metadata };
  }

  /**
   * Save preparation to database
   * Stores the prepared data for later use or tracking
   *
   * @param data - Taqadi submission data
   * @param userId - User ID who prepared the data
   * @returns Saved record ID
   */
  async savePreparation(
    data: TaqadiSubmissionData,
    userId?: string
  ): Promise<string | null> {
    try {
      const { data: saved, error } = await supabase
        .from('lawsuit_preparations')
        .insert({
          company_id: data.metadata.contractId, // Will be replaced with actual company_id
          contract_id: data.metadata.contractId,
          customer_id: undefined, // Will be filled from defendant
          defendant_name: data.defendant.fullName,
          defendant_id_number: data.defendant.idNumber,
          defendant_type: data.defendant.type,
          overdue_rent: data.case.amounts.principalAmount,
          late_fees: data.case.amounts.lateFees,
          other_fees: data.case.amounts.otherFees,
          total_amount: data.case.amounts.totalAmount,
          amount_in_words: data.case.amounts.amountInWords,
          case_title: data.case.caseTitle,
          facts_text: data.case.facts,
          claims_text: data.case.claims,
          status: data.validation?.canSubmit ? 'prepared' : 'draft',
          prepared_at: new Date().toISOString(),
          prepared_by: userId,
        })
        .select('id')
        .single();

      if (error) throw error;

      return saved?.id || null;

    } catch (error) {
      console.error('Failed to save preparation:', error);
      return null;
    }
  }

  /**
   * Load previously saved preparation
   *
   * @param preparationId - Preparation record ID
   * @returns Submission data or null
   */
  async loadPreparation(preparationId: string): Promise<TaqadiSubmissionData | null> {
    try {
      const { data, error } = await supabase
        .from('lawsuit_preparations')
        .select('*')
        .eq('id', preparationId)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Convert database record back to submission data
      // This would need to be implemented based on actual database schema
      return null; // Placeholder

    } catch (error) {
      console.error('Failed to load preparation:', error);
      return null;
    }
  }

  /**
   * Generate human-readable validation report
   *
   * @param validation - Validation result
   * @returns Formatted report string (Arabic)
   */
  generateValidationReport(validation: ValidationResult): string {
    const lines: string[] = [];

    // Header
    lines.push('تقرير التحقق من صحة البيانات');
    lines.push('='.repeat(40));
    lines.push('');

    // Score
    lines.push(`نسبة الاكتمال: ${validation.score}%`);
    lines.push(`الحالة: ${validation.canSubmit ? 'جاهز للإرسال ✓' : 'غير جاهز ✗'}`);
    lines.push('');

    // Errors
    if (validation.errors.length > 0) {
      lines.push('الأخطاء:');
      lines.push('-'.repeat(20));
      for (const error of validation.errors) {
        const severity = error.severity === 'critical' ? '🔴' :
                        error.severity === 'high' ? '🟠' : '🟡';
        lines.push(`${severity} ${error.field}: ${error.message}`);
      }
      lines.push('');
    }

    // Warnings
    if (validation.warnings.length > 0) {
      lines.push('تنبيهات:');
      lines.push('-'.repeat(20));
      for (const warning of validation.warnings) {
        lines.push(`⚠️ ${warning.field}: ${warning.message}`);
        if (warning.suggestion) {
          lines.push(`   💡 ${warning.suggestion}`);
        }
      }
      lines.push('');
    }

    // Missing fields
    const missingFields = Object.entries(validation.requiredFields)
      .filter(([_, present]) => !present)
      .map(([field]) => field);

    if (missingFields.length > 0) {
      lines.push('الحقول الناقصة:');
      lines.push('-'.repeat(20));
      for (const field of missingFields) {
        lines.push(`✗ ${field}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate JSON export for manual processing
   *
   * @param data - Taqadi submission data
   * @param prettify - Whether to prettify JSON
   * @returns JSON string
   */
  exportToJson(data: TaqadiSubmissionData, prettify: boolean = true): string {
    return JSON.stringify(data, null, prettify ? 2 : 0);
  }

  /**
   * Parse JSON import
   *
   * @param json - JSON string
   * @returns Parsed submission data
   */
  importFromJson(json: string): TaqadiSubmissionData | null {
    try {
      return JSON.parse(json) as TaqadiSubmissionData;
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const taqadiService = new TaqadiService();
export default taqadiService;

// Re-export types
export * from './TaqadiTypes';
export { taqadiDataExtractor } from './TaqadiDataExtractor';
export { taqadiValidator } from './TaqadiValidator';
