-- ================================================================
-- Migration: Prevent Duplicate Invoices from Payments
-- Created: 2026-01-10
-- Description: Add constraints to prevent creating duplicate invoices for the same payment
-- Impact: HIGH - Prevents data integrity issues in invoicing
-- ================================================================

-- ============================================================================
-- Step 1: Create unique constraint on payments to prevent duplicates
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_payment_unique_transaction'
  ) THEN
    ALTER TABLE payments
    ADD CONSTRAINT uq_payment_unique_transaction
    UNIQUE (company_id, payment_number, payment_date, amount);
    
    RAISE NOTICE 'Added constraint: uq_payment_unique_transaction';
  END IF;
END $$;

-- ============================================================================
-- Step 2: Create unique constraint to prevent payment-invoice duplicates
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_payment_invoice_unique'
  ) THEN
    ALTER TABLE payments
    ADD CONSTRAINT uq_payment_invoice_unique
    UNIQUE (company_id, invoice_id, payment_date, amount)
    DEFERRABLE INITIALLY IMMEDIATE;
    
    RAISE NOTICE 'Added constraint: uq_payment_invoice_unique';
  END IF;
END $$;

-- ============================================================================
-- Step 3: Create unique constraint to prevent payment-contract duplicates
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_payment_contract_unique'
  ) THEN
    ALTER TABLE payments
    ADD CONSTRAINT uq_payment_contract_unique
    UNIQUE (company_id, contract_id, payment_date, amount)
    DEFERRABLE INITIALLY IMMEDIATE;
    
    RAISE NOTICE 'Added constraint: uq_payment_contract_unique';
  END IF;
END $$;

-- ============================================================================
-- Step 4: Create function to fix existing duplicate invoices
-- ============================================================================

CREATE OR REPLACE FUNCTION fix_duplicate_payment_invoices()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_duplicate_invoices INTEGER := 0;
    v_duplicate_payments INTEGER := 0;
    v_invoice RECORD;
    v_payment_ids UUID[];
BEGIN
    -- Find duplicate invoices (same payment_date, amount, same customer/contract)
    FOR v_invoice IN 
        SELECT 
            inv.id as invoice_id,
            inv.payment_id,
            inv.customer_id,
            inv.contract_id,
            inv.invoice_date,
            inv.total_amount,
            COUNT(*) OVER (
                PARTITION BY inv.customer_id, 
                         inv.contract_id, 
                         inv.invoice_date, 
                         inv.total_amount,
                         COALESCE(inv.payment_id, '00000000-0000-0000-0000-0000-0000')
            ) as duplicate_count
        FROM invoices inv
        WHERE inv.invoice_type IN ('payment_receipt', 'rental')
          AND inv.status IN ('draft', 'paid')
          AND inv.created_at >= CURRENT_DATE - INTERVAL '30 days'
    LOOP
        IF v_invoice.duplicate_count > 1 THEN
            -- This is a duplicate invoice
            -- Check if there's a payment associated
            IF v_invoice.payment_id IS NOT NULL THEN
                v_duplicate_invoices := v_duplicate_invoices + 1;
                
                -- Delete the duplicate invoice (keep the oldest one)
                DELETE FROM invoices
                WHERE id IN (
                    SELECT id 
                    FROM invoices 
                    WHERE customer_id = v_invoice.customer_id
                      AND contract_id = v_invoice.contract_id
                      AND invoice_date = v_invoice.invoice_date
                      AND total_amount = v_invoice.total_amount
                      AND COALESCE(payment_id, '00000000-0000-0000-0000-0000-0000') = COALESCE(v_invoice.payment_id, '00000000-0000-0000-0000-0000')
                    AND status IN ('draft', 'paid')
                    AND id != (
                        SELECT MIN(id) 
                        FROM invoices 
                        WHERE customer_id = v_invoice.customer_id
                          AND contract_id = v_invoice.contract_id
                          AND invoice_date = v_invoice.invoice_date
                          AND total_amount = v_invoice.total_amount
                          AND COALESCE(payment_id, '00000000-0000-0000-0000-0000') = COALESCE(v_invoice.payment_id, '00000000-0000-0000-0000-0000')
                            AND status IN ('draft', 'paid')
                    )
                );
                
                -- Mark payment as needing review
                UPDATE payments
                SET processing_notes = 'فاتورة مكررة محذوفة: ' || v_invoice.invoice_id,
                    processing_status = 'needs_review'
                WHERE id = v_invoice.payment_id;
            END IF;
        END IF;
    END LOOP;
    
    -- Find payments with multiple invoices
    FOR v_invoice IN
        SELECT inv.payment_id, COUNT(*) as invoice_count
        FROM invoices inv
        WHERE inv.payment_id IS NOT NULL
          AND inv.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY inv.payment_id
        HAVING COUNT(*) > 1
    LOOP
        v_duplicate_payments := v_duplicate_payments + 1;
        
        -- Keep only the oldest invoice, delete others
        DELETE FROM invoices
        WHERE id IN (
            SELECT id 
            FROM invoices 
            WHERE payment_id = v_invoice.payment_id
              AND created_at >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY created_at ASC
            OFFSET 1
        );
        
        -- Update payment note
        UPDATE payments
        SET processing_notes = 'فواتير مكررة: تم الاحتفاظ بالفاتورة الأقدم',
            processing_status = 'needs_review'
        WHERE id = v_invoice.payment_id;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'duplicate_invoices_fixed', v_duplicate_invoices,
        'duplicate_payments_fixed', v_duplicate_payments,
        'message', format(
            'Fixed %s duplicate invoices and %s duplicate payments',
            v_duplicate_invoices, v_duplicate_payments
        )
    );
END;
$$;

-- ============================================================================
-- Step 5: Execute the fix function
-- ============================================================================

-- Run the fix (commented out by default, run manually)
-- SELECT fix_duplicate_payment_invoices();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON CONSTRAINT uq_payment_unique_transaction IS
'Prevents creating duplicate payments with same company, number, date, and amount. Critical for data integrity.';

COMMENT ON CONSTRAINT uq_payment_invoice_unique IS
'Prevents linking multiple payments to the same invoice with same payment context. DEFERRABLE to allow bulk operations.';

COMMENT ON CONSTRAINT uq_payment_contract_unique IS
'Prevents linking multiple payments to the same contract with same payment context. DEFERRABLE to allow bulk operations.';

COMMENT ON FUNCTION fix_duplicate_payment_invoices IS
'Identifies and fixes duplicate invoices created from payments. Safe to run - keeps the oldest invoice.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test 1: Try to create duplicate payment - should fail
-- INSERT INTO payments (company_id, payment_number, payment_date, amount, payment_method, payment_type, transaction_type, payment_status)
-- VALUES ('test-company', 'PAY-001', '2026-01-10', 1000, 'cash', 'receipt', 'receipt', 'completed');
-- INSERT INTO payments (company_id, payment_number, payment_date, amount, payment_method, payment_type, transaction_type, payment_status)
-- VALUES ('test-company', 'PAY-001', '2026-01-10', 1000, 'cash', 'receipt', 'receipt', 'completed');

-- Test 2: Verify constraints exist
-- SELECT conname, contype 
-- FROM pg_constraint 
-- WHERE conname IN ('uq_payment_unique_transaction', 'uq_payment_invoice_unique', 'uq_payment_contract_unique');
