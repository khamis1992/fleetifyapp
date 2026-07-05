# Plan: راجع النظام المالي وتكامله مع بقية الوحدات في مشروع Fleetify ERP وقدم تقرير كامل بدون تغيير أي كود. 

المشروع موجود في: C:\Users\khamis\Documents\fleetifyapp

المطلوب:
1. فحص جميع جداول النظام المالي (chart_of_accounts, journal_entries, journal_entry_lines, invoices, payments, accounting_periods, fixed_assets, cost_centers, budgets, audit_logs)
2. فحص جميع هوكات التكامل المحاسبي (6 هوكات): payroll, vehicle_installment, rental_payment, traffic_violation, maintenance, payments
3. فحص طبقات الخدمة: AccountingService, PaymentService, PaymentStateMachine, PaymentLinkingService, InvoiceService, ContractService, financialControls, auditService
4. فحص الضوابط الداخلية: صلاحيات، موافقات، سجل تدقيق، التحكم بالفترات المالية
5. فحص التقارير المالية ولوحات المعلومات
6. فحص التكامل مع الوحدات الأخرى: العقود، الموظفين، المركبات، الصيانة، المخالفات
7. فحص قواعد البيانات (migrations) والـ triggers

المخرجات:
- تقرير مفصل باللغة العربية في ملف docs/financial-system-integration-audit-report.md
- يجب أن يشمل التقرير: ملخص تنفيذي، تحليل كل وحدة، خريطة تكامل، نتائج حسب الخطورة، توصيات
- كل نتيجة يجب أن تحتوي على مرجع ملف:سطر محدد
- لا تغيير في أي كود - فقط تقرير

ملاحظة مهمة: لا تثق في تقارير الـ subagents الذاتية - تحقق من كل ملف بنفسك واقرأ الملفات مباشرة للتأكد من صحة المعلومات.

## Reasoning
The task is to audit the financial system and its integration across the Fleetify ERP project, producing a detailed Arabic report. We decompose into 7 parallel analysis subtasks covering: financial tables, integration hooks, service layers, internal controls, reports/dashboards, cross-module integrations, and database migrations/triggers. Each subtask reads relevant files directly and writes findings to a temporary JSON file. The final assembly subtask depends on all others and compiles the final report. This ensures independent verification and no code changes.

## Risk Level
medium

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: audit-cross-module-integrations, audit-database-migrations-triggers, audit-financial-tables, audit-integration-hooks, audit-internal-controls, audit-reports-dashboards, audit-service-layers
- Acceptance criteria:
  - A JSON file scripts/audit-part-integrations.json exists with an integration map and analysis.
  - A JSON file scripts/audit-part-migrations.json exists with a list of migrations/triggers and analysis.
  - A JSON file scripts/audit-part-financial-tables.json exists with a list of each table, its columns, relationships, and any issues found.
  - A JSON file scripts/audit-part-hooks.json exists with a description of each hook, its trigger, and analysis.
  - A JSON file scripts/audit-part-controls.json exists with a list of controls and their analysis.
  - A JSON file scripts/audit-part-reports.json exists with a list of reports/dashboards and analysis.
  - A JSON file scripts/audit-part-services.json exists with analysis of each service.

### Parallel group 2
- Subtasks: assembly
- Acceptance criteria:
  - Final deliverable file docs/financial-system-integration-audit-report.md is written and contains all findings from prior subtasks.

## DAG
- `audit-cross-module-integrations` group=0 deps=none: Analyze integration of financial system with other modules: contracts, employees, vehicles, maintenance, violations. Read service files, hooks, and any cross-module code. Map data flow and dependencies between financial and non-financial modules. Write findings to scripts/audit-part-integrations.json.
- `audit-database-migrations-triggers` group=0 deps=none: Read all migration files in supabase/migrations/ and any database triggers that affect financial tables. List each migration and trigger, its purpose, and any issues (e.g., missing triggers, incorrect logic). Write findings to scripts/audit-part-migrations.json.
- `audit-financial-tables` group=0 deps=none: Analyze all financial tables (chart_of_accounts, journal_entries, journal_entry_lines, invoices, payments, accounting_periods, fixed_assets, cost_centers, budgets, audit_logs). Read schema definitions from supabase/migrations/*.sql and src/integrations/supabase/types.ts. Also read any Python scripts in scripts/ that reference these tables. For each table, list columns, relationships, and any issues (missing fields, wrong types, missing indexes). Write findings to scripts/audit-part-financial-tables.json.
- `audit-integration-hooks` group=0 deps=none: Find and analyze all 6 integration hooks: payroll, vehicle_installment, rental_payment, traffic_violation, maintenance, payments. Search for these hooks in supabase/functions/ (edge functions) and supabase/migrations/*.sql (database functions). Read each hook's code and describe its trigger, logic, and correctness. Write findings to scripts/audit-part-hooks.json.
- `audit-internal-controls` group=0 deps=none: Examine internal controls: permissions (RLS policies in supabase/migrations/), approval workflows (look for approval logic in src/), audit trail (audit_logs table usage), and period control (accounting_periods enforcement). Read relevant files and document the controls, their implementation, and any gaps. Write findings to scripts/audit-part-controls.json.
- `audit-reports-dashboards` group=0 deps=none: Find and analyze financial reports and dashboards. Search for report generation code (e.g., in scripts/ or src/), dashboard components (likely in src/), and any API endpoints serving financial data. Document each report/dashboard, its data sources, and completeness. Write findings to scripts/audit-part-reports.json.
- `audit-service-layers` group=0 deps=none: Analyze service layers: AccountingService, PaymentService, PaymentStateMachine, PaymentLinkingService, InvoiceService, ContractService, financialControls, auditService. Search for these in src/ directory (likely .ts files). Read each service file and document its responsibilities, methods, and integration points with other services. Write findings to scripts/audit-part-services.json.
- `assembly` group=1 deps=audit-financial-tables, audit-integration-hooks, audit-service-layers, audit-internal-controls, audit-reports-dashboards, audit-cross-module-integrations, audit-database-migrations-triggers: Collect all findings from the 7 audit part files (scripts/audit-part-*.json). Compile them into a comprehensive Arabic report in docs/financial-system-integration-audit-report.md. The report must include: executive summary, analysis of each module, integration map, results by severity, and recommendations. Each finding must reference specific file:line. Do not change any code. Write the final report file.
