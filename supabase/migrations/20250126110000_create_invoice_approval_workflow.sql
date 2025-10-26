-- Invoice Approval Workflow Migration
-- ===============================================
-- Purpose: Add approval workflow for invoices
-- Features: Preview, approval, rejection tracking
-- Date: 2025-01-26
-- ===============================================

-- Step 1: Add approval columns to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Update status check constraint
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
CHECK (status IN (
    'draft',
    'pending_approval',
    'approved',
    'rejected',
    'sent',
    'paid',
    'overdue',
    'cancelled'
));

-- Step 3: Create invoice_approval_history table
CREATE TABLE IF NOT EXISTS public.invoice_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'sent')),
    user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_status_approval ON invoices(status) WHERE status IN ('pending_approval', 'approved');
CREATE INDEX IF NOT EXISTS idx_invoices_approved_at ON invoices(approved_at);
CREATE INDEX IF NOT EXISTS idx_invoice_approval_history_invoice ON invoice_approval_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_approval_history_created ON invoice_approval_history(created_at DESC);

-- Step 5: Enable RLS
ALTER TABLE invoice_approval_history ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
CREATE POLICY "Users can view approval history from their company"
    ON invoice_approval_history FOR SELECT
    USING (
        invoice_id IN (
            SELECT id FROM invoices
            WHERE company_id IN (
                SELECT company_id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert approval history"
    ON invoice_approval_history FOR INSERT
    WITH CHECK (
        invoice_id IN (
            SELECT id FROM invoices
            WHERE company_id IN (
                SELECT company_id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

-- Step 7: Create function to check if approval needed
CREATE OR REPLACE FUNCTION requires_invoice_approval(p_invoice_id UUID, p_threshold NUMERIC DEFAULT 1000)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_total_amount NUMERIC;
BEGIN
    SELECT total_amount INTO v_total_amount
    FROM invoices
    WHERE id = p_invoice_id;
    
    RETURN v_total_amount > p_threshold;
END;
$$;

-- Step 8: Create function to auto-submit high-value invoices for approval
CREATE OR REPLACE FUNCTION check_invoice_approval_requirement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_threshold NUMERIC := 1000; -- Default threshold in KWD
BEGIN
    -- If invoice is being set to 'sent' from 'draft' and exceeds threshold
    IF NEW.status = 'sent' 
       AND OLD.status = 'draft' 
       AND NEW.total_amount > v_threshold 
       AND NEW.approved_at IS NULL THEN
        
        -- Prevent direct sending without approval
        RAISE EXCEPTION 'Invoice exceeds %.3f KWD and requires approval before sending', v_threshold;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Step 9: Create trigger
DROP TRIGGER IF EXISTS check_invoice_approval_trigger ON invoices;
CREATE TRIGGER check_invoice_approval_trigger
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION check_invoice_approval_requirement();

-- Step 10: Create view for pending approvals
CREATE OR REPLACE VIEW pending_invoice_approvals AS
SELECT 
    i.id,
    i.invoice_number,
    i.invoice_date,
    i.total_amount,
    i.company_id,
    i.customer_id,
    i.submitted_for_approval_at,
    i.submitted_by,
    c.first_name_ar as customer_name,
    p.first_name_ar as submitted_by_name,
    EXTRACT(EPOCH FROM (NOW() - i.submitted_for_approval_at)) / 3600 as hours_pending
FROM invoices i
LEFT JOIN customers c ON i.customer_id = c.id
LEFT JOIN profiles p ON i.submitted_by = p.user_id
WHERE i.status = 'pending_approval'
ORDER BY i.submitted_for_approval_at ASC;

-- Step 11: Create notification function for new approvals
CREATE OR REPLACE FUNCTION notify_invoice_approval_needed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- If status changed to pending_approval
    IF NEW.status = 'pending_approval' AND (OLD.status IS NULL OR OLD.status != 'pending_approval') THEN
        -- Insert notification (if you have a notifications table)
        -- Or send email/SMS notification here
        
        -- For now, just log the event
        INSERT INTO invoice_approval_history (invoice_id, action, user_id, notes)
        VALUES (
            NEW.id,
            'submitted',
            NEW.submitted_by,
            'تم إرسال الفاتورة للاعتماد'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Step 12: Create notification trigger
DROP TRIGGER IF EXISTS invoice_approval_notification_trigger ON invoices;
CREATE TRIGGER invoice_approval_notification_trigger
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION notify_invoice_approval_needed();

-- Step 13: Create summary statistics function
CREATE OR REPLACE FUNCTION get_invoice_approval_stats(p_company_id UUID)
RETURNS TABLE (
    total_pending INTEGER,
    total_approved_today INTEGER,
    total_rejected_today INTEGER,
    avg_approval_time_hours NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE status = 'pending_approval')::INTEGER as total_pending,
        COUNT(*) FILTER (WHERE status = 'approved' AND approved_at >= CURRENT_DATE)::INTEGER as total_approved_today,
        COUNT(*) FILTER (WHERE status = 'rejected' AND rejected_at >= CURRENT_DATE)::INTEGER as total_rejected_today,
        AVG(
            EXTRACT(EPOCH FROM (approved_at - submitted_for_approval_at)) / 3600
        ) FILTER (WHERE approved_at IS NOT NULL AND submitted_for_approval_at IS NOT NULL)::NUMERIC as avg_approval_time_hours
    FROM invoices
    WHERE company_id = p_company_id;
END;
$$;

-- Step 14: Grant permissions
GRANT SELECT ON pending_invoice_approvals TO authenticated;
GRANT EXECUTE ON FUNCTION requires_invoice_approval TO authenticated;
GRANT EXECUTE ON FUNCTION get_invoice_approval_stats TO authenticated;

-- Step 15: Add comments
COMMENT ON TABLE invoice_approval_history IS 'Complete audit trail of all invoice approval actions';
COMMENT ON COLUMN invoices.submitted_for_approval_at IS 'When invoice was submitted for manager approval';
COMMENT ON COLUMN invoices.approved_at IS 'When invoice was approved by manager';
COMMENT ON COLUMN invoices.rejected_at IS 'When invoice was rejected by manager';
COMMENT ON FUNCTION requires_invoice_approval IS 'Checks if invoice exceeds threshold and needs approval';
COMMENT ON VIEW pending_invoice_approvals IS 'All invoices currently awaiting approval';

-- Step 16: Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Invoice Approval Workflow created successfully';
    RAISE NOTICE '📋 Tables: invoice_approval_history';
    RAISE NOTICE '🔧 Functions: requires_invoice_approval, get_invoice_approval_stats';
    RAISE NOTICE '👁️ Views: pending_invoice_approvals';
    RAISE NOTICE '⚠️ Threshold: 1000 KWD (configurable)';
    RAISE NOTICE '🔒 RLS policies enabled';
END $$;
