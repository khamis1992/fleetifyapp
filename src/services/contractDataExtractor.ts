/**
 * Contract Data Extraction Service
 * Parses extracted text from contract PDFs and identifies key fields
 */

export interface ExtractedContractFields {
  // Customer information
  customerName?: string;
  qatariId?: string;
  phoneNumbers?: string[];
  licenseNumber?: string;

  // Vehicle information
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  plateNumber?: string;

  // Contract information
  contractNumber?: string;
  contractDate?: string;
  startDate?: string;
  endDate?: string;

  // Financial information
  contractAmount?: number;
  monthlyAmount?: number;
  paymentMethod?: string; // بنكي, نقدي, etc.
  paymentCycle?: string; // شهري, أسبوعي, etc.

  // Raw extraction data
  confidence: number;
  rawText: string;
  extractionErrors: string[];
}

/**
 * Main function to extract contract fields from text
 */
export function extractContractFields(text: string): ExtractedContractFields {
  const errors: string[] = [];
  const fields: ExtractedContractFields = {
    confidence: 0,
    rawText: text,
    extractionErrors: errors,
  };

  // Extract customer name (Arabic)
  fields.customerName = extractCustomerName(text);

  // Extract Qatari ID
  fields.qatariId = extractQatariId(text);

  // Extract phone numbers
  fields.phoneNumbers = extractPhoneNumbers(text);

  // Extract license number
  fields.licenseNumber = extractLicenseNumber(text);

  // Extract vehicle information
  fields.vehicleMake = extractVehicleMake(text);
  fields.vehicleModel = extractVehicleModel(text);
  fields.vehicleYear = extractVehicleYear(text);
  fields.plateNumber = extractPlateNumber(text);

  // Extract contract dates
  fields.contractDate = extractContractDate(text);
  fields.startDate = extractStartDate(text);
  fields.endDate = extractEndDate(text);

  // Extract financial information
  fields.contractAmount = extractContractAmount(text);
  fields.monthlyAmount = extractMonthlyAmount(text);
  fields.paymentMethod = extractPaymentMethod(text);
  fields.paymentCycle = extractPaymentCycle(text);

  // Calculate confidence based on extracted fields
  fields.confidence = calculateConfidence(fields);

  return fields;
}

// ============================================================================
// Extraction Functions
// ============================================================================

/**
 * Extract customer name (Arabic)
 */
function extractCustomerName(text: string): string | undefined {
  // Look for patterns like "اسم العميل: يوسف الخليلي"
  const patterns = [
    /اسم\s*العميل[:\s]+([أ-ي\s]+)/i,
    /العميل[:\s]+([أ-ي\s]+)/i,
    /اسم\s*المستأجر[:\s]+([أ-ي\s]+)/i,
    /المستأجر[:\s]+([أ-ي\s]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim().replace(/\s+/g, ' ');
      if (name.length > 2) {
        return name;
      }
    }
  }

  return undefined;
}

/**
 * Extract Qatari ID (11 digits)
 */
function extractQatariId(text: string): string | undefined {
  // Qatari ID pattern: 11 digits, optionally formatted with spaces/dashes
  const patterns = [
    /رقم\s*الهوية[:\s]*([\d\s\-]+)/i,
    /الهوية[:\s]*([\d\s\-]+)/i,
    /رقم\s*البطاقة[:\s]*([\d\s\-]+)/i,
    /البطاقة[:\s]*([\d\s\-]+)/i,
    /رقم\s*الشخصي[:\s]*([\d\s\-]+)/i,
    /(?:الإثارة|الإثارة)\s*الشخصية[:\s]*([\d\s\-]+)/i,
    // Direct 11-digit pattern
    /\b(\d{11})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const id = match[1].replace(/[\s\-]/g, '');
      if (/^\d{11}$/.test(id)) {
        return id;
      }
    }
  }

  return undefined;
}

/**
 * Extract phone numbers (Qatar format: 8 digits, optionally with +974 or 33/55/66/77 prefix)
 */
