-- Restore seven genuine receipts cancelled by the contract-health auto-fix.
-- Every mutation is guarded by an exact expected-state check and captured for rollback.

CREATE TABLE IF NOT EXISTS public.financial_data_repair_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_version text NOT NULL,
  repair_key text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  before_value jsonb NOT NULL,
  after_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_at timestamptz NOT NULL DEFAULT now(),
  rolled_back_at timestamptz,
  UNIQUE (migration_version, entity_type, entity_id)
);
ALTER TABLE public.financial_data_repair_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.financial_data_repair_snapshots
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.financial_data_repair_snapshots
  TO service_role;
CREATE TEMP TABLE cancelled_receipt_repair_plan (
  payment_id uuid PRIMARY KEY,
  payment_number text NOT NULL,
  expected_amount numeric NOT NULL,
  expected_customer_id uuid NOT NULL,
  expected_contract_id uuid,
  expected_invoice_id uuid,
  expected_journal_entry_id uuid NOT NULL,
  target_contract_id uuid,
  target_invoice_id uuid,
  reclassify_to_customer_advances boolean NOT NULL DEFAULT false
) ON COMMIT DROP;
INSERT INTO cancelled_receipt_repair_plan VALUES
  (
    '36366922-906a-4d88-957a-c624681f5ca2', 'PAY-1758229515485-87', 1700,
    '1f273304-384c-4bd2-9ce6-9e577009ce01',
    '566fc4e6-4851-42de-8a57-ea94d5c95ac2', NULL,
    '6fbde928-422d-474e-82b4-e42edfa56dac',
    NULL, '65bbf50b-dcd6-4c5b-b699-34740684a692', false
  ),
  (
    '297bc609-f394-4c95-9198-04c7bc848913', 'PAY-1758229515520-2044', 1200,
    'dffed221-b8c3-4662-b758-d4f254edd994',
    '86bb0de4-11ef-4179-b928-10bb22c80bdb', NULL,
    '39034650-aa61-44fb-b625-4957ce9c6644',
    '4f461fb4-b2af-482c-9a4d-2f081c5386e8', 'fdaf7f31-cc23-460f-b88c-eb12dc2701b7', false
  ),
  (
    'dd9468ac-2ee0-47ce-83e7-2791e34f2fae', 'PAY-1758229515488-264', 1200,
    'dffed221-b8c3-4662-b758-d4f254edd994',
    '86bb0de4-11ef-4179-b928-10bb22c80bdb', NULL,
    'dffb47f8-d0ae-48d2-863a-e7e2a5b9dc4c',
    NULL, 'fcf7a4e2-80f2-48fc-b192-ac47c1a8d854', false
  ),
  (
    '41eb7671-ecbb-44c1-9513-c2fe0bfbf712', 'PAY-1770540413490-1', 1500,
    '1f273304-384c-4bd2-9ce6-9e577009ce01',
    '566fc4e6-4851-42de-8a57-ea94d5c95ac2', NULL,
    'c140844d-6270-46bb-9351-e4617cbf8ea4',
    '566fc4e6-4851-42de-8a57-ea94d5c95ac2', 'fa62dc77-d670-4362-85af-9baeb84599a4', false
  ),
  (
    'c5435a08-1be4-4fda-b35e-e40fb4f724d0', 'PAY-1758229515520-2006', 168,
    '1f273304-384c-4bd2-9ce6-9e577009ce01',
    '566fc4e6-4851-42de-8a57-ea94d5c95ac2', '2865666a-ded8-476f-9efa-a51763b729f6',
    '6f17af57-b652-4860-9f29-29b3b8aea332',
    NULL, NULL, true
  ),
  (
    '9affaa85-5ee4-4d75-85d3-4dc22b5a84bc', 'PAY-1758229515528-2368', 1532,
    '1f273304-384c-4bd2-9ce6-9e577009ce01',
    '566fc4e6-4851-42de-8a57-ea94d5c95ac2', NULL,
    'e30a6181-6b34-493a-bef6-e89649ffbcfa',
    NULL, '13a947c5-af90-4f66-a802-5cca5b8ad53c', false
  ),
  (
    'ce3a0e39-8c7c-4ebb-ac11-0e05cf300e83', 'PAY-1758229515532-2692', 1700,
    '1f273304-384c-4bd2-9ce6-9e577009ce01',
    '566fc4e6-4851-42de-8a57-ea94d5c95ac2', NULL,
    '95d451a8-e85e-4669-9862-6dae4ff0649c',
    NULL, 'ed2a7fd5-165e-439f-8dcc-89a453446aa4', false
  );
