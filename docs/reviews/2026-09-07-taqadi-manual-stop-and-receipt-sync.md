# Taqadi stop control and stale case value — 2026-09-07

The reported job remained at `submitting/final_approval` after the portal receipt
was already saved locally. The worker health endpoint showed receipt synchronization
pending. Completion failed because the legal case register held QAR 56,500 while
the approved payload and exact memo snapshot held QAR 40,000. The worker's approval
function validated payload/snapshot/current claim but omitted the case register.
The existing completion transition correctly rejected that stale value.

## Resolution

- Applied `20260907135928_synchronize_taqadi_approved_case_value.sql`. Both final
  approval and receipt completion synchronize the preparation-stage register from
  the exact worker-approved job/snapshot and audit the previous value. The final
  readiness and workflow guards remain enabled; no invoices/payments are changed.
- During retry, a concurrent identity scan temporarily changed the source to
  `unverified`, and the source guard rejected completion. That guard was retained;
  no identity decision or manual attestation was made by this task. After source
  readiness was restored, the existing worker completed the saved receipt.
- Verified the reported job as `filed/completed`, case `awaiting_acceptance`, value
  QAR 40,000, portal reference `20260012354`. There was no browser resubmission.
- Persistent receipt synchronization failures now publish `receipt_sync_pending`
  and a readable error through a conditional company/job/worker/status-scoped
  write. A failed/lost response cannot regress a filed job.
- Applied `20260907141007_cooperative_taqadi_manual_stop.sql`: active work receives
  a stop request, progress writes cannot erase it, and only the owning trusted
  worker acknowledges stopping after the portal operation returns. Submitting
  jobs stop as `SUBMISSION_UNCERTAIN`; retry/refresh/resume recognize the entire
  uncertainty-code family. Pending manual stops survive worker restart.
- The direct Arabic stop button displays the pending acknowledgement and explains
  that stopping automation does not cancel an external filing. It is absent for
  known receipts and uncertain submissions. Completed cases no longer offer
  another manual registration action.
- Worker version 1.8.4 was activated through the existing supervisor after the
  original worker was verified idle. No other process or browser was stopped.

## Verification

- 12 PG17/PGlite regression tests execute approval/completion/stop commands,
  verifying stale-value repair, audit, rollback, idempotency, mismatched snapshots,
  company/worker checks, uncertain submission and stop acknowledgement. The
  preparation-content validator and general readiness function use synthetic
  fixtures; these tests do not certify unrelated financial calculations.
- Full worker/UI pass initially had 249 passing and two failures: a mock lacking
  a Promise, corrected here; and a timing-sensitive existing party-dialog test,
  which passed when rerun alone. All 37 directly affected receipt/stop/resume/error
  regressions passed after correction. Additional stop-client response tests
  cover missing/mismatched acknowledgements.
- Application and worker TypeScript checks and local production build passed.
  Build retains the existing large-chunk warning. Changed UI files pass ESLint.
- Live browser shows the stored reference, connected worker, and “تم الإيداع —
  بانتظار قبول المحكمة”; no live filing/stop was triggered as a test.
- New internal RPCs are invoker functions, executable only by `service_role`.
  The existing authenticated cancellation command remains company-scoped and
  SECURITY DEFINER intentionally; its Supabase advisor notice is expected for
  this user command, with anonymous execution revoked.

Rollback scripts preserve case-value audit history and refuse to remove stop
support while a stop is pending. They retain the uncertainty restrictions and
worker check RPC for compatibility with already-running binaries.
