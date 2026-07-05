# Plan: راجع النظام المالي وتكامله مع بقية الوحدات في مشروع Fleetify وقدم تقرير كامل بدون تغيير الكود. 

المشروع موجود في: C:\Users\khamis\Documents\fleetifyapp

المطلوب:
1. قراءة جميع ملفات الترحيل (migrations) المالية في supabase/migrations/
2. قراءة جميع hooks التكامل المالي (use*JournalIntegration.ts) في src/hooks/
3. قراءة أنواع البيانات المالية (finance.types.ts, payment.ts, invoice.ts)
4. قراءة ملفات التقارير المالية (ledgerCashFlowReportRules.ts)
5. قراءة ملفات الضوابط المالية (financeAccessRules.ts)
6. بناء مصفوفة المشغلات (Trigger Matrix) لكل trigger في قاعدة البيانات
7. تحليل تسلسل عمليات كل hook ومقارنتها مع المشغلات
8. تحليل المنطق المحاسبي لكل وحدة (الإيجارات، الصيانة، المخالفات، الرواتب، أقساط المركبات)
9. تحليل التقارير المالية (هل تسحب بيانات حقيقية أم mock data)
10. تحليل الضوابط الداخلية (فصل المهام، الموافقات، سجل التدقيق)
11. تحليل العملة (هل تدعم عملات متعددة أم KWD فقط)
12. تحليل خريطة التكامل بين الوحدات
13. تقييم المخاطر

المخرجات: تقرير كامل باللغة العربية مع تفاصيل file:line لكل finding. لا تغيير في الكود.

## Reasoning
The task is to review the financial system and its integration across modules in the Fleetify project, producing a full Arabic report without code changes. I decomposed into 6 subtasks: (1) analyze migration files for trigger matrix and schema, (2) analyze hooks for integration logic, (3) analyze types, report rules, and access rules for data model and controls, (4) analyze accounting logic per module by reading relevant source files, (5) analyze currency, integration map, and risk assessment (depends on 1-4), and (6) assembly to write the final report. Each subtask produces structured findings that the assembly subtask combines. This keeps subtasks independently executable and verifiable, with clear dependencies.

## Risk Level
medium

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: analyze-accounting-logic, analyze-migrations, analyze-types-and-controls
- Acceptance criteria:
  - A JSON file 'findings_accounting_logic.json' is created with per-module accounting logic analysis.
  - A JSON file 'findings_migrations.json' is created containing trigger matrix and schema analysis with file:line for each finding.
  - A JSON file 'findings_types_controls.json' is created with data model, report analysis, and control findings.

### Parallel group 2
- Subtasks: analyze-hooks
- Acceptance criteria:
  - A JSON file 'findings_hooks.json' is created with hook analysis and comparison to triggers.

### Parallel group 3
- Subtasks: analyze-currency-integration-risk
- Acceptance criteria:
  - A JSON file 'findings_currency_integration_risk.json' is created with currency analysis, integration map, and risk assessment.

### Parallel group 4
- Subtasks: assembly
- Acceptance criteria:
  - Final report file 'reports/financial_system_review_arabic.md' is written and contains all findings from prior subtasks in Arabic.

## DAG
- `analyze-accounting-logic` group=0 deps=none: Read source files that implement accounting logic for each module: rentals (e.g., scripts/analyze_company_jes.py, scripts/analyze_je_structure.py), maintenance (e.g., scripts/apply_fixes.py), violations (e.g., scripts/audit_analysis.py), salaries (e.g., scripts/apply_migration.py), vehicle installments (e.g., scripts/apply_migration_v2.py). For each module, document the journal entry creation logic, double-entry rules, and integration points. Output findings as a JSON file.
- `analyze-migrations` group=0 deps=none: Read all migration files in supabase/migrations/ that are related to finance (e.g., contain 'finance', 'payment', 'invoice', 'journal', 'ledger'). For each, extract trigger definitions, table schemas, and function logic. Build a trigger matrix (table, event, function, timing). Output findings as a JSON file with file:line references.
- `analyze-types-and-controls` group=0 deps=none: Read finance.types.ts, payment.ts, invoice.ts, ledgerCashFlowReportRules.ts, and financeAccessRules.ts. Document data structures, report logic (whether real data or mock), and internal controls (segregation of duties, approvals, audit trail). Output findings as a JSON file.
- `analyze-hooks` group=1 deps=analyze-migrations: Read all hook files in src/hooks/ matching the pattern use*JournalIntegration.ts. For each hook, document the sequence of operations (API calls, state updates, side effects) and compare with the trigger matrix from subtask 1. Identify gaps or inconsistencies. Output findings as a JSON file.
- `analyze-currency-integration-risk` group=2 deps=analyze-migrations, analyze-hooks, analyze-types-and-controls, analyze-accounting-logic: Based on findings from subtasks 1-4, analyze: (a) currency support – search for 'KWD', 'QAR', 'currency' in all source files to determine if multi-currency is supported; (b) integration map – document how each module connects to the financial system (direct DB, hooks, triggers); (c) risk assessment – identify risks like missing audit trails, lack of segregation, hardcoded values, error handling gaps. Output findings as a JSON file.
- `assembly` group=3 deps=analyze-migrations, analyze-hooks, analyze-types-and-controls, analyze-accounting-logic, analyze-currency-integration-risk: Collect all findings JSON files from subtasks 1-5. Combine them into a single comprehensive report in Arabic. The report must include: trigger matrix, hook analysis, data model, report analysis, controls, accounting logic per module, currency support, integration map, and risk assessment. Write the final report to 'reports/financial_system_review_arabic.md'. Ensure all file:line references are preserved.
