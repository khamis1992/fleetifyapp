# Contracts register redesign

Scope: `/contracts`, following the light vehicle workspace design. No production deployment or database mutation.

## Delivered

- One light header, summary strip, search toolbar and status navigation, replacing duplicated hidden UI.
- Responsive contract rows with customer navigation, linked vehicle plates, dates, rental amounts and existing actions.
- Occupancy uses the same `isContractOccupyingVehicle` rule as the vehicle workspace, including return state and contract period. It does not overwrite vehicle status.
- Monthly expected rent is explicitly labeled as active plus under-review monthly amounts; page-local sorting is explicitly labeled.
- Search includes current related vehicle plates as well as stored contract plates, customer identity and contract number. Count and data queries share the same filter builder. Punctuation is quoted for PostgREST.
- Fetch failures surface an error and retry action instead of a misleading empty list; statistics failures do not display zero counts.
- Creation, renewal, cancellation, legal management, export, drafts, reminders and settings retain their existing handlers.

## Verification

- TypeScript app and node checks passed.
- Production Vite build passed (existing vendor/chunk-size warnings).
- 11 tests passed: contract register search (4), vehicle occupancy (5), contract status reason (2).
- Browser: plate 10853 returns four related contracts; legal filter plus that search returns C-ALF-0099; view opens `/contracts/C-ALF-0099`.
- Browser: legal action menu, empty search state, responsive 390px layout inspected. No horizontal document overflow observed.
- No live financial or contract mutations were submitted during verification.
