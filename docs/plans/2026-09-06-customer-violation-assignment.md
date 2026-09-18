# Customer traffic violation assignment

Replaces the old latest/nearest-contract auto-write with a read-only preview and explicit selected assignment (1–50 per atomic batch). Canonical source: `penalties`. The preview covers all unassigned penalties for the current active company member, without the PostgREST row limit. Filters, search, pagination and links support review.

The server only accepts a unique contract matching the actual vehicle and violation date. Cancelled contracts, overlapping contracts, plate conflicts, vehicle-change history, return-day ambiguity, existing responsibility and financial documents require review. There is no fallback to a recent contract outside its dates. Cases requiring review must be resolved using the underlying records; this workflow does not override them manually.

Preview tokens include penalty and contract snapshots. Apply locks company vehicle and contract parents plus existing history and selected penalties, recalculates the preview, rejects stale items and writes the customer/contract/vehicle/responsibility and audit record in one transaction. Batch failure rolls back every assignment. Locks cover all vehicle/contract parents in the company to serialize against new matching contracts; keep batch size at 50 and monitor contention before expanding it.

Uses the existing penalties write-policy company membership boundary, tightened to active members. No additional user role is granted. SECURITY DEFINER functions explicitly validate membership and filter every source by company. RPC execute is granted only to authenticated, and removed from PUBLIC/anon. Matching changes are scoped to this assignment workflow; imports and manual violation-entry workflows are unchanged.

## Verification

- PGlite/PostgreSQL tests: preview is read-only; actual customer assignment and audit; outside dates; overlapping contracts; duplicate plates; cancelled/missing dates; returns; changed vehicles; financial protection; stale tokens; whole-batch rollback; company membership; batch bounds.
- React tests: explicit selection, blocked review rows, 50-item limit, all-result pagination, search selection and refreshing state. Adapter test covers the Supabase method receiver and missing migration message.
- TypeScript and production build validated locally. No real violations assigned during verification.

## Deployment status

Migration: `supabase/migrations/20260906200000_customer_violation_assignment.sql`.
Rollback: `supabase/rollbacks/20260906200000_customer_violation_assignment.rollback.sql` removes the RPCs, preserving business audit/assignment records.

**Deployed on 2026-09-06 after the user explicitly approved Supabase deployment.** Applied `customer_violation_assignment` to project `qwhunliohlkkahbspfiu`. Verified both RPCs exist, authenticated execution is granted, and anonymous execution is denied. The authenticated local browser successfully loaded the read-only preview: 819 unassigned penalties, 0 ready, 819 requiring review under the conservative matching rules. No real assignments were executed during verification. The earlier automatic approval rejection is resolved by the user's explicit deployment approval. Frontend production deployment is outside this database deployment request.
