-- Add OCR-related columns to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS scanned_image_url text,
ADD COLUMN IF NOT EXISTS ocr_confidence numeric CHECK (ocr_confidence >= 0 AND ocr_confidence <= 100),
ADD COLUMN IF NOT EXISTS ocr_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_legacy boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_review_required boolean DEFAULT false;

-- Create storage bucket for scanned invoices
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'scanned-invoices',
  'scanned-invoices',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for scanned invoices bucket
CREATE POLICY "Users can upload scanned invoices for their company"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'scanned-invoices' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view scanned invoices from their company"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'scanned-invoices'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete scanned invoices from their company"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'scanned-invoices'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

-- Create invoice OCR logs table for tracking
CREATE TABLE IF NOT EXISTS invoice_ocr_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  ocr_confidence numeric,
  extracted_data jsonb DEFAULT '{}'::jsonb,
  matched_customer_id uuid REFERENCES customers(id),
  matched_contract_id uuid REFERENCES contracts(id),
  match_confidence numeric,
  match_reasons text[],
  processing_status text NOT NULL DEFAULT 'pending',
  error_message text,
  processed_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoice_ocr_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for OCR logs
CREATE POLICY "Users can view OCR logs in their company"
ON invoice_ocr_logs FOR SELECT
TO authenticated
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can insert OCR logs in their company"
ON invoice_ocr_logs FOR INSERT
TO authenticated
WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can update OCR logs in their company"
ON invoice_ocr_logs FOR UPDATE
TO authenticated
USING (company_id = get_user_company(auth.uid()));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_invoice_ocr_logs_company ON invoice_ocr_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_ocr_logs_status ON invoice_ocr_logs(processing_status);
CREATE INDEX IF NOT EXISTS idx_invoices_scanned ON invoices(company_id, is_legacy) WHERE is_legacy = true;