-- Migration: Generate Payment Schedules from Existing Invoices
-- Created: 2025-01-10
-- Description: This migration creates a function to generate missing payment_schedule
--              records for invoices that don't have them linked.
--
-- The function is idempotent - it can be run multiple times safely.
-- It only creates payment schedules for invoices that don't already have one.

-- =========================================
-- Function: generate_payment_schedules_for_contract
-- =========================================
-- Creates payment_schedule records for a contract's invoices that don't have them
--
-- Parameters:
--   p_contract_id: UUID - The contract to process
--   p_dry_run: BOOLEAN - If true, only report what would be done (default: false)
--
-- Returns: JSONB with results including:
--   - success: boolean
--   - invoices_processed: integer
--   - schedules_created: integer
--   - schedules_skipped: integer
--   - errors: array of error messages
--   - warnings: array of warning messages
--   - created_schedules: array of created schedule details
--
-- Usage:
--   SELECT generate_payment_schedules_for_contract('contract-uuid-here');
--   SELECT generate_payment_schedules_for_contract('contract-uuid-here', true); -- dry run
--
CREATE OR REPLACE FUNCTION generate_payment_schedules_for_contract(
    p_contract_id UUID,
    p_dry_run BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_contract RECORD;
    v_invoice RECORD;
    v_existing_schedule RECORD;
    v_installment_number INTEGER;
    v_schedule_status TEXT;
    v_schedule_amount NUMERIC;
    v_schedule_description TEXT;
    v_schedule_due_date DATE;

    v_results JSONB := jsonb_build_object(
        'success', false,
        'contract_id', p_contract_id,
        'invoices_processed', 0,
        'schedules_created', 0,
        'schedules_skipped', 0,
        'errors', '[]'::jsonb,
        'warnings', '[]'::jsonb,
        'created_schedules', '[]'::jsonb
    );

    v_invoices_without_schedules INTEGER := 0;
    v_invoice_date DATE;
    v_contract_start_date DATE;
    v_months_diff INTEGER;
BEGIN
    -- Get contract details
    SELECT * INTO v_contract
    FROM contracts
    WHERE id = p_contract_id;

    IF NOT FOUND THEN
        v_results := jsonb_set(v_results, '{errors}',
            jsonb_build_array('Contract not found')
        );
        RETURN v_results;
    END IF;

    -- Update contract_number in results
    v_results := jsonb_set(v_results, '{contract_number}', to_jsonb(v_contract.contract_number));

    v_contract_start_date := v_contract.start_date;

    -- Process each invoice for this contract
    FOR v_invoice IN
        SELECT *
        FROM invoices
        WHERE contract_id = p_contract_id
        AND invoice_date IS NOT NULL
        AND total_amount > 0
        ORDER BY invoice_date ASC
    LOOP
        -- Increment processed count
        v_results := jsonb_set(
            v_results,
            '{invoices_processed}',
            to_jsonb((v_results->>'invoices_processed')::integer + 1)
        );

        -- Check if payment schedule already exists for this invoice
        SELECT * INTO v_existing_schedule
        FROM contract_payment_schedules
        WHERE invoice_id = v_invoice.id
        LIMIT 1;

        IF v_existing_schedule IS NOT NULL THEN
            -- Skip this invoice - already has a schedule
            v_results := jsonb_set(
                v_results,
                '{schedules_skipped}',
                to_jsonb((v_results->>'schedules_skipped')::integer + 1)
            );
            CONTINUE;
        END IF;

        -- Validate invoice
        IF v_invoice.total_amount <= 0 THEN
            v_results := jsonb_set(
                v_results,
                '{warnings}',
                (v_results->'warnings') || jsonb_build_array(
                    'Invoice ' || v_invoice.invoice_number || ' has zero or negative amount'
                )
            );
            CONTINUE;
        END IF;

        -- Skip fully paid invoices (they likely don't need schedules)
        IF v_invoice.payment_status = 'paid' THEN
            v_results := jsonb_set(
                v_results,
                '{warnings}',
                (v_results->'warnings') || jsonb_build_array(
                    'Invoice ' || v_invoice.invoice_number || ' is already paid, skipping'
                )
            );
            v_results := jsonb_set(
                v_results,
                '{schedules_skipped}',
                to_jsonb((v_results->>'schedules_skipped')::integer + 1)
            );
            CONTINUE;
        END IF;

        -- Calculate installment number based on invoice date
        v_invoice_date := v_invoice.invoice_date;
        v_months_diff := (
            EXTRACT(YEAR FROM v_invoice_date) - EXTRACT(YEAR FROM v_contract_start_date)
        ) * 12 + (
            EXTRACT(MONTH FROM v_invoice_date) - EXTRACT(MONTH FROM v_contract_start_date)
        );
        v_installment_number := GREATEST(1, v_months_diff + 1);

        -- Determine schedule status
        v_schedule_status := CASE
            WHEN v_invoice.payment_status = 'partially_paid' THEN 'partially_paid'
            WHEN v_invoice.payment_status = 'paid' THEN 'paid'
            WHEN v_invoice.due_date IS NOT NULL AND v_invoice.due_date < CURRENT_DATE THEN 'overdue'
            ELSE 'pending'
        END;

        -- Determine due date
        v_schedule_due_date := COALESCE(
            v_invoice.due_date,
            v_invoice.invoice_date,
            v_contract_start_date
        );

        -- Calculate amount
        v_schedule_amount := v_invoice.total_amount;

        -- Generate description
        v_schedule_description := 'Installment ' || v_installment_number ||
            ' - ' || TO_CHAR(v_invoice.invoice_date, 'YYYY-MM') ||
            ' (' || v_invoice.invoice_number || ')';

        -- Increment invoices without schedules count
        v_invoices_without_schedules := v_invoices_without_schedules + 1;

        -- Insert the payment schedule (unless dry run)
        IF NOT p_dry_run THEN
            INSERT INTO contract_payment_schedules (
                contract_id,
                invoice_id,
                company_id,
                amount,
                due_date,
                installment_number,
                status,
                paid_amount,
                paid_date,
                description,
                notes,
                created_at,
                updated_at
            ) VALUES (
                v_contract.id,
                v_invoice.id,
                v_contract.company_id,
                v_schedule_amount,
                v_schedule_due_date,
                v_installment_number,
                v_schedule_status,
                CASE WHEN v_invoice.payment_status = 'paid' THEN v_invoice.total_amount ELSE NULL END,
                CASE WHEN v_invoice.payment_status = 'paid' THEN v_invoice.invoice_date ELSE NULL END,
                v_schedule_description,
                'Auto-generated from invoice ' || v_invoice.invoice_number,
                NOW(),
                NOW()
            );

            -- Increment created count
            v_results := jsonb_set(
                v_results,
                '{schedules_created}',
                to_jsonb((v_results->>'schedules_created')::integer + 1)
            );

            -- Add to created_schedules array
            v_results := jsonb_set(
                v_results,
                '{created_schedules}',
                (v_results->'created_schedules') || jsonb_build_array(
                    jsonb_build_object(
                        'invoice_number', v_invoice.invoice_number,
                        'installment_number', v_installment_number,
                        'amount', v_schedule_amount,
                        'due_date', v_schedule_due_date,
                        'status', v_schedule_status
                    )
                )
            );
        ELSE
            -- Dry run - just add to created_schedules array for preview
            v_results := jsonb_set(
                v_results,
                '{created_schedules}',
                (v_results->'created_schedules') || jsonb_build_array(
                    jsonb_build_object(
                        'invoice_number', v_invoice.invoice_number,
                        'installment_number', v_installment_number,
                        'amount', v_schedule_amount,
                        'due_date', v_schedule_due_date,
                        'status', v_schedule_status,
                        '_dry_run', true
                    )
                )
            );

            v_results := jsonb_set(
                v_results,
                '{schedules_created}',
                to_jsonb((v_results->>'schedules_created')::integer + 1)
            );
        END IF;
    END LOOP;

    -- Mark as successful if no errors
    IF jsonb_array_length(v_results->'errors') = 0 THEN
        v_results := jsonb_set(v_results, '{success}', to_jsonb(true));
    END IF;

    RETURN v_results;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'contract_id', p_contract_id
        );
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION generate_payment_schedules_for_contract IS
'Generates payment_schedule records for a contract''s invoices that don''t have them. Idempotent - can be run multiple times safely.';


-- =========================================
-- Function: generate_payment_schedules_all_contracts
-- =========================================
-- Scans all contracts and generates payment schedules for invoices that don't have them
--
-- Parameters:
--   p_dry_run: BOOLEAN - If true, only report what would be done (default: false)
--   p_contract_type: TEXT - Optional filter by contract type
--   p_status: TEXT - Optional filter by contract status (default: 'active')
--
-- Returns: JSONB with aggregate results
--
-- Usage:
--   SELECT generate_payment_schedules_all_contracts();
--   SELECT generate_payment_schedules_all_contracts(true); -- dry run
--
CREATE OR REPLACE FUNCTION generate_payment_schedules_all_contracts(
    p_dry_run BOOLEAN DEFAULT FALSE,
    p_contract_type TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_contract RECORD;
    v_result RECORD;
    v_results JSONB := jsonb_build_object(
        'success', true,
        'contracts_processed', 0,
        'total_schedules_created', 0,
        'total_schedules_skipped', 0,
        'total_invoices_processed', 0,
        'total_errors', 0,
        'total_warnings', 0,
        'contract_results', '[]'::jsonb,
        'dry_run', p_dry_run
    );
BEGIN
    -- Process each contract
    FOR v_contract IN
        SELECT id, contract_number
        FROM contracts
        WHERE (p_status IS NULL OR status = p_status)
        AND (p_contract_type IS NULL OR contract_type = p_contract_type)
        ORDER BY contract_number
    LOOP
        -- Generate payment schedules for this contract
        SELECT * INTO v_result
        FROM generate_payment_schedules_for_contract(v_contract.id, p_dry_run);

        -- Update aggregate counts
        v_results := jsonb_set(
            v_results,
            '{contracts_processed}',
            to_jsonb((v_results->>'contracts_processed')::integer + 1)
        );

        v_results := jsonb_set(
            v_results,
            '{total_schedules_created}',
            to_jsonb(
                (v_results->>'total_schedules_created')::integer +
                COALESCE((v_result->>'schedules_created')::integer, 0)
            )
        );

        v_results := jsonb_set(
            v_results,
            '{total_schedules_skipped}',
            to_jsonb(
                (v_results->>'total_schedules_skipped')::integer +
                COALESCE((v_result->>'schedules_skipped')::integer, 0)
            )
        );

        v_results := jsonb_set(
            v_results,
            '{total_invoices_processed}',
            to_jsonb(
                (v_results->>'total_invoices_processed')::integer +
                COALESCE((v_result->>'invoices_processed')::integer, 0)
            )
        );

        v_results := jsonb_set(
            v_results,
            '{total_errors}',
            to_jsonb(
                (v_results->>'total_errors')::integer +
                COALESCE(jsonb_array_length(v_result->'errors'), 0)
            )
        );

        v_results := jsonb_set(
            v_results,
            '{total_warnings}',
            to_jsonb(
                (v_results->>'total_warnings')::integer +
                COALESCE(jsonb_array_length(v_result->'warnings'), 0)
            )
        );

        -- Add contract result to array
        v_results := jsonb_set(
            v_results,
            '{contract_results}',
            (v_results->'contract_results') || jsonb_build_array(v_result)
        );
    END LOOP;

    RETURN v_results;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION generate_payment_schedules_all_contracts IS
'Scans all contracts and generates payment schedules for invoices without them. Returns aggregate results for all contracts processed.';


-- =========================================
-- Helper Function: get_missing_payment_schedules_summary
-- =========================================
-- Returns a summary of contracts with invoices but no payment schedules
--
-- Usage:
--   SELECT * FROM get_missing_payment_schedules_summary();
--
CREATE OR REPLACE FUNCTION get_missing_payment_schedules_summary()
RETURNS TABLE (
    contract_id UUID,
    contract_number TEXT,
    contract_type TEXT,
    invoice_count BIGINT,
    schedule_count BIGINT,
    missing_schedules BIGINT,
    total_invoice_amount NUMERIC,
    first_invoice_date DATE,
    last_invoice_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS contract_id,
        c.contract_number,
        c.contract_type,
        COUNT(DISTINCT i.id) AS invoice_count,
        COUNT(DISTINCT cps.id) AS schedule_count,
        COUNT(DISTINCT i.id) - COUNT(DISTINCT cps.invoice_id) AS missing_schedules,
        COALESCE(SUM(i.total_amount), 0) AS total_invoice_amount,
        MIN(i.invoice_date) AS first_invoice_date,
        MAX(i.invoice_date) AS last_invoice_date
    FROM contracts c
    INNER JOIN invoices i ON i.contract_id = c.id
    LEFT JOIN contract_payment_schedules cps ON cps.invoice_id = i.id
    GROUP BY c.id, c.contract_number, c.contract_type
    HAVING COUNT(DISTINCT i.id) > COUNT(DISTINCT cps.invoice_id)
    ORDER BY missing_schedules DESC, total_invoice_amount DESC;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_missing_payment_schedules_summary IS
'Returns a summary of contracts that have invoices but are missing payment schedules. Useful for identifying which contracts need payment schedule generation.';


-- =========================================
-- GRANT Permissions
-- =========================================
-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_payment_schedules_for_contract TO authenticated;
GRANT EXECUTE ON FUNCTION generate_payment_schedules_all_contracts TO authenticated;
GRANT EXECUTE ON FUNCTION get_missing_payment_schedules_summary TO authenticated;


-- =========================================
-- Usage Examples (as comments)
-- =========================================
/*

-- 1. Check which contracts are missing payment schedules
SELECT * FROM get_missing_payment_schedules_summary();

-- 2. Preview what would be generated for a specific contract (dry run)
SELECT generate_payment_schedules_for_contract(
    'contract-uuid-here',
    true  -- dry run
);

-- 3. Generate payment schedules for a specific contract
SELECT generate_payment_schedules_for_contract('contract-uuid-here');

-- 4. Preview for all active contracts (dry run)
SELECT generate_payment_schedules_all_contracts(true);

-- 5. Generate for all active contracts
SELECT generate_payment_schedules_all_contracts();

-- 6. Generate only for specific contract type
SELECT generate_payment_schedules_all_contracts(false, 'rental');

*/
