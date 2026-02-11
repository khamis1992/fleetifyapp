-- نسخ هذا الكود وتشغيله في Supabase SQL Editor
-- https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu/sql

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_invoices_from_payment_schedule(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invoices_from_payment_schedule(uuid) TO service_role;

COMMENT ON FUNCTION generate_invoices_from_payment_schedule IS 
'Generates invoices from payment schedules for a contract. Skips existing invoices to prevent duplicates.';
