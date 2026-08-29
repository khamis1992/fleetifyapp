-- ================================================================
-- Migration: Detect cross-file duplicate imported payments
-- Created: 2026-08-29
-- Description: The same source payment rows were imported twice through
--   different Excel files (Payment By Client -> payment_number 'PBC-*',
--   cancelled-contracts file -> 'PAY-XLS-*'). Both carry the original
--   source row number (PBC: reference_number 'PBCFULL-<n>' / PAY-XLS:
--   numeric reference_number). This migration adds a detection RPC that
--   pairs rows imported for the same contract, same source number, same
--   amount, and payment_date within 1 day, plus a review table for the
--   findings. Nothing is mutated: findings require human reversal
--   approval via cancel_payments_batch_with_reversal.
-- Impact: review/report only — no financial mutation.
-- ================================================================

-- ============================================================================
-- Step 1: Review table for cross-file duplicate findings (additive, RLS-hardened)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'review_cross_file_duplicate_payments'
  ) THEN
    CREATE TABLE public.review_cross_file_duplicate_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES public.companies(id),
      contract_id uuid REFERENCES public.contracts(id),
      contract_number text,
      source_txn text NOT NULL,
      payment_number_a text NOT NULL,
      payment_id_a uuid NOT NULL REFERENCES public.payments(id),
      payment_date_a date NOT NULL,
      payment_number_b text NOT NULL,
      payment_id_b uuid NOT NULL REFERENCES public.payments(id),
      payment_date_b date NOT NULL,
      amount numeric NOT NULL CHECK (amount > 0),
      date_diff_days integer NOT NULL,
      status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'reversed', 'dismissed')),
      reversed_at timestamptz,
      reversed_by uuid,
      reversal_reason text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (company_id, payment_id_a, payment_id_b)
    );

    CREATE INDEX idx_review_cross_file_dups_company
      ON public.review_cross_file_duplicate_payments (company_id, status);
    CREATE INDEX idx_review_cross_file_dups_contract
      ON public.review_cross_file_duplicate_payments (contract_id);

    ALTER TABLE public.review_cross_file_duplicate_payments
      ENABLE ROW LEVEL SECURITY;

    CREATE POLICY review_cross_file_dups_company_read
      ON public.review_cross_file_duplicate_payments
      FOR SELECT
      USING (
        company_id = user_company_id()
        OR has_role(auth.uid(), 'super_admin')
      );

    CREATE POLICY review_cross_file_dups_admin_write
      ON public.review_cross_file_duplicate_payments
      FOR ALL
      USING (
        has_role(auth.uid(), 'super_admin')
        OR (
          company_id = get_user_company(auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.company_id = company_id
              AND p.role IN ('admin', 'super_admin', 'company_admin', 'manager')
              AND p.is_active = true
          )
        )
      )
      WITH CHECK (
        has_role(auth.uid(), 'super_admin')
        OR (
          company_id = get_user_company(auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.company_id = company_id
              AND p.role IN ('admin', 'super_admin', 'company_admin', 'manager')
              AND p.is_active = true
          )
        )
      );

    RAISE NOTICE 'Created review_cross_file_duplicate_payments';
  END IF;
END $$;

-- ============================================================================
-- Step 2: Detection RPC — pairs same source payment imported via two files
-- ============================================================================

