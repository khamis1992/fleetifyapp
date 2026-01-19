-- ================================================================
-- Migration: Late Fee System
-- Created: 2026-01-10
-- Description: Add tables and functions for late fee calculation and management
-- Impact: HIGH - Enables automated late fee calculation and tracking
-- ================================================================

-- ============================================================================
-- Step 1: Create late_fee_rules table
-- ============================================================================

CREATE TABLE IF NOT EXISTS late_fee_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  description TEXT,
  description_en TEXT,
  rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('percentage', 'fixed', 'tiered')),
  grace_period_days INTEGER NOT NULL DEFAULT 7 CHECK (grace_period_days >= 0),
  minimum_overdue_days INTEGER NOT NULL DEFAULT 1 CHECK (minimum_overdue_days >= 0),
  fee_structure JSONB NOT NULL, -- { dailyRate, maxPercentage } OR { dailyAmount, maxAmount } OR { tiers }
  is_applies_to_invoices BOOLEAN NOT NULL DEFAULT true,
  is_applies_to_contracts BOOLEAN NOT NULL DEFAULT false,
  is_applies_to_payments BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0 CHECK (priority >= 0), -- Higher priority rules checked first
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_late_fee_rules_company 
ON late_fee_rules(company_id, enabled, priority DESC);

-- Unique constraint: only one enabled rule of each type per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_late_fee_rules_company_type 
ON late_fee_rules(company_id, rule_type)
WHERE enabled = true;

-- Comments
COMMENT ON TABLE late_fee_rules IS
'Stores company-specific late fee calculation rules. Supports percentage, fixed, and tiered fee structures with configurable grace periods.';

COMMENT ON COLUMN late_fee_rules.rule_type IS
'Type of late fee calculation: percentage (X% of amount), fixed (QAR Y per day), or tiered (different rates for different overdue periods)';

COMMENT ON COLUMN late_fee_rules.fee_structure IS
'JSON object containing fee calculation parameters. For percentage: {dailyRate, maxPercentage}. For fixed: {dailyAmount, maxAmount}. For tiered: {tiers: [{daysRange, dailyRate, maxAmount}]}';

COMMENT ON COLUMN late_fee_rules.grace_period_days IS
'Number of days after due date before late fees start applying. 0 means fees apply immediately after due date.';

COMMENT ON COLUMN late_fee_rules.minimum_overdue_days IS
'Minimum number of overdue days before fees apply. Allows setting different rules for short vs long overdue periods.';

COMMENT ON COLUMN late_fee_rules.is_applies_to_invoices IS
'Whether this rule applies to invoice late fees.';

COMMENT ON COLUMN late_fee_rules.is_applies_to_contracts IS
'Whether this rule applies to contract late fees (e.g., for monthly rental payments).';

COMMENT ON COLUMN late_fee_rules.priority IS
'Higher priority rules are checked first. Allows customizing fee structures for different scenarios.';

-- ============================================================================
-- Step 2: Create late_fee_calculations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS late_fee_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  target_id UUID NOT NULL, -- invoice_id, contract_id, or payment_id
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('invoice', 'contract', 'payment')),
  target_number VARCHAR(100), -- invoice_number, contract_number, or payment_number
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  payment_date DATE NOT NULL,
  days_overdue INTEGER NOT NULL CHECK (days_overdue >= 0),
  original_amount NUMERIC(15,2) NOT NULL CHECK (original_amount > 0),
  late_fee_amount NUMERIC(15,2) NOT NULL CHECK (late_fee_amount >= 0),
  total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount = original_amount + late_fee_amount),
  rule_id UUID REFERENCES late_fee_rules(id) ON DELETE SET NULL,
  rule_name VARCHAR(100) NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMP WITH TIME ZONE, -- When the fee was applied to invoice/contract
  waived_at TIMESTAMP WITH TIME ZONE,
  waive_reason TEXT,
  waive_reason_en TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_late_fee_calculations_company 