function extractPhoneNumbers(text: string): string[] | undefined {
  const patterns = [
    /\+?974?\s*([345678]\d{7})\b/g,
    /(\d{4})\s*(\d{4})/g,
  ];

  const phones = new Set<string>();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const phone = match[1] || (match[2] ? match[1] + match[2] : '');
      if (phone && phone.length >= 7) {
        phones.add(phone.replace(/\s/g, ''));
      }
    }
  }

  // Look for phone keywords
  const phoneKeywordPattern = /(?:الهاتف|الجوال|رقم\s*الهاتف|رقم\s*الجوال)[:\s]*([+\d\s]+)/gi;
  let keywordMatch;
  while ((keywordMatch = phoneKeywordPattern.exec(text)) !== null) {
    const phone = keywordMatch[1].replace(/[\s\-\(\)]/g, '').replace(/^\+?974/, '');
    if (/^\d{8}$/.test(phone)) {
      phones.add(phone);
    }
  }

  return phones.size > 0 ? Array.from(phones) : undefined;
}

/**
 * Extract license number
 */
function extractLicenseNumber(text: string): string | undefined {
  const patterns = [
    /رقم\s*الرخصة[:\s]*([\d\s\-]+)/i,
    /الرخصة[:\s]*([\d\s\-]+)/i,
    /رقم\s*القيادة[:\s]*([\d\s\-]+)/i,
    /رخصة\s*القيادة[:\s]*([\d\s\-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const license = match[1].replace(/[\s\-]/g, '');
      if (/^\d{6,10}$/.test(license)) {
        return license;
      }
    }
  }

  return undefined;
}

/**
 * Extract vehicle make
 */
function extractVehicleMake(text: string): string | undefined {
  const makes = [
    'تويوتا', 'Toyota',
    'نيسان', 'Nissan',
    'هيونداي', 'Hyundai',
    'كيا', 'Kia',
    'فورد', 'Ford',
    'شفروليه', 'Chevrolet',
    'هوندا', 'Honda',
    'ميتسوبيشي', 'Mitsubishi',
    'مازدا', 'Mazda',
    'بي إم دبليو', 'BMW',
    'مرسيدس', 'Mercedes',
    'فولكس واجن', 'Volkswagen',
    'أودي', 'Audi',
    'لكزس', 'Lexus',
  ];

  const lowerText = text.toLowerCase();

  for (const make of makes) {
    const lowerMake = make.toLowerCase();
    if (lowerText.includes(lowerMake)) {
      // Return Arabic name if available
      const arabicMap: { [key: string]: string } = {
        'toyota': 'تويوتا',
        'nissan': 'نيسان',
        'hyundai': 'هيونداي',
        'kia': 'كيا',
        'ford': 'فورد',
        'chevrolet': 'شفروليه',
        'honda': 'هوندا',
        'mitsubishi': 'ميتسوبيشي',
        'mazda': 'مازدا',
        'bmw': 'بي إم دبليو',
        'mercedes': 'مرسيدس',
        'volkswagen': 'فولكس واجن',
        'audi': 'أودي',
        'lexus': 'لكزس',
      };

      return arabicMap[lowerMake] || make;
    }
  }

  return undefined;
}

/**
 * Extract vehicle model
 */
function extractVehicleModel(text: string): string | undefined {
  const models = [
    'هيلكس', 'Hilux',
    'كورولا', 'Corolla',
    'كامري', 'Camry',
    'يارس', 'Yaris',
    'سنترا', 'Sentra',
    'ألتيما', 'Altima',
    'باترول', 'Patrol',
    'لاند كروزر', 'Land Cruiser',
    'فورتشنر', 'Fortuner',
    'راڤ 4', 'RAV4',
    'CR-V', 'CRV',
    'أكورد', 'Accord',
    'سيفيك', 'Civic',
    'إكسنت', 'Accent',
    'إلنترا', 'Elantra',
    'سوناتا', 'Sonata',
    'سبورتيج', 'Sportage',
    'سيراتو', 'Cerato',
    'سولار', 'Solar',
    'توسان', 'Tucson',
    'إمبالا', 'Impala',
    'كابتيفا', 'Captiva',
    'F-150', 'F150',
    'رنج روفر', 'Range Rover',
    'إيفوك', 'Evoque',
  ];

  const lowerText = text.toLowerCase();

  for (const model of models) {
    if (lowerText.includes(model.toLowerCase())) {
      return model;
    }
  }

  return undefined;
}

/**
 * Extract vehicle year
 */
function extractVehicleYear(text: string): string | undefined {
  // Match years between 2000 and 2030
  const match = text.match(/\b(20[0-2][0-9]|2030)\b/);
  if (match) {
    return match[1];
  }

  // Check for Hijri years (1440-1460)
  const hijriMatch = text.match(/\b(14[4-5][0-9]|1460)\b/);
  if (hijriMatch) {
    return hijriMatch[1];
  }

  return undefined;
}

/**
 * Extract plate number
 */
function extractPlateNumber(text: string): string | undefined {
  const patterns = [
    /رقم\s*اللوحة[:\s]*([A-Z0-9\s\-]+)/i,
    /اللوحة[:\s]*([A-Z0-9\s\-]+)/i,
    /لوحة\s*المركبة[:\s]*([A-Z0-9\s\-]+)/i,
    // Qatar plate format: 6-7 digits
    /\b(\d{6,7})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const plate = match[1].replace(/[\s\-]/g, '');
      if (/^\d{6,7}$/.test(plate)) {
        return plate;
      }
    }
  }

  return undefined;
}

