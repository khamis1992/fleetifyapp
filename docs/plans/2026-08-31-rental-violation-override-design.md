# Rental Violation Override Design

## Goal

Allow every active employee who is already authorized to create a contract to continue when the selected vehicle or customer has unpaid traffic violations. The employee must explicitly acknowledge the warning before creation. Vehicle safety and custody blocks remain non-overridable.

## Rules

- Unpaid vehicle or customer violations produce an overridable block with the count and total for each party.
- A missing vehicle or a vehicle in `street_52`, `police_station`, or `stolen` remains a hard block.
- The override is available only to an authenticated, active employee with system access who is authorized to create contracts for the active company.
- The confirmation is explicit and scoped to the current eligibility result. Changing the customer or vehicle invalidates the confirmation.
- Contract creation rechecks eligibility immediately before the atomic database operation.
- Every accepted override records the actor, company, contract, customer, vehicle, counts, totals, source, and timestamp in the audit trail.

## Architecture

The shared rental guard classifies each block as either a hard safety block or an unpaid-violations block. A reusable confirmation dialog receives the guard result and returns an explicit acknowledgement. Contract creation entry points use one shared helper so the warning behavior is consistent.

The atomic contract-creation RPC accepts violation-override metadata. It recalculates unpaid violation totals, validates the actor and company scope, rejects hard vehicle states, and records the accepted override in the same transaction as the contract and billing graph. Client confirmation alone is never treated as authorization.

## Verification

- Unit tests cover classification, paid-status filtering, and non-overridable vehicle states.
- Component/helper tests cover confirmation, cancellation, and stale selection protection.
- Migration tests verify authorization, server-side recalculation, audit insertion, grants, and rollback parity.
- Type-check, targeted tests, and the production build must pass.
