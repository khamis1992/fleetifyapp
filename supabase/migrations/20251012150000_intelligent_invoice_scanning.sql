-- Intelligent Invoice Scanning System Migration
-- Creates tables and functions for advanced OCR and fuzzy matching

-- Table for storing invoice scan results
CREATE TABLE IF NOT EXISTS invoice_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    original_filename TEXT,
    image_url TEXT,
    
    -- OCR Results
    ocr_engine TEXT DEFAULT 'gemini',
    ocr_text TEXT,
    language_detected TEXT DEFAULT 'auto',
    structured_data JSONB,
    ocr_confidence INTEGER DEFAULT 0,
    
    -- Fuzzy Matching Results
    matched_customer_id UUID REFERENCES customers(id),
    matched_agreement_id UUID REFERENCES contracts(id),
    match_confidence INTEGER DEFAULT 0,
    all_matches JSONB DEFAULT '[]'::jsonb,
    
    -- Processing Status
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    
    -- Manual Review
    requires_review BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    final_customer_id UUID REFERENCES customers(id),
    final_agreement_id UUID REFERENCES contracts(id),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Create indexes for performance
CREATE INDEX idx_invoice_scans_company_id ON invoice_scans(company_id);
CREATE INDEX idx_invoice_scans_matched_customer ON invoice_scans(matched_customer_id);
CREATE INDEX idx_invoice_scans_status ON invoice_scans(processing_status);
CREATE INDEX idx_invoice_scans_requires_review ON invoice_scans(requires_review);
CREATE INDEX idx_invoice_scans_created_at ON invoice_scans(created_at);

-- Table for storing OCR confidence thresholds and matching rules per company
CREATE TABLE IF NOT EXISTS invoice_scanning_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
    
    -- OCR Settings
    preferred_ocr_engine TEXT DEFAULT 'gemini',
    auto_language_detection BOOLEAN DEFAULT TRUE,
    min_ocr_confidence INTEGER DEFAULT 70,
    
    -- Matching Settings
    auto_assign_threshold INTEGER DEFAULT 85,
    requires_review_threshold INTEGER DEFAULT 70,
    enable_fuzzy_matching BOOLEAN DEFAULT TRUE,
    enable_transliteration BOOLEAN DEFAULT TRUE,
    
    -- Notification Settings
    notify_on_match BOOLEAN DEFAULT TRUE,
    notify_on_review_required BOOLEAN DEFAULT TRUE,
    notification_emails TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create default settings for all existing companies
INSERT INTO invoice_scanning_settings (company_id)
SELECT id FROM companies
ON CONFLICT (company_id) DO NOTHING;

-- Table for storing custom transliteration mappings
CREATE TABLE IF NOT EXISTS custom_transliterations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    arabic_text TEXT NOT NULL,
    english_variants TEXT[] NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    
    UNIQUE(company_id, arabic_text)
);

CREATE INDEX idx_custom_transliterations_company ON custom_transliterations(company_id);
CREATE INDEX idx_custom_transliterations_arabic ON custom_transliterations(arabic_text);

-- Table for tracking matching accuracy and learning
CREATE TABLE IF NOT EXISTS invoice_matching_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_scan_id UUID NOT NULL REFERENCES invoice_scans(id) ON DELETE CASCADE,
    suggested_customer_id UUID REFERENCES customers(id),
    actual_customer_id UUID REFERENCES customers(id),
    is_correct BOOLEAN NOT NULL,
    confidence_at_suggestion INTEGER,
    user_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_matching_feedback_scan_id ON invoice_matching_feedback(invoice_scan_id);
CREATE INDEX idx_matching_feedback_accuracy ON invoice_matching_feedback(is_correct);

-- Function to update invoice scan status
CREATE OR REPLACE FUNCTION update_invoice_scan_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-assign if confidence is high enough
    IF NEW.match_confidence >= 85 AND NEW.processing_status = 'completed' THEN
        NEW.final_customer_id = NEW.matched_customer_id;
        NEW.final_agreement_id = NEW.matched_agreement_id;
        NEW.requires_review = FALSE;
    -- Mark for review if confidence is medium
    ELSIF NEW.match_confidence >= 70 AND NEW.match_confidence < 85 THEN
        NEW.requires_review = TRUE;
    -- Mark for manual review if confidence is low
    ELSE
        NEW.requires_review = TRUE;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_invoice_scan_status ON invoice_scans;
