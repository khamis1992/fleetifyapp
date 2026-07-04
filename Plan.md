# Plan: Comprehensive financial system integration audit for the Fleetify ERP (car rental management for Qatar). Project root: C:\Users\khamis\Documents\fleetifyapp\

DO NOT modify any code. This is a READ-ONLY audit that produces a detailed report.

Audit scope:
1. Map the ENTIRE financial system — all financial-related pages, components, hooks, API routes, Supabase queries, and type definitions. Include: invoices, payments, journal entries, chart of accounts, general ledger, financial reports, expense management, revenue tracking, customer billing, vendor payments, payroll, tax/VAT, currency handling, financial dashboards.

2. Integration points — trace how the financial system connects to EVERY other module:
   - Fleet/vehicle management (depreciation, maintenance costs, fuel, insurance)
   - Customer management (billing, credit limits, statements)
   - Driver management (salaries, advances, settlements)
   - Bookings/reservations (revenue recognition, billing cycles)
   - Contracts (payment schedules, penalties)
   - Inventory/parts (stock valuation, cost of goods)
   - Reports & analytics (financial KPIs, P&L, balance sheet, cash flow)
   - Admin/settings (currency, tax rates, fiscal year)

3. Data flow analysis — for each integration point, document:
   - What data flows between modules (fields, direction)
   - How it flows (direct query, hook, shared state, API call)
   - Is the integration complete or are there gaps/broken links?
   - Are there orphaned financial records (payments without invoices, journal entries without source documents)?
   - Foreign key integrity issues

4. Known issues from memory: 43 payments unlinked (blocked by prevent_overpayment_trigger), A=L+E off by 2,142,986 QAR (Revenue not closed to Equity), empty=0, zero=0, drafts=2, invoices=0, migration 20260701000006 created with trigger-bypass RPC but unapplied. Column traps: payments(status→payment_status), journal_entry_lines(entry_id→journal_entry_id, account_code→account_id, company_id→none).

5. Architecture assessment:
   - Is the chart of accounts properly structured?
   - Are journal entries following double-entry bookkeeping correctly?
   - Is the trial balance generation correct?
   - Are financial reports (P&L, Balance Sheet, Cash Flow) correctly pulling data?
   - Is VAT/tax handling compliant with Qatar regulations?
   - Is currency handling consistent (QAR)?
   - Are there any calculated fields that could have precision issues?

