# Contract status update: inspection type constraint

The live `record_contract_vehicle_return_v1` writes `check_out` when a contract is cancelled with a vehicle return. The live table constraint only allowed `pre_dispatch`, `post_dispatch` and `contract_inspection`, so the entire atomic cancellation failed. `useCreateInspection` and `useVehicleInspections` also write/read `check_in` and `check_out`.

Deployed `20260906203000_allow_contract_condition_inspection_types.sql` to Supabase on 2026-09-06. The constraint now accepts the two contract inspection types while preserving the three legacy types. No existing reports or contract statuses were changed. Permissions and RLS are unchanged.

Verification: the cancellation/return PostgreSQL suite now reproduces the original table constraint and applies the correction before exercising the real RPC migrations. All eight tests pass, including successful cancellation with a `check_out` report, invalid return rollback and replay without duplicated evidence. Live catalog verification confirms the updated constraint is validated.

The matching rollback refuses to remove support while new inspection types exist, preserving inspection evidence for explicit review. No real customer contract was cancelled to test this fix.