/**
 * Extract contract date
 */
function extractContractDate(text: string): string | undefined {
  const patterns = [
    /تاريخ\s*العقد[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /عقد\s*بتاريخ[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /التاريخ[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Extract start date
 */
function extractStartDate(text: string): string | undefined {
  const patterns = [
    /تاريخ\s*البداية[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /من\s*تاريخ[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /ابتداء\s*من[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /يبدأ\s*من[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Extract end date
 */
function extractEndDate(text: string): string | undefined {
  const patterns = [
    /تاريخ\s*النهاية[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /إلى\s*تاريخ[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /وينتهي\s*بتاريخ[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /حتى[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Extract contract amount
 */
function extractContractAmount(text: string): number | undefined {
  const patterns = [
    /قيمة\s*العقد[:\s]*[\d,]+\.?\d*/i,
    /القيمة\s*الإجمالية[:\s]*[\d,]+\.?\d*/i,
    /إجمالي\s*المبلغ[:\s]*[\d,]+\.?\d*/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[0]) {
      const amount = match[0].match(/[\d,]+\.?\d*/);
      if (amount) {
        const parsed = parseFloat(amount[0].replace(/,/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
  }

  return undefined;
}

/**
 * Extract monthly amount
 */
function extractMonthlyAmount(text: string): number | undefined {
  const patterns = [
    /القيمة\s*الشهرية[:\s]*[\d,]+\.?\d*/i,
    /المبلغ\s*الشهري[:\s]*[\d,]+\.?\d*/i,
    /الإيجار\s*الشهري[:\s]*[\d,]+\.?\d*/i,
    /شهريا[:\s]*[\d,]+\.?\d*/i,
    /ريال\s*شهريا[:\s]*[\d,]+\.?\d*/i,
    /ر\.ق\s*شهريا[:\s]*[\d,]+\.?\d*/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[0]) {
      const amount = match[0].match(/[\d,]+\.?\d*/);
      if (amount) {
        const parsed = parseFloat(amount[0].replace(/,/g, ''));
        if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
          return parsed;
        }
      }
    }
  }

  return undefined;
}

/**
 * Extract payment method
 */
function extractPaymentMethod(text: string): string | undefined {
  if (/بنكي/i.test(text)) {
    return 'بنكي';
  }
  if (/نقدي/i.test(text) || /كاش/i.test(text)) {
    return 'نقدي';
  }
  if (/شيك/i.test(text)) {
    return 'شيك';
  }

  return undefined;
}

/**
 * Extract payment cycle
 */
function extractPaymentCycle(text: string): string | undefined {
  if (/شهري/i.test(text)) {
    return 'شهري';
  }
  if (/أسبوعي/i.test(text)) {
    return 'أسبوعي';
  }
  if (/يومي/i.test(text)) {
    return 'يومي';
  }

  return undefined;
}

/**
 * Calculate extraction confidence based on number of extracted fields
 */
function calculateConfidence(fields: ExtractedContractFields): number {
  const importantFields = [
    fields.customerName,
    fields.qatariId,
    fields.plateNumber,
    fields.startDate,
    fields.endDate,
    fields.monthlyAmount,
  ];

  const extractedCount = importantFields.filter(Boolean).length;
  const totalCount = importantFields.length;

  return extractedCount / totalCount;
}