ON late_fee_calculations(company_id, calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_late_fee_calculations_target 
ON late_fee_calculations(target_id, target_type);

CREATE INDEX IF NOT EXISTS idx_late_fee_calculations_customer 
ON late_fee_calculations(customer_id);

CREATE INDEX IF NOT EXISTS idx_late_fee_calculations_due_date 
ON late_fee_calculations(due_date);

-- Comments
COMMENT ON TABLE late_fee_calculations IS
'Stores all late fee calculations. Tracks which rule was applied, the calculated amount, and application status.';

COMMENT ON COLUMN late_fee_calculations.days_overdue IS
'Number of days the invoice/contract/payment is overdue. Used to determine applicable fee rules.';

COMMENT ON COLUMN late_fee_calculations.applied_at IS
'Timestamp when the late fee was applied to the target (added to invoice/contract).';

COMMENT ON COLUMN late_fee_calculations.waived_at IS
'Timestamp when the late fee was waived (cancelled). Allows managers to waive fees for valid reasons.';

COMMENT ON COLUMN late_fee_calculations.waive_reason IS
'Arabic explanation for why the late fee was waived.';

COMMENT ON COLUMN late_fee_calculations.waive_reason_en IS
'English explanation for why the late fee was waived.';

-- ============================================================================
-- Step 3: Create function to calculate late fee
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_late_fee_for_invoice(
    p_invoice_id UUID,
    p_payment_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_invoice RECORD;
    v_customer RECORD;
    v_days_overdue INTEGER;
    v_applicable_rule RECORD;
    v_late_fee_amount NUMERIC;
    v_result JSONB;
BEGIN
    -- Get invoice
    SELECT * INTO v_invoice
    FROM invoices
    WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
    END IF;
    
    -- Get customer
    SELECT * INTO v_customer
    FROM customers
    WHERE id = v_invoice.customer_id;
    
    -- Calculate days overdue
    v_days_overdue := GREATEST(0, 
        EXTRACT(DAY FROM (p_payment_date::date) - v_invoice.due_date));
    
    -- Find applicable rule
    SELECT * INTO v_applicable_rule
    FROM late_fee_rules
    WHERE company_id = v_customer.company_id
      AND enabled = true
      AND is_applies_to_invoices = true
      AND minimum_overdue_days <= v_days_overdue
    ORDER BY priority DESC, created_at ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- No applicable rule
        v_late_fee_amount := 0;
    ELSE
        -- Calculate fee based on rule type
        IF v_applicable_rule.rule_type = 'percentage' THEN
            DECLARE
                v_daily_rate NUMERIC;
                v_max_percentage NUMERIC;
            BEGIN
                v_daily_rate := (v_applicable_rule.fee_structure->>'dailyRate')::NUMERIC;
                v_max_percentage := COALESCE(
                    (v_applicable_rule.fee_structure->>'maxPercentage')::NUMERIC,
                    100
                );
                
                v_late_fee_amount := v_invoice.total_amount * (v_daily_rate / 100) * v_days_overdue;
                v_late_fee_amount := LEAST(v_late_fee_amount, v_invoice.total_amount * (v_max_percentage / 100));
            END;
        ELSIF v_applicable_rule.rule_type = 'fixed' THEN
            DECLARE
                v_daily_amount NUMERIC;
                v_max_amount NUMERIC;
            BEGIN
                v_daily_amount := (v_applicable_rule.fee_structure->>'dailyAmount')::NUMERIC;
                v_max_amount := COALESCE(
                    (v_applicable_rule.fee_structure->>'maxAmount')::NUMERIC,
                    100000
                );
                
                v_late_fee_amount := v_daily_amount * v_days_overdue;
                v_late_fee_amount := LEAST(v_late_fee_amount, v_max_amount);
            END;
        ELSIF v_applicable_rule.rule_type = 'tiered' THEN
            DECLARE
                v_tiers JSONB;
                v_tier_count INTEGER;
                v_i INTEGER;
                v_tier JSONB;
                v_daily_rate NUMERIC;
                v_max_amount NUMERIC;
                v_min_days INTEGER;
                v_max_days INTEGER;
            BEGIN
                v_tiers := v_applicable_rule.fee_structure->>'tiers';
                v_tier_count := jsonb_array_length(v_tiers);
                
                -- Find applicable tier
                FOR v_i IN 1..v_tier_count LOOP
                    SELECT * INTO v_tier FROM jsonb_array_elements(v_tiers) 
                    WITH ORDINALITY AS v_i
                    LIMIT 1 OFFSET (v_i - 1);
                    
                    v_daily_rate := (v_tier->>'dailyRate')::NUMERIC;
                    v_max_amount := COALESCE(
                        (v_tier->>'maxAmount')::NUMERIC,
                        100000
                    );
                    
                    v_min_days := (v_tier->0->>'daysRange')::int[];
                    v_max_days := (v_tier->1->>'daysRange')::int[];
                    
                    IF v_days_overdue >= v_min_days AND v_days_overdue < v_max_days THEN
                        v_late_fee_amount := v_invoice.total_amount * (v_daily_rate / 100);
                        v_late_fee_amount := LEAST(v_late_fee_amount, v_max_amount);
                        EXIT;
                    END IF;
                END LOOP;
            END IF;
    END IF;
    
    -- Build result
    v_result := jsonb_build_object(
        'invoiceId', v_invoice.id,
        'invoiceNumber', v_invoice.invoice_number,
        'customerId', v_invoice.customer_id,
        'dueDate', v_invoice.due_date,
        'paymentDate', p_payment_date,
        'daysOverdue', v_days_overdue,
        'originalAmount', v_invoice.total_amount,
        'lateFeeAmount', ROUND(v_late_fee_amount, 2),
        'totalAmount', ROUND(v_invoice.total_amount + v_late_fee_amount, 2),
        'ruleId', COALESCE(v_applicable_rule.id, '00000000-0000-0000-0000-0000-0000'),
        'ruleName', COALESCE(v_applicable_rule.name, 'No applicable rule'),
        'ruleType', COALESCE(v_applicable_rule.rule_type, 'none'),
        'calculatedAt', NOW()
    );
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION calculate_late_fee_for_invoice IS
'Calculates late fee for a specific invoice based on company rules. Returns detailed JSON with all calculation details.';

-- ============================================================================
-- Step 4: Create function to apply late fee to invoice
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_late_fee_to_invoice(
    p_calculation_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_auto_apply BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_calculation RECORD;
    v_current_total NUMERIC;
    v_new_total NUMERIC;
BEGIN
    -- Get calculation
    SELECT * INTO v_calculation
    FROM late_fee_calculations
    WHERE id = p_calculation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Late fee calculation not found: %', p_calculation_id;
    END IF;
    
    -- Check if already applied
    IF v_calculation.applied_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Late fee already applied',
            'appliedAt', v_calculation.applied_at
        );
    END IF;
    
    -- Get current invoice total
    SELECT COALESCE(total_amount, 0) INTO v_current_total
    FROM invoices
    WHERE id = v_calculation.target_id;
    
    -- Calculate new total
    v_new_total := v_current_total + v_calculation.late_fee_amount;
    
    -- If auto apply, update invoice immediately
    IF p_auto_apply THEN
        -- Update invoice with late fee
        UPDATE invoices
        SET 
            total_amount = v_new_total,
            balance_due = COALESCE(balance_due, 0) + v_calculation.late_fee_amount,
            updated_at = NOW()
        WHERE id = v_calculation.target_id;
        
        -- Mark calculation as applied
        UPDATE late_fee_calculations
        SET applied_at = NOW()
        WHERE id = p_calculation_id;
        
        -- Add line item to invoice (if invoice has line items table)
        -- Note: This depends on invoice_line_items table structure
    END IF;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'invoiceId', v_calculation.target_id,
        'lateFeeAmount', v_calculation.late_fee_amount,
        'previousTotal', v_current_total,
        'newTotal', v_new_total,
        'appliedAt', p_auto_apply ? NOW() : NULL,
        'autoApplied', p_auto_apply,
        'ruleId', v_calculation.rule_id,
        'userId', p_user_id
    );
END;
$$;

COMMENT ON FUNCTION apply_late_fee_to_invoice IS
'Applies a calculated late fee to an invoice. Can auto-apply (update immediately) or prepare for manual application.';

-- ============================================================================
-- Step 5: Create function to waive late fee
-- ============================================================================

CREATE OR REPLACE FUNCTION waive_late_fee(
    p_calculation_id UUID,
    p_user_id UUID,
    p_reason TEXT,
    p_reason_en TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_calculation RECORD;
    v_invoice RECORD;
BEGIN
    -- Get calculation
    SELECT * INTO v_calculation
    FROM late_fee_calculations
    WHERE id = p_calculation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Late fee calculation not found: %', p_calculation_id;
    END IF;
    
    -- Check if already waived
    IF v_calculation.waived_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Late fee already waived',
            'waivedAt', v_calculation.waived_at
        );
    END IF;
    
    -- Check if already applied
    IF v_calculation.applied_at IS NOT NULL THEN
        -- Get invoice
        SELECT * INTO v_invoice
        FROM invoices
        WHERE id = v_calculation.target_id;
        
        -- Remove late fee from invoice total
        UPDATE invoices
        SET 
            total_amount = v_invoice.total_amount - v_calculation.late_fee_amount,
            balance_due = COALESCE(v_invoice.balance_due, v_invoice.total_amount) - v_calculation.late_fee_amount,
            updated_at = NOW()
        WHERE id = v_calculation.target_id;
    END IF;
    
    -- Mark calculation as waived
    UPDATE late_fee_calculations
    SET 
        waived_at = NOW(),
        waive_reason = p_reason,
        waive_reason_en = p_reason_en
    WHERE id = p_calculation_id;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'calculationId', p_calculation_id,
        'targetId', v_calculation.target_id,
        'lateFeeAmount', v_calculation.late_fee_amount,
        'waivedAt', NOW(),
        'reason', p_reason,
        'userId', p_user_id
    );
