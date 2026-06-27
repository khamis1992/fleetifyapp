-- Audit-grade financial reports: hash every snapshot and freeze approved reports.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.financial_report_snapshots
  ADD COLUMN IF NOT EXISTS report_hash TEXT,
  ADD COLUMN IF NOT EXISTS hash_version INTEGER NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.calculate_financial_report_snapshot_hash(
  p_company_id UUID,
  p_report_type TEXT,
  p_period_start DATE,
  p_period_end DATE,
  p_as_of_date DATE,
  p_currency TEXT,
  p_source_fingerprint TEXT,
  p_report_payload JSONB,
  p_total_debit NUMERIC,
  p_total_credit NUMERIC,
  p_total_assets NUMERIC,
  p_total_liabilities NUMERIC,
  p_total_equity NUMERIC,
  p_total_revenue NUMERIC,
  p_total_expenses NUMERIC,
  p_net_income NUMERIC,
  p_imbalance NUMERIC
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    digest(
      concat_ws(
        '|',
        COALESCE(p_company_id::text, ''),
        COALESCE(p_report_type, ''),
        COALESCE(p_period_start::text, ''),
        COALESCE(p_period_end::text, ''),
        COALESCE(p_as_of_date::text, ''),
        UPPER(COALESCE(p_currency, 'QAR')),
        COALESCE(p_source_fingerprint, ''),
        COALESCE(p_report_payload::text, '{}'),
        COALESCE(ROUND(p_total_debit::numeric, 3)::text, ''),
        COALESCE(ROUND(p_total_credit::numeric, 3)::text, ''),
        COALESCE(ROUND(p_total_assets::numeric, 3)::text, ''),
        COALESCE(ROUND(p_total_liabilities::numeric, 3)::text, ''),
        COALESCE(ROUND(p_total_equity::numeric, 3)::text, ''),
        COALESCE(ROUND(p_total_revenue::numeric, 3)::text, ''),
        COALESCE(ROUND(p_total_expenses::numeric, 3)::text, ''),
        COALESCE(ROUND(p_net_income::numeric, 3)::text, ''),
        COALESCE(ROUND(p_imbalance::numeric, 3)::text, '')
      ),
      'sha256'
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.assign_financial_report_snapshot_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.hash_version := COALESCE(NEW.hash_version, 1);
  NEW.report_hash := public.calculate_financial_report_snapshot_hash(
    NEW.company_id,
    NEW.report_type,
    NEW.period_start,
    NEW.period_end,
    NEW.as_of_date,
    NEW.currency,
    NEW.source_fingerprint,
    NEW.report_payload,
    NEW.total_debit,
    NEW.total_credit,
    NEW.total_assets,
    NEW.total_liabilities,
    NEW.total_equity,
    NEW.total_revenue,
    NEW.total_expenses,
    NEW.net_income,
    NEW.imbalance
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_approved_financial_report_snapshot_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Financial report snapshots cannot be deleted. Void the snapshot with a reason instead.'
      USING ERRCODE = 'P0001';
  END IF;

  IF OLD.status = 'voided' THEN
    RAISE EXCEPTION 'Voided financial report snapshots are immutable.'
      USING ERRCODE = 'P0001';
  END IF;

  IF OLD.status = 'approved' THEN
    IF NEW.status = 'voided'
      AND NEW.company_id IS NOT DISTINCT FROM OLD.company_id
      AND NEW.report_type IS NOT DISTINCT FROM OLD.report_type
      AND NEW.period_start IS NOT DISTINCT FROM OLD.period_start
      AND NEW.period_end IS NOT DISTINCT FROM OLD.period_end
      AND NEW.as_of_date IS NOT DISTINCT FROM OLD.as_of_date
      AND NEW.currency IS NOT DISTINCT FROM OLD.currency
      AND NEW.source_fingerprint IS NOT DISTINCT FROM OLD.source_fingerprint
      AND NEW.report_payload IS NOT DISTINCT FROM OLD.report_payload
      AND NEW.total_debit IS NOT DISTINCT FROM OLD.total_debit
      AND NEW.total_credit IS NOT DISTINCT FROM OLD.total_credit
      AND NEW.total_assets IS NOT DISTINCT FROM OLD.total_assets
      AND NEW.total_liabilities IS NOT DISTINCT FROM OLD.total_liabilities
      AND NEW.total_equity IS NOT DISTINCT FROM OLD.total_equity
      AND NEW.total_revenue IS NOT DISTINCT FROM OLD.total_revenue
      AND NEW.total_expenses IS NOT DISTINCT FROM OLD.total_expenses
      AND NEW.net_income IS NOT DISTINCT FROM OLD.net_income
      AND NEW.imbalance IS NOT DISTINCT FROM OLD.imbalance
      AND NEW.report_hash IS NOT DISTINCT FROM OLD.report_hash
    THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Approved financial report snapshots are immutable. Void and republish instead.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.financial_report_snapshots
SET report_hash = public.calculate_financial_report_snapshot_hash(
      company_id,
      report_type,
      period_start,
      period_end,
      as_of_date,
      currency,
      source_fingerprint,
      report_payload,
      total_debit,
      total_credit,
      total_assets,
      total_liabilities,
      total_equity,
      total_revenue,
      total_expenses,
      net_income,
      imbalance
    ),
    hash_version = COALESCE(hash_version, 1)
WHERE report_hash IS NULL;

DROP TRIGGER IF EXISTS assign_financial_report_snapshot_hash_trigger ON public.financial_report_snapshots;
CREATE TRIGGER assign_financial_report_snapshot_hash_trigger
BEFORE INSERT OR UPDATE ON public.financial_report_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.assign_financial_report_snapshot_hash();

DROP TRIGGER IF EXISTS prevent_approved_financial_report_snapshot_update_trigger ON public.financial_report_snapshots;
CREATE TRIGGER prevent_approved_financial_report_snapshot_update_trigger
BEFORE UPDATE ON public.financial_report_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.prevent_approved_financial_report_snapshot_mutation();

DROP TRIGGER IF EXISTS prevent_financial_report_snapshot_delete_trigger ON public.financial_report_snapshots;
CREATE TRIGGER prevent_financial_report_snapshot_delete_trigger
BEFORE DELETE ON public.financial_report_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.prevent_approved_financial_report_snapshot_mutation();

CREATE INDEX IF NOT EXISTS idx_financial_report_snapshots_report_hash
  ON public.financial_report_snapshots(company_id, report_hash);

CREATE OR REPLACE FUNCTION public.approve_financial_report_snapshot(p_snapshot_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot public.financial_report_snapshots%ROWTYPE;
BEGIN
  SELECT * INTO v_snapshot
  FROM public.financial_report_snapshots
  WHERE id = p_snapshot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial report snapshot not found';
  END IF;

  IF v_snapshot.company_id <> get_user_company_id() THEN
    RAISE EXCEPTION 'Cannot approve another company financial report snapshot';
  END IF;

  IF v_snapshot.status <> 'published' THEN
    RAISE EXCEPTION 'Only published financial report snapshots can be approved';
  END IF;

  IF v_snapshot.generated_by = auth.uid() THEN
    RAISE EXCEPTION 'Generator cannot approve their own financial report snapshot';
  END IF;

  IF v_snapshot.source_fingerprint IS NULL OR length(trim(v_snapshot.source_fingerprint)) = 0 THEN
    RAISE EXCEPTION 'Financial report source fingerprint is required before approval';
  END IF;

  IF v_snapshot.report_hash IS NULL OR length(trim(v_snapshot.report_hash)) = 0 THEN
    RAISE EXCEPTION 'Financial report hash is required before approval';
  END IF;

  IF ABS(COALESCE(v_snapshot.imbalance, 0)) > 0.01 THEN
    RAISE EXCEPTION 'Unbalanced financial report snapshot cannot be approved';
  END IF;

  UPDATE public.financial_report_snapshots
  SET
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    updated_at = now()
  WHERE id = p_snapshot_id;

  RETURN jsonb_build_object(
    'snapshot_id', p_snapshot_id,
    'status', 'approved',
    'report_hash', v_snapshot.report_hash
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_financial_report_snapshot_hash(UUID, TEXT, DATE, DATE, DATE, TEXT, TEXT, JSONB, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
