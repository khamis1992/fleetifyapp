/**
 * Vehicle Registration OCR Edge Function
 * 
 * Uses Google Cloud Vision API for extracting data from vehicle registration documents
 * Optimized for Arabic + English mixed documents (Qatar vehicle forms)
 * 
 * Features:
 * - High accuracy for Arabic text
 * - Extracts plate numbers, VIN, engine number, dates, etc.
 * - Handles complex table layouts
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { authorizeActiveCompanyUser } from "../_shared/privileged-admin.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRRequest {
  imageBase64: string; // Base64 encoded image (without data: prefix)
}

interface ExtractedVehicleData {
  plateNumber?: string;
  vin?: string;
  engineNumber?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  seatingCapacity?: number;
  registrationDate?: string;
  registrationExpiry?: string;
  insuranceExpiry?: string;
  ownerName?: string;
}

interface OCRResponse {
  success: boolean;
  rawText: string;
  extractedData: ExtractedVehicleData;
  confidence: number;
  error?: string;
}

// Google Cloud Vision API endpoint
const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await authorizeActiveCompanyUser(req);
    const { imageBase64 }: OCRRequest = await req.json();

    console.log('🚗 Vehicle OCR Request received');

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

    // Call Google Cloud Vision API
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
              languageHints: ['ar', 'en'],
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
    const extractedData = extractVehicleData(fullText);
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
    console.error('❌ Vehicle OCR Error:', error);
    
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
 * Extract structured vehicle data from raw OCR text
 */