END;
$$;

COMMENT ON FUNCTION waive_late_fee IS
'Waives (cancels) a late fee calculation. Removes the fee from the invoice if already applied, or marks calculation as waived if not yet applied.';

-- ============================================================================
-- Step 6: Create function to calculate all overdue invoices late fees
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_all_overdue_late_fees(
    p_company_id UUID,
    p_as_of_date DATE DEFAULT CURRENT_DATE,
    p_auto_apply BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_results JSONB;
    v_calc_count INTEGER := 0;
BEGIN
    -- Get all overdue invoices
    WITH overdue_invoices AS (
        SELECT 
            inv.id,
            inv.invoice_number,
            inv.customer_id,
            inv.due_date,
            inv.total_amount,
            p_as_of_date as calculation_date
        FROM invoices inv
        WHERE inv.company_id = p_company_id
          AND inv.due_date < p_as_of_date
          AND inv.payment_status IN ('unpaid', 'partial', 'overdue')
    ),
    calculations AS (
        SELECT 
            calculate_late_fee_for_invoice(
                oi.id,
                oi.calculation_date
            ) as calculation,
            (calculate_late_fee_for_invoice(
                oi.id,
                oi.calculation_date
            )->>'daysOverdue')::int as days_overdue
        FROM overdue_invoices oi
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'calculation', calc.calculation,
            'invoiceId', calc.calculation->>'invoiceId',
            'invoiceNumber', calc.calculation->>'invoiceNumber',
            'daysOverdue', calc.days_overdue
        )
    ) INTO v_results
    FROM calculations
    WHERE (calc.calculation->>'lateFeeAmount')::NUMERIC > 0;
    
    v_calc_count := jsonb_array_length(v_results);
    
    -- Auto-apply if requested
    IF p_auto_apply THEN
        FOR i IN 1..v_calc_count LOOP
            SELECT apply_late_fee_to_invoice(
                (v_results->>i->>'calculationId')::UUID,
                NULL,
                TRUE
            );
        END LOOP;
    END IF;
    
    RETURN jsonb_build_object(
        'companyId', p_company_id,
        'asOfDate', p_as_of_date,
        'totalInvoices', v_calc_count,
        'calculations', v_results,
        'autoApplied', p_auto_apply,
        'calculatedAt', NOW()
    );
