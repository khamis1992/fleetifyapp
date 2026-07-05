# Plan: READ-ONLY AUDIT MODE: Do not modify source code, do not run self-healing, and only create the requested report artifact if a deliverable file is required.

راجع النظام المالي وتكامله مع بقية الوحدات وقدم لي تقرير كامل بدون تغير الكود فقط تقرير عن تكامل النظام

This is a comprehensive financial system integration audit for the Fleetify project. The audit must:
1. Find the Fleetify project codebase (likely under C:\Users\khamis\Documents\ or similar)
2. Review ALL financial modules and their integration with other system modules
3. Check database migrations, triggers, hooks, API routes, and frontend components
4. Verify double-entry integrity, chart of accounts, GL reconciliation, trial balance, AP/AR, revenue recognition, financial statements, internal controls, cash flow, and period-end close
5. Cross-reference every finding against actual source files with file:line references
6. Produce a comprehensive Arabic report saved to docs/ in the hermes-agent repo
7. NO CODE CHANGES - read-only audit mode
8. Use the financial-system-audit-verification methodology: read all migrations, build trigger matrix, trace hook operations, cross-reference each operation against each trigger

## Reasoning
The audit requires cataloging database schema, API routes, and frontend components in parallel, then analyzing double-entry integrity, financial modules, and trigger cross-references sequentially. The final assembly compiles all findings into an Arabic report. This decomposition respects dependencies and keeps subtasks independently verifiable.

## Risk Level
medium

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: catalog-api-routes, catalog-db-schema, catalog-frontend-components
- Acceptance criteria:
  - A structured list of all financial API operations (create, read, update, delete) with file paths and line numbers is produced.
  - A JSON or markdown file listing all financial tables, columns, triggers, functions, and RLS policies with exact file paths and line numbers is created.
  - A structured list of all frontend components that handle financial data, with file paths and line numbers, is produced.

### Parallel group 2
- Subtasks: analyze-double-entry, analyze-financial-modules
- Acceptance criteria:
  - A report section detailing double-entry integrity, including any missing constraints, unbalanced entries, or incorrect mappings, with file:line references.
  - A report section covering each financial module, identifying gaps, missing features, or integration issues, with file:line references.

### Parallel group 3
- Subtasks: cross-reference-triggers
- Acceptance criteria:
  - A trigger-operation matrix and gap analysis with file:line references, highlighting any missing or misconfigured triggers.

### Parallel group 4
- Subtasks: assembly
- Acceptance criteria:
  - Final deliverable file docs/financial-integration-audit-report.md is written and contains all findings from prior subtasks, in Arabic, with file:line references.

## DAG
- `catalog-api-routes` group=0 deps=none: Identify all API endpoints, hooks, and service functions that handle financial operations (invoices, payments, journal entries, accounts, etc.). Scan src/integrations/supabase/ and any other backend code. Produce a list of operations with file:line references.
- `catalog-db-schema` group=0 deps=none: Extract all financial-related database tables, columns, migrations, triggers, functions, and RLS policies from the codebase. Parse supabase/migrations/*.sql, src/integrations/supabase/types.ts, and any other SQL files. Produce a structured list with file:line references.
- `catalog-frontend-components` group=0 deps=none: Identify all frontend components that display or interact with financial data (dashboards, forms, reports, drilldowns). Scan src/components/ and any other UI code. Produce a list of components with file:line references.
- `analyze-double-entry` group=1 deps=catalog-db-schema: Analyze double-entry integrity: verify journal entry lines structure, debit/credit balancing constraints, account mappings, and any database-level checks. Use the catalog from catalog-db-schema. Document findings with file:line references.
- `analyze-financial-modules` group=1 deps=catalog-db-schema, catalog-api-routes, catalog-frontend-components: Analyze chart of accounts, GL reconciliation, trial balance, AP/AR, revenue recognition, financial statements, internal controls, cash flow, and period-end close. Cross-reference with cataloged API routes and frontend components. Document findings with file:line references.
- `cross-reference-triggers` group=2 deps=catalog-db-schema, catalog-api-routes, analyze-double-entry: Build a trigger-operation matrix: map every database trigger/function to the API operations that invoke them. Cross-reference each financial operation against each trigger to identify missing triggers, redundant triggers, or incorrect logic. Use catalogs and double-entry analysis.
- `assembly` group=3 deps=catalog-db-schema, catalog-api-routes, catalog-frontend-components, analyze-double-entry, analyze-financial-modules, cross-reference-triggers: Compile all findings from previous subtasks into a comprehensive Arabic report. Structure the report with sections for each audit area, include file:line references, and save to docs/financial-integration-audit-report.md. No code changes.
