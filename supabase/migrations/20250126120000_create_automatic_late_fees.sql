-- Automatic Late Fee Application Migration
-- ===============================================
-- Purpose: Automated late fee calculation and application
-- Features: Daily cron job, contract-based rules, notifications, waiver workflow
-- Date: 2025-01-26
-- ===============================================

-- Step 1: Create late_fee_rules table
CREATE TABLE IF NOT EXISTS public.late_fee_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    grace_period_days INTEGER DEFAULT 0,
    fee_type TEXT NOT NULL CHECK (fee_type IN ('fixed', 'percentage', 'daily')),
    fee_amount NUMERIC(15, 3) NOT NULL,
    max_fee_amount NUMERIC(15, 3),
    apply_to_invoice_types TEXT[], -- ['rental', 'service', 'sales', etc.]
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_company_rule_name UNIQUE (company_id, rule_name)
);

-- Step 2: Create late_fees table
CREATE TABLE IF NOT EXISTS public.late_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    late_fee_rule_id UUID REFERENCES late_fee_rules(id) ON DELETE SET NULL,
    
    -- Fee details
    original_amount NUMERIC(15, 3) NOT NULL,
    days_overdue INTEGER NOT NULL,
    fee_amount NUMERIC(15, 3) NOT NULL,
    fee_type TEXT NOT NULL,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Calculated but not applied
        'applied',      -- Added to invoice
        'waived',       -- Manager waived
        'cancelled'     -- Cancelled
    )),
    
    -- Application details
    applied_at TIMESTAMP WITH TIME ZONE,
    applied_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    
    -- Waiver details
    waive_requested_at TIMESTAMP WITH TIME ZONE,
    waive_requested_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    waive_reason TEXT,
    waived_at TIMESTAMP WITH TIME ZONE,
    waived_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    waiver_approval_notes TEXT,
    
    -- Notification
    customer_notified_at TIMESTAMP WITH TIME ZONE,
    notification_sent BOOLEAN DEFAULT false,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_invoice_late_fee UNIQUE (invoice_id, created_at)
);

-- Step 3: Create late_fee_history table (audit trail)
CREATE TABLE IF NOT EXISTS public.late_fee_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    late_fee_id UUID NOT NULL REFERENCES late_fees(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'applied', 'waive_requested', 'waived', 'rejected', 'cancelled')),
    user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_late_fees_invoice ON late_fees(invoice_id);
CREATE INDEX IF NOT EXISTS idx_late_fees_contract ON late_fees(contract_id);
CREATE INDEX IF NOT EXISTS idx_late_fees_status ON late_fees(status);
CREATE INDEX IF NOT EXISTS idx_late_fees_created_at ON late_fees(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_late_fee_rules_company ON late_fee_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_late_fee_rules_active ON late_fee_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_late_fee_history_late_fee ON late_fee_history(late_fee_id);

-- Step 5: Enable RLS
ALTER TABLE late_fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE late_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE late_fee_history ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
CREATE POLICY "Users can view late fee rules from their company"
    ON late_fee_rules FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Managers can manage late fee rules"
    ON late_fee_rules FOR ALL
    USING (
        company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('manager', 'company_admin', 'super_admin')
        )
    );

CREATE POLICY "Users can view late fees from their company"
    ON late_fees FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "System can insert late fees"
    ON late_fees FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Managers can update late fees"
    ON late_fees FOR UPDATE
    USING (
        company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('manager', 'company_admin', 'super_admin')
        )
    );

CREATE POLICY "Users can view late fee history"
    ON late_fee_history FOR SELECT
    USING (
        late_fee_id IN (
            SELECT id FROM late_fees
            WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        )
    );

