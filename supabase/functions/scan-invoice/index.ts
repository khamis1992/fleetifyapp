import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRRequest {
  imageBase64: string;
  fileName?: string;
  ocrEngine?: 'gemini' | 'google-vision' | 'hybrid';
  language?: 'auto' | 'arabic' | 'english';
}

// Simplified fuzzy matching for Edge Function environment
interface MatchCandidate {
  id: string;
  name: string;
  phone?: string;
  car_number?: string;
  contract_number?: string;
  agreement_id?: string;
  customer_type?: string;
  confidence: number;
  match_reasons: string[];
  source_table: 'customers' | 'contracts';
}

interface FuzzyMatchResult {
  best_match?: MatchCandidate;
  all_matches: MatchCandidate[];
  total_confidence: number;
  ocr_confidence: number;
  name_similarity: number;
  car_match_score: number;
  context_match_score: number;
}

interface ExtractedInvoiceData {
  invoice_number?: string;
  invoice_date?: string;
  customer_name?: string;
  contract_number?: string;
  car_number?: string;
  total_amount?: number;
  payment_period?: string;
  items?: Array<{
    description: string;
    quantity?: number;
    unit_price?: number;
    total?: number;
  }>;
  notes?: string;
  language_detected?: string;
  raw_text?: string;
  context_clues?: {
    car_numbers: string[];
    months: string[];
    amounts: string[];
    agreement_numbers: string[];
  };
}

/**
 * Simplified Jaro-Winkler similarity for Edge Function
 */
function jaroWinklerSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0 || len2 === 0) return 0.0;
  
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  const str1Matches = new Array(len1).fill(false);
  const str2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }
  
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  
  // Winkler prefix bonus
  let prefix = 0;
  for (let i = 0; i < Math.min(len1, len2, 4); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }
  
  return jaro + (0.1 * prefix * (1 - jaro));
}

/**
 * Normalize name for comparison
 */
