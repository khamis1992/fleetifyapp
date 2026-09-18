# Autonomous Contract Reconciliation Agent

## Goal

Close contract billing failures without requiring the system owner to diagnose database state. The agent must read the signed contract, compare it with the stored contract and its complete financial graph, choose only a document-supported scenario, apply safe corrections atomically, and verify the result before declaring success.

## Trigger and evidence

The nightly signed-contract scan must include active and legal contracts when any of the following is true: an active schedule has no invoice, the contract has schedules but no invoices, a system-audit missing-invoice repair failed, or the stored contract amount disagrees with the canonical billing graph. Candidate selection must not depend on one inclusive-month formula.

For every candidate, the agent loads the latest signed contract document, contract dates and amounts, active schedules, invoices, payments, allocations, and posted journals. OCR/LLM extraction remains evidence-bound: absent terms are `null`, confidence is recorded, and short source excerpts accompany every proposed value.

## Decision policy

The agent may auto-apply only when all of these conditions hold:

1. The caller is the verified scheduled `contract-terms-scanner` identity.
2. Extraction confidence is at least 0.90 and contains quoted evidence.
3. Monthly amount, period, duration/installment count, and total are internally consistent.
4. The selected billing scenario fits inside the written contract period.
5. No affected schedule or invoice has payment history, allocations, or protected posted financial impact.
6. The database can perform the correction through canonical transactional gateways.

If any condition fails, the agent records a pending proposal and creates or updates one assigned financial-review task containing the competing scenarios, extracted evidence, and exact blocker. It does not ask the system owner to choose technical values.

## Apply and verification

The apply gateway cancels only payment-free schedules outside the written scenario, updates document-supported contract terms, regenerates the canonical schedule and invoice graph, links every active schedule to its same-month invoice, and recalculates contract totals. Existing paid financial history is never deleted or rewritten.

Success requires a postcondition check: no active in-period schedule lacks an invoice, no active schedule exists outside the selected scenario, active invoice and schedule months are one-to-one, amounts match the written terms, and every generated invoice has its required balanced posted journal. A failed postcondition leaves the proposal failed/pending with evidence and the audit job must report a failed or partial outcome rather than `completed`.

## Rollout

The implementation is idempotent and supports a target contract for controlled rollout. It will first be dry-run against `LTO2024284`, then applied only if the signed document produces a single safe scenario. Scheduled batches remain bounded and process failed audit findings before ordinary amount mismatches.
