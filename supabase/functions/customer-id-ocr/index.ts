/**
 * Customer QID OCR Edge Function
 *
 * Uses Google Cloud Vision API for extracting data from Qatari ID cards
 * Optimized for Arabic + English mixed documents (Qatar Resident Permits)
 *
 * Features:
 * - High accuracy for Arabic and English text
 * - Extracts: National ID, Name (EN/AR), Nationality, DOB, Expiry, Occupation
 * - Handles clear and unclear/fuzzy images
 * - Supports Qatar-specific ID card patterns
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRRequest {
  imageBase64: string; // Base64 encoded image (without data: prefix)
}

interface ExtractedCustomerData {
  nationalId?: string;
  name?: string;
  nameArabic?: string;
  firstName?: string;
  lastName?: string;
  firstNameArabic?: string;
  lastNameArabic?: string;
  dateOfBirth?: string;
  idExpiry?: string;
  nationality?: string;
  nationalityArabic?: string;
  passportNumber?: string;
  occupation?: string;
  occupationArabic?: string;
}

interface OCRResponse {
  success: boolean;
  rawText: string;
  extractedData: ExtractedCustomerData;
  confidence: number;
  error?: string;
}

// Google Cloud Vision API endpoint
const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 }: OCRRequest = await req.json();

    console.log('🪪 Customer QID OCR Request received');

    if (!imageBase64) {
      throw new Error('No image provided');
    }

    // Get Google Vision API key from environment
    const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');

    if (!apiKey) {
      console.error('❌ GOOGLE_VISION_API_KEY not configured');
      throw new Error('Google Vision API key not configured');
    }

    console.log('🔍 Calling Google Cloud Vision API...');

    // Clean base64 data (remove data URL prefix if present)
    const cleanBase64 = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;

    // Call Google Cloud Vision API with both Arabic and English hints
    const response = await fetch(`${GOOGLE_VISION_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: { content: cleanBase64 },
            features: [
              { type: 'TEXT_DETECTION', maxResults: 50 },
              { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
            ],
            imageContext: {
              languageHints: ['ar', 'en'], // Support both Arabic and English
              // Enable advanced text extraction for uncertain images
              textDetectionParams: {
                enableTextDetectionConfidenceScore: true,
              },
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Google Vision API error:', response.status, errorText);
      throw new Error(`Google Vision API error: ${response.status}`);
    }

    const data = await response.json();

    // Get extracted text
    const fullText = data.responses?.[0]?.fullTextAnnotation?.text ||
                     data.responses?.[0]?.textAnnotations?.[0]?.description || '';

    console.log('📝 Extracted text length:', fullText.length);
    console.log('📝 Text preview:', fullText.substring(0, 300));

    if (!fullText || fullText.length === 0) {
      throw new Error('No text extracted from image');
    }

    // Extract structured data from text
    const extractedData = extractCustomerData(fullText);
    const confidence = calculateConfidence(fullText, extractedData);

    console.log('✅ Extracted data:', JSON.stringify(extractedData));
    console.log('📊 Confidence:', Math.round(confidence * 100) + '%');

    const result: OCRResponse = {
      success: true,
      rawText: fullText,
      extractedData,
      confidence,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('❌ Customer QID OCR Error:', error);

    const result: OCRResponse = {
      success: false,
      rawText: '',
      extractedData: {},
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Extract structured customer data from raw OCR text
 * Supports Qatar-specific ID card patterns with Arabic and English
 */
