-- Invoice Dispute Management System Migration
-- ===============================================
-- Purpose: Track and manage invoice disputes and billing issues
-- Features: Dispute submission, internal notes, status tracking, resolution workflow
-- Date: 2025-01-26
-- ===============================================

-- Step 1: Create invoice_disputes table
CREATE TABLE IF NOT EXISTS public.invoice_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Dispute details
    dispute_number TEXT NOT NULL UNIQUE,
    dispute_reason TEXT NOT NULL,
    dispute_category TEXT CHECK (dispute_category IN (
        'amount_incorrect',      -- المبلغ غير صحيح
        'service_not_received',  -- الخدمة لم تُستلم
        'duplicate_invoice',     -- فاتورة مكررة
        'quality_issue',         -- مشكلة في الجودة
        'contract_violation',    -- مخالفة العقد
        'other'                  -- أخرى
    )),
    disputed_amount NUMERIC(15, 3),
    
    -- Customer submission
    submitted_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    customer_comments TEXT,
    customer_attachments JSONB DEFAULT '[]'::jsonb, -- Array of file URLs
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',           -- في الانتظار
        'under_review',      -- قيد المراجعة
        'investigating',     -- قيد التحقيق
        'resolved',          -- تم الحل
        'rejected',          -- مرفوض
        'partially_resolved' -- حل جزئي
    )),
    
    -- Assignment
    assigned_to UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- Resolution details
    resolution_type TEXT CHECK (resolution_type IN (
        'adjustment',        -- تعديل المبلغ
        'credit_note',       -- إشعار دائن
        'invoice_reversal',  -- عكس الفاتورة
        'explanation',       -- توضيح فقط
        'no_action'          -- لا إجراء
    )),
    resolution_notes TEXT,
    resolved_amount NUMERIC(15, 3), -- Amount adjusted/credited
    resolved_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Related documents
    credit_note_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    adjustment_journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    
    -- Priority and SLA
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date DATE,
    escalated BOOLEAN DEFAULT false,
    escalated_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 2: Create dispute_notes table (internal communication)
CREATE TABLE IF NOT EXISTS public.dispute_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES invoice_disputes(id) ON DELETE CASCADE,
    
    -- Note details
    note_type TEXT NOT NULL CHECK (note_type IN (
        'internal',          -- داخلي (staff only)
        'customer_visible',  -- مرئي للعميل
        'system'            -- ملاحظة تلقائية
    )),
    note_text TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Author
    created_by UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Visibility
    is_visible_to_customer BOOLEAN DEFAULT false
);