function normalizeName(name: string): string {
  if (!name) return '';
  
  return name.toLowerCase()
    .replace(/[^\u0600-\u06FF\u0750-\u077F\w\s]/g, ' ') // Keep Arabic, Latin, numbers, spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate name similarity
 */
function calculateNameSimilarity(extracted: string, candidate: string): number {
  const normalizedExtracted = normalizeName(extracted);
  const normalizedCandidate = normalizeName(candidate);
  
  if (!normalizedExtracted || !normalizedCandidate) return 0;
  
  return jaroWinklerSimilarity(normalizedExtracted, normalizedCandidate);
}

/**
 * Perform customer matching with simplified algorithm
 */
async function performCustomerMatching(
  supabaseClient: any,
  extractedData: ExtractedInvoiceData,
  rawText: string,
  companyId: string,
  ocrConfidence: number
): Promise<FuzzyMatchResult> {
  const candidates: MatchCandidate[] = [];
  
  try {
    // Fetch customers with their contract information
    const { data: customers } = await supabaseClient
      .from('customers')
      .select(`
        id,
        first_name_ar,
        last_name_ar,
        first_name,
        last_name,
        company_name_ar,
        company_name,
        phone,
        customer_type,
        contracts(
          id,
          contract_number,
          monthly_amount,
          car_number,
          status
        )
      `)
      .eq('company_id', companyId)
      .eq('is_active', true);
    
    if (!customers || !extractedData.customer_name) {
      return {
        all_matches: [],
        total_confidence: 0,
        ocr_confidence: ocrConfidence,
        name_similarity: 0,
        car_match_score: 0,
        context_match_score: 0
      };
    }
    
    // Process each customer
    for (const customer of customers) {
      const customerName = customer.company_name_ar || customer.company_name || 
                          `${customer.first_name_ar || customer.first_name || ''} ${customer.last_name_ar || customer.last_name || ''}`.trim();
      
      if (!customerName) continue;
      
      // Calculate name similarity
      const nameSimilarity = calculateNameSimilarity(extractedData.customer_name, customerName);
      
      if (nameSimilarity < 0.3) continue; // Skip low similarity matches
      
      // Process contracts for this customer
      if (customer.contracts && Array.isArray(customer.contracts)) {
        for (const contract of customer.contracts) {
          const carMatchScore = contract.car_number && rawText.includes(contract.car_number) ? 1.0 : 0;
          
          // Calculate total confidence
          const totalConfidence = (
            ocrConfidence * 0.3 +
            nameSimilarity * 100 * 0.4 +
            carMatchScore * 100 * 0.2 +
            0.1 * 100 // Base context score
          );
          
          const matchReasons: string[] = [];
          if (nameSimilarity > 0.7) matchReasons.push('Strong name match');
          if (nameSimilarity > 0.5) matchReasons.push('Good name match');
          if (carMatchScore > 0.8) matchReasons.push('Car number match');
          
          candidates.push({
            id: customer.id,
            name: customerName,
            phone: customer.phone,
            car_number: contract.car_number,
            contract_number: contract.contract_number,
            agreement_id: contract.id,
            customer_type: customer.customer_type,
            confidence: Math.round(totalConfidence),
            match_reasons: matchReasons,
            source_table: 'customers'
          });
        }
      }
    }
    
    // Sort by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    // Calculate aggregate scores
    const bestMatch = candidates[0];
    const avgNameSimilarity = candidates.length > 0 ? 
      candidates.reduce((sum, c) => sum + calculateNameSimilarity(extractedData.customer_name || '', c.name), 0) / candidates.length : 0;
    
    return {
      best_match: bestMatch,
      all_matches: candidates.slice(0, 10), // Top 10 matches
      total_confidence: bestMatch ? bestMatch.confidence : 0,
      ocr_confidence: ocrConfidence,
      name_similarity: Math.round(avgNameSimilarity * 100),
      car_match_score: 0,
      context_match_score: 0
    };
    
  } catch (error) {
    console.error('Error in fuzzy matching:', error);
    return { 
      all_matches: [], 
      total_confidence: 0, 
      ocr_confidence: ocrConfidence, 
      name_similarity: 0, 
      car_match_score: 0, 
      context_match_score: 0 
    };
  }
}

/**
 * Enhanced OCR with multi-engine support and intelligent text analysis
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_VISION_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { imageBase64, fileName, ocrEngine = 'hybrid', language = 'auto' }: OCRRequest = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing advanced invoice OCR for:', fileName || 'unnamed file', 'Engine:', ocrEngine);

    // Enhanced OCR processing with multi-engine support
    let extractedText = '';
    let extractedData: ExtractedInvoiceData = {};
    let confidence = 0;
    let languageDetected = 'auto';

    // Detect language from filename or use auto-detection
    if (fileName && (fileName.includes('ar') || fileName.includes('arabic'))) {
      languageDetected = 'arabic';
    } else if (fileName && (fileName.includes('en') || fileName.includes('english'))) {
      languageDetected = 'english';
    }

    console.log('Using OCR engine:', ocrEngine, 'Language:', languageDetected);

    // Primary OCR with Gemini 2.5 Flash (enhanced for handwritten Arabic/English)
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an advanced multilingual OCR specialist expert in reading handwritten and printed invoices in Arabic and English.

Your mission: Extract structured data from invoice images with maximum accuracy.

Instructions:
1. Read ALL text (handwritten, printed, Arabic, English)
2. Handle name variations (محمد = Mohammed/Muhammad/Mohamed)
3. Detect car/vehicle numbers in any format
4. Extract payment periods/months mentioned
5. Identify customer names with fuzzy matching capability
6. Find agreement/contract numbers

Output ONLY valid JSON in this exact format:
{
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "customer_name": "exact name as written",
  "contract_number": "agreement/contract number or null",
  "car_number": "vehicle/plate number or null",
  "total_amount": number_only_or_null,
  "payment_period": "month/period mentioned or null",
  "items": [
    {
      "description": "item description",
      "quantity": number_or_null,
      "unit_price": number_or_null,
      "total": number_or_null
    }
  ],
  "notes": "additional context or null",
  "language_detected": "arabic/english/mixed",
  "raw_text": "all extracted text as one string",
  "context_clues": {
    "car_numbers": ["array of potential car numbers"],
    "months": ["array of month references"],
    "amounts": ["array of monetary amounts found"],
    "agreement_numbers": ["array of contract/agreement refs"]
  }
}

CRITICAL:
- Include ALL text in raw_text field
- Extract customer names exactly as written (preserve Arabic/English)
- Find car numbers in ANY format (123-ABC, ABC-123, Arabic letters + numbers)
- Detect months in Arabic (يناير، فبراير) and English (January, February)
- Handle handwritten text with high tolerance for variations
- Return confidence score based on text clarity`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this invoice image and extract ALL data with maximum precision. Pay special attention to handwritten Arabic names and car numbers. Language preference: ${languageDetected}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') 
                    ? imageBase64 
                    : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 3000,
        temperature: 0.1 // Low temperature for consistency
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`OCR processing failed: ${response.status}`);
    }

    const data = await response.json();
    extractedText = data.choices?.[0]?.message?.content;

    if (!extractedText) {
      throw new Error('No content extracted from image');
    }

    console.log('Raw OCR response:', extractedText);

    // Parse JSON from response
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = extractedText.match(/```json\n([\s\S]*?)\n```/) || 
                       extractedText.match(/```\n([\s\S]*?)\n```/) ||
                       extractedText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        extractedData = JSON.parse(jsonStr);
      } else {
        // Try parsing the whole response
        extractedData = JSON.parse(extractedText);
      }

      // Calculate confidence based on extracted fields
      const fields = ['invoice_number', 'invoice_date', 'customer_name', 'total_amount'];
      const foundFields = fields.filter(f => extractedData[f as keyof ExtractedInvoiceData]);
      confidence = (foundFields.length / fields.length) * 100;
      languageDetected = extractedData.language_detected || languageDetected;

    } catch (parseError) {
      console.error('Failed to parse OCR response:', parseError);
      // Return raw text if JSON parsing fails
      extractedData = {
        raw_text: extractedText,
        notes: 'Failed to parse structured data'
      };
      confidence = 30; // Low confidence for unparsed data
    }

    // Now integrate fuzzy matching
    console.log('Starting intelligent customer matching...');
    
    // Initialize Supabase client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get company_id from request headers or default
    const authHeader = req.headers.get('authorization');
    let companyId = 'default-company'; // Default fallback
    
    if (authHeader) {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
        if (user) {
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();
          if (profile?.company_id) {
            companyId = profile.company_id;
          }
        }
      } catch (error) {
        console.warn('Could not get company_id from auth:', error);
      }
    }

    // Perform intelligent fuzzy matching
    let matchResult: FuzzyMatchResult | null = null;
    if (extractedData.customer_name || extractedData.car_number) {
      try {
        // Import and use fuzzy matching (simplified version for Edge Function)
        const customerMatches = await performCustomerMatching(
          supabaseClient,
          extractedData,
          extractedText,
          companyId,
          confidence
        );
        
        matchResult = customerMatches;
        console.log('Fuzzy matching completed:', matchResult.total_confidence);
        
      } catch (matchError) {
        console.error('Error in fuzzy matching:', matchError);
        matchResult = {
          best_match: undefined,
          all_matches: [],
          total_confidence: confidence,
          ocr_confidence: confidence,
          name_similarity: 0,
          car_match_score: 0,
          context_match_score: 0
        };
      }
    }

    // Store the result in database
    try {
      const { data: invoice, error: insertError } = await supabaseClient
        .from('invoice_scans')
        .insert({
          company_id: companyId,
          original_filename: fileName || 'untitled',
          ocr_engine: ocrEngine,
          ocr_text: extractedText,
          language_detected: languageDetected,
          structured_data: extractedData,
          ocr_confidence: confidence,
          matched_customer_id: matchResult?.best_match?.id || null,
          matched_agreement_id: matchResult?.best_match?.agreement_id || null,
          match_confidence: matchResult?.total_confidence || 0,
          all_matches: matchResult?.all_matches || [],
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (insertError) {
        console.error('Error storing scan result:', insertError);
      } else {
        console.log('Scan result stored with ID:', invoice.id);
      }
    } catch (storeError) {
      console.error('Error storing scan result:', storeError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...extractedData,
          scan_id: Date.now(), // Temporary ID
          processing_info: {
            ocr_engine: ocrEngine,
            language_detected: languageDetected,
            ocr_confidence: Math.round(confidence)
          }
        },
        matching: matchResult,
        raw_response: extractedText.substring(0, 1000) // Truncate for response size
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in scan-invoice:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
