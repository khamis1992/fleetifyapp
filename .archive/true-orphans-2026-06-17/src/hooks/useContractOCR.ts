import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ExtractedContractData {
  // Agreement Info
  contract_number?: string;
  contract_date?: string;
  agreement_type?: string;
  
  // Customer Info
  customer_name?: string;
  customer_civil_id?: string;
  customer_phone?: string;
  customer_nationality?: string;
  customer_address?: string;
  
  // Vehicle Info
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  vehicle_year?: number;
  vehicle_chassis?: string;
  
  // Financial Terms
  monthly_rent?: number;
  guarantee_amount?: number;
  contract_duration_months?: number;
  start_date?: string;
  end_date?: string;
  
  // Additional Info
  raw_text?: string;
  confidence?: number;
}

interface OCRResult {
  success: boolean;
  data?: ExtractedContractData;
  confidence?: number;
  error?: string;
}

export const useContractOCR = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedContractData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const extractContractData = useCallback(async (file: File): Promise<OCRResult> => {
    setIsProcessing(true);
    setProgress(10);
    setError(null);

    try {
      // Step 1: Convert image to base64
      setProgress(20);
      const base64Image = await fileToBase64(file);
      
      // Step 2: Get OpenAI API key from Supabase
      setProgress(30);
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', user?.profile?.company_id)
        .single();

      if (companyError || !companyData?.settings?.openai_api_key) {
        throw new Error('OpenAI API key not configured. Please configure it in company settings.');
      }

      const apiKey = companyData.settings.openai_api_key;

      // Step 3: Call OpenAI Vision API for OCR
      setProgress(50);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',  // GPT-4 Omni with vision capabilities
          messages: [
            {
              role: 'system',
              content: `You are an expert at extracting structured data from Arabic rental agreement documents. 
Extract all relevant information from the contract image and return it in valid JSON format.
Focus on: agreement number, date, customer details (name, civil ID, phone, nationality), 
vehicle details (make, model, plate number, chassis, year), 
financial terms (monthly rent, guarantee amount, duration), and contract dates.
If a field is not clearly visible, omit it rather than guessing.
Return ONLY valid JSON, no additional text.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract all contract data from this Arabic rental agreement image. Return the data in this JSON structure:
{
  "contract_number": "string",
  "contract_date": "YYYY-MM-DD",
  "agreement_type": "string",
  "customer_name": "string",
  "customer_civil_id": "string",
  "customer_phone": "string",
  "customer_nationality": "string",
  "customer_address": "string",
  "vehicle_make": "string",
  "vehicle_model": "string",
  "vehicle_plate": "string",
  "vehicle_year": number,
  "vehicle_chassis": "string",
  "monthly_rent": number,
  "guarantee_amount": number,
  "contract_duration_months": number,
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "raw_text": "string with all extracted Arabic text"
}`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image
                  }
                }
              ]
            }
          ],
          max_tokens: 2000,
          temperature: 0.1  // Low temperature for consistent extraction
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      setProgress(70);
      const result = await response.json();
      const extractedText = result.choices[0]?.message?.content;

      if (!extractedText) {
        throw new Error('No data extracted from image');
      }

      // Step 4: Parse the JSON response
      setProgress(85);
      let parsedData: ExtractedContractData;
      try {
        // Remove markdown code blocks if present
        const cleanedText = extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsedData = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Failed to parse extracted data');
      }

      // Step 5: Validate and clean the data
      setProgress(95);
      const validatedData = validateAndCleanData(parsedData);
      
      // Calculate confidence based on how many fields were extracted
      const totalFields = 18; // Total expected fields
      const extractedFields = Object.keys(validatedData).filter(key => 
        validatedData[key] !== null && validatedData[key] !== undefined && validatedData[key] !== ''
      ).length;
      const confidence = Math.round((extractedFields / totalFields) * 100);

      validatedData.confidence = confidence;

      setExtractedData(validatedData);
      setProgress(100);
      setIsProcessing(false);

      return {
        success: true,
        data: validatedData,
        confidence
      };

    } catch (err) {
      console.error('Contract OCR error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract contract data';
      setError(errorMessage);
      setIsProcessing(false);
      setProgress(0);

      return {
        success: false,
        error: errorMessage
      };
    }
  }, [user?.profile?.company_id]);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress(0);
    setExtractedData(null);
    setError(null);
  }, []);

  return {
    extractContractData,
    isProcessing,
    progress,
    extractedData,
    error,
    reset
  };
};

// Helper function to convert File to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper function to validate and clean extracted data
function validateAndCleanData(data: any): ExtractedContractData {
  const cleaned: ExtractedContractData = {};

  // String fields
  if (data.contract_number) cleaned.contract_number = String(data.contract_number).trim();
  if (data.agreement_type) cleaned.agreement_type = String(data.agreement_type).trim();
  if (data.customer_name) cleaned.customer_name = String(data.customer_name).trim();
  if (data.customer_civil_id) cleaned.customer_civil_id = String(data.customer_civil_id).trim();
  if (data.customer_phone) cleaned.customer_phone = String(data.customer_phone).trim();
  if (data.customer_nationality) cleaned.customer_nationality = String(data.customer_nationality).trim();
  if (data.customer_address) cleaned.customer_address = String(data.customer_address).trim();
  if (data.vehicle_make) cleaned.vehicle_make = String(data.vehicle_make).trim();
  if (data.vehicle_model) cleaned.vehicle_model = String(data.vehicle_model).trim();
  if (data.vehicle_plate) cleaned.vehicle_plate = String(data.vehicle_plate).trim();
  if (data.vehicle_chassis) cleaned.vehicle_chassis = String(data.vehicle_chassis).trim();
  if (data.raw_text) cleaned.raw_text = String(data.raw_text).trim();

  // Date fields - validate format
  if (data.contract_date && isValidDate(data.contract_date)) {
    cleaned.contract_date = data.contract_date;
  }
  if (data.start_date && isValidDate(data.start_date)) {
    cleaned.start_date = data.start_date;
  }
  if (data.end_date && isValidDate(data.end_date)) {
    cleaned.end_date = data.end_date;
  }

  // Number fields - ensure they're valid numbers
  if (data.monthly_rent && !isNaN(Number(data.monthly_rent))) {
    cleaned.monthly_rent = Number(data.monthly_rent);
  }
  if (data.guarantee_amount && !isNaN(Number(data.guarantee_amount))) {
    cleaned.guarantee_amount = Number(data.guarantee_amount);
  }
  if (data.contract_duration_months && !isNaN(Number(data.contract_duration_months))) {
    cleaned.contract_duration_months = Number(data.contract_duration_months);
  }
  if (data.vehicle_year && !isNaN(Number(data.vehicle_year))) {
    cleaned.vehicle_year = Number(data.vehicle_year);
  }

  return cleaned;
}

// Helper function to validate date format
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