6. Gaps and risks:
   - Missing integrations (modules that should feed financial data but don't)
   - Broken integrations (data flowing but incorrect/incomplete)
   - Redundant data entry points
   - Security concerns in financial data access
   - Performance concerns in financial queries
   - Compliance gaps

Deliver a comprehensive markdown report saved to C:\Users\khamis\Documents\fleetifyapp\FINANCIAL_SYSTEM_AUDIT_REPORT.md with:
- Executive summary
- Complete financial system map
- Integration matrix (module × financial area)
- Data flow diagrams (ASCII)
- Issue register (categorized by severity: critical/high/medium/low)
- Compliance assessment
- Risk assessment
- Recommendations (prioritized, no code changes — just recommendations)

The report should be in Arabic (the user's language) with technical terms in English where appropriate.

## Reasoning
This is a read-only audit producing a single comprehensive report. I decomposed it into 5 parallel analysis tasks covering different audit dimensions (system mapping, query audit, integration tracing, known issue verification, architecture assessment), followed by 1 report compilation task that depends on all analysis tasks. This maximizes parallelism while keeping the final report coherent.

## Risk Level
low

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: architecture-assessment, financial-system-mapping, integration-tracing, known-issues-verification, supabase-query-audit
- Acceptance criteria:
  - Structured assessment of all 7 architecture areas with specific findings, code references, and compliance notes.
  - A complete catalog of all financial-related files with their purposes, covering all listed financial areas. No financial file is missed.
  - Integration matrix covering all 8 modules with documented data flows, gaps, orphaned records, and FK integrity issues.
  - Each of the 5 known issues verified with code evidence, confirming or refuting with specific file references.
  - Complete inventory of financial table schemas, all queries against them, and all column name mismatches/traps identified.

### Parallel group 2
- Subtasks: compile-audit-report
- Acceptance criteria:
  - FINANCIAL_SYSTEM_AUDIT_REPORT.md exists, is in Arabic with English technical terms, contains all 8 required sections, includes ASCII data flow diagrams, issue register with severity categories, and prioritized recommendations. No code files were modified.

## DAG
- `architecture-assessment` group=0 deps=none: Assess the financial architecture: (1) Is the chart of accounts properly structured? (2) Are journal entries following double-entry bookkeeping correctly? (3) Is trial balance generation correct? (4) Are financial reports (P&L, Balance Sheet, Cash Flow) correctly pulling data? (5) Is VAT/tax handling compliant with Qatar regulations? (6) Is currency handling consistent (QAR)? (7) Are there calculated fields with precision issues? Review CoA structure, JE line balancing logic, report generation code, VAT calculation code, and currency conversion code. Produce a structured assessment summary.
- `financial-system-mapping` group=0 deps=none: Map the ENTIRE financial system structure. Scan src/pages, src/components, src/hooks, src/routes, src/integrations for all financial-related files. Catalog every file related to: invoices, payments, journal entries, chart of accounts, general ledger, financial reports, expense management, revenue tracking, customer billing, vendor payments, payroll, tax/VAT, currency handling, financial dashboards. For each file, note its purpose, what financial entity it manages, and key functions/exports. Produce a structured summary of the financial system map.
- `integration-tracing` group=0 deps=none: Trace integration points between the financial system and EVERY other module. For each module (fleet/vehicles, customers, drivers, bookings, contracts, inventory/parts, reports/analytics, admin/settings), identify: what financial data flows between them, how it flows (direct query, hook, shared state, API), whether the integration is complete or has gaps, orphaned records (payments without invoices, journal entries without source documents), and foreign key integrity issues. Produce a structured integration matrix and data flow summary.
- `known-issues-verification` group=0 deps=none: Verify the known issues from project memory: (1) 43 payments unlinked blocked by prevent_overpayment_trigger, (2) A=L+E off by 2,142,986 QAR (Revenue not closed to Equity), (3) empty=0, zero=0, drafts=2, invoices=0, (4) migration 20260701000006 created with trigger-bypass RPC but unapplied, (5) column traps in payments, journal_entry_lines, chart_of_accounts. Search for the migration files, trigger definitions, closing entry scripts, and any related code. Confirm or refute each issue with evidence from the codebase. Produce a structured verification summary.
- `supabase-query-audit` group=0 deps=none: Audit all Supabase queries and type definitions related to financial tables. Parse src/integrations/supabase/types.ts for financial table schemas (payments, invoices, journal_entries, journal_entry_lines, chart_of_accounts, expenses, etc.). Scan all source files for .from() calls targeting financial tables. Document: table schemas, column names, which files query which tables, what filters/selects are used. Check for the known column traps: payments(status→payment_status, recorded_by→created_by, reconciled→reconciliation_status), journal_entry_lines(entry_id→journal_entry_id, account_code→account_id, company_id→none), chart_of_accounts(level→account_level, parent_code→parent_account_code). Produce a structured findings summary.
- `compile-audit-report` group=1 deps=financial-system-mapping, supabase-query-audit, integration-tracing, known-issues-verification, architecture-assessment: Compile all analysis findings into the final comprehensive markdown report at C:\Users\khamis\Documents\fleetifyapp\FINANCIAL_SYSTEM_AUDIT_REPORT.md. The report MUST be in Arabic with technical terms in English where appropriate. Include: Executive summary, Complete financial system map, Integration matrix (module × financial area), ASCII data flow diagrams, Issue register (categorized by severity: critical/high/medium/low), Compliance assessment, Risk assessment, Prioritized recommendations (no code changes). Synthesize findings from all 5 analysis tasks into a coherent, well-structured document.
