-- =====================================================
-- Scheduled Follow-ups Table for CRM Auto Follow-up System
-- =====================================================

-- Create the scheduled_followups table
CREATE TABLE IF NOT EXISTS scheduled_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    legal_case_id UUID REFERENCES legal_cases(id) ON DELETE SET NULL,
    
    -- Follow-up details
    followup_type VARCHAR(50) NOT NULL CHECK (followup_type IN ('call', 'visit', 'email', 'sms', 'whatsapp', 'letter', 'legal_notice', 'other')),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'rescheduled', 'no_answer', 'postponed')),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    
    -- Content
    title VARCHAR(255) NOT NULL,
    description TEXT,
    notes TEXT,
    
    -- Outcome tracking
    outcome VARCHAR(50) CHECK (outcome IN ('payment_promise', 'partial_payment', 'full_payment', 'dispute', 'unreachable', 'refused', 'rescheduled', 'other')),
    outcome_notes TEXT,
    completed_at TIMESTAMPTZ,
    
    -- Assignment
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Reminder system
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMPTZ,
    
    -- Source tracking
    source VARCHAR(50) DEFAULT 'manual',
    source_reference TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_company_id ON scheduled_followups(company_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_customer_id ON scheduled_followups(customer_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_status ON scheduled_followups(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_scheduled_date ON scheduled_followups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_assigned_to ON scheduled_followups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_legal_case_id ON scheduled_followups(legal_case_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_priority ON scheduled_followups(priority);
CREATE INDEX IF NOT EXISTS idx_scheduled_followups_pending_date ON scheduled_followups(company_id, status, scheduled_date) WHERE status = 'pending';

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_scheduled_followups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_scheduled_followups_updated_at ON scheduled_followups;
CREATE TRIGGER trigger_update_scheduled_followups_updated_at
    BEFORE UPDATE ON scheduled_followups
    FOR EACH ROW
    EXECUTE FUNCTION update_scheduled_followups_updated_at();

-- Enable RLS
ALTER TABLE scheduled_followups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their company followups" ON scheduled_followups;
CREATE POLICY "Users can view their company followups" ON scheduled_followups
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create followups for their company" ON scheduled_followups;
CREATE POLICY "Users can create followups for their company" ON scheduled_followups
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their company followups" ON scheduled_followups;
CREATE POLICY "Users can update their company followups" ON scheduled_followups
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete their company followups" ON scheduled_followups;
CREATE POLICY "Users can delete their company followups" ON scheduled_followups
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Add table comment
COMMENT ON TABLE scheduled_followups IS 'جدول المتابعات المجدولة - يحتوي على مواعيد المتابعة مع العملاء';
COMMENT ON COLUMN scheduled_followups.followup_type IS 'نوع المتابعة: اتصال، زيارة، بريد، رسالة، واتساب، خطاب، إنذار قانوني';
COMMENT ON COLUMN scheduled_followups.priority IS 'الأولوية: عاجل، عالي، عادي، منخفض';
COMMENT ON COLUMN scheduled_followups.outcome IS 'نتيجة المتابعة: وعد بالدفع، دفعة جزئية، سداد كامل، نزاع، لا يمكن الوصول، رفض، إعادة جدولة';
COMMENT ON COLUMN scheduled_followups.source IS 'مصدر المتابعة: يدوي، تحويل قانوني، نظام تلقائي';;
