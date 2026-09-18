# Saved PDF orientation correction

Implemented a lazy RTL editor in contract-owned PDF previews. It renders up to
50 pages / 25 MiB, supports per-page quarter turns and all-page 180-degree turns,
and requires reviewing every page before saving. Tesseract OSD runs locally using
its dedicated `osd` model; suggestions below confidence 15 remain manual.
Low-confidence pages are marked individually. Detection can be cancelled.

The Edge Function authenticates the JWT with `getUser`, performs company/role
checks through a service-only RPC, verifies the reviewed file hash, and rotates
the server's current PDF with pdf-lib. It does not accept replacement PDF bytes.
PDF text/image content streams remain unchanged; encrypted/digitally signed PDFs
are rejected. A unique storage object is committed with provenance and the
document's existing ID. Identity/evidence status is retained. Original objects
and audit history are protected from client overwrite/deletion. Stale and
duplicate requests, pending filing jobs and filed evidence are guarded.
Prepared public URLs and the signed preview URL are refreshed after correction.

## Deployment

- Local migration `20260907193009_contract_document_orientation_revisions.sql`:
  deployed as `20260907194948`.
- Follow-up `allow_orientation_review_for_quarantined_documents` deployed;
  correcting quarantine does not approve identity or reactivate evidence.
- `correct-contract-document-orientation`: ACTIVE, version 1, JWT verification on.
- No Vercel frontend deployment was performed; the UI is available on localhost.

## Validation

- TypeScript application/node configurations and isolated Edge Function check pass.
- Production Vite build passes (existing bundle-size/OpenCV warnings).
- 10 PDF/detection unit tests, 5 editor tests, 9 PostgreSQL/PGlite integration
  tests pass, plus 4 existing rotation and 13 legal-selection tests.
- Real Tesseract OSD test on synthetic pages: input 0/90/180/270 returns correction
  0/270/180/90, scores 22.07–23.68. Using the ordinary English OCR model yielded
  unusable OSD scores; the dedicated OSD model fixes this.
- Remote checks confirm RLS, service-only execution and two restrictive storage
  preservation policies. Supabase advisors reported no orientation-related finding.
- Browser: the requested contract opens all 7 pages in the new editor. Automatic
  inspection proposes 180 degrees for page 1; screenshot confirms upright content.
  Three pages are conservatively left for manual review. Save remains disabled
  until page review and confirmation. No customer PDF was changed during verification.

## Deliberate scope

The editor is for PDFs owned by the contract, including active and quarantined
documents. It does not mutate inherited customer/vehicle documents or submitted
court copies. Rollback disables correction and restores signed-document
immutability while retaining provenance and original storage objects.