function extractCustomerData(text: string): ExtractedCustomerData {
  const data: ExtractedCustomerData = {};

  // Clean text - remove extra spaces and control characters
  const cleanText = text.replace(/\s+/g, ' ').trim();

  console.log('🔍 Extracting customer data from text...');

  // 1. National ID Number - ID No / ID Number / QID / رقم الهوية
  // Supports multiple variations: ID No, ID No., ID Number, QID, رقم الهوية
  const idPatterns = [
    // English patterns
    /(?:ID\s*\.\s*(?:No\s*\.\s*?|Number\s*?)?|QID)\s*[:\.]?\s*(\d{11})/i,
    /ID\s*No\s*[:\.]?\s*(\d{11})/i,
    /ID\s*Number\s*[:\.]?\s*(\d{11})/i,
    // Arabic patterns
    /(?:رقم\s*(?:البطاقة|الهوية|الID)|QID)\s*[:\.]?\s*(\d{11})/i,
    /(?:إذن\s*إقامة)\s*[:\.]?\s*(\d{11})/i,
    // Any 11-digit number (as fallback)
    /\b(\d{11})\b/,
  ];

  for (const pattern of idPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      data.nationalId = match[1];
      console.log('✅ Found National ID:', data.nationalId);
      break;
    }
  }

  // 2. Date of Birth - D.O.B / Date of Birth / تاريخ الميلاد
  // Supports: D.O.B, DOB, Date of Birth, تاريخ الميلاد
  const dobPatterns = [
    /(?:D\.?O\.?B\.?|Date\s+of\s+Birth|تاريخ\s+الميلاد)\s*[:\.]?\s*(\d{2}[-/]\d{2}[-/]\d{4})/i,
    /(?:D\.?O\.?B\.?|DOB|تاريخ\s+الميلاد)\s*[:\.]?\s*(\d{4}[-/]\d{2}[-/]\d{2})/i,
    // Flexible pattern with optional spaces
    /(?:D\s*\.?\s*O\s*\.?\s*B|تاريخ\s+الميلاد)\s*[:\.]?\s*(\d{2}[-/]\d{2}[-/]\d{4})/i,
  ];

  for (const pattern of dobPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      data.dateOfBirth = parseDate(match[1]);
      if (data.dateOfBirth) {
        console.log('✅ Found DOB:', data.dateOfBirth);
        break;
      }
    }
  }

  // 3. ID Expiry - Expiry / Exp Date / تاريخ الانتهاء
  // Supports: Expiry, Exp Date, تاريخ الانتهاء
  const expiryPatterns = [
    /(?:Exp(?:iry|\.?)?(?:\s+Date)?|انتهاء\s+البطاقة|تاريخ\s+الانتهاء)\s*[:\.]?\s*(\d{2}[-/]\d{2}[-/]\d{4})/i,
    /(?:Exp(?:iry|\.?)?(?:\s+Date)?|انتهاء\s+البطاقة|تاريخ\s+الانتهاء)\s*[:\.]?\s*(\d{4}[-/]\d{2}[-/]\d{2})/i,
  ];

  for (const pattern of expiryPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      data.idExpiry = parseDate(match[1]);
      if (data.idExpiry) {
        console.log('✅ Found Expiry:', data.idExpiry);
        break;
      }
    }
  }

  // 4. Nationality - Nationality / الجنسية (English and Arabic)
  const nationalityPatterns = [
    // English
    /Nationality\s*[:\.]?\s*([A-Z][A-Z\s]+)/i,
    // Arabic
    /الجنسية\s*[:\.]?\s*([A-Za-z\u0600-\u06FF\s]+)/i,
  ];

  for (const pattern of nationalityPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const nationality = match[1].trim();
      const hasArabic = /[\u0600-\u06FF]/.test(nationality);

      if (hasArabic) {
        data.nationalityArabic = nationality;
        console.log('✅ Found Nationality (AR):', data.nationalityArabic);
      } else {
        data.nationality = nationality;
        console.log('✅ Found Nationality (EN):', data.nationality);
      }
      break;
    }
  }

  // 5. Name - Name / الاسم (English and Arabic)
  // Supports: Name, الاسم, الاسم بالعربي, الاسم بالإنجليزي
  const namePatterns = [
    // English name
    /Name\s*[:\.]?\s*([A-Z][A-Z\s]+)/i,
    // Arabic name label
    /(?:الاسم\s*[:\.]?\s*|الاسم\s+بالإنجليزي\s*[:\.]?\s*)([A-Za-z\s]+)/i,
    // Arabic name (الاسم بالعربي)
    /(?:الاسم\s+بالعربي|الاسم\s*\([^)]*\))\s*[:\.]?\s*([\u0600-\u06FF\s]+)/i,
  ];

  for (const pattern of namePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const fullName = match[1].trim();
      const hasArabic = /[\u0600-\u06FF]/.test(fullName);

      if (hasArabic) {
        data.nameArabic = fullName;
        console.log('✅ Found Name (AR):', data.nameArabic);

        // Split Arabic name
        const nameParts = fullName.split(/\s+/).filter(n => n.length > 0);
        if (nameParts.length >= 2) {
          data.firstNameArabic = nameParts[0];
          data.lastNameArabic = nameParts.slice(1).join(' ');
        } else if (nameParts.length === 1) {
          data.firstNameArabic = nameParts[0];
        }
      } else {
        data.name = fullName;
        console.log('✅ Found Name (EN):', data.name);

        // Split English name
        const nameParts = fullName.split(/\s+/).filter(n => n.length > 0);
        if (nameParts.length >= 2) {
          data.firstName = nameParts[0];
          data.lastName = nameParts.slice(1).join(' ');
        } else if (nameParts.length === 1) {
          data.firstName = nameParts[0];
        }
      }
    }
  }

  // 6. Occupation - Occupation / المهنة (English and Arabic)
  const occupationPatterns = [
    /Occupation\s*[:\.]?\s*([A-Za-z\s]+)/i,
    /المهنة\s*[:\.]?\s*([A-Za-z\u0600-\u06FF\s]+)/i,
  ];

  for (const pattern of occupationPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const occupation = match[1].trim();
      const hasArabic = /[\u0600-\u06FF]/.test(occupation);

      if (hasArabic) {
        data.occupationArabic = occupation;
        console.log('✅ Found Occupation (AR):', data.occupationArabic);
      } else {
        data.occupation = occupation;
        console.log('✅ Found Occupation (EN):', data.occupation);
      }
      break;
    }
  }

  // 7. Passport Number - Passport No
  const passportPatterns = [
    /Passport\s*No\s*[:\.]?\s*([A-Z0-9]{6,12})/i,
    /رقم\s*جواز\s*السفر\s*[:\.]?\s*([A-Z0-9]{6,12})/i,
  ];

  for (const pattern of passportPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      data.passportNumber = match[1].trim();
      console.log('✅ Found Passport:', data.passportNumber);
      break;
    }
  }

  console.log('📊 Final extracted data:', JSON.stringify(data, null, 2));
  return data;
}