function extractVehicleData(text: string): ExtractedVehicleData {
  const data: ExtractedVehicleData = {};
  
  // Clean text
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // 1. Plate Number - رقم اللوحة / Vehicle No.
  const platePatterns = [
    /vehicle\s*n[o0]\.?\s*[:\.]?\s*(\d{3,8})/i,
    /رقم\s*اللوح[ةه]\s*[:\.]?\s*(\d{3,8})/,
    /(\d{6})\s*(?:رقم\s*اللوح[ةه]|vehicle)/i,
  ];
  for (const pattern of platePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      data.plateNumber = match[1].replace(/^0+/, '') || match[1];
      break;
    }
  }
  
  // Also look for standalone 6-digit numbers near "Vehicle" or "اللوحة"
  if (!data.plateNumber) {
    const vehicleSection = cleanText.match(/(?:vehicle|اللوح)[^]*?(\d{5,7})/i);
    if (vehicleSection) {
      data.plateNumber = vehicleSection[1].replace(/^0+/, '') || vehicleSection[1];
    }
  }
  
  // 2. VIN / Chassis Number - رقم الهيكل / رقم القاعدة
  const vinPatterns = [
    /chassis\s*n[o0]\.?\s*[:\.]?\s*([A-Z0-9]{17})/i,
    /رقم\s*القاعد[ةه]\s*[:\.]?\s*([A-Z0-9]{17})/i,
    /([A-Z][A-Z0-9]{15,16})/i,
  ];
  for (const pattern of vinPatterns) {
    const match = cleanText.match(pattern);
    if (match && /^[A-Z0-9]{17}$/i.test(match[1])) {
      data.vin = match[1].toUpperCase();
      break;
    }
  }
  
  // 3. Engine Number - رقم المحرك
  const enginePatterns = [
    /engine\s*n[o0]\.?\s*[:\.]?\s*([A-Z0-9]{4,15})/i,
    /رقم\s*المحرك\s*[:\.]?\s*([A-Z0-9]{4,15})/i,
  ];
  for (const pattern of enginePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      data.engineNumber = match[1].toUpperCase();
      break;
    }
  }
  
  // 4. Year - سنة الصنع
  const yearPatterns = [
    /سن[ةه]\s*الصنع\s*[:\.]?\s*(\d{4})/,
    /(\d{4})\s*سن[ةه]\s*الصنع/,
    /year\s*[:\.]?\s*(\d{4})/i,
  ];
  for (const pattern of yearPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const year = parseInt(match[1]);
      if (year >= 1990 && year <= new Date().getFullYear() + 1) {
        data.year = year;
        break;
      }
    }
  }
  
  // 5. Model - الطراز
  const modelPatterns = [
    /الطراز\s*[:\.]?\s*([A-Z0-9\-]+)/i,
    /model\s*[:\.]?\s*([A-Z0-9\-]+)/i,
  ];
  for (const pattern of modelPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1].length >= 2) {
      data.model = match[1].toUpperCase();
      break;
    }
  }
  
  // 6. Make - نوع المركبة
  const knownMakes = [
    'تويوتا', 'TOYOTA', 'نيسان', 'NISSAN', 'هوندا', 'HONDA',
    'هيونداي', 'HYUNDAI', 'كيا', 'KIA', 'مازدا', 'MAZDA',
    'ميتسوبيشي', 'MITSUBISHI', 'فورد', 'FORD', 'شيفروليه', 'CHEVROLET',
    'مرسيدس', 'MERCEDES', 'بي ام دبليو', 'BMW', 'أودي', 'AUDI',
    'لكزس', 'LEXUS', 'جي ايه سي', 'GAC', 'جيلي', 'GEELY',
    'ام جي', 'MG', 'بي واي دي', 'BYD', 'جي ام سي', 'GMC',
    'لاند روفر', 'LAND ROVER', 'جاكوار', 'JAGUAR', 'بورش', 'PORSCHE',
    'جي ايه سي موتور', 'GAC MOTOR',
  ];
  for (const make of knownMakes) {
    if (cleanText.includes(make)) {
      data.make = make;
      break;
    }
  }
  
  // 7. Color - اللون
  const colorMap: Record<string, string> = {
    'بني': 'بني', 'brown': 'بني',
    'أبيض': 'أبيض', 'ابيض': 'أبيض', 'white': 'أبيض',
    'أسود': 'أسود', 'اسود': 'أسود', 'black': 'أسود',
    'فضي': 'فضي', 'silver': 'فضي',
    'رمادي': 'رمادي', 'grey': 'رمادي', 'gray': 'رمادي',
    'أحمر': 'أحمر', 'احمر': 'أحمر', 'red': 'أحمر',
    'أزرق': 'أزرق', 'ازرق': 'أزرق', 'blue': 'أزرق',
    'أخضر': 'أخضر', 'اخضر': 'أخضر', 'green': 'أخضر',
  };
  for (const [key, value] of Object.entries(colorMap)) {
    if (cleanText.toLowerCase().includes(key.toLowerCase())) {
      data.color = value;
      break;
    }
  }
  
  // 8. Seating Capacity - المقاعد
  const seatsMatch = cleanText.match(/(?:المقاعد|seats?)\s*[:\.]?\s*0*(\d{1,2})/i);
  if (seatsMatch) {
    const seats = parseInt(seatsMatch[1]);
    if (seats >= 2 && seats <= 50) {
      data.seatingCapacity = seats;
    }
  }
  
  // 9. Dates - extract all YYYY-MM-DD or DD-MM-YYYY dates
  const dateMatches = cleanText.matchAll(/(\d{4}[-/]\d{2}[-/]\d{2})/g);
  const dates = Array.from(dateMatches).map(m => m[1]);
  
  // Registration expiry (usually labeled "Exp. Date" or "انتهاء الترخيص")
  const expiryMatch = cleanText.match(/(?:exp\.?\s*date|انتهاء\s*الترخيص)[:\s]*(\d{4}[-/]\d{2}[-/]\d{2})/i);
  if (expiryMatch) {
    data.registrationExpiry = expiryMatch[1].replace(/\//g, '-');
  } else if (dates.length > 0) {
    // Assume last date is expiry
    data.registrationExpiry = dates[dates.length - 1].replace(/\//g, '-');
  }
  
  // Insurance expiry
  const insuranceMatch = cleanText.match(/(?:انتهاء\s*التأمين|insurance)[:\s]*(\d{4}[-/]\d{2}[-/]\d{2})/i);
  if (insuranceMatch) {
    data.insuranceExpiry = insuranceMatch[1].replace(/\//g, '-');
  }
  
  // 10. Owner name - المالك / Owner
  const ownerMatch = cleanText.match(/(?:owner|المالك)[:\s]*([^\n\r]+?)(?=\s*owner\s*id|\s*إثبات|$)/i);
  if (ownerMatch) {
    data.ownerName = ownerMatch[1].trim();
  }
  
  return data;
}

/**
 * Calculate confidence score based on extracted data
 */
function calculateConfidence(text: string, data: ExtractedVehicleData): number {
  if (!text || text.length < 50) return 0;
  
  let confidence = 0.3; // Base confidence
  
  // Text quality indicators
  if (text.length > 200) confidence += 0.1;
  if (text.length > 500) confidence += 0.1;
  
  // Arabic text presence
  if (/[\u0600-\u06FF]/.test(text)) confidence += 0.1;
  
  // Extracted data quality
  if (data.plateNumber) confidence += 0.15;
  if (data.vin) confidence += 0.1;
  if (data.year) confidence += 0.05;
  if (data.make) confidence += 0.05;
  if (data.registrationExpiry) confidence += 0.05;
  if (data.engineNumber) confidence += 0.05;
  
  return Math.min(confidence, 1.0);
}


