# Inline contract matching — verification

Both review actions in LegalDocuments now open ContractMatchingDialog inside lawsuit preparation instead of navigating to the contract details route. The dialog loads the shared ContractDocuments workspace on demand and reflects the provider's evidence/readiness state.

The reported C-ALF-0079 file is customer-owned despite its signed-contract classification. CustomerContractAttachment provides an explicit action to attach that stored file through the existing reviewed upload and identity-verification workflow. It does not move or alter the customer original or infer a match from classification. An origin marker prevents repeating an existing attachment through this action.

Validation:

- 23 Vitest tests passed: ledger/dialog navigation, pending and refreshed readiness, customer attachment, manual identity approval prerequisites, and query synchronization.
- Full app and node TypeScript checks passed.
- Final production build passed; existing bundle-size warnings remain.
- Live browser: the review button opened a dialog on the same lawsuit URL; all six stored files loaded. The customer document's attachment button opened the six-page signed-copy review with the correct contract/customer/vehicle context.
- The agent did not approve identity or save/upload a copy. The review remains open for the user.

No database migration or remote deployment was required. Frontend changes are available on localhost.