/**
 * Parse date string to YYYY-MM-DD format
 * Handles both DD-MM-YYYY and YYYY-MM-DD formats
 */
function parseDate(dateStr: string): string | undefined {
  try {
    const parts = dateStr.split(/[-/]/);
    if (parts.length !== 3) return undefined;

    let year: number, month: number, day: number;

    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
      day = parseInt(parts[2]);
    } else {
      // DD-MM-YYYY
      day = parseInt(parts[0]);
      month = parseInt(parts[1]);
      year = parseInt(parts[2]);
    }

    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      return undefined;
    }

    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  } catch {
    return undefined;
  }
}

/**
 * Calculate confidence score based on extracted data quality
 */
function calculateConfidence(text: string, data: ExtractedCustomerData): number {
  if (!text || text.length < 50) return 0;

  let confidence = 0.3; // Base confidence

  // Text quality indicators
  if (text.length > 200) confidence += 0.1;
  if (text.length > 500) confidence += 0.1;

  // Arabic text presence (Qatar IDs are bilingual)
  if (/[\u0600-\u06FF]/.test(text)) confidence += 0.1;

  // Extracted data quality
  if (data.nationalId) confidence += 0.2;
  if (data.name || data.nameArabic) confidence += 0.1;
  if (data.firstName || data.firstNameArabic) confidence += 0.05;
  if (data.nationality || data.nationalityArabic) confidence += 0.05;
  if (data.dateOfBirth) confidence += 0.05;
  if (data.idExpiry) confidence += 0.05;

  return Math.min(confidence, 1.0);
}
