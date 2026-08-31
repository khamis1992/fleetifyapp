# Fix `create_contract_with_violation_override_atomic` 500

## Root cause

Postgres logs at 21:55:16 and 21:55:25 show `canceling statement due to statement timeout`.
The API roles `authenticator` / `authenticated` have `statement_timeout=8s`.
The wrapper creates the full contract billing graph (invoices + journals) and has no function-scoped timeout, so PostgREST returns HTTP 500.

## Plan

- [x] Add a failing migration test that requires `SET statement_timeout` on the override RPC
- [x] Persist the live wrapper + rental-guard propagation in repo migrations
- [x] Raise `statement_timeout` / `lock_timeout` to 60s on the override RPC and the inner billing-graph RPC
- [x] Apply the timeout ALTER to production and verify `proconfig`
- [ ] Commit, push, open PR
- [ ] Run migration/source-safety tests

## Review

The 500 was `statement_timeout` (8s) on `authenticator`/`authenticated`, not a missing function. Both atomic writers now have a function-scoped 60s timeout (applied in production). Browser contract creation calls `create_contract_with_violation_override_atomic` because execute on the inner billing-graph RPC was already revoked.

## Constraints

- Smallest possible change: no frontend feature port, no business-rule changes
- Keep the existing wrapper security checks and the one-time GUC override
- Match the existing `delete_contract_*` timeout pattern
