-- Restore the exact legacy definitions superseded by 20260803155800.
-- ACLs are reset to the grants visible in their creating migrations plus the
-- PostgreSQL default PUBLIC execution grant that those migrations did not revoke.

BEGIN;

CREATE OR REPLACE FUNCTION generate_invoices_from_payment_schedule(p_contract_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule RECORD;
  v_contract RECORD;
  v_invoice_number TEXT;
  v_invoice_id uuid;
  v_count integer := 0;
  v_existing_invoice_id uuid;
BEGIN
  -- Get contract details
  SELECT * INTO v_contract
  FROM contracts
  WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found: %', p_contract_id;
  END IF;

  -- Loop through payment schedules
  FOR v_schedule IN
    SELECT *
    FROM contract_payment_schedules
    WHERE contract_id = p_contract_id
    ORDER BY due_date
  LOOP
    -- Generate invoice number
    v_invoice_number := 'INV-' || v_contract.contract_number || '-' || 
                       to_char(v_schedule.due_date, 'YYYY-MM');

    -- Check if invoice already exists (by invoice_number OR by contract+month)
    SELECT id INTO v_existing_invoice_id
    FROM invoices
    WHERE (
      invoice_number = v_invoice_number
      OR (
        contract_id = p_contract_id
        AND date_trunc('month', invoice_date) = date_trunc('month', v_schedule.due_date)
      )
    )
    LIMIT 1;

    -- Skip if invoice already exists
    IF v_existing_invoice_id IS NOT NULL THEN
      RAISE NOTICE 'Skipping existing invoice: % (ID: %)', v_invoice_number, v_existing_invoice_id;
      CONTINUE;
    END IF;

    -- Create invoice
    INSERT INTO invoices (
      company_id,
      customer_id,
      contract_id,
      invoice_number,
      invoice_type,
      invoice_date,
      due_date,
      subtotal,
      tax_amount,
      total_amount,
      balance_due,
      status,
      payment_status,
      notes
    ) VALUES (
      v_contract.company_id,
      v_contract.customer_id,
      p_contract_id,
      v_invoice_number,
      'sales',
      v_schedule.due_date,
      v_schedule.due_date,
      v_schedule.amount,
      0,
      v_schedule.amount,
      v_schedule.amount,
      'draft',
      'unpaid',
      'Generated from payment schedule #' || v_schedule.installment_number
    )
    RETURNING id INTO v_invoice_id;

    -- Create invoice item
    INSERT INTO invoice_items (
      invoice_id,
      line_number,
      item_description,
      quantity,
      unit_price,
      line_total,
      tax_rate,
      tax_amount
    ) VALUES (
      v_invoice_id,
      1,
      'Monthly rental payment - ' || to_char(v_schedule.due_date, 'Month YYYY'),
      1,
      v_schedule.amount,
      v_schedule.amount,
      0,
      0
    );

    -- Link invoice to payment schedule
    UPDATE contract_payment_schedules
    SET invoice_id = v_invoice_id
    WHERE id = v_schedule.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

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

COMMENT ON FUNCTION generate_invoices_from_payment_schedule IS 
'Generates invoices from payment schedules for a contract. Skips existing invoices to prevent duplicates.';

COMMENT ON FUNCTION generate_payment_schedules_for_contract IS
'Generates payment_schedule records for a contract''s invoices that don''t have them. Idempotent - can be run multiple times safely.';

REVOKE ALL ON FUNCTION public.generate_invoices_from_payment_schedule(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_invoices_from_payment_schedule(uuid)
  TO PUBLIC, authenticated, service_role;

REVOKE ALL ON FUNCTION public.generate_payment_schedules_for_contract(uuid, boolean)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_payment_schedules_for_contract(uuid, boolean)
  TO PUBLIC, authenticated;

COMMIT;