CREATE OR REPLACE FUNCTION public.detect_cross_file_duplicate_payments(
  p_company_id uuid,
  p_apply boolean DEFAULT false
)
RETURNS TABLE (
  pair_count bigint,
  duplicated_amount numeric,
  affected_contracts bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_pair_count bigint;
  v_amount numeric;
  v_contracts bigint;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'Company is required' USING ERRCODE = 'P0001';
  END IF;

  -- Extract the original source row number from import payment numbers:
  --   PBC-*    -> reference_number 'PBCFULL-<n>'
  --   PAY-XLS-* -> numeric reference_number '<n>'
  WITH pbc_rows AS (
    SELECT
      p.contract_id,
      substring(p.reference_number FROM 'PBCFULL-(\d+)$') AS source_txn,
      p.amount,
      p.payment_date,
      p.id AS payment_id,
      p.payment_number
    FROM public.payments p
    WHERE p.company_id = p_company_id
      AND p.payment_number LIKE 'PBC-%'
      AND p.payment_status <> 'cancelled'
      AND p.contract_id IS NOT NULL
      AND p.reference_number LIKE 'PBCFULL-%'
  ),
  xls_rows AS (
    SELECT
      p.contract_id,
      p.reference_number AS source_txn,
      p.amount,
      p.payment_date,
      p.id AS payment_id,
      p.payment_number
    FROM public.payments p
    WHERE p.company_id = p_company_id
      AND p.payment_number LIKE 'PAY-XLS-%'
      AND p.payment_status <> 'cancelled'
      AND p.contract_id IS NOT NULL
      AND p.reference_number ~ '^\d+$'
  ),
  pairs AS (
    SELECT
      x.payment_id AS payment_id_xls,
      x.payment_number AS payment_number_xls,
      x.payment_date AS payment_date_xls,
      b.payment_id AS payment_id_pbc,
      b.payment_number AS payment_number_pbc,
      b.payment_date AS payment_date_pbc,
      x.amount,
      x.contract_id,
      ABS(x.payment_date - b.payment_date) AS date_diff_days,
      x.source_txn
    FROM xls_rows x
    JOIN pbc_rows b
      ON b.contract_id = x.contract_id
     AND b.source_txn = x.source_txn
     AND b.amount = x.amount
     AND ABS(b.payment_date - x.payment_date) <= 1
  )
  SELECT
    COUNT(*),
    COALESCE(SUM(amount), 0),
    COUNT(DISTINCT contract_id)
  INTO v_pair_count, v_amount, v_contracts
  FROM pairs;

  IF COALESCE(p_apply, false) AND v_pair_count > 0 THEN
    INSERT INTO public.review_cross_file_duplicate_payments (
      company_id,
      contract_id,
      contract_number,
      source_txn,
      payment_number_a,
      payment_id_a,
      payment_date_a,
      payment_number_b,
      payment_id_b,
      payment_date_b,
      amount,
      date_diff_days
    )
    SELECT
      p_company_id,
      pr.contract_id,
      c.contract_number,
      pr.source_txn,
      pr.payment_number_xls,
      pr.payment_id_xls,
      pr.payment_date_xls,
      pr.payment_number_pbc,
      pr.payment_id_pbc,
      pr.payment_date_pbc,
      pr.amount,
      pr.date_diff_days
    FROM (
      SELECT
        x.payment_id AS payment_id_xls,
        x.payment_number AS payment_number_xls,
        x.payment_date AS payment_date_xls,
        b.payment_id AS payment_id_pbc,
        b.payment_number AS payment_number_pbc,
        b.payment_date AS payment_date_pbc,
        x.amount,
        x.contract_id,
        ABS(x.payment_date - b.payment_date) AS date_diff_days,
        x.source_txn
      FROM public.payments x
      JOIN public.payments b
        ON b.company_id = x.company_id
       AND b.contract_id = x.contract_id
       AND b.amount = x.amount
       AND ABS(b.payment_date - x.payment_date) <= 1
       AND b.payment_number LIKE 'PBC-%'
       AND b.reference_number LIKE 'PBCFULL-%'
      WHERE x.company_id = p_company_id
        AND x.payment_number LIKE 'PAY-XLS-%'
        AND x.reference_number ~ '^\d+$'
        AND x.payment_status <> 'cancelled'
        AND x.contract_id IS NOT NULL
        AND substring(x.reference_number FROM '^\d+$') =
            substring(b.reference_number FROM 'PBCFULL-(\d+)$')
    ) pr
    LEFT JOIN public.contracts c ON c.id = pr.contract_id
    ON CONFLICT (company_id, payment_id_a, payment_id_b) DO NOTHING;
  END IF;

  RETURN QUERY SELECT v_pair_count, v_amount, v_contracts;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.detect_cross_file_duplicate_payments(uuid, boolean)
  FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_cross_file_duplicate_payments(uuid, boolean)
  TO service_role;