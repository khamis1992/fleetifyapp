# Manual rotation for inherited customer PDFs

The contract preview hid its rotation button for sourceType=customer. The reported file on C-ALF-0079 is stored in customer_documents, bucket documents, and therefore could not use the existing contract-only editor backend.

The same preview button and editor now support both contract and customer PDFs. The client sends a source discriminator; the Edge Function derives owner and storage paths from an authorized server RPC. Automatic calls remain restricted to contract PDFs.

The customer RPC verifies active company permissions, ownership through the displayed contract, and the customer's storage prefix. It locks the owner and affected contracts, checks filing activity across the customer's contracts, requires a current revision, and records an idempotent correction while keeping the document ID and all non-file metadata. Original and corrected paths are protected against authenticated overwrite/delete. Existing filing snapshots retain their original URLs. All affected contract readers refresh after a save.

Legacy conversion in useConvertToLegal.ts sets filing_date on initial case creation. For customer rotation, a case still in preparation with this date alone is not classified as submitted; actual references, advanced workflow, submitted preparations and filing jobs still block modification.

Rollback disables the RPC and retains populated history/storage protections; an unused installation can remove supporting objects.

## Validation

- PGlite: 27 passing tests across customer and existing contract orientation transactions.
- Vitest: 20 passing tests covering PDF transformations, editor review/save and automatic detection policy.
- Full application/node type-check passed; isolated Edge Function type-check passed.
- Production Vite build passed (existing bundle size and optional dependency warnings).
- Migration deployed to qwhunliohlkkahbspfiu.
- Edge Function correct-contract-document-orientation deployed as version 3, JWT verification enabled; SHA 713b91b6fc8f6536c60ebdd5463018b31f337a259073293664d0a5d864b5aab2.
- Live grants confirmed: RPC service-role only, SECURITY INVOKER, empty search_path.
- Live C-ALF-0079 editor loaded انور جنيبي.pdf with six page selectors and enabled manual rotation controls. No correction was saved by the agent on this document.

The frontend change is available on localhost. No Vercel deployment was performed.
