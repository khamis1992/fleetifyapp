# Restart after uncertain approval

The stopped job for AGR-202504-417240 has SUBMISSION_UNCERTAIN and no recorded receipt. The old UI hid restart altogether. Provide an explicit restart dialog that requires the operator to review Taqadi and confirm that this request was not submitted and has no reference.

Keep automatic retry blocked. Use a dedicated authenticated command, scoped to the user's company and contract permissions, to validate the job version and all stored filing evidence. Lock the job and case, reject receipts, references, active work and competing jobs, then run the existing package validator and restart in one transaction. Record the operator, verification note, prior attempt and request ID for audit and idempotency. Preserve all previous documents and events.

Rebuild current generated documents and freeze a current memo when necessary before sending the command. The dialog never preselects human verification. No live restart is performed while the user has not confirmed the portal outcome. Test database authorization, receipt blockers, stale confirmation, rollback, duplicate command and UI confirmation before publishing the RPC.
