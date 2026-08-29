import {
  agentCorsHeaders,
  AgentInvocationContext,
  authorizeGovernedAgent,
  createServiceClient,
  finishAgentExecution,
  jsonResponse,
} from "../_shared/agent.ts";
import {
  validateAndFixAmount,
  validateAndFixDate,
  validateAndFixPhone,
} from "./validation.ts";

interface ProcessedContractData {
  customer_name?: string;
  customer_phone?: string;
  customer_id?: string;
  vehicle_number?: string;
  vehicle_id?: string;
  contract_number?: string;
  contract_type?: string;
  start_date?: string;
  end_date?: string;
  contract_amount?: number;
  monthly_amount?: number;
  description?: string;
  terms?: string;
  cost_center_code?: string;
  cost_center_name?: string;
}

interface ValidationIssue {
  field: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

interface AutoFix {
  field: string;
  original_value: any;
  suggested_value: any;
  reason: string;
  confidence: number;
}

interface ProcessingResult {
  contract_data: ProcessedContractData;
  validation_issues: ValidationIssue[];
  auto_fixes: AutoFix[];
  is_valid: boolean;
  confidence_score: number;
  processing_notes: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: agentCorsHeaders });
  }

  let invocation: AgentInvocationContext | null = null;
  try {
    const { companyId, contract_data, options = {} } = await req.json();
    if (!companyId || !contract_data || typeof contract_data !== 'object') {
      return jsonResponse({ error: 'companyId and contract_data are required' }, 400);
    }
    invocation = await authorizeGovernedAgent(
      req,
      'intelligent-contract-processor',
      companyId,
    );
    const supabase = createServiceClient();

    const result: ProcessingResult = {
      contract_data: { ...contract_data },
      validation_issues: [],
      auto_fixes: [],
      is_valid: true,
      confidence_score: 0.8,
      processing_notes: []
    };
    let normalizedStartDate: string | undefined;
    let normalizedEndDate: string | undefined;

    // Phone number validation and fixes
    if (contract_data.customer_phone) {
      const phoneValidation = validateAndFixPhone(contract_data.customer_phone);
      if (phoneValidation.isValid) {
        if (phoneValidation.needsFix) {
          result.auto_fixes.push({
            field: 'customer_phone',
            original_value: contract_data.customer_phone,
            suggested_value: phoneValidation.cleanPhone,
            reason: 'تم تنسيق رقم الهاتف ليتوافق مع معايير دول الخليج',
            confidence: 0.9
          });
          if (options.autoApplyFixes === true) {
            result.contract_data.customer_phone = phoneValidation.cleanPhone;
          }
        }
      } else {
        result.validation_issues.push({
          field: 'customer_phone',
          issue: 'رقم الهاتف غير صحيح أو ليس رقماً قطرياً واضحاً',
          severity: 'error',
          suggestion: 'استخدم رقماً قطرياً من 8 أرقام أو +974 متبوعاً بـ8 أرقام'
        });
        result.is_valid = false;
      }
    }

    // Date validation and fixes
    if (contract_data.start_date) {
      const dateValidation = validateAndFixDate(contract_data.start_date);
      normalizedStartDate = dateValidation.fixedDate;
      if (dateValidation.isValid && dateValidation.needsFix) {
        result.auto_fixes.push({
          field: 'start_date',
          original_value: contract_data.start_date,
          suggested_value: dateValidation.fixedDate,
          reason: 'تم تصحيح تنسيق التاريخ',
          confidence: 0.8
        });
        if (options.autoApplyFixes === true) {
          result.contract_data.start_date = dateValidation.fixedDate;
        }
      } else if (!dateValidation.isValid) {
        result.validation_issues.push({
          field: 'start_date',
          issue: dateValidation.reason || 'تاريخ البداية غير صالح أو ملتبس',
          severity: 'error',
          suggestion: 'استخدم YYYY-MM-DD، أو صيغة لا تحتمل أكثر من تفسير',
        });
        result.is_valid = false;
      }
    }

    if (contract_data.end_date) {
      const dateValidation = validateAndFixDate(contract_data.end_date);
      normalizedEndDate = dateValidation.fixedDate;
      if (dateValidation.isValid && dateValidation.needsFix) {
        result.auto_fixes.push({
          field: 'end_date',
          original_value: contract_data.end_date,
          suggested_value: dateValidation.fixedDate,
          reason: 'تم تصحيح تنسيق التاريخ',
          confidence: 0.8
        });
        if (options.autoApplyFixes === true) {
          result.contract_data.end_date = dateValidation.fixedDate;
        }
      } else if (!dateValidation.isValid) {
        result.validation_issues.push({
          field: 'end_date',
          issue: dateValidation.reason || 'تاريخ النهاية غير صالح أو ملتبس',
          severity: 'error',
          suggestion: 'استخدم YYYY-MM-DD، أو صيغة لا تحتمل أكثر من تفسير',
        });
        result.is_valid = false;
      }
    }

    if (normalizedStartDate && normalizedEndDate && normalizedEndDate < normalizedStartDate) {
      result.validation_issues.push({
        field: 'end_date',
        issue: 'تاريخ نهاية العقد يسبق تاريخ البداية',
        severity: 'error',
        suggestion: 'راجع تاريخي البداية والنهاية في المستند الأصلي',
      });
      result.is_valid = false;
    }

    // Amount validation and fixes
    if (contract_data.contract_amount !== undefined && contract_data.contract_amount !== null) {
      const amountValidation = validateAndFixAmount(contract_data.contract_amount);
      if (amountValidation.isValid && amountValidation.needsFix) {
        result.auto_fixes.push({
          field: 'contract_amount',
          original_value: contract_data.contract_amount,
          suggested_value: amountValidation.fixedAmount,
          reason: 'تم تصحيح تنسيق المبلغ',
          confidence: 0.9
        });
        if (options.autoApplyFixes === true) {
          result.contract_data.contract_amount = amountValidation.fixedAmount;
        }
      } else if (!amountValidation.isValid) {
        result.validation_issues.push({
          field: 'contract_amount',
          issue: 'قيمة العقد غير صالحة',
          severity: 'error',
          suggestion: 'أدخل مبلغاً رقمياً موجباً أو صفراً',
        });
        result.is_valid = false;
      }
    }

    if (contract_data.monthly_amount !== undefined && contract_data.monthly_amount !== null) {
      const amountValidation = validateAndFixAmount(contract_data.monthly_amount);
      if (amountValidation.isValid && amountValidation.needsFix) {
        result.auto_fixes.push({
          field: 'monthly_amount',
          original_value: contract_data.monthly_amount,
          suggested_value: amountValidation.fixedAmount,
          reason: 'تم تصحيح تنسيق الإيجار الشهري',
          confidence: 0.9,
        });
        if (options.autoApplyFixes === true) {
          result.contract_data.monthly_amount = amountValidation.fixedAmount;
        }
      } else if (!amountValidation.isValid) {
        result.validation_issues.push({
          field: 'monthly_amount',
          issue: 'قيمة الإيجار الشهري غير صالحة',
          severity: 'error',
          suggestion: 'أدخل مبلغاً رقمياً موجباً أو صفراً',
        });
        result.is_valid = false;
      }
    }

    // Apply auto fixes if requested
    if (options.autoApplyFixes === true && result.auto_fixes.length > 0) {
      result.processing_notes.push(`تم تطبيق ${result.auto_fixes.length} تصحيحات تلقائية`);
    }

    // Calculate final confidence score
    const errorCount = result.validation_issues.filter(i => i.severity === 'error').length;
    const warningCount = result.validation_issues.filter(i => i.severity === 'warning').length;
    
    result.confidence_score = Math.max(0.1, 1.0 - (errorCount * 0.3) - (warningCount * 0.1));
    
    console.log('Contract processing completed', {
      companyId,
      isValid: result.is_valid,
      issuesCount: result.validation_issues.length,
      fixesCount: result.auto_fixes.length,
      confidence: result.confidence_score
    });
    await finishAgentExecution(supabase, invocation, true, {
      isValid: result.is_valid,
      issuesCount: result.validation_issues.length,
      fixesCount: result.auto_fixes.length,
    });

    return jsonResponse(result);

  } catch (error: unknown) {
    console.error('Contract processing failed', {
      code: error instanceof Error ? error.name : 'unknown_error',
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (invocation) {
      try {
        await finishAgentExecution(
          createServiceClient(),
          invocation,
          false,
          {},
          'contract_processing_failed',
        );
      } catch (finishError) {
        console.error('Failed to close contract processor execution', {
          code: finishError instanceof Error ? finishError.name : 'unknown_error',
        });
      }
    }
    const status = errorMessage === 'Unauthorized'
      ? 401
      : errorMessage === 'Agent disabled or busy'
      ? 409
      : 500;
    return jsonResponse({
      error: errorMessage,
      contract_data: null,
      validation_issues: [],
      auto_fixes: [],
      is_valid: false,
      confidence_score: 0,
      processing_notes: [`خطأ في المعالجة: ${errorMessage}`]
    }, status);
  }
});
