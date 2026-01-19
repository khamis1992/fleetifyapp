-- Partial Payment Tracking Migration
-- ===============================================
-- Purpose: Track partial payments, payment timeline, and reconciliation
-- Features: Payment timeline, visual indicators, method tracking, bank reconciliation
-- Date: 2025-01-26
-- ===============================================

-- Step 1: Add payment tracking fields to payments table (if not exists)
-- Note: Most fields should already exist, this adds missing ones
DO $$
BEGIN
    -- Add reconciliation fields if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'reconciled'
    ) THEN
        ALTER TABLE payments ADD COLUMN reconciled BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'reconciled_at'
    ) THEN
        ALTER TABLE payments ADD COLUMN reconciled_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'reconciled_by'
    ) THEN
        ALTER TABLE payments ADD COLUMN reconciled_by UUID REFERENCES profiles(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'bank_reference'
    ) THEN
        ALTER TABLE payments ADD COLUMN bank_reference TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'bank_statement_date'
    ) THEN
        ALTER TABLE payments ADD COLUMN bank_statement_date DATE;
    END IF;
END $$;

-- Step 2: Create view for invoice payment timeline
CREATE OR REPLACE VIEW invoice_payment_timeline AS
SELECT 
    i.id as invoice_id,
    i.company_id,
    i.invoice_number,
    i.customer_id,
    c.first_name_ar || ' ' || c.last_name_ar as customer_name_ar,
    c.first_name_en || ' ' || c.last_name_en as customer_name_en,
    
    -- Invoice details
    i.invoice_date,
    i.due_date,
    i.total_amount,
    i.payment_status,
    
    -- Payment calculations
    COALESCE(
        (SELECT SUM(amount) FROM payments WHERE invoice_id = i.id AND status = 'completed'),
        0
    ) as total_paid,
    
    i.total_amount - COALESCE(
        (SELECT SUM(amount) FROM payments WHERE invoice_id = i.id AND status = 'completed'),
        0
    ) as outstanding_balance,
    
    -- Payment progress percentage
    ROUND(
        (COALESCE(
            (SELECT SUM(amount) FROM payments WHERE invoice_id = i.id AND status = 'completed'),
            0
        ) / NULLIF(i.total_amount, 0)) * 100,
        2
    ) as payment_progress_percentage,
    
    -- Payment counts
    (SELECT COUNT(*) FROM payments WHERE invoice_id = i.id) as total_payment_attempts,
    (SELECT COUNT(*) FROM payments WHERE invoice_id = i.id AND status = 'completed') as successful_payments,
    (SELECT COUNT(*) FROM payments WHERE invoice_id = i.id AND status = 'pending') as pending_payments,
    (SELECT COUNT(*) FROM payments WHERE invoice_id = i.id AND status = 'failed') as failed_payments,
    
    -- Timeline data
    (SELECT MIN(payment_date) FROM payments WHERE invoice_id = i.id AND status = 'completed') as first_payment_date,
    (SELECT MAX(payment_date) FROM payments WHERE invoice_id = i.id AND status = 'completed') as last_payment_date,
    
    -- Days to payment
    CASE 
        WHEN i.payment_status = 'paid' THEN 
            (SELECT MAX(payment_date) FROM payments WHERE invoice_id = i.id AND status = 'completed') - i.invoice_date
        ELSE NULL
    END as days_to_full_payment,
    
    -- Reconciliation status
    (SELECT COUNT(*) FROM payments WHERE invoice_id = i.id AND reconciled = true) as reconciled_payments,
    (SELECT COUNT(*) FROM payments WHERE invoice_id = i.id AND reconciled = false) as unreconciled_payments,
    
    -- Payment methods used
    (SELECT 
        ARRAY_AGG(DISTINCT payment_method ORDER BY payment_method)
        FROM payments 
        WHERE invoice_id = i.id AND status = 'completed'
    ) as payment_methods_used,
    
    i.created_at,
    i.updated_at

FROM invoices i
JOIN customers c ON i.customer_id = c.id
WHERE i.total_amount > 0;

