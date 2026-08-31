-- Roll back the latest August operational-custody snapshot only.
-- Vehicle, contract, invoice, payment, and legal rows were never changed by it.

BEGIN;

DO $rollback$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid;
  v_source_sha constant text := '4E0F968805E9953CD3E10B90B9CEA6E418EE87CC8C477490235092A102224A67';
  v_batch_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':fleet-report:' || v_source_sha, 0)
  );

  SELECT batch.id INTO v_batch_id
  FROM public.fleet_reconciliation_batches batch
  WHERE batch.company_id = v_company_id
    AND batch.source_sha256 = v_source_sha
  FOR UPDATE;

  IF v_batch_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.fleet_reconciliation_batches
    WHERE id = v_batch_id AND status = 'applied'
  ) THEN
    RAISE EXCEPTION 'Latest August batch is not in applied state';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.fleet_reconciliation_assignments assignment
    JOIN public.vehicles vehicle
      ON vehicle.id = assignment.vehicle_id
     AND vehicle.company_id = assignment.company_id
    WHERE assignment.batch_id = v_batch_id
      AND (
        assignment.is_active = false
        OR vehicle.status::text IS DISTINCT FROM assignment.after_state ->> 'status'
        OR vehicle.location IS DISTINCT FROM assignment.after_state ->> 'location'
      )
  ) THEN
    RAISE EXCEPTION 'Rollback aborted: an assignment was superseded or vehicle state changed';
  END IF;

  UPDATE public.fleet_reconciliation_assignments assignment
  SET is_active = false,
      closed_at = now(),
      closed_reason = 'rolled_back_batch:' || v_batch_id::text
  WHERE assignment.batch_id = v_batch_id
    AND assignment.is_active;

  UPDATE public.fleet_reconciliation_assignments previous
  SET is_active = true,
      closed_at = NULL,
      closed_reason = NULL
  FROM public.fleet_reconciliation_assignments latest
  WHERE latest.batch_id = v_batch_id
    AND latest.source_evidence ->> 'previous_assignment_id' = previous.id::text
    AND previous.company_id = v_company_id
    AND previous.vehicle_id = latest.vehicle_id
    AND previous.is_active = false
    AND previous.closed_reason = 'superseded_by_batch:' || v_batch_id::text;

  UPDATE public.fleet_reconciliation_batches batch
  SET status = 'rolled_back',
      rolled_back_at = now(),
      metadata = batch.metadata || jsonb_build_object(
        'rollback_reason', 'migration_rollback',
        'rollback_restored_previous_assignments', (
          SELECT count(*)
          FROM public.fleet_reconciliation_assignments previous
          JOIN public.fleet_reconciliation_assignments latest
            ON latest.batch_id = v_batch_id
           AND latest.source_evidence ->> 'previous_assignment_id' = previous.id::text
          WHERE previous.is_active
        )
      )
  WHERE batch.id = v_batch_id;
END;
$rollback$;

COMMIT;
