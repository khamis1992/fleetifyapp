# Saved PDF orientation correction

Add a light, RTL editor to contract-owned PDF previews. Render every page, detect text orientation locally using Tesseract OSD, suggest only confident quarter-turn corrections, and require the user to review every page before saving. Manual quarter-turn controls remain available when detection fails.

The browser sends page rotations, never replacement PDF bytes. An authenticated Edge Function downloads the current stored PDF, rejects digital signatures/encryption and excessive size/page counts, rotates pages with pdf-lib without rasterization, and writes a unique object. A service-only transaction validates actor/company, locks the contract/document/legal records, rejects filed or queued filing work, checks the complete source revision, records original/corrected paths and hashes, and updates the same document ID. Original objects and the audit are retained. Identity decisions remain unchanged because the server performs only rotations; stale OCR requests fail their existing path-based revision check.

Existing consumers read the current file_path, including lawsuit document selection. Unfiled preparation URLs are refreshed. Storage history is protected from client overwrite/deletion. A narrowly scoped exception to signed-document immutability requires the trusted revision inserted in the same transaction. No generic file replacement is permitted.

Validate PDF preservation, detection thresholds/angles, authorization, stale saves, duplicate requests, filing locks, history protection, and UI review/save behavior. Deploy the additive database migration and new authenticated Edge Function to activate local UI. Do not alter the user's sample PDF without their page review.
