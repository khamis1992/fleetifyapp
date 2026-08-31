import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve('../..');
const auditPath = path.join(repoRoot, 'tmp', 'august-contract-reconciliation.json');
const migrationPath = path.join(
  repoRoot,
  'supabase',
  'migrations',
  '20260831114500_register_latest_august_operational_custody_snapshot.sql',
);
const rollbackPath = path.join(
  repoRoot,
  'supabase',
  'rollbacks',
  '20260831114500_register_latest_august_operational_custody_snapshot.rollback.sql',
);

const audit = JSON.parse(await fs.readFile(auditPath, 'utf8'));
const companyId = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const sourceSha = '4E0F968805E9953CD3E10B90B9CEA6E418EE87CC8C477490235092A102224A67';
const liveStatuses = new Set(['active', 'under_legal_procedure']);
const newerDecisionPlates = new Set(['722134', '2773', '848014', '846485', '847932']);

const rows = audit.auditRows
  .map((row, index) => ({ row, sourceRow: index + 2 }))
  .filter(({ row }) => !newerDecisionPlates.has(row.source.plate))
  .map(({ row, sourceRow }) => {
    if (!row.vehicle?.id) throw new Error(`Missing vehicle for ${row.source.plate}`);
    if (row.vehicle.status !== 'rented') {
      throw new Error(`Expected rented status for ${row.source.plate}, found ${row.vehicle.status}`);
    }

    const matchingIds = new Set(row.matchingCustomers.map((customer) => customer.id));
    const live = row.contracts.filter((contract) => liveStatuses.has(contract.status));
    const same = live.filter((contract) => matchingIds.has(contract.customer_id));
    const different = live.filter((contract) => !matchingIds.has(contract.customer_id));
    const other = row.expectedCustomerContracts.filter((contract) => (
      liveStatuses.has(contract.status) && contract.vehicle_id !== row.vehicle.id
    ));
    const supporting = same.find((contract) => contract.status === 'active')
      || same.find((contract) => contract.status === 'under_legal_procedure')
      || null;

    let classification;
    if (same.length && !different.length && !other.length) classification = 'matched_contract';
    else if (same.length) classification = 'matched_with_parallel_conflict';
    else if (different.length) classification = 'different_customer_live_contract';
    else if (other.length) classification = 'expected_customer_contract_on_other_vehicle';
    else classification = 'no_live_contract';

    const resolvedCustomer = row.matchingCustomers.length === 1
      ? row.matchingCustomers[0]
      : null;
    const identityResolution = row.matchingCustomers.length === 1
      ? 'unique_customer_match'
      : row.matchingCustomers.length > 1
        ? 'ambiguous_multiple_customer_records'
        : 'unresolved_customer';

    return {
      sourceRow,
      sourcePlate: row.source.plate,
      sourceCustomerName: row.source.canonicalCustomer || row.source.expectedCustomer,
      sourceCustomerPhone: row.source.sourcePhone || null,
      resolvedCustomerNationalId: resolvedCustomer?.national_id || null,
      resolvedCustomerPhone: resolvedCustomer?.national_id
        ? null
        : resolvedCustomer?.phone || null,
      supportingContractNumber: supporting?.contract_number || null,
      identityResolution,
      sourceClassification: classification,
      decisionReason: classification === 'matched_contract'
        ? 'Latest August file confirms the operational custodian; matching live contract retained.'
        : 'Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.',
      evidence: {
        source_contract_number: row.source.sourceContractNumber,
        source_start_date: row.source.sourceStartDate,
        source_end_date: row.source.sourceEndDate,
        source_monthly_amount: row.source.sourceMonthlyAmount,
        source_note: row.source.sourceNote,
        reconciliation_classification: classification,
        matching_customer_count: row.matchingCustomers.length,
        live_contract_count_on_vehicle: live.length,
      },
    };
  });

