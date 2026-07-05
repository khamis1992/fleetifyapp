# Plan: READ-ONLY AUDIT MODE: Do not modify source code, do not run self-healing, and only create the requested report artifact if a deliverable file is required.

راجع النظام المالي وتكامله مع بقية الوحدات وقدم لي تقرير كامل بدون تغير الكود فقط تقرير عن تكامل النظام

This is a comprehensive financial system integration audit. The user wants a full report on how the financial system integrates with other modules in the project. DO NOT modify any code - this is read-only audit/report only.

Based on memory context, the project is likely Fleetify (a law firm management system in Qatar). The project root should be determined from the current context. If the project is Fleetify, it's likely at a path like C:\Users\khamis\Documents\fleetify\ or similar.

First, determine the correct project path by checking common locations. Then perform a thorough audit covering:
1. Database schema and migration analysis (all financial tables, triggers, functions)
2. Integration points with other modules (HR, CRM, Inventory, Projects, etc.)
3. API layer analysis (REST endpoints, RPCs)
4. Frontend components and their integration
5. Data flow analysis
6. Security and access control
7. Issues and recommendations

Use the CFO financial system audit methodology covering 12 domains:
- Double-Entry Integrity
- Chart of Accounts
- GL Reconciliation
- Trial Balance
- AP/AR Aging
- Revenue Recognition (ASC 606/IFRS 15)
- Financial Statements
- Internal Controls
- SOX/COSO Compliance
- Financial Reporting
- Cash Flow Management
- Period-End Close

The report should be in Arabic (as the user requested in Arabic) and saved to docs/financial-system-integration-audit-<date>.md

IMPORTANT: Read actual migration files, source code, and configuration - do NOT rely on subagent self-reports. Verify every finding with file:line references.

## Reasoning
The task is a read-only audit of the financial system integration. I decomposed it into 5 parallel analysis subtasks (schema, integration points, API, frontend, dataflow/security) that can run independently, followed by an assembly subtask that compiles all findings into a final Arabic report. Each subtask is assigned to a 'builder' agent since it involves analysis and file reading. The plan respects the maximum of 8 subtasks and ensures the final deliverable is written.

## Risk Level
low

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: api-layer, dataflow-security, frontend-components, integration-points, schema-analysis
- Acceptance criteria:
  - A list of all financial API endpoints (REST and RPC) with their HTTP method, path, parameters, and file:line references.
  - A description of the data flow for key financial operations (e.g., payment creation, journal entry posting) and a list of security controls (RLS policies, authentication checks) with file:line references.
  - A list of all financial frontend components with file paths and a short description of their role in the financial system.
  - A list of files and line numbers where financial tables are referenced from other modules, with the module name and context. File:line references.
  - A list of all financial tables with their columns, data types, and any triggers/functions found in migrations and types.ts. File:line references for each finding.

### Parallel group 2
- Subtasks: assembly
- Acceptance criteria:
  - Final deliverable file is written at docs/financial-system-integration-audit-<current-date>.md and contains all findings from prior subtasks with file:line references, organized by the 12 audit domains, in Arabic.

## DAG
- `api-layer` group=0 deps=none: Analyze API layer: find all Supabase RPCs, REST endpoints, and API route definitions related to finance. Look in supabase/functions/, any API route files, and the audit scripts. List each endpoint with method, parameters, and purpose.
- `dataflow-security` group=0 deps=none: Analyze data flow and security: examine how financial data flows through the system (from frontend to database and back), access controls (Row Level Security policies, authentication checks), and any security measures specific to financial data. Look at RLS policies in migrations, middleware, and audit scripts.
- `frontend-components` group=0 deps=none: Analyze frontend components related to finance: find all React components in src/components/ and src/pages/ that deal with financial data (payments, invoices, journal entries, chart of accounts, etc.). List each component with its file path and a brief description of its financial functionality.
- `integration-points` group=0 deps=none: Analyze integration points with other modules: scan all .ts, .tsx, .py files in src/ and scripts/ for references to financial tables (payments, journal_entry_lines, chart_of_accounts, invoices, etc.) from non-financial modules (HR, CRM, Inventory, Projects, etc.). Identify cross-module data flows.
- `schema-analysis` group=0 deps=none: Analyze database schema and migrations: find all migration files (supabase/migrations/), extract financial tables (payments, journal_entry_lines, chart_of_accounts, etc.), triggers, functions, and column definitions from types.ts and migration SQL files. List all financial tables with columns and constraints.
- `assembly` group=1 deps=schema-analysis, integration-points, api-layer, frontend-components, dataflow-security: Compile all findings from the five analysis subtasks into a comprehensive financial system integration audit report in Arabic. The report should follow the CFO audit methodology covering 12 domains. Save the report to docs/financial-system-integration-audit-<current-date>.md. Include file:line references for every finding.
