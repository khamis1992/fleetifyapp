# Customer dossier redesign

Implement a light-only customer workspace at the existing `/customers/:customerId` route. Use warm white, sage surfaces, restrained green actions and the existing Arabic typography. The identity header and four compact financial metrics precede a side navigation with nine directly addressable sections. On small screens the navigation scrolls horizontally and metrics use two columns.

Sections: overview, personal data, contracts, vehicles, invoices, payments, violations, documents, activity. Preserve old `financial`, `records`, `phones`, and `notes` links; browser back/forward and reload retain the selected section. Keep all existing company-scoped queries and mutation handlers. Keep legal, share, print, delete, CRM, upload, edit, invoice preview and payment actions accessible.

Redesign information as definition lists, contracts as accessible links with accurate status labels, document previews as landscape cards, and tables as horizontally scrollable surfaces. Search filters the loaded records in each section. Payments continue to show the existing latest 10 records and the interface explicitly labels that scope. Invoices retain the existing 100-record query limit.

Do not deploy or modify production data as part of visual verification. Validate type checking, production build, existing smoke tests and focused interaction tests. Use synthetic customer data for local visual checks when the local application lacks a signed-in session.

## Verification

- `npm run type-check`: passed after final changes.
- `npm run build:ci`: passed; existing bundle-size and mixed-import warnings remain.
- Customer smoke and workspace interaction suites: 13 tests passed.
- Targeted ESLint: no errors; legacy permissive record types produce warnings.
- Browser: inspected desktop and 390px mobile layouts with synthetic data, navigated all nine sections, verified document width does not exceed the viewport, and checked that a dark ancestor leaves the workspace and metric surfaces light.
- Fixed a shared mobile stylesheet hiding the customer navigation and activity rail.
- Production preview reached the authentication screen without console errors. Authenticated end-to-end writes were not exercised; production data was not changed and this change was not deployed.