if (rows.length !== 84) throw new Error(`Expected 84 imported rows, found ${rows.length}`);
if (rows.filter((row) => (
  row.resolvedCustomerNationalId || row.resolvedCustomerPhone
)).length !== 70) {
  throw new Error('Expected 70 uniquely resolved customers');
}

const manifest = JSON.stringify(rows, null, 2).replaceAll("'", "''");

const migration = `-- Register the latest August operational-custody snapshot without changing
-- contracts, invoices, payments, legal cases, or vehicle statuses.
--
-- Source workbook: دفعات-شهر-8-أغسطس-2026.xlsx (89 rows).
-- Five rows are intentionally excluded because later direct administrative
-- decisions supersede the workbook: 722134, 2773, 848014, 846485, 847932.

BEGIN;

DO $register$
DECLARE
  v_company_id constant uuid := '${companyId}'::uuid;
  v_source_sha constant text := '${sourceSha}';
  v_batch_id uuid;
  v_manifest jsonb := '${manifest}'::jsonb;
  v_import_count integer;
  v_resolved_customer_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':fleet-report:' || v_source_sha, 0)
  );

  SELECT batch.id INTO v_batch_id
  FROM public.fleet_reconciliation_batches batch
  WHERE batch.company_id = v_company_id
    AND batch.source_sha256 = v_source_sha
  FOR UPDATE;

  IF v_batch_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.fleet_reconciliation_batches
      WHERE id = v_batch_id AND status = 'applied'
    ) THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'An incomplete reconciliation batch already exists: %', v_batch_id;
  END IF;

  CREATE TEMP TABLE latest_august_source ON COMMIT DROP AS
  SELECT source.*
  FROM jsonb_to_recordset(v_manifest) AS source(
    "sourceRow" integer,
    "sourcePlate" text,
    "sourceCustomerName" text,
    "sourceCustomerPhone" text,
    "resolvedCustomerNationalId" text,
    "resolvedCustomerPhone" text,
    "supportingContractNumber" text,
    "identityResolution" text,
    "sourceClassification" text,
    "decisionReason" text,
    "evidence" jsonb
  );

  SELECT count(*), count(*) FILTER (
    WHERE "resolvedCustomerNationalId" IS NOT NULL
       OR "resolvedCustomerPhone" IS NOT NULL
  )
  INTO v_import_count, v_resolved_customer_count
  FROM latest_august_source;

  IF v_import_count <> 84 OR v_resolved_customer_count <> 70 THEN
    RAISE EXCEPTION 'Manifest totals changed: % imported / % resolved customers',
      v_import_count, v_resolved_customer_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM latest_august_source source
    LEFT JOIN LATERAL (
      SELECT count(*) AS match_count
      FROM public.vehicles vehicle
      WHERE vehicle.company_id = v_company_id
        AND public.normalize_vehicle_plate(vehicle.plate_number)
          = public.normalize_vehicle_plate(source."sourcePlate")
    ) matches ON true
    WHERE matches.match_count <> 1
  ) THEN
    RAISE EXCEPTION 'Every imported row must resolve to its reviewed company vehicle';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM latest_august_source source
    JOIN public.vehicles vehicle
      ON vehicle.company_id = v_company_id
     AND public.normalize_vehicle_plate(vehicle.plate_number)
       = public.normalize_vehicle_plate(source."sourcePlate")
    WHERE vehicle.status::text <> 'rented'
  ) THEN
    RAISE EXCEPTION 'Vehicle status changed after review; latest August snapshot aborted';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM latest_august_source source
    LEFT JOIN LATERAL (
      SELECT count(*) AS match_count
      FROM public.customers customer
      WHERE customer.company_id = v_company_id
        AND (
          (
            source."resolvedCustomerNationalId" IS NOT NULL
            AND customer.national_id = source."resolvedCustomerNationalId"
          )
          OR (
            source."resolvedCustomerNationalId" IS NULL
            AND source."resolvedCustomerPhone" IS NOT NULL
            AND regexp_replace(COALESCE(customer.phone, ''), '\\D', '', 'g')
              = regexp_replace(source."resolvedCustomerPhone", '\\D', '', 'g')
          )
        )
    ) matches ON true
    WHERE (
      source."resolvedCustomerNationalId" IS NOT NULL
      OR source."resolvedCustomerPhone" IS NOT NULL
    )
      AND matches.match_count <> 1
  ) THEN
    RAISE EXCEPTION 'A resolved operational customer is outside the company';
  END IF;

  CREATE TEMP TABLE latest_august_resolved ON COMMIT DROP AS
  SELECT
    source.*,
    vehicle.id AS vehicle_id,
    customer.id AS customer_id,
    contract.id AS supporting_contract_id
  FROM latest_august_source source
  JOIN public.vehicles vehicle
    ON vehicle.company_id = v_company_id
   AND public.normalize_vehicle_plate(vehicle.plate_number)
     = public.normalize_vehicle_plate(source."sourcePlate")
  LEFT JOIN LATERAL (
    SELECT matched.id
    FROM public.customers matched
    WHERE matched.company_id = v_company_id
      AND (
        (
          source."resolvedCustomerNationalId" IS NOT NULL
          AND matched.national_id = source."resolvedCustomerNationalId"
        )
        OR (
          source."resolvedCustomerNationalId" IS NULL
          AND source."resolvedCustomerPhone" IS NOT NULL
          AND regexp_replace(COALESCE(matched.phone, ''), '\\D', '', 'g')
            = regexp_replace(source."resolvedCustomerPhone", '\\D', '', 'g')
        )
      )
    ORDER BY matched.id
    LIMIT 1
  ) customer ON true
  LEFT JOIN public.contracts contract
    ON contract.company_id = v_company_id
   AND contract.contract_number = source."supportingContractNumber"
   AND contract.vehicle_id = vehicle.id
   AND contract.customer_id = customer.id
   AND contract.status IN ('active', 'under_legal_procedure');

  IF EXISTS (
    SELECT 1
    FROM latest_august_resolved source
    WHERE source."supportingContractNumber" IS NOT NULL
      AND source.supporting_contract_id IS NULL
  ) THEN
    RAISE EXCEPTION 'A supporting contract no longer matches the reviewed vehicle/customer';
  END IF;

  CREATE TEMP TABLE prior_august_assignments ON COMMIT DROP AS
  SELECT DISTINCT ON (assignment.vehicle_id)
    assignment.vehicle_id,
    assignment.id AS previous_assignment_id
  FROM public.fleet_reconciliation_assignments assignment
  JOIN latest_august_resolved source
    ON source.vehicle_id = assignment.vehicle_id
  WHERE assignment.company_id = v_company_id
    AND assignment.is_active
  ORDER BY assignment.vehicle_id, assignment.created_at DESC, assignment.id DESC;

  INSERT INTO public.fleet_reconciliation_batches (
    company_id, source_file_name, source_sha256, source_as_of, status,
    source_row_count, status_change_count, customer_snapshot_count, metadata
  ) VALUES (
    v_company_id,
    'دفعات-شهر-8-أغسطس-2026.xlsx',
    v_source_sha,
    DATE '2026-08-31',
    'applying',
    89,
    0,
    70,
    jsonb_build_object(
      'scope', 'latest_august_operational_custody_snapshot',
      'source_report_row_count', 89,
      'imported_assignment_count', 84,
      'excluded_newer_decision_count', 5,
      'excluded_newer_decision_plates', jsonb_build_array(
        '722134', '2773', '848014', '846485', '847932'
      ),
      'unresolved_customer_count', 12,
      'ambiguous_customer_count', 2,
      'vehicle_status_rows_changed', 0,
      'contract_rows_changed', 0,
      'invoice_rows_changed', 0,
      'payment_rows_changed', 0,
      'legal_case_rows_changed', 0
    )
  ) RETURNING id INTO v_batch_id;

  UPDATE public.fleet_reconciliation_assignments assignment
  SET is_active = false,
      closed_at = now(),
      closed_reason = 'superseded_by_batch:' || v_batch_id::text
  WHERE assignment.company_id = v_company_id
    AND assignment.is_active
    AND assignment.vehicle_id IN (
      SELECT source.vehicle_id FROM latest_august_resolved source
    );

  INSERT INTO public.fleet_reconciliation_assignments (
    batch_id, company_id, vehicle_id, source_row, source_plate,
    source_result, source_classification, source_customer_name,
    source_customer_phone, customer_id, supporting_contract_id,
    identity_resolution, target_status, target_location, decision_reason,
    source_fingerprint, source_evidence, before_state, after_state
  )
  SELECT
    v_batch_id,
    v_company_id,
    source.vehicle_id,
    source."sourceRow",
    source."sourcePlate",
    'current_renter_in_august_2026_payment_workbook',
    source."sourceClassification",
    source."sourceCustomerName",
    source."sourceCustomerPhone",
    source.customer_id,
    source.supporting_contract_id,
    source."identityResolution",
    'rented'::public.vehicle_status,
    NULL,
    source."decisionReason",
    md5(concat_ws(
      '|', v_source_sha, source."sourceRow"::text, source."sourcePlate",
      COALESCE(source."sourceCustomerName", '')
    )),
    COALESCE(source."evidence", '{}'::jsonb)
      || jsonb_build_object(
        'previous_assignment_id', previous.previous_assignment_id,
        'source_sha256', v_source_sha,
        'operational_only', true,
        'creates_contract', false,
        'proves_payment', false,
        'proves_legal_claim', false
      ),
    jsonb_build_object(
      'status', vehicle.status::text,
      'location', vehicle.location,
      'plate_number', vehicle.plate_number,
      'is_active', vehicle.is_active,
      'updated_at', vehicle.updated_at
    ),
    jsonb_build_object(
      'status', vehicle.status::text,
      'location', vehicle.location,
      'plate_number', vehicle.plate_number,
      'is_active', vehicle.is_active,
      'updated_at', vehicle.updated_at
    )
  FROM latest_august_resolved source
  JOIN public.vehicles vehicle
    ON vehicle.id = source.vehicle_id
   AND vehicle.company_id = v_company_id
  LEFT JOIN prior_august_assignments previous
    ON previous.vehicle_id = source.vehicle_id;

  IF (
    SELECT count(*)
    FROM public.fleet_reconciliation_assignments assignment
    WHERE assignment.batch_id = v_batch_id
      AND assignment.company_id = v_company_id
      AND assignment.is_active
      AND assignment.target_status = 'rented'
  ) <> 84 THEN
    RAISE EXCEPTION 'Postcondition failed: latest August assignments are incomplete';
  END IF;

  UPDATE public.fleet_reconciliation_batches batch
  SET status = 'applied',
      applied_at = now(),
      metadata = batch.metadata || jsonb_build_object(
        'applied_assignment_count', 84,
        'previous_assignment_count', (
          SELECT count(*) FROM prior_august_assignments
        )
      )
  WHERE batch.id = v_batch_id;
END;
$register$;

COMMIT;
`;

const rollback = `-- Roll back the latest August operational-custody snapshot only.
-- Vehicle, contract, invoice, payment, and legal rows were never changed by it.

BEGIN;

DO $rollback$
DECLARE
  v_company_id constant uuid := '${companyId}'::uuid;
  v_source_sha constant text := '${sourceSha}';
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
`;

await fs.writeFile(migrationPath, migration, 'utf8');
await fs.writeFile(rollbackPath, rollback, 'utf8');
console.log(JSON.stringify({ migrationPath, rollbackPath, importedRows: rows.length }, null, 2));
