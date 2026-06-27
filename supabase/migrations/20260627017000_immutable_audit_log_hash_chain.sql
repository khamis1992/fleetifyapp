-- Tamper-evident and append-only audit logs.
-- New audit rows receive a hash chained to the previous company audit row.
-- Existing rows are backfilled once, then UPDATE/DELETE is blocked.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS previous_hash TEXT,
  ADD COLUMN IF NOT EXISTS entry_hash TEXT,
  ADD COLUMN IF NOT EXISTS hash_version INTEGER NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.calculate_audit_log_entry_hash(
  p_previous_hash TEXT,
  p_company_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_old_values JSONB,
  p_new_values JSONB,
  p_metadata JSONB,
  p_created_at TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    digest(
      concat_ws(
        '|',
        COALESCE(p_previous_hash, ''),
        COALESCE(p_company_id::text, ''),
        COALESCE(p_user_id::text, ''),
        COALESCE(p_action, ''),
        COALESCE(p_resource_type, ''),
        COALESCE(p_resource_id, ''),
        COALESCE(p_old_values::text, '{}'),
        COALESCE(p_new_values::text, '{}'),
        COALESCE(p_metadata::text, '{}'),
        COALESCE(p_created_at::text, '')
      ),
      'sha256'
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.assign_audit_log_hash_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_hash TEXT;
BEGIN
  NEW.created_at := COALESCE(NEW.created_at, now());
  NEW.hash_version := COALESCE(NEW.hash_version, 1);

  SELECT entry_hash INTO v_previous_hash
  FROM public.audit_logs
  WHERE company_id IS NOT DISTINCT FROM NEW.company_id
    AND entry_hash IS NOT NULL
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  NEW.previous_hash := v_previous_hash;
  NEW.entry_hash := public.calculate_audit_log_entry_hash(
    NEW.previous_hash,
    NEW.company_id,
    NEW.user_id,
    NEW.action,
    NEW.resource_type,
    NEW.resource_id,
    NEW.old_values::jsonb,
    NEW.new_values::jsonb,
    NEW.metadata::jsonb,
    NEW.created_at
  );

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  PERFORM set_config('app.audit_log_maintenance', 'on', true);

  WITH RECURSIVE ordered AS (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY company_id
        ORDER BY COALESCE(created_at, now()), id
      ) AS rn,
      company_id,
      user_id,
      action,
      resource_type,
      resource_id,
      old_values,
      new_values,
      metadata,
      COALESCE(created_at, now()) AS effective_created_at
    FROM public.audit_logs
  ),
  hashed AS (
    SELECT
      id,
      rn,
      company_id,
      NULL::text AS calculated_previous_hash,
      public.calculate_audit_log_entry_hash(
        NULL,
        company_id,
        user_id,
        action,
        resource_type,
        resource_id,
        old_values::jsonb,
        new_values::jsonb,
        metadata::jsonb,
        effective_created_at
      ) AS calculated_entry_hash
    FROM ordered
    WHERE rn = 1

    UNION ALL

    SELECT
      ordered.id,
      ordered.rn,
      ordered.company_id,
      hashed.calculated_entry_hash AS calculated_previous_hash,
      public.calculate_audit_log_entry_hash(
        hashed.calculated_entry_hash,
        ordered.company_id,
        ordered.user_id,
        ordered.action,
        ordered.resource_type,
        ordered.resource_id,
        ordered.old_values::jsonb,
        ordered.new_values::jsonb,
        ordered.metadata::jsonb,
        ordered.effective_created_at
      ) AS calculated_entry_hash
    FROM ordered
    JOIN hashed
      ON ordered.company_id IS NOT DISTINCT FROM hashed.company_id
     AND ordered.rn = hashed.rn + 1
  )
  UPDATE public.audit_logs audit
  SET
    previous_hash = hashed.calculated_previous_hash,
    entry_hash = hashed.calculated_entry_hash,
    hash_version = 1
  FROM hashed
  WHERE audit.id = hashed.id
    AND audit.entry_hash IS NULL;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.audit_log_maintenance', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Audit logs are immutable. Append a new audit event instead of updating or deleting.';
END;
$$;

DROP TRIGGER IF EXISTS assign_audit_log_hash_chain_trigger ON public.audit_logs;
CREATE TRIGGER assign_audit_log_hash_chain_trigger
BEFORE INSERT ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.assign_audit_log_hash_chain();

DROP TRIGGER IF EXISTS prevent_audit_log_update_trigger ON public.audit_logs;
CREATE TRIGGER prevent_audit_log_update_trigger
BEFORE UPDATE ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS prevent_audit_log_delete_trigger ON public.audit_logs;
CREATE TRIGGER prevent_audit_log_delete_trigger
BEFORE DELETE ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_audit_log_mutation();

CREATE OR REPLACE FUNCTION public.verify_audit_log_hash_chain(p_company_id UUID DEFAULT NULL)
RETURNS TABLE (
  company_id UUID,
  checked_entries INTEGER,
  broken_entries INTEGER,
  missing_hash_entries INTEGER,
  is_valid BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT *
    FROM public.audit_logs
    WHERE p_company_id IS NULL OR audit_logs.company_id = p_company_id
  ),
  ordered AS (
    SELECT
      scoped.*,
      lag(entry_hash) OVER (
        PARTITION BY scoped.company_id
        ORDER BY COALESCE(scoped.created_at, now()), scoped.id
      ) AS expected_previous_hash
    FROM scoped
  ),
  verified AS (
    SELECT
      ordered.company_id,
      ordered.id,
      ordered.entry_hash,
      ordered.previous_hash,
      ordered.expected_previous_hash,
      public.calculate_audit_log_entry_hash(
        ordered.previous_hash,
        ordered.company_id,
        ordered.user_id,
        ordered.action,
        ordered.resource_type,
        ordered.resource_id,
        ordered.old_values::jsonb,
        ordered.new_values::jsonb,
        ordered.metadata::jsonb,
        ordered.created_at
      ) AS expected_entry_hash
    FROM ordered
  )
  SELECT
    verified.company_id,
    COUNT(*)::integer AS checked_entries,
    COUNT(*) FILTER (
      WHERE verified.entry_hash IS DISTINCT FROM verified.expected_entry_hash
        OR verified.previous_hash IS DISTINCT FROM verified.expected_previous_hash
    )::integer AS broken_entries,
    COUNT(*) FILTER (WHERE verified.entry_hash IS NULL)::integer AS missing_hash_entries,
    (
      COUNT(*) FILTER (
        WHERE verified.entry_hash IS DISTINCT FROM verified.expected_entry_hash
          OR verified.previous_hash IS DISTINCT FROM verified.expected_previous_hash
          OR verified.entry_hash IS NULL
      ) = 0
    ) AS is_valid
  FROM verified
  GROUP BY verified.company_id;
$$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_hash_chain
  ON public.audit_logs(company_id, created_at DESC, entry_hash);

GRANT EXECUTE ON FUNCTION public.verify_audit_log_hash_chain(UUID) TO authenticated;
