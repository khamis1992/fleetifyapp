# Plan: READ-ONLY AUDIT MODE: Do not modify source code, do not run self-healing, and only create the requested report artifact if a deliverable file is required.

READ-ONLY FINANCIAL SYSTEM INTEGRATION AUDIT

قم بمراجعة شاملة للنظام المالي في مشروع Fleetify الموجود في C:\Users\khamis\Documents\fleetify\fleetify-erp وتكامله مع بقية الوحدات.

المطلوب:
1. اقرأ جميع ملفات الميغراشن (SQL migration files) المتعلقة بالنظام المالي
2. اقرأ ملفات الخدمات (services) والهوك (hooks) والكمبوننت (components) المالية
3. حلل تكامل النظام المالي مع: المخزون، المبيعات، المشتريات، الموارد البشرية
4. حدد نقاط الضعف في التكامل (triggers, foreign keys, data flow)
5. اكتب تقريراً كاملاً باللغة العربية في ملف C:\Users\khamis\Documents\fleetify\docs\financial-integration-audit-2026-07-05.md

التقرير يجب أن يشمل:
- ملخص تنفيذي
- منهجية المراجعة
- تحليل قاعدة البيانات والعلاقات
- تحليل تدفق البيانات بين الوحدات
- نقاط القوة
- نقاط الضعف والمخاطر (حرج، عالي، متوسط، منخفض)
- توصيات للتحسين
- قائمة بجميع الملفات التي تمت مراجعتها

هام جداً: لا تقم بتعديل أي كود. فقط تقرير وتحليل.

## Reasoning
The task is a read-only audit of the financial system integration. We decompose into: (1) discover all financial-related files, (2-4) analyze migrations, services, hooks/components separately, (5) analyze cross-module integration, (6) identify weaknesses, (7) assembly writes the final report. Dependencies flow from discovery to analysis to integration to weaknesses to report. Parallel groups allow independent file analysis after discovery.

## Risk Level
low

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: discover-financial-files
- Acceptance criteria:
  - A file list is produced (e.g., financial_files.json) containing all discovered financial-related files with their relative paths and categories.

### Parallel group 2
- Subtasks: analyze-hooks-components, analyze-migrations, analyze-services
- Acceptance criteria:
  - A summary (hooks_components_analysis.md) describing each hook/component, its data dependencies, and cross-module interactions.
  - A structured summary (e.g., migration_analysis.md) containing table definitions, foreign keys, triggers, and cross-module references found in migrations.
  - A summary (services_analysis.md) describing each service's purpose, key functions, data flow, and integration points with other modules.

### Parallel group 3
- Subtasks: analyze-cross-module-integration
- Acceptance criteria:
  - A document (cross_module_integration.md) with a diagram or table showing how financial data flows to/from each other module, including specific tables, keys, and code references.

### Parallel group 4
- Subtasks: identify-weaknesses
- Acceptance criteria:
  - A list of weaknesses with severity ratings, descriptions, and suggested improvements (without modifying code).

### Parallel group 5
- Subtasks: assembly
- Acceptance criteria:
  - Final deliverable file is written and contains all findings from prior subtasks, formatted as specified.

## DAG
- `discover-financial-files` group=0 deps=none: Scan the project directory C:\Users\khamis\Documents\fleetify\fleetify-erp to find all files related to the financial system: SQL migration files (in migrations/ or similar), service files (services/), hooks (hooks/), and components (components/). Use grep or find to locate files containing keywords like 'financial', 'account', 'journal', 'ledger', 'payment', 'invoice', 'chart_of_accounts', etc. Output a list of file paths with their categories (migration, service, hook, component).
- `analyze-hooks-components` group=1 deps=discover-financial-files: Read all hooks and components related to the financial system (e.g., useFinancialData.ts, FinancialDashboard.tsx, InvoiceForm.tsx). Identify how the frontend interacts with the financial backend, what data is fetched, and how it is displayed. Note any integration with other module components (e.g., linking invoices to inventory items).
- `analyze-migrations` group=1 deps=discover-financial-files: Read all SQL migration files identified in the previous subtask. Extract table schemas, foreign key constraints, triggers, and any financial-specific logic. Document the database structure for financial tables (e.g., chart_of_accounts, journal_entries, payments, invoices). Note any relationships to inventory, sales, purchases, or HR tables.
- `analyze-services` group=1 deps=discover-financial-files: Read all service files related to the financial system (e.g., financialService.ts, paymentService.ts, invoiceService.ts). Identify data flow: which functions call which tables, how data is transformed, and how the financial module interacts with other modules (inventory, sales, purchases, HR). Note any direct database queries, API calls, or event-driven integrations.
- `analyze-cross-module-integration` group=2 deps=analyze-migrations, analyze-services, analyze-hooks-components: Using the outputs from migration, service, and hooks/components analysis, map the data flow between the financial module and inventory, sales, purchases, and HR modules. Identify foreign key relationships, shared tables, event triggers, and any direct code references. Document the integration points and data dependencies.
- `identify-weaknesses` group=3 deps=analyze-cross-module-integration: Based on the cross-module integration analysis, identify weaknesses and risks in the financial system integration. Categorize by severity (critical, high, medium, low). Look for missing foreign keys, inconsistent data types, lack of triggers for cascading updates/deletes, potential data integrity issues, and any gaps in data flow. Also note any security or performance concerns.
- `assembly` group=4 deps=discover-financial-files, analyze-migrations, analyze-services, analyze-hooks-components, analyze-cross-module-integration, identify-weaknesses: Collect all findings from prior subtasks (discover-financial-files, analyze-migrations, analyze-services, analyze-hooks-components, analyze-cross-module-integration, identify-weaknesses) and write the final comprehensive audit report in Arabic to C:\Users\khamis\Documents\fleetify\docs\financial-integration-audit-2026-07-05.md. The report must include: executive summary, methodology, database analysis, data flow analysis, strengths, weaknesses (with severity), recommendations, and a list of all reviewed files. Ensure the report is well-formatted in Markdown.
