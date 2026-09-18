# Signed contract upload review

Employees must inspect every page before uploading signed copies. The shared contract document mutation opens a local review showing the company's selected contract, customer identity and vehicle. PDF and supported images can be rotated by page or together. PDF rotation preserves original page contents; PDFs containing digital signature fields cannot be rewritten. No previous document is deleted or replaced.

Review reads Fleetify QR identifiers and explicitly labeled contract numbers from PDF text. A different identifier on any page blocks uploading to the selected contract. Missing identifiers are inconclusive and never establish identity. New signed and unsigned PDF generators reserve a footer for a QR with the contract number, with no customer personal data. QR identifiers are routing aids, not cryptographic signatures.

After upload, the existing server identity scanner evaluates the stored copy. The UI distinguishes matched, mismatched and pending/unverified copies. OCR failures retain the uploaded pending copy and require review rather than resubmitting or claiming success. Existing database identity/evidence controls remain authoritative. Page rendering is capped at 20, the scanner's supported limit, and excess pages are rejected rather than silently truncated.

Other paths: one-time public upload reviews against the token's contract number; bulk uploads review orientation before storage and require a second confirmation against the proposed contract before binding. Filename matching alone no longer binds a document without employee review. The public endpoint and existing bulk reconciliation remain responsible for server identity verification.

Limits: unreadable or old scanned documents without QR depend on existing OCR and human review; the frontend gate does not replace server authorization. Existing copies are not retroactively modified. Deployment and a production OCR transaction are not part of local validation.

Validation: functional tests cover rotation round trips, mixed contracts, Arabic digits, mandatory page review, cancellation, mismatched OCR and unavailable OCR. Browser verification uses synthetic PDFs inside the actual Radix upload-dialog environment. Run type-check and build:ci separately.
