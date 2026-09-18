# Legal case cancellation vehicle-status guard

## Problem

`cancel_legal_cases_v1` returns HTTP 400 when a contract transition produces an
empty derived vehicle status. PostgreSQL rejects casting the empty string to the
`vehicle_status` enum, rolling back the entire legal-case cancellation.

## Design

Keep the existing cancellation, audit, contract, and vehicle-state rules. At
the two enum-conversion boundaries (`cancel_legal_cases_v1` and
`update_vehicle_status_from_contract`), normalize whitespace-only values to
`NULL` and confirm non-empty values exist in `vehicle_status` before casting.
When no valid target exists, preserve the vehicle's current status and allow the
legal workflow to complete.

## Verification

Apply the migration, invoke cancellation for an affected case, confirm the RPC
returns success, and verify the case activity/audit trail. Run database security
and performance advisors after the DDL change.