DO $$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
  v_reclass_payment public.payments%ROWTYPE;
  v_reclass_original public.journal_entries%ROWTYPE;
  v_reclassification public.journal_entries%ROWTYPE;
  v_original_credit_account_id uuid;
  v_customer_advances_account_id uuid;
  v_credit_line_count integer;
BEGIN
  IF (SELECT COUNT(*) FROM cancelled_receipt_repair_plan) <> 7 THEN
    RAISE EXCEPTION 'Cancelled receipt repair plan must contain exactly seven payments';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM cancelled_receipt_repair_plan plan
    LEFT JOIN public.payments payment ON payment.id = plan.payment_id
    WHERE payment.id IS NULL
       OR payment.company_id IS DISTINCT FROM v_company_id
       OR payment.payment_number IS DISTINCT FROM plan.payment_number
       OR payment.amount IS DISTINCT FROM plan.expected_amount
       OR payment.customer_id IS DISTINCT FROM plan.expected_customer_id
       OR payment.contract_id IS DISTINCT FROM plan.expected_contract_id
       OR payment.invoice_id IS DISTINCT FROM plan.expected_invoice_id
       OR payment.journal_entry_id IS DISTINCT FROM plan.expected_journal_entry_id
       OR lower(COALESCE(payment.payment_status, '')) NOT IN ('cancelled', 'canceled')
       OR lower(COALESCE(payment.transaction_type::text, 'receipt')) <> 'receipt'
       OR COALESCE(payment.processing_notes, '') NOT LIKE '%Contract health repair:%'
  ) THEN
    RAISE EXCEPTION 'A cancelled payment no longer matches the reviewed repair state';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM cancelled_receipt_repair_plan plan
    JOIN public.journal_entries journal ON journal.id = plan.expected_journal_entry_id
    WHERE journal.company_id IS DISTINCT FROM v_company_id
       OR journal.reference_type IS DISTINCT FROM 'payment'
       OR journal.reference_id IS DISTINCT FROM plan.payment_id
       OR lower(COALESCE(journal.status, '')) <> 'posted'
       OR journal.reversal_entry_id IS NOT NULL
       OR abs(COALESCE(journal.total_debit, 0) - plan.expected_amount) > 0.01
       OR abs(COALESCE(journal.total_credit, 0) - plan.expected_amount) > 0.01
  ) OR (
    SELECT COUNT(*)
    FROM cancelled_receipt_repair_plan plan
    JOIN public.journal_entries journal ON journal.id = plan.expected_journal_entry_id
  ) <> 7 THEN
    RAISE EXCEPTION 'A reviewed payment journal is missing, reversed, or unbalanced';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM cancelled_receipt_repair_plan plan
    LEFT JOIN public.invoices invoice ON invoice.id = plan.target_invoice_id
    WHERE plan.target_invoice_id IS NOT NULL
      AND (
        invoice.id IS NULL
        OR invoice.company_id IS DISTINCT FROM v_company_id
        OR (invoice.customer_id IS NOT NULL AND invoice.customer_id IS DISTINCT FROM plan.expected_customer_id)
        OR invoice.contract_id IS DISTINCT FROM plan.target_contract_id
        OR abs(COALESCE(invoice.total_amount, 0) - plan.expected_amount) > 0.01
        OR lower(COALESCE(invoice.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
        OR COALESCE((
          SELECT SUM(existing.amount)
          FROM public.payments existing
          WHERE existing.invoice_id = invoice.id
            AND lower(COALESCE(existing.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
            AND lower(COALESCE(existing.transaction_type::text, 'receipt')) = 'receipt'
        ), 0) + plan.expected_amount > COALESCE(invoice.total_amount, 0) + 0.01
      )
  ) THEN
    RAISE EXCEPTION 'A target invoice is missing, mismatched, inactive, or would be overpaid';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM cancelled_receipt_repair_plan plan
    LEFT JOIN public.contracts contract ON contract.id = plan.target_contract_id
    WHERE plan.target_contract_id IS NOT NULL
      AND (
        contract.id IS NULL
        OR contract.company_id IS DISTINCT FROM v_company_id
        OR contract.customer_id IS DISTINCT FROM plan.expected_customer_id
      )
  ) THEN
    RAISE EXCEPTION 'A target contract is missing or belongs to another company/customer';
  END IF;

  PERFORM public.assert_financial_period_is_open(v_company_id, CURRENT_DATE);

  INSERT INTO public.financial_data_repair_snapshots (
    migration_version, repair_key, company_id, entity_type, entity_id,
    before_value, metadata
  )
  SELECT
    '20260712051000',
    'restore_contract_health_cancelled_receipt',
    v_company_id,
    'payment',
    payment.id,
    to_jsonb(payment),
    jsonb_build_object(
      'target_contract_id', plan.target_contract_id,
      'target_invoice_id', plan.target_invoice_id,
      'reclassify_to_customer_advances', plan.reclassify_to_customer_advances,
      'original_journal_entry_id', plan.expected_journal_entry_id
    )
  FROM cancelled_receipt_repair_plan plan
  JOIN public.payments payment ON payment.id = plan.payment_id;

  IF (
    SELECT COUNT(*) FROM public.financial_data_repair_snapshots
    WHERE migration_version = '20260712051000' AND entity_type = 'payment'
  ) <> 7 THEN
    RAISE EXCEPTION 'Failed to capture all seven payment repair snapshots';
  END IF;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  UPDATE public.payments payment
  SET
    contract_id = plan.target_contract_id,
    invoice_id = plan.target_invoice_id,
    payment_status = 'completed',
    allocation_status = CASE WHEN plan.target_invoice_id IS NULL THEN 'unallocated' ELSE 'fully_allocated' END,
    processing_status = 'completed',
    processing_notes = CONCAT_WS(
      E'\n',
      NULLIF(payment.processing_notes, ''),
      'Restored by reviewed financial repair 20260712051000; original posted journal preserved.'
    ),
    updated_at = now()
  FROM cancelled_receipt_repair_plan plan
  WHERE payment.id = plan.payment_id
    AND payment.company_id = v_company_id;

  SELECT payment.* INTO v_reclass_payment
  FROM public.payments payment
  JOIN cancelled_receipt_repair_plan plan ON plan.payment_id = payment.id
  WHERE plan.reclassify_to_customer_advances
  FOR UPDATE;

  SELECT journal.* INTO v_reclass_original
  FROM public.journal_entries journal
  WHERE journal.id = v_reclass_payment.journal_entry_id
    AND journal.company_id = v_company_id
  FOR UPDATE;

  SELECT COUNT(*) INTO v_credit_line_count
  FROM public.journal_entry_lines line
  WHERE line.journal_entry_id = v_reclass_original.id
    AND COALESCE(line.credit_amount, 0) > 0.01;

  SELECT line.account_id INTO v_original_credit_account_id
  FROM public.journal_entry_lines line
  JOIN public.chart_of_accounts account ON account.id = line.account_id
  WHERE line.journal_entry_id = v_reclass_original.id
    AND abs(COALESCE(line.credit_amount, 0) - v_reclass_payment.amount) <= 0.01
    AND COALESCE(account.account_level, 0) >= 3
    AND COALESCE(account.is_header, false) = false
    AND account.is_active = true
    AND lower(COALESCE(account.account_type, '')) = 'assets'
    AND lower(COALESCE(account.balance_type, '')) = 'debit'
  LIMIT 1;

  IF v_credit_line_count <> 1 OR v_original_credit_account_id IS NULL THEN
    RAISE EXCEPTION 'The unallocated receipt original credit line is not uniquely reclassifiable';
  END IF;

  SELECT mapping.chart_of_accounts_id INTO v_customer_advances_account_id
  FROM public.account_mappings mapping
  JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
  JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
  WHERE mapping.company_id = v_company_id
    AND account_type.type_code = 'CUSTOMER_ADVANCES'
    AND mapping.is_active = true
    AND account.is_active = true
    AND COALESCE(account.is_header, false) = false
    AND COALESCE(account.account_level, 0) >= 3
    AND lower(COALESCE(account.account_type, '')) = 'liabilities'
    AND lower(COALESCE(account.balance_type, '')) = 'credit'
  LIMIT 1;

  IF v_customer_advances_account_id IS NULL
     OR v_customer_advances_account_id = v_original_credit_account_id
  THEN
    RAISE EXCEPTION 'Customer advances mapping is missing or invalid';
  END IF;

  SELECT journal.* INTO v_reclassification
  FROM public.journal_entries journal
  WHERE journal.company_id = v_company_id
    AND journal.reference_type = 'payment_reclassification'
    AND journal.reference_id = v_reclass_payment.id
  ORDER BY journal.created_at
  LIMIT 1;

  IF v_reclassification.id IS NULL THEN
    INSERT INTO public.journal_entries (
      company_id, entry_number, entry_date, reference_type, reference_id,
      description, total_debit, total_credit, status, created_by,
      created_at, updated_at
    ) VALUES (
      v_company_id,
      'JE-RECLASS-PAY-' || substring(v_reclass_payment.id::text, 1, 8),
      CURRENT_DATE,
      'payment_reclassification',
      v_reclass_payment.id,
      'Reclassify unallocated receipt from receivables to customer advances',
      v_reclass_payment.amount,
      v_reclass_payment.amount,
      'draft',
      COALESCE(v_reclass_original.created_by, v_reclass_payment.created_by),
      now(), now()
    ) RETURNING * INTO v_reclassification;

    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount
    ) VALUES
      (
        v_reclassification.id, v_original_credit_account_id, 1,
        'Restore receivables balance for unallocated receipt', v_reclass_payment.amount, 0
      ),
      (
        v_reclassification.id, v_customer_advances_account_id, 2,
        'Recognize unallocated customer advance', 0, v_reclass_payment.amount
      );

    UPDATE public.journal_entries
    SET status = 'posted',
        posted_by = COALESCE(v_reclass_original.created_by, v_reclass_payment.created_by),
        posted_at = now(), updated_at = now()
    WHERE id = v_reclassification.id;
  ELSIF lower(COALESCE(v_reclassification.status, '')) <> 'posted'
        OR abs(COALESCE(v_reclassification.total_debit, 0) - v_reclass_payment.amount) > 0.01
        OR abs(COALESCE(v_reclassification.total_credit, 0) - v_reclass_payment.amount) > 0.01
  THEN
    RAISE EXCEPTION 'Existing payment reclassification journal is not the reviewed posted amount';
  END IF;

  SELECT journal.* INTO v_reclassification
  FROM public.journal_entries journal
  WHERE journal.id = v_reclassification.id;

  UPDATE public.financial_data_repair_snapshots snapshot
  SET after_value = to_jsonb(payment) || jsonb_build_object(
    'reclassification_journal_id',
    CASE WHEN plan.reclassify_to_customer_advances THEN v_reclassification.id ELSE NULL END
  )
  FROM cancelled_receipt_repair_plan plan
  JOIN public.payments payment ON payment.id = plan.payment_id
  WHERE snapshot.migration_version = '20260712051000'
    AND snapshot.entity_type = 'payment'
    AND snapshot.entity_id = plan.payment_id;

  IF EXISTS (
    SELECT 1
    FROM cancelled_receipt_repair_plan plan
    JOIN public.payments payment ON payment.id = plan.payment_id
    WHERE payment.payment_status IS DISTINCT FROM 'completed'
       OR payment.contract_id IS DISTINCT FROM plan.target_contract_id
       OR payment.invoice_id IS DISTINCT FROM plan.target_invoice_id
       OR payment.journal_entry_id IS DISTINCT FROM plan.expected_journal_entry_id
       OR payment.allocation_status IS DISTINCT FROM
          CASE WHEN plan.target_invoice_id IS NULL THEN 'unallocated' ELSE 'fully_allocated' END
  ) THEN
    RAISE EXCEPTION 'A payment did not reach the reviewed repaired state';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM cancelled_receipt_repair_plan plan
    JOIN public.invoices invoice ON invoice.id = plan.target_invoice_id
    WHERE plan.target_invoice_id IS NOT NULL
      AND (
        abs(COALESCE(invoice.paid_amount, 0) - plan.expected_amount) > 0.01
        OR abs(COALESCE(invoice.balance_due, 0)) > 0.01
        OR lower(COALESCE(invoice.payment_status, '')) <> 'paid'
      )
  ) THEN
    RAISE EXCEPTION 'A target invoice did not reconcile after payment restoration';
  END IF;

  IF lower(COALESCE(v_reclassification.status, '')) <> 'posted'
     OR abs(COALESCE(v_reclassification.total_debit, 0) - v_reclass_payment.amount) > 0.01
     OR abs(COALESCE(v_reclassification.total_credit, 0) - v_reclass_payment.amount) > 0.01
  THEN
    RAISE EXCEPTION 'The customer-advance reclassification journal is not posted and balanced';
  END IF;

  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
