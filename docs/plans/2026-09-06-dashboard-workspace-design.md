# Dashboard workspace redesign

Implemented for `/dashboard`, using the same light white/sage visual direction as the customer workspace. Existing shell, routes, authentication, company scoping and operational commands remain integrated.

## Presentation and data

- Four linked summary metrics followed by filterable daily priorities, complete fleet distribution, collections, ending contracts, maintenance and workspace shortcuts.
- DashboardStats, FleetStatus and DailyDecisionCenter remain the data sources. The maintenance query retains company isolation and now surfaces query failures.
- Overdue balances use actual decision collection metrics instead of probing nonexistent DashboardStats properties.
- Replaced the old six-query active-contract cohort chart, which was labeled as historical revenue, with explicitly labeled cumulative cashflow forecasts from the existing decision source.
- All fleet statuses contribute to the distribution. Zero and unavailable data have different presentations; each section has loading, retry and empty states.
- Contract creation uses the existing wizard. The dashboard search button dispatches a dedicated open event to the shared GlobalSearch to avoid opening two keyboard-listener dialogs simultaneously.

## Validation

- Nine focused tests cover complete fleet totals, zero fleet, internal routes, immutable priority ordering, filtering, actual collection metrics, contract links, commands, missing/error/loading data and opening/closing a named global search dialog without a keyboard broadcast.
- TypeScript and production Vite build checked separately; focused ESLint checked.
- Authenticated localhost browser review with real data: desktop layout, urgent filter, opening/closing the contract wizard without saving, and opening a single global search dialog.
- Mobile review at 390 × 844: corrected inherited global section padding and metric typography; document width stays inside the viewport.
- Light tokens are scoped to the workspace and its dialogs. No deployment or database schema changes.
