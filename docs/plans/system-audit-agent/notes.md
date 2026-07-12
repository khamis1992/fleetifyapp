# Notes: System-Wide Audit Agent

## Current Agent Coverage
- Contract invoice balance recalculation
- Contract totals and payment status recalculation
- Payment schedule and invoice linking
- Missing invoice generation
- Safe invoice amount reconciliation
- Safe duplicate and outside-period invoice cancellation
- Cancelled-contract zero-invoice cleanup
- Clear unlinked-payment matching
- Non-completed out-of-period payment repair
- Payment journal integrity repair
- Detection of duplicate payments, overpayments, and unbalanced journals

## Initial Architecture Findings
- The existing daily agent is a single Edge Function and already supports dry-run and targeted contract execution.
- The system has separate mutation paths for contracts, invoices, payments, journal entries, fleet, customers, legal cases, inventory, and employees.
- Financial migrations contain hard-delete prevention, immutable audit logs, closed-period controls, reversal RPCs, duplicate guards, and journal-balance protections.
- A system-wide agent must invoke authoritative RPCs rather than write protected financial rows directly.
- A single monolithic run risks timeouts; domain workers coordinated by a small orchestrator are a better fit.
- The generated database reference currently documents 285 tables across core, finance, contracts, customers, fleet, inventory, legal, HR, and system domains.
- Existing authoritative operations include transactional contract/payment creation, invoice generation, inventory allocation/deallocation, journal reversal, payment bank-transaction reversal, compliance validation, vehicle status maintenance, and financial integrity reporting.
- Existing audit storage includes audit logs, audit trail, compliance audit trail, contract operation logs, vehicle activity logs, user account audit, and CTO agent audit.

## Architecture Options
1. Expand the current daily Edge Function. Fastest initially, but likely to hit execution limits and creates a large blast radius.
2. Use a small orchestrator plus domain workers and a registered repair-command catalog. Best isolation, resumability, rollback, and observability.
3. Let the AI generate and execute arbitrary SQL. Most flexible, but non-deterministic and incompatible with the selected reversible safety boundary.

## Safety Boundary Selected By User
- Full repair authority for reversible operations.
- Audit trail and rollback are mandatory.
- Closed accounting periods remain protected.

## Production Verification
- Deployed final functions: `system-audit-orchestrator-v10` (`2026-07-11.15`) and `system-audit-worker-v8` (`2026-07-11.13`).
- Scheduled the primary company at 00:30 UTC daily. Resume-only recovery runs every five minutes from 00:00 through 05:59 UTC and hourly at minute 45 for the rest of the day.
- Completed an all-domain production run across contracts, accounting, fleet, customers, inventory, legal, and employees.
- Proved a controlled vehicle repair and rollback, including optimistic after-state protection.
- Proved a controlled contract schedule-to-invoice link and persisted reread.
- Applied the remaining contract convergence repairs with no final repair failures.
- Final contract dry run `d3e806ef-03b3-4ec7-b070-bcfbd00bea11`: 294 contracts, 30 batches, 3,367 review findings, zero planned repairs, zero repair failures.
- Final global dry run `0914b9ef-862d-4307-ab7b-95540f6d0b15`: seven completed jobs, 17,018 accounting records, 294 contracts, 221 vehicles, 260 customers, 14 legal cases, 8 employees, zero planned repairs, and zero failures.
- LongCat probe `404e6edc-802e-4817-88c4-b77b312e72b5`: 98 findings in one bounded batch and 30 persisted AI triage decisions.
- The v10 status endpoint paginates all findings; its total of 3,632 exactly matches the persisted run summary.
- The 3,632 global review findings are intentionally non-mutating cases such as completed-payment reversals, financially impacted invoices, ambiguous links, duplicate customer identities, and legal or accounting judgments.
