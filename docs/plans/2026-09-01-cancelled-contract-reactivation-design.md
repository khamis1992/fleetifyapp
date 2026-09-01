# Cancelled Contract Reactivation

## Goal

Allow an employee to return a cancelled contract to `active` from the contract details page without duplicating or rewriting existing invoices, payment schedules, payments, or journals.

## Selected design

The existing draft activation command is not suitable for cancelled legacy contracts because it requires the complete modern billing graph to equal the stored contract amount. `LTO202437` predates that invariant and has an intact but historically shaped financial graph. Directly updating `contracts.status` is also unsafe because database lifecycle and rental-eligibility guards intentionally reject it.

Add a dedicated `reactivate_cancelled_contract_atomic_v1` RPC. It will:

- authorize any active employee with system access in the contract company;
- lock the contract and its vehicle;
- accept only `cancelled`/`canceled` contracts, with idempotent replay for `active`;
- reject active legal cases, unavailable vehicles, and overlapping active/legal contracts;
- preserve the counts and totals of invoices, schedules, payments, and payment allocations before and after the status change;
- require explicit acknowledgement when the vehicle or customer has unpaid traffic penalties;
- use a row-scoped transaction setting consumed by the rental-eligibility trigger, so the acknowledgement cannot leak to another update;
- record the transition and violation acknowledgement in `contract_operations_log` and `audit_logs`.

## UI flow

For a cancelled contract, show “إعادة تفعيل العقد” in the top action bar and the quick actions area. The confirmation dialog displays the number and total of linked traffic violations. When violations exist, the employee must select an acknowledgement checkbox before submission. The page calls the atomic RPC, refreshes contract/vehicle/financial queries, and shows the database error in Arabic if a legal, vehicle, or overlap guard blocks the transition.

## Verification

Add source-level migration tests for authorization, lifecycle checks, scoped override consumption, financial preservation, audit logging, grants, and rollback. Add hook/UI tests confirming cancelled contracts call the dedicated RPC only after explicit acknowledgement. Verify the deployed function definition, trigger attachment, grants, and the read-only eligibility facts for `LTO202437`; do not reactivate the production contract automatically.
