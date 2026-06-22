/**
 * Data Validation Service
 * 
 * Validates and improves extracted data by:
 * 1. Cross-referencing with existing database records
 * 2. Applying business rules validation
 * 3. Auto-correcting common OCR errors
 * 4. Suggesting corrections for low-confidence fields
 */

import { supabase } from '@/integrations/supabase/client';

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  correctedValue?: string;
  suggestions?: string[];
  error?: string;
}

export interface ExtractedDataValidation {
  customerName: ValidationResult;
  qatariId: ValidationResult;
  plateNumber: ValidationResult;
  startDate: ValidationResult;
  endDate: ValidationResult;
  monthlyAmount: ValidationResult;
  overallConfidence: number;
}

// Common OCR errors and corrections
const OCR_CORRECTIONS: { [key: string]: string } = {
  // Number corrections (Arabic to English digits)
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  // Common letter confusions
  'O': '0', 'o': '0', 'I': '1', 'l': '1', 'S': '5', 'B': '8',
  // Arabic letter corrections
  'ة': 'ه', // Sometimes confused
};

/**
 * Apply common OCR corrections to a string
 */
export function applyOCRCorrections(text: string): string {
  let corrected = text;
  for (const [wrong, right] of Object.entries(OCR_CORRECTIONS)) {
    corrected = corrected.replace(new RegExp(wrong, 'g'), right);
  }
  return corrected;
}

/**
 * Validate Qatari ID format and check for existing customer
 */
export async function validateQatariId(
  qatariId: string | undefined,
  companyId: string
): Promise<ValidationResult> {
  if (!qatariId) {
    return { isValid: false, confidence: 0, error: 'No Qatari ID provided' };
  }

  // Apply OCR corrections
  let correctedId = applyOCRCorrections(qatariId);
  
  // Remove any non-digit characters
  correctedId = correctedId.replace(/\D/g, '');

  // Validate format (11 digits)
  if (!/^\d{11}$/.test(correctedId)) {
    return {
      isValid: false,
      confidence: 0.3,
      correctedValue: correctedId,
      error: `Invalid format: expected 11 digits, got ${correctedId.length}`,
    };
  }

  // Check if customer exists in database
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .select('id, full_name, phone_number')
      .eq('company_id', companyId)
      .eq('qatari_id', correctedId)
      .maybeSingle();

    if (customer) {
      return {
        isValid: true,
        confidence: 1.0,
        correctedValue: correctedId,
        suggestions: [`Existing customer: ${customer.full_name}`],
      };
    }
  } catch (error) {
    console.warn('[Validation] Database check failed:', error);
  }

  return {
    isValid: true,
    confidence: 0.8,
    correctedValue: correctedId,
  };
}

/**
 * Validate plate number and check for existing vehicle
 */
export async function validatePlateNumber(
  plateNumber: string | undefined,
  companyId: string
): Promise<ValidationResult> {
  if (!plateNumber) {
    return { isValid: false, confidence: 0, error: 'No plate number provided' };
  }

  // Apply OCR corrections
  let correctedPlate = applyOCRCorrections(plateNumber);
  correctedPlate = correctedPlate.replace(/\D/g, '');

  // Validate format (4-7 digits for Qatar)
  if (!/^\d{4,7}$/.test(correctedPlate)) {
    return {
      isValid: false,
      confidence: 0.3,
      correctedValue: correctedPlate,
      error: `Invalid format: expected 4-7 digits`,
    };
  }

  // Check if it's a year (common OCR mistake)
  const asNumber = parseInt(correctedPlate);
  if (asNumber >= 2000 && asNumber <= 2030) {
    return {
      isValid: false,
      confidence: 0.2,
      error: 'This looks like a year, not a plate number',
    };
  }

  // Check if vehicle exists in database
  try {
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .select('id, make, model, year')
      .eq('company_id', companyId)
      .eq('license_plate', correctedPlate)
      .maybeSingle();

    if (vehicle) {
      return {
        isValid: true,
        confidence: 1.0,
        correctedValue: correctedPlate,
        suggestions: [`Existing vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.year})`],
      };
    }
  } catch (error) {
    console.warn('[Validation] Database check failed:', error);
  }

  return {
    isValid: true,
    confidence: 0.7,
    correctedValue: correctedPlate,
  };
}

/**
 * Validate date format
 */
