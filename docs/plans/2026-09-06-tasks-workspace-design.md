# Tasks workspace refresh

Implemented locally on 2026-09-06 for `/tasks`.

## Experience

- Light white/sage RTL workspace, aligned with the customer, dashboard and sidebar refreshes.
- Eight sections grouped into daily work, review and personal organization. Financial review and team communication retain their existing access checks.
- Personal and team task lists share search, status/priority/assignee filtering, due/priority/newest sorting, list/cards/board views, scoped metrics and 30-item display pagination.
- URL query parameters preserve section, filters, view and the selected task. Legacy `tab=data-review` still opens verification.
- Document verification and duplicate customer review have separate views. Personal notes and team communication have separate views.
- Reminders expose completed items; notes expose archive/search; goals filter by period. Financial reviews and agent decisions support search. Agent decisions now paginate beyond the former first-eight limit.
- Task forms use one scrollable flow, validate date order, preserve failed submissions and explicitly clear optional fields on edit. Task details provide current checklist progress, comments, activity, status changes and known related-record links.

## Integration

- Existing Supabase tables, mutations, access checks and workflow decision handlers retained. No database migration.
- Task queries fetch 500-row pages with stable ordering, company/assignment filters and cancellation. This removes the former server-response truncation from local search and metrics.
- Single-task queries include company scope in both the query and cache key. The details panel consumes the current query result instead of a stale selected object.
- Existing checklist cache arrays are copied before sorting.
- Main refresh invalidates relevant task/personal/review queries; it does not start document scans. Explicit scan controls remain in document review.
- Known task metadata links use registered customer/contract/vehicle routes, not arbitrary metadata URLs.
- Empty board columns now register as drop targets; cancelled/completed tasks do not count as overdue.

## Validation

- 14 focused Vitest tests: scope resolution, dates, filtering/sorting, known links, optional edit fields, validation/failure preservation, checklist refresh, accessible status changes, paginated company-scoped fetching.
- TypeScript app and node checks passed.
- ESLint on the workspace, page, form, details, board and personal/financial panels passed without warnings. Existing legacy hook/audit warnings were not used to justify unrelated edits.
- Authenticated browser review of personal/team workspace controls, list/cards/board, all eight sections, completed reminders, task form and task details/activity. Responsive form/detail review at 390×844; viewport restored afterward.
- Browser checks did not submit new tasks, comments, decisions or deletion actions. Mutation behavior tested with mocks.
- Production Vite build verified; existing bundle-size/dynamic-import warnings remain. No deployment performed.