-- Step 3: Create dispute_history table (audit trail)
CREATE TABLE IF NOT EXISTS public.dispute_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES invoice_disputes(id) ON DELETE CASCADE,
    
    -- Action details
    action TEXT NOT NULL CHECK (action IN (
        'created', 'assigned', 'status_changed', 'priority_changed',
        'note_added', 'resolved', 'rejected', 'escalated', 'reopened'
    )),
    
    -- Changes
    old_value TEXT,
    new_value TEXT,
    description TEXT,
    
    -- Actor
    performed_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_company ON invoice_disputes(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_invoice ON invoice_disputes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_customer ON invoice_disputes(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_status ON invoice_disputes(status);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_assigned ON invoice_disputes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_number ON invoice_disputes(dispute_number);

CREATE INDEX IF NOT EXISTS idx_dispute_notes_dispute ON dispute_notes(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_notes_created_by ON dispute_notes(created_by);

CREATE INDEX IF NOT EXISTS idx_dispute_history_dispute ON dispute_history(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_history_created ON dispute_history(created_at DESC);

-- Step 5: Enable RLS
ALTER TABLE invoice_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_history ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies

-- invoice_disputes policies
CREATE POLICY "Users can view disputes from their company"
    ON invoice_disputes FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create disputes for their invoices"
    ON invoice_disputes FOR INSERT
    WITH CHECK (
        company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        AND invoice_id IN (
            SELECT id FROM invoices 
            WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Managers can update disputes"
    ON invoice_disputes FOR UPDATE
    USING (
        company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('manager', 'company_admin', 'super_admin', 'accountant')
        )
    );

-- dispute_notes policies
CREATE POLICY "Users can view notes from their company disputes"
    ON dispute_notes FOR SELECT
    USING (
        dispute_id IN (
            SELECT id FROM invoice_disputes
            WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        )
        AND (
            -- Staff can see all notes
            EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = auth.uid()
                AND role IN ('manager', 'company_admin', 'super_admin', 'accountant')
            )
            OR 
            -- Customers only see customer-visible notes
            is_visible_to_customer = true
        )
    );

CREATE POLICY "Users can create notes on disputes"
    ON dispute_notes FOR INSERT
    WITH CHECK (
        dispute_id IN (
            SELECT id FROM invoice_disputes
            WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        )
    );

-- dispute_history policies
CREATE POLICY "Users can view dispute history from their company"
    ON dispute_history FOR SELECT
    USING (
        dispute_id IN (
            SELECT id FROM invoice_disputes
            WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        )
    );

-- Step 7: Create function to generate dispute number
CREATE OR REPLACE FUNCTION generate_dispute_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_year TEXT;
    v_count INTEGER;
    v_number TEXT;
BEGIN
    -- Get current year
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Count disputes for this company this year
    SELECT COUNT(*) + 1 INTO v_count
    FROM invoice_disputes
    WHERE company_id = NEW.company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Generate dispute number: DSP-YYYY-0001
    v_number := 'DSP-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
    
    NEW.dispute_number := v_number;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER generate_dispute_number_trigger
    BEFORE INSERT ON invoice_disputes
    FOR EACH ROW
    WHEN (NEW.dispute_number IS NULL)
    EXECUTE FUNCTION generate_dispute_number();

-- Step 8: Create function to log dispute history
CREATE OR REPLACE FUNCTION log_dispute_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO dispute_history (dispute_id, action, new_value, performed_by)
        VALUES (NEW.id, 'created', NEW.status, NEW.submitted_by);
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Status changed
        IF OLD.status != NEW.status THEN
            INSERT INTO dispute_history (dispute_id, action, old_value, new_value, performed_by)
            VALUES (NEW.id, 'status_changed', OLD.status, NEW.status, auth.uid());
        END IF;
        
        -- Assigned
        IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
            INSERT INTO dispute_history (dispute_id, action, new_value, performed_by)
            VALUES (NEW.id, 'assigned', NEW.assigned_to::TEXT, auth.uid());
        END IF;
        
        -- Priority changed
        IF OLD.priority != NEW.priority THEN
            INSERT INTO dispute_history (dispute_id, action, old_value, new_value, performed_by)
            VALUES (NEW.id, 'priority_changed', OLD.priority, NEW.priority, auth.uid());
        END IF;
        
        -- Escalated
        IF OLD.escalated = false AND NEW.escalated = true THEN
            INSERT INTO dispute_history (dispute_id, action, performed_by)
            VALUES (NEW.id, 'escalated', auth.uid());
        END IF;
        
        -- Resolved
        IF NEW.status IN ('resolved', 'partially_resolved') AND OLD.status NOT IN ('resolved', 'partially_resolved') THEN
            INSERT INTO dispute_history (dispute_id, action, description, performed_by)
            VALUES (NEW.id, 'resolved', NEW.resolution_notes, NEW.resolved_by);
        END IF;
        
        -- Rejected
        IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
            INSERT INTO dispute_history (dispute_id, action, description, performed_by)
            VALUES (NEW.id, 'rejected', NEW.resolution_notes, NEW.resolved_by);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER log_dispute_history_trigger
    AFTER INSERT OR UPDATE ON invoice_disputes
    FOR EACH ROW
    EXECUTE FUNCTION log_dispute_history();

-- Step 9: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dispute_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_dispute_timestamp_trigger
    BEFORE UPDATE ON invoice_disputes
    FOR EACH ROW
    EXECUTE FUNCTION update_dispute_timestamp();

-- Step 10: Create view for dispute dashboard
CREATE OR REPLACE VIEW dispute_dashboard_stats AS
SELECT 
    d.company_id,
    COUNT(*) as total_disputes,
    COUNT(*) FILTER (WHERE d.status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE d.status = 'under_review') as under_review_count,
    COUNT(*) FILTER (WHERE d.status = 'investigating') as investigating_count,
    COUNT(*) FILTER (WHERE d.status = 'resolved') as resolved_count,
    COUNT(*) FILTER (WHERE d.status = 'rejected') as rejected_count,
    COUNT(*) FILTER (WHERE d.status = 'partially_resolved') as partially_resolved_count,
    COUNT(*) FILTER (WHERE d.priority = 'urgent') as urgent_count,
    COUNT(*) FILTER (WHERE d.escalated = true) as escalated_count,
    COUNT(*) FILTER (WHERE d.due_date < CURRENT_DATE AND d.status NOT IN ('resolved', 'rejected')) as overdue_count,
    SUM(d.disputed_amount) as total_disputed_amount,
    SUM(d.resolved_amount) FILTER (WHERE d.status IN ('resolved', 'partially_resolved')) as total_resolved_amount,
    ROUND(AVG(EXTRACT(EPOCH FROM (d.resolved_at - d.submission_date))/86400), 2) FILTER (WHERE d.resolved_at IS NOT NULL) as avg_resolution_days
FROM invoice_disputes d
GROUP BY d.company_id;

-- Step 11: Create view for pending disputes
CREATE OR REPLACE VIEW pending_disputes AS
SELECT 
    d.*,
    i.invoice_number,
    i.total_amount as invoice_amount,
    i.due_date as invoice_due_date,
    c.first_name_ar || ' ' || c.last_name_ar as customer_name_ar,
    c.first_name_en || ' ' || c.last_name_en as customer_name_en,
    c.phone as customer_phone,
    c.email as customer_email,
    p.full_name as assigned_to_name,
    submitter.full_name as submitted_by_name,
    (SELECT COUNT(*) FROM dispute_notes WHERE dispute_id = d.id) as notes_count,
    CURRENT_DATE - d.submission_date::date as days_open
FROM invoice_disputes d
JOIN invoices i ON d.invoice_id = i.id
JOIN customers c ON d.customer_id = c.id
LEFT JOIN profiles p ON d.assigned_to = p.user_id
LEFT JOIN profiles submitter ON d.submitted_by = submitter.user_id
WHERE d.status NOT IN ('resolved', 'rejected')
ORDER BY 
    CASE d.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    d.submission_date ASC;

-- Step 12: Grant permissions
GRANT SELECT ON dispute_dashboard_stats TO authenticated;
GRANT SELECT ON pending_disputes TO authenticated;

-- Step 13: Add comments
COMMENT ON TABLE invoice_disputes IS 'Invoice disputes and billing issue tracking';
COMMENT ON TABLE dispute_notes IS 'Internal and customer-facing notes for disputes';
COMMENT ON TABLE dispute_history IS 'Complete audit trail of dispute actions';
COMMENT ON VIEW dispute_dashboard_stats IS 'Real-time statistics for dispute management';
COMMENT ON VIEW pending_disputes IS 'All open disputes with enriched data';

-- Step 14: Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Invoice Dispute Management System created successfully';
    RAISE NOTICE '📋 Tables: invoice_disputes, dispute_notes, dispute_history';
    RAISE NOTICE '🔧 Functions: generate_dispute_number, log_dispute_history, update_dispute_timestamp';
    RAISE NOTICE '⚡ Triggers: Auto dispute number, History logging, Timestamp updates';
    RAISE NOTICE '👁️ Views: dispute_dashboard_stats, pending_disputes';
    RAISE NOTICE '📊 Categories: amount_incorrect, service_not_received, duplicate_invoice, quality_issue, contract_violation, other';
    RAISE NOTICE '🔄 Statuses: pending, under_review, investigating, resolved, rejected, partially_resolved';
    RAISE NOTICE '🔒 RLS policies enabled';
END $$;
