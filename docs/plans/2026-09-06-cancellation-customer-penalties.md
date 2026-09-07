# Keep customer traffic liability after cancellation

## Follow-up: legacy trigger blocker fixed

The user's subsequent screenshot reproduced a real remaining blocker: the existing BEFORE UPDATE trigger `trg_block_contract_close_with_unpaid_penalties` still rejected cancellation inside the corrected RPC. The earlier isolated fixture omitted that trigger, so the previous verification was incomplete.

Applied `20260906171751_allow_contract_close_with_customer_penalties.sql` successfully. It removes only that obsolete contract-status trigger; all other 22 contract triggers remain installed. The trigger function is retained for the matching rollback. No penalty, invoice, payment or contract row is modified by deployment.

The regression fixture now installs the actual legacy trigger, reproduces the same Arabic rejection, applies the corrective migration, and executes the same six-argument cancellation wrapper successfully with retained customer responsibility. Eleven executable database cases and ten focused Vitest cases passed; app TypeScript check passed. Closing to completed/closed/terminated/expired also preserves penalty rows in the isolated fixture. Live catalog verification confirms the legacy blocker is absent. The shared client penalty decision now treats unpaid penalties as retained customer liability rather than a closure veto. This is not a claim of full production trigger or separate employee-workspace closure acceptance.

User requirement: cancelling a rental contract must not force traffic penalties onto the company. Cancellation preserves the original customer/contract links, penalty balances, invoices and receipts.

Implemented and deployed `20260906155723_preserve_customer_penalties_on_contract_cancellation.sql` through Supabase apply_migration. The existing cancellation command keeps tenant/auth checks, locking and replay behavior; it no longer transfers penalties or cancels their invoices. A stale client explicitly requesting transfer receives a validation error. Existing execute grants are preserved. The preflight returns requires_company_transfer=false and can_transfer=false. Matching rollback restores the previous definitions; no historical transferred penalties are reassigned by this migration.

Both the cancellation dialog and status workspace now submit false and show retained customer responsibility. Existing preflight loading/errors still block submission until verified. Unpaid or partly paid penalty invoices do not require a finance transfer permission to cancel the rental.

Validation:

- Six executable PGlite cases using the actual command SQL: preservation of all penalty/invoice/payment fields; repeat cancellation; rejection of stale transfer requests; cross-company and inactive-user rejection; no-open-penalty case. Minimal isolated tables, not full production trigger coverage.
- Seven focused component/hook cases passed.
- Both TypeScript configs passed; Vite production build passed in 1m37s with existing chunk warnings.
- Live RPC reader resolves and reports no company-transfer requirement. Anonymous execution remains denied.
- Signed-in browser preview on LTO2024233 showed 19 open penalties / QAR 8,700, retained customer liability notice, and enabled review after a reason, with no transfer checkbox. No cancellation was submitted.
- LTO202410 was already cancelled when inspected in this turn; intervening business changes were preserved. No live financial write, historical responsibility repair or frontend deployment occurred.

Existing SECURITY DEFINER entry points remain under their prior grants; this change does not broaden access. [Supabase advisor reference](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
