# Contract matching in lawsuit preparation

The review actions in the document ledger and missing-items panel currently open the contract details route. They will instead open an accessible, light dialog in the current lawsuit workspace.

Reuse ContractDocuments, loaded on demand, to retain its preview, classification, upload, orientation and audited manual identity review capabilities. Pass the lawsuit contract's ID, customer ID and vehicle ID. Preserve the page and its preparation state while nested review dialogs are active.

The dialog displays the current evidence review/readiness state from LawsuitPreparationContext. Existing matching mutations invalidate contract document readers, and the context's contract-document query verifies evidence and refreshes the document URL. Opening or closing the dialog never marks a document matched or ready.

Cover both review entry points, missing-copy guidance, correct scope, return without navigation, and readiness updates while the dialog remains open. Verify the current user's lawsuit page in the browser; do not approve identity or upload documents merely to test navigation.

The live example has a signed-contract classification on a customer-owned document. Add an explicit attachment action to copy that existing file through useCreateContractDocument's page-review and identity-verification flow. Keep the customer original unchanged; never treat classification alone as a match. Record the source customer document ID in the new copy's notes and disable repeat attachment when that copy already exists.