export function validateDate(date: string | undefined): ValidationResult {
  if (!date) {
    return { isValid: false, confidence: 0, error: 'No date provided' };
  }

  // Try to parse as DD/MM/YYYY
  const match = date.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (!match) {
    return {
      isValid: false,
      confidence: 0.2,
      error: 'Invalid date format',
    };
  }

  const [, day, month, year] = match;
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  let yearNum = parseInt(year);

  // Handle 2-digit years
  if (yearNum < 100) {
    yearNum = yearNum > 50 ? 1900 + yearNum : 2000 + yearNum;
  }

  // Validate ranges
  if (monthNum < 1 || monthNum > 12) {
    return { isValid: false, confidence: 0.3, error: 'Invalid month' };
  }
  if (dayNum < 1 || dayNum > 31) {
    return { isValid: false, confidence: 0.3, error: 'Invalid day' };
  }
  if (yearNum < 1990 || yearNum > 2050) {
    return { isValid: false, confidence: 0.3, error: 'Invalid year' };
  }

  const correctedDate = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${yearNum}`;

  return {
    isValid: true,
    confidence: 0.9,
    correctedValue: correctedDate,
  };
}

/**
 * Validate monthly amount
 */
export function validateMonthlyAmount(amount: number | undefined): ValidationResult {
  if (amount === undefined || amount === null) {
    return { isValid: false, confidence: 0, error: 'No amount provided' };
  }

  // Reasonable range for car rental in Qatar (500 - 50,000 QAR)
  if (amount < 500) {
    return {
      isValid: false,
      confidence: 0.3,
      error: 'Amount too low for car rental',
      suggestions: ['Check if this is weekly or daily rate'],
    };
  }

  if (amount > 50000) {
    return {
      isValid: false,
      confidence: 0.3,
      error: 'Amount unusually high',
      suggestions: ['This might be total contract value, not monthly'],
    };
  }

  return {
    isValid: true,
    confidence: 0.9,
    correctedValue: amount.toString(),
  };
}

/**
 * Validate customer name
 */
export async function validateCustomerName(
  name: string | undefined,
  companyId: string
): Promise<ValidationResult> {
  if (!name) {
    return { isValid: false, confidence: 0, error: 'No name provided' };
  }

  // Clean up the name
  const cleanName = name.trim().replace(/\s+/g, ' ');

  // Check minimum length
  if (cleanName.length < 3) {
    return { isValid: false, confidence: 0.2, error: 'Name too short' };
  }

  // Check for common OCR garbage
  if (/[0-9]{3,}/.test(cleanName)) {
    return { isValid: false, confidence: 0.2, error: 'Name contains too many numbers' };
  }

  // Try to find similar names in database (fuzzy match)
  try {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, full_name')
      .eq('company_id', companyId)
      .ilike('full_name', `%${cleanName.split(' ')[0]}%`)
      .limit(3);

    if (customers && customers.length > 0) {
      return {
        isValid: true,
        confidence: 0.9,
        correctedValue: cleanName,
        suggestions: customers.map(c => `Existing: ${c.full_name}`),
      };
    }
  } catch (error) {
    console.warn('[Validation] Name search failed:', error);
  }

  return {
    isValid: true,
    confidence: 0.7,
    correctedValue: cleanName,
  };
}

/**
 * Validate all extracted data
 */
export async function validateExtractedData(
  data: {
    customerName?: string;
    qatariId?: string;
    plateNumber?: string;
    startDate?: string;
    endDate?: string;
    monthlyAmount?: number;
  },
  companyId: string
): Promise<ExtractedDataValidation> {
  // Run validations in parallel for speed
  const [customerName, qatariId, plateNumber] = await Promise.all([
    validateCustomerName(data.customerName, companyId),
    validateQatariId(data.qatariId, companyId),
    validatePlateNumber(data.plateNumber, companyId),
  ]);

  const startDate = validateDate(data.startDate);
  const endDate = validateDate(data.endDate);
  const monthlyAmount = validateMonthlyAmount(data.monthlyAmount);

  // Calculate overall confidence
  const validations = [customerName, qatariId, plateNumber, startDate, endDate, monthlyAmount];
  const totalConfidence = validations.reduce((sum, v) => sum + v.confidence, 0);
  const overallConfidence = totalConfidence / validations.length;

  return {
    customerName,
    qatariId,
    plateNumber,
    startDate,
    endDate,
    monthlyAmount,
    overallConfidence,
  };
}
