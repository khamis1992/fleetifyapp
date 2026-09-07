# Vehicle details: light operational workspace

The vehicle file uses a white and warm green visual system, a wide identity header,
a contract occupancy panel, actionable operational counters, and nine URL-addressable
sections. Reused business forms and their Radix portals inherit the light appearance
only while the vehicle workspace is mounted. Existing routes and mutations remain intact.

## Operational behavior

- Stored vehicle status remains authoritative; reading this page never writes status.
- Occupancy follows the existing `isContractOccupyingVehicle` rule, including suspended
  and legal contracts in their current period and excluding recorded vehicle returns.
- An occupying contract links directly to its detail page. The file blocks its new-rental
  action while occupied, inactive, in executing maintenance, unavailable, or unverifiable.
- Availability is not represented by an invented percentage. Contract creation still
  performs the application's date and eligibility checks.
- Histories use stable paged queries with company and vehicle filters, instead of
  silently using ten records to calculate totals. Errors surface with a retry action.
- Data refreshes every 30 seconds while open, on focus, and after vehicle/status/maintenance
  dialogs close. No production mutations were performed during verification.
- Base vehicle rates remain visible alongside the separate pricing-history panel.

## Verification

- Inspected the supplied vehicle in production and the redesigned local route with the
  existing authenticated browser session. Confirmed its legal contract counts as one
  occupying contract and links to the correct contract page.
- Verified the known `petrol` fuel value displays as gasoline and zero mileage stays zero.
- Added 24 focused tests for rental gating, contract states, returns, history pagination,
  partial-fetch failures and tab resolution. Together with existing occupancy and
  return/cancellation migration tests: 43 passed.
- TypeScript and production build run separately, since `build:ci` skips type checking.
- Final production build and scoped ESLint passed. A previous complete TypeScript run
  passed; the final repository-wide run is blocked by an unrelated concurrent change
  in `src/components/finance/ProtectedFinanceRoute.tsx:38`, which calls `refetch` on
  `usePermissionCheck` although that hook does not expose it. Vehicle files report no
  TypeScript errors.
- Inspected all nine sections and the edit/status dialogs using the local authenticated
  route. Checked the narrow viewport: the document did not overflow horizontally.
- No schema migrations, commits, or deployment are part of this change.
