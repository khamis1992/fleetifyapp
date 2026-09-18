# Cancellation RPC 404 — deployment diagnosis

## Current status: deployed with explicit approval

On 2026-09-06 the user explicitly approved both schema migrations after the previous approval-review rejection was explained. Supabase `apply_migration` succeeded, in dependency order:

- `atomic_contract_vehicle_return`: live migration version `20260906114803`.
- `unify_cancellation_vehicle_return`: live migration version `20260906114814`.

Verified both exact argument signatures, empty search paths, the intended DEFINER/INVOKER modes, denied anonymous execution and granted authenticated/service execution. PostgREST resolves both RPCs: a request without an actor rejects with `AUTHENTICATION_REQUIRED` / `42501`; a cancellation request with an array payload rejects with `INVALID_VEHICLE_RETURN_PAYLOAD` / `22023`. Neither probe supplies a real contract id or reaches business writes. No manual schema-cache reload was needed.

Invoices (47), payments (5), schedules (37) and traffic violations (0) still match the original snapshot. The contract itself no longer matches the old snapshot: it is now active, with cleared legal status and suspension reason. This was discovered during verification; no restoration was attempted because intervening work may be intentional. This deployment did not execute cancellation, return, liability transfer or legal reversal. Full live cancellation/return acceptance remains outstanding.

Read-only follow-up confirms the contract was last updated at `2026-09-06 09:46:04.666459+00`, before these migrations, and its vehicle is now `available` rather than the snapshot's `maintenance`. These intervening state changes were preserved.

The diagnosis and rejected attempt below are historical, superseded by this successful deployment.

Connected project: `qwhunliohlkkahbspfiu`.

## Confirmed cause

The cancellation hook calls `cancel_contract_with_return_and_penalties_v2` with six named arguments matching the checked-in SQL and generated TypeScript types. A live `pg_proc` check confirms this function is absent. Its dependency `record_contract_vehicle_return_v1` is also absent. The existing `cancel_contract_with_company_traffic_penalties_v1` is present with the expected five arguments.

The remaining dependencies `refresh_vehicle_operational_status_v1(uuid,uuid)` and `get_user_company_id()` exist. The referenced return-report fields, vehicle mileage fields and contract return/status fields were verified through `information_schema.columns`.

## Ready deployment, in order

1. `supabase/migrations/20260903170924_atomic_contract_vehicle_return.sql`
2. `supabase/migrations/20260903172440_unify_cancellation_vehicle_return.sql`
3. Reload the PostgREST schema cache and verify both exact signatures and execute grants.

The first function uses SECURITY DEFINER with explicit actor/company checks and restricts execution to authenticated/service_role; the second uses SECURITY INVOKER and delegates cancellation to the existing financial/traffic-penalty gateway. Neither migration updates existing business rows during deployment. Their runtime purpose is to perform cancellation and optional vehicle return in one transaction.

Matching rollback files already exist in `supabase/rollbacks`; apply them in reverse order if needed.

## Verification and deployment status

14 local tests passed: renewal/cancellation hook (5), atomic return migration (6), unified cancellation migration (3).

Automatic approval review rejected the first apply_migration call because it creates a SECURITY DEFINER RPC and changes persistent execute privileges on the connected database. Neither migration was applied. Explicit user approval of this schema/security change is required before retrying. No live contract cancellation was executed.

After approval, verify the API resolves the new RPC and that authorization/validation reject invalid input without business mutations. Any full cancellation test must be rolled back or use a separately authorized test contract.
