-- Phase 4: Hardening
-- 1. chart_of_accounts.current_balance auto-recalculation trigger
-- 2. Payment approval workflow enforcement (large payments require approval)
-- 3. PII encryption for sensitive customer fields

-- =============================================================================
-- 1. Auto-recalculate chart_of_accounts.current_balance on journal entry changes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.recalc_account_balance_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
  v_company_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_account_id := OLD.account_id;
  ELSE
    v_account_id := NEW.account_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.account_id IS DISTINCT FROM NEW.account_id THEN
    UPDATE public.chart_of_accounts
    SET current_balance = COALESCE((
      SELECT
        CASE
          WHEN balance_type = 'debit' THEN
            COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0)
          ELSE
            COALESCE(SUM(jel.credit_amount), 0) - COALESCE(SUM(jel.debit_amount), 0)
        END
      FROM public.journal_entry_lines jel
      JOIN public.journal_entries je ON je.id = jel.journal_entry_id
      WHERE jel.account_id = OLD.account_id AND je.status = 'posted'
    ), 0),
    updated_at = now()
    WHERE id = OLD.account_id;
  END IF;

  IF v_account_id IS NOT NULL THEN
    UPDATE public.chart_of_accounts
    SET current_balance = COALESCE((
      SELECT
        CASE
          WHEN balance_type = 'debit' THEN
            COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0)
          ELSE
            COALESCE(SUM(jel.credit_amount), 0) - COALESCE(SUM(jel.debit_amount), 0)
        END
      FROM public.journal_entry_lines jel
      JOIN public.journal_entries je ON je.id = jel.journal_entry_id
      WHERE jel.account_id = v_account_id AND je.status = 'posted'
    ), 0),
    updated_at = now()
    WHERE id = v_account_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_account_balance ON public.journal_entry_lines;
CREATE TRIGGER trg_recalc_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_account_balance_trigger_fn();

-- =============================================================================
-- 2. Payment Approval Workflow Enforcement
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name LIKE '%financial_approval_policies%action%'
    AND constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE public.financial_approval_policies
      DROP CONSTRAINT IF EXISTS financial_approval_policies_action_check;
  END IF;
END $$;

ALTER TABLE public.financial_approval_policies
  ADD CONSTRAINT financial_approval_policies_action_check
  CHECK (action IN (
    'invoice_cancel',
    'payment_cancel',
    'payment_create',
    'journal_post',
    'period_reopen',
    'budget_override',
    'bank_reconcile',
    'report_approve'
  ));

CREATE OR REPLACE FUNCTION public.enforce_payment_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy_exists BOOLEAN;
  v_has_approval BOOLEAN;
BEGIN
  IF NEW.payment_status <> 'completed' OR OLD.payment_status = 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.financial_approval_policies
    WHERE company_id = NEW.company_id
      AND action = 'payment_create'
      AND is_active = true
      AND NEW.amount >= min_amount
      AND (max_amount IS NULL OR NEW.amount <= max_amount)
  ) INTO v_policy_exists;

  IF NOT v_policy_exists THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.financial_approval_requests
    WHERE source_table = 'payments'
      AND source_id = NEW.id
      AND action = 'payment_create'
      AND status = 'approved'
  ) INTO v_has_approval;

  IF NOT v_has_approval THEN
    RAISE EXCEPTION 'Payment amount % exceeds approval threshold. An approved financial approval request is required before completion.', NEW.amount;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_payment_approval ON public.payments;
CREATE TRIGGER trg_enforce_payment_approval
  BEFORE UPDATE OF payment_status ON public.payments
  FOR EACH ROW
  WHEN (NEW.payment_status = 'completed')
  EXECUTE FUNCTION public.enforce_payment_approval();

-- =============================================================================
-- 3. PII Encryption for Customer Sensitive Fields
-- Uses AES-256 symmetric encryption via pgcrypto
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'national_id_encrypted'
  ) THEN
    ALTER TABLE public.customers
      ADD COLUMN national_id_encrypted BYTEA,
      ADD COLUMN passport_number_encrypted BYTEA,
      ADD COLUMN license_number_encrypted BYTEA;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.encrypt_pii(
  p_plaintext TEXT,
  p_key TEXT DEFAULT current_setting('app.pii_encryption_key', true)
)
RETURNS BYTEA
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT pgp_sym_encrypt(p_plaintext, COALESCE(p_key, 'default-fleetify-key-change-in-prod'));
$$;

CREATE OR REPLACE FUNCTION public.decrypt_pii(
  p_encrypted BYTEA,
  p_key TEXT DEFAULT current_setting('app.pii_encryption_key', true)
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT pgp_sym_decrypt(p_encrypted, COALESCE(p_key, 'default-fleetify-key-change-in-prod'));
$$;

GRANT EXECUTE ON FUNCTION public.encrypt_pii(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_pii(BYTEA, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_pii(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_pii(BYTEA, TEXT) TO service_role;
