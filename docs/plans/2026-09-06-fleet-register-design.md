# Fleet register redesign

The fleet landing page now uses a light Arabic RTL workspace consistent with the contract register. An ivory background, restrained green accents and a compact operational list replace the previous image-heavy cards and repeated confirmation dialogs.

The default list and optional card view expose vehicle identity, canonical operational status, daily rate, mileage and registration/insurance expiry. Unknown document dates are labelled explicitly. Summary metrics filter their matching status; the maintenance count is not mixed with unrelated unavailable states.

Search, status tabs, the full status selector and page-size controls use the existing paginated hook. Ordering is explicitly labelled as plate order. Existing add/edit/copy, contract, maintenance, status, export, import, grouping, document distribution and synchronization workflows remain available. Destructive deletion retains confirmation. The vehicle form owns its dialog, avoiding nested modals.

Exports were extracted unchanged into `src/pages/fleet/fleetRegisterExports.ts`. No database schema or vehicle records were changed.

Verification: ESLint passes for the new page. TypeScript initially passed; the final workspace check reports concurrent, unrelated errors in `ContractNoClaimClosureDialog.tsx`. Browser checks confirm plate search, card view, two matching maintenance vehicles, and a single add-vehicle modal. Narrow viewport inspection found no horizontal document overflow; the viewport was restored. The production build passed. No live records were created, edited or deleted during verification.