-- Step 3: Create view for payment details with timeline
CREATE OR REPLACE VIEW payment_timeline_details AS
SELECT 
    p.id as payment_id,
    p.company_id,
    p.invoice_id,
    i.invoice_number,
    i.customer_id,
    c.first_name_ar || ' ' || c.last_name_ar as customer_name_ar,
    c.first_name_en || ' ' || c.last_name_en as customer_name_en,
    
    -- Payment information
    p.payment_number,
    p.payment_date,
    p.amount,
    p.payment_method,
    p.status,
    p.transaction_reference,
    p.bank_reference,
    p.bank_statement_date,
    p.notes,
    
    -- Reconciliation
    p.reconciled,
    p.reconciled_at,
    p.reconciled_by,
    prof.full_name as reconciled_by_name,
    
    -- Invoice context
    i.total_amount as invoice_total,
    i.invoice_date,
    i.due_date,
    i.payment_status as invoice_payment_status,
    
    -- Running balance (cumulative payments before this one)
    (
        SELECT COALESCE(SUM(amount), 0)
        FROM payments p2
        WHERE p2.invoice_id = p.invoice_id
        AND p2.status = 'completed'
        AND p2.payment_date <= p.payment_date
        AND p2.id <= p.id
    ) as cumulative_paid,
    
    -- Remaining balance after this payment
    i.total_amount - (
        SELECT COALESCE(SUM(amount), 0)
        FROM payments p2
        WHERE p2.invoice_id = p.invoice_id
        AND p2.status = 'completed'
        AND p2.payment_date <= p.payment_date
        AND p2.id <= p.id
    ) as remaining_balance,
    
    -- Payment sequence number
    (
        SELECT COUNT(*) + 1
        FROM payments p2
        WHERE p2.invoice_id = p.invoice_id
        AND p2.status = 'completed'
        AND p2.payment_date < p.payment_date
    ) as payment_sequence,
    
    p.created_at,
    p.updated_at

FROM payments p
JOIN invoices i ON p.invoice_id = i.id
JOIN customers c ON i.customer_id = c.id
LEFT JOIN profiles prof ON p.reconciled_by = prof.id
ORDER BY p.payment_date DESC, p.created_at DESC;

-- Step 4: Create view for payment method statistics
CREATE OR REPLACE VIEW payment_method_statistics AS
SELECT 
    company_id,
    payment_method,
    
    -- Counts
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_transactions,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_transactions,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_transactions,
    
    -- Amounts
    SUM(amount) FILTER (WHERE status = 'completed') as total_amount,
    AVG(amount) FILTER (WHERE status = 'completed') as average_transaction,
    MIN(amount) FILTER (WHERE status = 'completed') as min_transaction,
    MAX(amount) FILTER (WHERE status = 'completed') as max_transaction,
    
    -- Success rate
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0),
        2
    ) as success_rate,
    
    -- Reconciliation
    COUNT(*) FILTER (WHERE reconciled = true) as reconciled_count,
    COUNT(*) FILTER (WHERE reconciled = false AND status = 'completed') as pending_reconciliation,
    
    -- Timeline
    MIN(payment_date) FILTER (WHERE status = 'completed') as first_payment_date,
    MAX(payment_date) FILTER (WHERE status = 'completed') as last_payment_date

FROM payments
GROUP BY company_id, payment_method
ORDER BY total_amount DESC NULLS LAST;

-- Step 5: Create view for bank reconciliation dashboard
CREATE OR REPLACE VIEW bank_reconciliation_summary AS
SELECT 
    company_id,
    
    -- Reconciliation overview
    COUNT(*) FILTER (WHERE status = 'completed') as total_completed_payments,
    COUNT(*) FILTER (WHERE status = 'completed' AND reconciled = true) as reconciled_payments,
    COUNT(*) FILTER (WHERE status = 'completed' AND reconciled = false) as pending_reconciliation,
    
    -- Amounts
    SUM(amount) FILTER (WHERE status = 'completed') as total_payments_amount,
    SUM(amount) FILTER (WHERE status = 'completed' AND reconciled = true) as reconciled_amount,
    SUM(amount) FILTER (WHERE status = 'completed' AND reconciled = false) as pending_reconciliation_amount,
    
    -- Percentages
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE status = 'completed' AND reconciled = true) / 
        NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0),
        2
    ) as reconciliation_percentage,
    
    -- By payment method
    COUNT(*) FILTER (WHERE status = 'completed' AND payment_method = 'cash' AND reconciled = false) as cash_pending,
    COUNT(*) FILTER (WHERE status = 'completed' AND payment_method = 'bank_transfer' AND reconciled = false) as bank_transfer_pending,
    COUNT(*) FILTER (WHERE status = 'completed' AND payment_method = 'check' AND reconciled = false) as check_pending,
    COUNT(*) FILTER (WHERE status = 'completed' AND payment_method = 'credit_card' AND reconciled = false) as credit_card_pending,
    
    -- Aging analysis for unreconciled
    COUNT(*) FILTER (
        WHERE status = 'completed' 
        AND reconciled = false 
        AND payment_date < CURRENT_DATE - INTERVAL '7 days'
    ) as unreconciled_over_7_days,
    
    COUNT(*) FILTER (
        WHERE status = 'completed' 
        AND reconciled = false 
        AND payment_date < CURRENT_DATE - INTERVAL '30 days'
    ) as unreconciled_over_30_days,
    
    -- Recent activity
    MAX(reconciled_at) as last_reconciliation_date,
    COUNT(*) FILTER (
        WHERE reconciled = true 
        AND reconciled_at >= CURRENT_DATE - INTERVAL '7 days'
    ) as reconciled_last_7_days

