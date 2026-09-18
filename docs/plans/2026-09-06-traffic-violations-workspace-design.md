# Traffic violations workspace

Rebuilt the traffic violations page with a light white/sage RTL layout matching the dashboard and tasks workspaces. Removed duplicated legacy page layouts and duplicate form mounts.

The page now separates the register, PDF imports, traffic files, analysis and company liabilities. The register provides linked vehicle/customer/contract details, status and payment labels, accessible named row actions, filters and pagination. Registration, payments, cancellation, reminders, reports and relinking retain their existing business handlers. Mail sync retains its administrator permission gate.

Search results from the server no longer undergo a contradictory second substring filter, so contract and phone matches remain visible. Filtered results paginate in groups of 50; the existing 500-result search limit is disclosed. Reports use the visible records. The main refresh invalidates the relevant traffic queries. Filter and count cache keys include the company; the customer filter is explicitly company scoped.

Statistics now fetch 500-row batches instead of silently stopping at the first server response limit. The monetary headline describes original amounts for records not fully paid, including partial-payment records; it is not presented as an exact remaining receivable balance.

Validation: application/node TypeScript checks; production Vite build; page ESLint; a statistics pagination/company-scope test and the existing three payment tests. Browser review covers the new register and registration modal, followed by responsive and section checks. No live payment, cancellation, notification, import or relinking action is submitted during verification. No deployment or schema migration.
