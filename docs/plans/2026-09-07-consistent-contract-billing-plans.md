# Consistent contract billing plans — 2026-09-07

## Report and verified evidence

The contract page for `AGR-202504-400949` reported that both boundary installments must be prorated because the contract starts/ends within a calendar month. Read-only inspection of Supabase project `qwhunliohlkkahbspfiu`, company `24bc0b21-4e2d-4413-9842-31719a3669f4`, established:

- Contract `cef308de-167c-4387-8e42-b5e75707acf7`: 2025-01-03 through 2028-01-04, monthly QAR 1,500, total QAR 55,500.
- There are 37 contiguous persisted installments, January 2025 through January 2028, each QAR 1,500, all linked to existing invoices.
- There are 37 invoices totaling QAR 55,500. The reported problem did not require new invoices or changing financial amounts.
- A read-only scan found 30 contracts with the similar full-boundary/monthly-total pattern among 91 active/under-legal contracts with schedules. This is a candidate count, not certification that every candidate passes every validation.
- `public.generate_contract_billing_graph_v2(uuid)`, already used by the application service, was absent from production.

## Corrected behavior

The common validator now treats a complete, consistent persisted installment plan as the billing basis. Full or partial boundary installments are accepted when the plan meets the contract amount and all other checks. Calendar dates alone no longer override persisted installment amounts or invent daily proration.

Duplicate/gapped/out-of-window months, invalid or mismatched totals, invalid installment numbering, financial holds, excessive or invalid interior installment amounts, and ambiguous service invoices remain blockers. Without a persisted plan, ambiguous mid-month contracts still require review. Prepaid invoice due dates remain subject to the existing first-of-own-month database rule.

The invoice tab displays the validated installment count and total. Actual validation failures request review before issuing new invoices. Missing server functionality remains a clear failure with no legacy generation fallback.

## Prepared server update

`supabase/migrations/20260907001000_consistent_contract_billing_plans.sql` provides the shared RPC with company authorization, row/advisory locks, consistent schedule validation, existing-invoice identity/amount checks, closed-period and payment-history safeguards, balanced-journal verification, schedule links, and audit recording. Generation is invoked for a specified contract; deployment itself does not generate invoices for all contracts.

The matching rollback removes the newly introduced RPC and preserves business records. Its baseline is the verified absence of this RPC in production; recheck that baseline and dependencies before deployment if other work intervenes.

## Deployment status

Successfully applied and verified prerequisite schema-only corrections:

1. `20260904003755_exclude_traffic_invoices_from_rental_core.sql`: excludes penalty-linked and TV-prefixed invoices from rental lookup in the existing core function.
2. `20260904013746_align_rental_month_uniqueness_with_traffic_classification.sql`: aligns the unique invoice-month index with that classification, preserving transactional uniqueness and guarded definitions.

The main `consistent_contract_billing_plans` migration is **not deployed**. Automatic approval review rejected publication of a SECURITY DEFINER financial write function without explicit authorization for this production capability. Do not retry or route around this rejection. Obtain the user's approval to publish the prepared RPC, then verify the live definition, permissions, and dependencies before applying it. Production invoice creation has not been used as a test.

No invoice amounts, payments, or persisted installment amounts were changed during this fix. Frontend changes are verified locally; no Vercel deployment was performed.

## Verification

- `node --test tests/database/contract-billing-graph.test.mjs`: 36 passed. Includes full 37-installment billing, replay without duplicate creation, partial boundary/leap-month plans, and validation failures. Uses the captured rental core in PGlite; journal and permission helpers include explicit test doubles, so this does not certify every production accounting trigger.
- `npx vitest run src/utils/__tests__/contractCalculations.test.ts src/services/__tests__/contractBillingGraph.test.ts src/hooks/__tests__/useContractPaymentSchedules.test.tsx`: 71 passed.
- `npm run type-check`: passed.
- `npm run build:ci`: passed; existing bundle-size warnings remain.
- Targeted ESLint: no errors; warnings remain.
- Read-only browser verification at the reported local URL: invoice tab displays `خطة الفوترة متطابقة`, 37 installments and 37 invoices totaling QAR 55,500, with no former proration blocker. No generation/payment action was clicked.

The production RPC path still needs publication and read-only deployment verification after approval; the local database tests are not a production execution claim.
