export interface ExtractedInvoiceData {
  invoice_number?: string;
  invoice_date?: string;
  customer_name?: string;
  contract_number?: string;
  total_amount?: number;
  items?: InvoiceItem[];
  notes?: string;
}

export interface InvoiceItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
}

export interface OCRResult {
  success: boolean;
  data?: ExtractedInvoiceData;
  confidence?: number;
  raw_response?: string;
  error?: string;
}

export interface InvoiceMatchResult {
  confidence: number;
  customer_id?: string;
  customer_name?: string;
  contract_id?: string;
  contract_number?: string;
  match_reasons: string[];
  alternatives: Array<{
    customer_id?: string;
    customer_name?: string;
    contract_id?: string;
    contract_number?: string;
    confidence: number;
    reason: string;
  }>;
}

export interface InvoiceOCRLog {
  id: string;
  company_id: string;
  invoice_id?: string;
  image_url: string;
  ocr_confidence?: number;
  extracted_data: ExtractedInvoiceData;
  matched_customer_id?: string;
  matched_contract_id?: string;
  match_confidence?: number;
  match_reasons?: string[];
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'reviewed';
  error_message?: string;
  processed_by?: string;
  created_at: string;
  updated_at: string;
}
