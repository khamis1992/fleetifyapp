# Daily contract PDF orientation

Run outside the browser using a portable Node worker (PDF.js native canvas and Tesseract OSD). Existing Supabase Edge workers do not provide the browser canvas/OSD runtime; avoid a scheduled function that silently skips scanned PDFs. Hosting is chosen separately from the processing implementation.

Inspect current, contract-owned signed PDFs in company scope. Reuse results for the same storage path, size and updated-at fingerprint; new or replaced PDFs are eligible on the next daily run. Preserve human-reviewed corrected versions. Bound daily work and paginate without starving the backlog. Failed work retries with backoff; uncertain and protected files remain visible for review and are not repeatedly rotated.

An unattended page correction requires agreement at two rendering sizes with OSD scores at least 20, followed by a successful upright read of the rotated PDF. This is a conservative heuristic, not a guarantee or a confidence percentage. Low-confidence pages stay unchanged. Detection and rasterization remain on the worker; PDFs are not sent to a new OCR provider.

Use a service-authenticated machine identity and the existing agent policy/lease gates, with no fabricated human actor. The Edge service reconstructs the PDF from stored bytes; source hash, full document revision, filed-case locks, same-transaction provenance, original retention, and existing matching state all remain enforced. Record per-document results in company-scoped storage and show them in the orientation editor.

Validation: consensus/verification failures, mixed pages, no-op/idempotency, source changes, machine authorization, filing locks, daily selection and retries, real OSD fixture, and existing manual save regression tests.