-- Step 7: Create function to calculate late fee
CREATE OR REPLACE FUNCTION calculate_late_fee(
    p_invoice_id UUID,
    p_days_overdue INTEGER,
    p_late_fee_rule_id UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_invoice RECORD;
    v_rule RECORD;
    v_fee_amount NUMERIC := 0;
BEGIN
    -- Get invoice details
    SELECT * INTO v_invoice
    FROM invoices
    WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    -- Get late fee rule (either provided or company default)
    IF p_late_fee_rule_id IS NOT NULL THEN
        SELECT * INTO v_rule
        FROM late_fee_rules
        WHERE id = p_late_fee_rule_id;
    ELSE
        -- Get active rule for this company and invoice type
        SELECT * INTO v_rule
        FROM late_fee_rules
        WHERE company_id = v_invoice.company_id
        AND is_active = true
        AND (apply_to_invoice_types IS NULL OR v_invoice.invoice_type = ANY(apply_to_invoice_types))
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;
    
    IF NOT FOUND THEN
        RETURN 0; -- No rule found, no fee
    END IF;
    
    -- Apply grace period
    IF p_days_overdue <= v_rule.grace_period_days THEN
        RETURN 0;
    END IF;
    
    -- Calculate fee based on type
    CASE v_rule.fee_type
        WHEN 'fixed' THEN
            v_fee_amount := v_rule.fee_amount;
        WHEN 'percentage' THEN
            v_fee_amount := (v_invoice.total_amount * v_rule.fee_amount) / 100;
        WHEN 'daily' THEN
            v_fee_amount := v_rule.fee_amount * (p_days_overdue - v_rule.grace_period_days);
    END CASE;
    
    -- Apply max fee cap if set
    IF v_rule.max_fee_amount IS NOT NULL AND v_fee_amount > v_rule.max_fee_amount THEN
        v_fee_amount := v_rule.max_fee_amount;
    END IF;
    
    RETURN v_fee_amount;
END;
$$;

-- Step 8: Create function to process overdue invoices (for cron job)
CREATE OR REPLACE FUNCTION process_overdue_invoices()
RETURNS TABLE (
    invoice_id UUID,
    invoice_number TEXT,
    days_overdue INTEGER,
    fee_amount NUMERIC,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_invoice RECORD;
    v_days_overdue INTEGER;
    v_fee_amount NUMERIC;
    v_late_fee_id UUID;
    v_existing_fee UUID;
BEGIN
    -- Process all overdue invoices
    FOR v_invoice IN
        SELECT i.*
        FROM invoices i
        WHERE i.status IN ('sent', 'overdue')
        AND i.due_date < CURRENT_DATE
        AND i.payment_status != 'paid'
    LOOP
        -- Calculate days overdue
        v_days_overdue := CURRENT_DATE - v_invoice.due_date;
        
        -- Check if late fee already exists for today
        SELECT id INTO v_existing_fee
        FROM late_fees
        WHERE invoice_id = v_invoice.id
        AND DATE(created_at) = CURRENT_DATE;
        
        IF v_existing_fee IS NOT NULL THEN
            CONTINUE; -- Already processed today
        END IF;
        
        -- Calculate fee amount
        v_fee_amount := calculate_late_fee(v_invoice.id, v_days_overdue);
        
        IF v_fee_amount > 0 THEN
            -- Create late fee record
            INSERT INTO late_fees (
                company_id,
                invoice_id,
                contract_id,
                original_amount,
                days_overdue,
                fee_amount,
                fee_type,
                status
            )
            VALUES (
                v_invoice.company_id,
                v_invoice.id,
                v_invoice.contract_id,
                v_invoice.total_amount,
                v_days_overdue,
                v_fee_amount,
                (SELECT fee_type FROM late_fee_rules WHERE company_id = v_invoice.company_id AND is_active = true LIMIT 1),
                'pending'
            )
            RETURNING id INTO v_late_fee_id;
            
            -- Log history
            INSERT INTO late_fee_history (late_fee_id, action, notes)
            VALUES (v_late_fee_id, 'created', 'Auto-generated by daily cron job');
            
            -- Update invoice status to overdue
            UPDATE invoices
            SET status = 'overdue'
            WHERE id = v_invoice.id;
            
            -- Return result
            invoice_id := v_invoice.id;
            invoice_number := v_invoice.invoice_number;
            days_overdue := v_days_overdue;
            fee_amount := v_fee_amount;
            status := 'created';
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$;

-- Step 9: Create function to apply late fee
CREATE OR REPLACE FUNCTION apply_late_fee(p_late_fee_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_late_fee RECORD;
    v_invoice_id UUID;
BEGIN
    -- Get late fee details
    SELECT * INTO v_late_fee
    FROM late_fees
    WHERE id = p_late_fee_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Late fee not found');
    END IF;
    
    IF v_late_fee.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Late fee already processed');
    END IF;
    
    -- Add fee to invoice total
    UPDATE invoices
    SET 
        total_amount = total_amount + v_late_fee.fee_amount,
        updated_at = NOW()
    WHERE id = v_late_fee.invoice_id
    RETURNING id INTO v_invoice_id;
    
    -- Update late fee status
    UPDATE late_fees
    SET 
        status = 'applied',
        applied_at = NOW(),
        applied_by = COALESCE(p_user_id, auth.uid()),
        updated_at = NOW()
    WHERE id = p_late_fee_id;
    
    -- Log history
    INSERT INTO late_fee_history (late_fee_id, action, user_id, notes)
    VALUES (p_late_fee_id, 'applied', COALESCE(p_user_id, auth.uid()), 'Late fee applied to invoice');
    
    RETURN jsonb_build_object(
        'success', true,
        'late_fee_id', p_late_fee_id,
        'invoice_id', v_invoice_id,
        'fee_amount', v_late_fee.fee_amount
    );
END;
$$;

-- Step 10: Create function to waive late fee
CREATE OR REPLACE FUNCTION waive_late_fee(
    p_late_fee_id UUID,
    p_reason TEXT,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_late_fee RECORD;
BEGIN
    -- Get late fee details
    SELECT * INTO v_late_fee
    FROM late_fees
    WHERE id = p_late_fee_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Late fee not found');
    END IF;
    
    IF v_late_fee.status = 'applied' THEN
        -- Reverse the fee from invoice
        UPDATE invoices
        SET 
            total_amount = total_amount - v_late_fee.fee_amount,
            updated_at = NOW()
        WHERE id = v_late_fee.invoice_id;
    END IF;
    
    -- Update late fee status
    UPDATE late_fees
    SET 
        status = 'waived',
        waived_at = NOW(),
        waived_by = COALESCE(p_user_id, auth.uid()),
        waiver_approval_notes = p_reason,
        updated_at = NOW()
    WHERE id = p_late_fee_id;
    
    -- Log history
    INSERT INTO late_fee_history (late_fee_id, action, user_id, notes)
    VALUES (p_late_fee_id, 'waived', COALESCE(p_user_id, auth.uid()), p_reason);
    
    RETURN jsonb_build_object(
        'success', true,
        'late_fee_id', p_late_fee_id,
        'fee_amount_waived', v_late_fee.fee_amount
    );
END;
$$;

-- Step 11: Create view for pending late fees
CREATE OR REPLACE VIEW pending_late_fees AS
SELECT 
    lf.id,
    lf.invoice_id,
    i.invoice_number,
    i.customer_id,
    c.first_name_ar as customer_name,
    lf.days_overdue,
    lf.fee_amount,
    lf.status,
    lf.created_at,
    EXTRACT(EPOCH FROM (NOW() - lf.created_at)) / 3600 as hours_pending
FROM late_fees lf
JOIN invoices i ON lf.invoice_id = i.id
LEFT JOIN customers c ON i.customer_id = c.id
WHERE lf.status = 'pending'
ORDER BY lf.created_at DESC;

-- Step 12: Create default late fee rules for existing companies
INSERT INTO late_fee_rules (company_id, rule_name, grace_period_days, fee_type, fee_amount, is_active)
SELECT 
    id as company_id,
    'Default Late Fee Rule' as rule_name,
    3 as grace_period_days,
    'percentage' as fee_type,
    5.0 as fee_amount, -- 5% of invoice amount
    true as is_active
FROM companies
ON CONFLICT (company_id, rule_name) DO NOTHING;

-- Step 13: Grant permissions
GRANT SELECT ON pending_late_fees TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_late_fee TO authenticated;
GRANT EXECUTE ON FUNCTION process_overdue_invoices TO authenticated;
GRANT EXECUTE ON FUNCTION apply_late_fee TO authenticated;
GRANT EXECUTE ON FUNCTION waive_late_fee TO authenticated;

-- Step 14: Add comments
COMMENT ON TABLE late_fee_rules IS 'Company-specific rules for automatic late fee calculation';
COMMENT ON TABLE late_fees IS 'Late fees calculated and applied to overdue invoices';
COMMENT ON TABLE late_fee_history IS 'Complete audit trail of late fee actions';
COMMENT ON FUNCTION process_overdue_invoices IS 'Daily cron job to process all overdue invoices and generate late fees';
COMMENT ON FUNCTION calculate_late_fee IS 'Calculate late fee amount based on company rules';
COMMENT ON FUNCTION apply_late_fee IS 'Apply pending late fee to invoice';
COMMENT ON FUNCTION waive_late_fee IS 'Waive late fee with manager approval';
COMMENT ON VIEW pending_late_fees IS 'All pending late fees awaiting application';

-- Step 15: Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Automatic Late Fee System created successfully';
    RAISE NOTICE '📋 Tables: late_fee_rules, late_fees, late_fee_history';
    RAISE NOTICE '🔧 Functions: process_overdue_invoices, calculate_late_fee, apply_late_fee, waive_late_fee';
    RAISE NOTICE '👁️ Views: pending_late_fees';
    RAISE NOTICE '⏰ Schedule: Run process_overdue_invoices() daily via cron';
    RAISE NOTICE '📧 TODO: Add customer notification after fee application';
    RAISE NOTICE '🔒 RLS policies enabled';
END $$;