FROM payments
GROUP BY company_id;

-- Step 6: Create function to get payment status indicator
CREATE OR REPLACE FUNCTION get_payment_status_indicator(
    p_total_amount NUMERIC,
    p_paid_amount NUMERIC
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_percentage NUMERIC;
BEGIN
    IF p_total_amount = 0 THEN
        RETURN 'no_amount';
    END IF;
    
    v_percentage := (p_paid_amount / p_total_amount) * 100;
    
    IF v_percentage = 0 THEN
        RETURN 'unpaid';
    ELSIF v_percentage < 100 THEN
        RETURN 'partial';
    ELSE
        RETURN 'paid';
    END IF;
END;
$$;

-- Step 7: Create function to auto-update invoice payment status
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_paid NUMERIC;
    v_invoice_total NUMERIC;
    v_new_status TEXT;
BEGIN
    -- Get invoice total and total paid
    SELECT total_amount INTO v_invoice_total
    FROM invoices
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM payments
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    AND status = 'completed';
    
    -- Determine new status
    IF v_total_paid = 0 THEN
        v_new_status := 'unpaid';
    ELSIF v_total_paid >= v_invoice_total THEN
        v_new_status := 'paid';
    ELSE
        v_new_status := 'partial';
    END IF;
    
    -- Update invoice status
    UPDATE invoices
    SET 
        payment_status = v_new_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 8: Create trigger for auto-updating invoice payment status
DROP TRIGGER IF EXISTS trigger_update_invoice_payment_status ON payments;
CREATE TRIGGER trigger_update_invoice_payment_status
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_reconciled 
    ON payments(reconciled, status) 
    WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_payments_payment_date_status 
    ON payments(payment_date, status);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_status 
    ON payments(invoice_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_method_status 
    ON payments(payment_method, status);

-- Step 10: Grant permissions
GRANT SELECT ON invoice_payment_timeline TO authenticated;
GRANT SELECT ON payment_timeline_details TO authenticated;
GRANT SELECT ON payment_method_statistics TO authenticated;
GRANT SELECT ON bank_reconciliation_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_status_indicator TO authenticated;

-- Step 11: Add comments
COMMENT ON VIEW invoice_payment_timeline IS 'Timeline view of invoice payments with progress tracking';
COMMENT ON VIEW payment_timeline_details IS 'Detailed payment timeline with running balances and sequences';
COMMENT ON VIEW payment_method_statistics IS 'Statistics and analytics by payment method';
COMMENT ON VIEW bank_reconciliation_summary IS 'Bank reconciliation dashboard with pending items';
COMMENT ON FUNCTION get_payment_status_indicator IS 'Get visual payment status indicator';
COMMENT ON FUNCTION update_invoice_payment_status IS 'Auto-update invoice payment status based on payments';

-- Step 12: Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Payment Tracking System created successfully';
    RAISE NOTICE '📊 Views: invoice_payment_timeline, payment_timeline_details, payment_method_statistics, bank_reconciliation_summary';
    RAISE NOTICE '🔧 Functions: get_payment_status_indicator, update_invoice_payment_status';
    RAISE NOTICE '⚡ Trigger: Auto-update invoice payment status on payment changes';
    RAISE NOTICE '🎯 Features: Payment timeline, Visual indicators, Method tracking, Bank reconciliation';
    RAISE NOTICE '📈 Metrics: Payment progress, Running balances, Reconciliation status';
    RAISE NOTICE '🔒 Permissions granted to authenticated users';
END $$;