END;
$$;

COMMENT ON FUNCTION calculate_all_overdue_late_fees IS
'Calculates late fees for all overdue invoices for a company. Can auto-apply fees to update invoices immediately.';

-- ============================================================================
-- Step 7: Create trigger to calculate late fee when invoice becomes overdue
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_late_fee_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- When invoice status changes to overdue, calculate late fee
    IF NEW.payment_status = 'overdue' 
       AND (OLD.payment_status IS NULL OR OLD.payment_status != 'overdue') THEN
        -- Calculate late fee
        PERFORM calculate_late_fee_for_invoice(NEW.id, CURRENT_DATE);
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_late_fee_check_on_invoices
    AFTER UPDATE OF payment_status ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_late_fee_check();

COMMENT ON TRIGGER trigger_late_fee_check_on_invoices IS
'Automatically calculates late fees when an invoice becomes overdue. This ensures timely fee calculation without manual intervention.';

-- ============================================================================
-- Step 8: Enable RLS
-- ============================================================================

ALTER TABLE late_fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE late_fee_calculations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for late_fee_rules
CREATE POLICY "Users can view late_fee_rules for their company"
ON late_fee_rules FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert late_fee_rules for their company"
ON late_fee_rules FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update late_fee_rules for their company"
ON late_fee_rules FOR UPDATE
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete late_fee_rules for their company"
ON late_fee_rules FOR DELETE
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for late_fee_calculations
CREATE POLICY "Users can view late_fee_calculations for their company"
ON late_fee_calculations FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert late_fee_calculations for their company"
ON late_fee_calculations FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update late_fee_calculations for their company"
ON late_fee_calculations FOR UPDATE
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete late_fee_calculations for their company"
ON late_fee_calculations FOR DELETE
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify tables exist
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('late_fee_rules', 'late_fee_calculations');

-- Verify functions exist
-- SELECT routine_name 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public'
--   AND routine_name IN ('calculate_late_fee_for_invoice', 'apply_late_fee_to_invoice', 'waive_late_fee', 'calculate_all_overdue_late_fees');

-- Test late fee calculation
-- SELECT calculate_late_fee_for_invoice('some-invoice-id', '2026-01-10');

-- Test apply function
-- SELECT apply_late_fee_to_invoice('some-calculation-id', auth.uid(), TRUE);

-- Test waive function
-- SELECT waive_late_fee('some-calculation-id', auth.uid(), 'Customer dispute', 'Customer dispute');

-- Test batch calculation
-- SELECT calculate_all_overdue_late_fees('24bc0b21-4e2d-4413-9842-31719a3669f4', '2026-01-10', FALSE);
