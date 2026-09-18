# Direct signed-copy approval access

The live inventory for the reported lawsuit now contains the signed file in customer documents, with no signed copy remaining in contract_documents. The previous dialog combined a stale lawsuit assessment with a current general-purpose library, so it showed a review message but no contract-only manual approval action.

ContractMatchingWorkspace now presents current signed copies and their next action first. It uses the same company/contract-scoped inventory as the library, includes the evidence state, refreshes the separate filing assessment, and blocks stale actions during refetch. CustomerContractAttachment can hand a successfully created, scope-verified contract copy directly to the existing IdentityReviewDialog. Attachment failures do not open approval. Full library tools remain available behind an explicit toggle.

The manual form is placed before the inline preview on narrow screens, with a prominent full-size document link. The observed identity number, review reason, confirmation, server revision check and invalidation remain required. No evidence was uploaded or approved during this turn.

Validation:

- 40 tests passed: matching workspace, ledger/dialog, attachment handoff, manual identity approval and filing readiness.
- App and node TypeScript checks passed.
- Production build passed with existing chunk-size warnings.
- Live browser at the user's narrow viewport shows the current customer-copy status, the file and the visible "إرفاق النسخة ومتابعة الاعتماد" button without scrolling through the library. The dialog remains open for the user.
- No database migration or remote deployment required.