CREATE TRIGGER trigger_update_invoice_scan_status
    BEFORE UPDATE ON invoice_scans
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_scan_status();

-- Function to get invoice scanning statistics
CREATE OR REPLACE FUNCTION get_invoice_scanning_stats(input_company_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_scans', COUNT(*),
        'auto_assigned', COUNT(*) FILTER (WHERE requires_review = FALSE AND final_customer_id IS NOT NULL),
        'pending_review', COUNT(*) FILTER (WHERE requires_review = TRUE AND reviewed_at IS NULL),
        'manually_reviewed', COUNT(*) FILTER (WHERE reviewed_at IS NOT NULL),
        'failed_scans', COUNT(*) FILTER (WHERE processing_status = 'failed'),
        'avg_ocr_confidence', ROUND(AVG(ocr_confidence), 2),
        'avg_match_confidence', ROUND(AVG(match_confidence), 2),
        'languages_detected', array_agg(DISTINCT language_detected) FILTER (WHERE language_detected IS NOT NULL),
        'recent_scans', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')
    ) INTO result
    FROM invoice_scans 
    WHERE company_id = input_company_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to improve matching accuracy based on feedback
CREATE OR REPLACE FUNCTION record_matching_feedback(
    scan_id UUID,
    actual_customer_id UUID,
    user_feedback TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    scan_record invoice_scans%ROWTYPE;
    is_correct BOOLEAN;
BEGIN
    -- Get the scan record
    SELECT * INTO scan_record FROM invoice_scans WHERE id = scan_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice scan not found';
    END IF;
    
    -- Determine if the suggestion was correct
    is_correct := (scan_record.matched_customer_id = actual_customer_id);
    
    -- Record the feedback
    INSERT INTO invoice_matching_feedback (
        invoice_scan_id,
        suggested_customer_id,
        actual_customer_id,
        is_correct,
        confidence_at_suggestion,
        user_feedback,
        created_by
    ) VALUES (
        scan_id,
        scan_record.matched_customer_id,
        actual_customer_id,
        is_correct,
        scan_record.match_confidence,
        user_feedback,
        auth.uid()
    );
    
    -- Update the scan record with final assignment
    UPDATE invoice_scans 
    SET 
        final_customer_id = actual_customer_id,
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        requires_review = FALSE
    WHERE id = scan_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE invoice_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_scanning_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_transliterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_matching_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoice_scans
CREATE POLICY "Users can view company invoice scans" ON invoice_scans
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert company invoice scans" ON invoice_scans
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update company invoice scans" ON invoice_scans
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- RLS Policies for settings
CREATE POLICY "Users can view company scanning settings" ON invoice_scanning_settings
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update company scanning settings" ON invoice_scanning_settings
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- RLS Policies for custom_transliterations
CREATE POLICY "Users can manage company transliterations" ON custom_transliterations
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- RLS Policies for feedback
CREATE POLICY "Users can manage company feedback" ON invoice_matching_feedback
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM invoice_scans 
            WHERE id = invoice_matching_feedback.invoice_scan_id
            AND company_id IN (
                SELECT company_id FROM profiles 
                WHERE id = auth.uid()
            )
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON invoice_scans TO authenticated;
GRANT SELECT, UPDATE ON invoice_scanning_settings TO authenticated;
GRANT ALL ON custom_transliterations TO authenticated;
GRANT ALL ON invoice_matching_feedback TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMENT ON TABLE invoice_scans IS 'Stores OCR results and fuzzy matching data for scanned invoices';
COMMENT ON TABLE invoice_scanning_settings IS 'Per-company configuration for OCR and matching thresholds';
COMMENT ON TABLE custom_transliterations IS 'Company-specific Arabic to English name mappings';
COMMENT ON TABLE invoice_matching_feedback IS 'Tracks accuracy of automatic matching for machine learning';