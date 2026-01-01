import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contract_data, options = {} } = await req.json();

    console.log('🤖 Processing contract data:', contract_data);
    
    const result: ProcessingResult = {
      contract_data: { ...contract_data },
      validation_issues: [],
      auto_fixes: [],
      is_valid: true,
      confidence_score: 0.8,
      processing_notes: []
    };

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
          result.contract_data.customer_phone = phoneValidation.cleanPhone;
        }
      } else {
        result.validation_issues.push({
          field: 'customer_phone',
          issue: `رقم الهاتف غير صحيح: ${contract_data.customer_phone}`,
          severity: 'error',
          suggestion: 'تأكد من أن رقم الهاتف يحتوي على مقدمة دولية صحيحة لدول الخليج'
        });
        result.is_valid = false;
      }
    }

    // Date validation and fixes
    if (contract_data.start_date) {
      const dateValidation = validateAndFixDate(contract_data.start_date);
      if (dateValidation.isValid && dateValidation.needsFix) {
        result.auto_fixes.push({
          field: 'start_date',
          original_value: contract_data.start_date,
          suggested_value: dateValidation.fixedDate,
          reason: 'تم تصحيح تنسيق التاريخ',
          confidence: 0.8
        });
        result.contract_data.start_date = dateValidation.fixedDate;
      }
    }

    if (contract_data.end_date) {
      const dateValidation = validateAndFixDate(contract_data.end_date);
      if (dateValidation.isValid && dateValidation.needsFix) {
        result.auto_fixes.push({
          field: 'end_date',
          original_value: contract_data.end_date,
          suggested_value: dateValidation.fixedDate,
          reason: 'تم تصحيح تنسيق التاريخ',
          confidence: 0.8
        });
        result.contract_data.end_date = dateValidation.fixedDate;
      }
    }

    // Amount validation and fixes
    if (contract_data.contract_amount) {
      const amountValidation = validateAndFixAmount(contract_data.contract_amount);
      if (amountValidation.isValid && amountValidation.needsFix) {
        result.auto_fixes.push({
          field: 'contract_amount',
          original_value: contract_data.contract_amount,
          suggested_value: amountValidation.fixedAmount,
          reason: 'تم تصحيح تنسيق المبلغ',
          confidence: 0.9
        });
        result.contract_data.contract_amount = amountValidation.fixedAmount;
      }
    }

    // Apply auto fixes if requested
    if (options.autoApplyFixes && result.auto_fixes.length > 0) {
      result.processing_notes.push(`تم تطبيق ${result.auto_fixes.length} تصحيحات تلقائية`);
    }

    // Calculate final confidence score
    const errorCount = result.validation_issues.filter(i => i.severity === 'error').length;
    const warningCount = result.validation_issues.filter(i => i.severity === 'warning').length;
    
    result.confidence_score = Math.max(0.1, 1.0 - (errorCount * 0.3) - (warningCount * 0.1));
    
    console.log('✅ Processing completed:', {
      isValid: result.is_valid,
      issuesCount: result.validation_issues.length,
      fixesCount: result.auto_fixes.length,
      confidence: result.confidence_score
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('❌ Error in intelligent-contract-processor:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      contract_data: null,
      validation_issues: [],
      auto_fixes: [],
      is_valid: false,
      confidence_score: 0,
      processing_notes: [`خطأ في المعالجة: ${errorMessage}`]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function validateAndFixPhone(phone: string): { isValid: boolean; needsFix: boolean; cleanPhone?: string } {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, needsFix: false };
  }

  // Clean the phone number
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // GCC phone patterns with better validation
  const gccPatterns = [
    // Qatar: +974 or 974 (8 digits)
    { pattern: /^(\+?974)([0-9]{8})$/, country: 'Qatar', format: '+974$2' },
    // Kuwait: +965 or 965 (8 digits) or local with 0
    { pattern: /^(\+?965|0)?([2-9]\d{7})$/, country: 'Kuwait', format: '+965$2' },
    // Saudi: +966 or 966 (9 digits) or local with 0
    { pattern: /^(\+?966|0)?(5[0-9]{8})$/, country: 'Saudi', format: '+966$2' },
    // UAE: +971 or 971 (9 digits) or local with 0
    { pattern: /^(\+?971|0)?(5[0-9]{8})$/, country: 'UAE', format: '+971$2' },
    // Oman: +968 or 968 (8 digits)
    { pattern: /^(\+?968)([0-9]{8})$/, country: 'Oman', format: '+968$2' },
    // Bahrain: +973 or 973 (8 digits)
    { pattern: /^(\+?973)([0-9]{8})$/, country: 'Bahrain', format: '+973$2' }
  ];

  for (const { pattern, format } of gccPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const formattedPhone = cleaned.replace(pattern, format);
      return {
        isValid: true,
        needsFix: formattedPhone !== phone,
        cleanPhone: formattedPhone
      };
    }
  }

  // Check if it's a local number without country code (7-9 digits)
  if (/^[0-9]{7,9}$/.test(cleaned)) {
    return {
      isValid: true,
      needsFix: true,
      cleanPhone: `+974${cleaned}` // Default to Qatar if no country code
    };
  }

  return { isValid: false, needsFix: false };
}

function validateAndFixDate(dateStr: string): { isValid: boolean; needsFix: boolean; fixedDate?: string } {
  if (!dateStr) return { isValid: false, needsFix: false };

  // Try parsing as ISO date first
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    const isoString = date.toISOString().split('T')[0];
    return {
      isValid: true,
      needsFix: isoString !== dateStr,
      fixedDate: isoString
    };
  }

  // Try common date formats
  const dateFormats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY or DD-MM-YYYY
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // YYYY/MM/DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
  ];

  for (const format of dateFormats) {
    const match = dateStr.match(format);
    if (match) {
      const [, p1, p2, p3] = match;
      // Assume YYYY-MM-DD or DD/MM/YYYY format
      const year = p3.length === 4 ? p3 : p1;
      const month = p3.length === 4 ? p1 : p2;
      const day = p3.length === 4 ? p2 : p1;
      
      date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!isNaN(date.getTime())) {
        const isoString = date.toISOString().split('T')[0];
        return {
          isValid: true,
          needsFix: true,
          fixedDate: isoString
        };
      }
    }
  }

  return { isValid: false, needsFix: false };
}

function validateAndFixAmount(amount: any): { isValid: boolean; needsFix: boolean; fixedAmount?: number } {
  if (typeof amount === 'number' && !isNaN(amount)) {
    return { isValid: true, needsFix: false };
  }

  if (typeof amount === 'string') {
    // Remove currency symbols and spaces
    const cleaned = amount.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    
    if (!isNaN(parsed) && parsed >= 0) {
      return {
        isValid: true,
        needsFix: true,
        fixedAmount: parsed
      };
    }
  }

  return { isValid: false, needsFix: false };
}
