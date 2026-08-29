# Daily closeouts employee and date-range filter

## Goal

Allow managers to select an employee and view that employee's daily closeouts across a from/to date range while preserving the existing single-day overview.

## Design

- Replace the single date state with inclusive dateFrom and dateTo values, defaulting to today.
- Add an employee selector to the closeouts register. The default remains all employees.
- Apply company, date range, and optional employee filters in the Supabase query so exports and displayed totals use the complete matching dataset.
- Include inactive employees in the selector for historical reporting, but continue counting only active non-manager employees in the daily missing-closeout overview.
- Validate that dateFrom is not later than dateTo before querying and show an inline Arabic error when invalid.
- When viewing one day for all employees, keep the current daily metric cards and missing-employee warning.
- For an employee or multi-day range, show period metrics: closeout count, completed/incomplete count, total collections, and calls.
- Add the closeout date to the table and export filename so multi-day results are unambiguous.

## Verification

- Type-check the affected TypeScript.
- Verify the production build.
- Confirm query keys include company, both dates, and employee so React Query caches each filter combination independently.
