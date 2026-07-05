# Plan: راجع النظام المالي وتكامله مع بقية الوحدات وقدم لي تقرير كامل بدون تغير الكود فقط تقرير عن تكامل النظام. 

المشروع: Fleetify ERP (نظام تأجير سيارات) في C:/Users/khamis/Documents/fleetifyapp

المطلوب:
1. تدقيق شامل للنظام المالي وتكامله مع جميع الوحدات الأخرى (العقود، الأسطول، الموارد البشرية، المخزون، القانونية، الممتلكات، المدفوعات)
2. استخدام منهجية financial-system-audit-verification:
   - قراءة جميع ملفات migrations في supabase/migrations/
   - بناء مصفوفة triggers كاملة
   - تتبع تسلسل عمليات كل hook مالي
   - تقاطع كل عملية مع كل trigger
   - التحقق من صحة المنطق المحاسبي
3. تغطية جميع نطاقات CFO financial system audit الـ 13
4. كل نتيجة يجب أن تكون موثقة بـ file:line
5. لا تغير أي كود - تقرير فقط
6. التقرير النهائي يحفظ في docs/financial-system-integration-audit-report.md

استخدم المنهجية الكاملة: اقرأ كل migration، ابنِ مصفوفة triggers، تتبع hooks، تحقق من التقارير المالية، افحص العملات، اكشف البيانات الوهمية، وتحقق من آليات الموافقات والضوابط.

## Reasoning
The audit requires a systematic approach: first gather database schema and triggers from migrations, then inventory application-level financial hooks, then cross-reference for integration gaps, then perform domain-specific audits covering all 13 CFO areas, and finally assemble the report. We decompose into 8 subtasks: 2 foundational (migrations & hooks), 1 cross-reference, 4 domain audits (revenue, expenses, HR/cash, controls/reporting), and 1 assembly. This ensures parallelism where possible and comprehensive coverage.

## Risk Level
medium

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: inventory-financial-hooks, parse-migrations-triggers
- Acceptance criteria:
  - Complete inventory of financial hooks with file:line, table affected, operation type, and sequence of steps. No source file with financial logic is missed.
  - Triggers matrix JSON or structured list is produced with all triggers, their tables, events, and logic summaries. No migration file is skipped.

### Parallel group 2
- Subtasks: audit-controls-reporting, audit-expense-cycle, audit-hr-cash, audit-revenue-cycle, cross-reference-triggers-hooks
- Acceptance criteria:
  - Findings documented with file:line for controls, approvals, reporting, and audit trail. All 13 CFO domains are addressed across all subtasks.
  - Findings documented with file:line for expense-related hooks, triggers, and logic. All expense types (direct, inventory, asset) are covered.
  - Findings documented with file:line for HR/payroll and cash management hooks, triggers, and logic. Payroll cycles and bank reconciliation steps are verified.
  - Findings documented with file:line for revenue-related hooks, triggers, and logic. All revenue recognition scenarios (rental, lease, one-time) are covered.
  - List of all integration gaps with file:line references, categorized by severity. Each gap is explained with the hook and trigger involved.

### Parallel group 3
- Subtasks: assembly
- Acceptance criteria:
  - Final deliverable file is written and contains all findings from prior subtasks

## DAG
- `inventory-financial-hooks` group=0 deps=none: Scan all application source files (src/**/*.ts, src/**/*.tsx) to identify every financial hook: functions that create, update, or delete records in financial tables (journal_entries, journal_entry_lines, payments, invoices, chart_of_accounts, etc.). For each hook, trace its sequence of operations and document file:line references.
- `parse-migrations-triggers` group=0 deps=none: Parse all SQL migration files in supabase/migrations/ to extract table schemas, triggers, functions, and build a comprehensive triggers matrix. Document every trigger, its event, table, and logic.
- `audit-controls-reporting` group=1 deps=parse-migrations-triggers, inventory-financial-hooks: Audit internal controls, approval mechanisms, financial reporting, and audit trail. Verify segregation of duties, approval workflows, financial statement generation, and completeness of audit logs.
- `audit-expense-cycle` group=1 deps=parse-migrations-triggers, inventory-financial-hooks: Audit the expense cycle integration: purchases, accounts payable, inventory, and fixed assets. Verify expense recognition, asset capitalization, depreciation triggers, and inventory valuation.
- `audit-hr-cash` group=1 deps=parse-migrations-triggers, inventory-financial-hooks: Audit HR/payroll integration and cash management: payroll journal entries, employee advances, bank reconciliation, and cash flow triggers. Verify payroll accounting, cash controls, and reconciliation logic.
- `audit-revenue-cycle` group=1 deps=parse-migrations-triggers, inventory-financial-hooks: Audit the revenue cycle integration: contracts → invoices → journal entries → payments. Cover revenue recognition, accounts receivable, contract billing, and payment allocation. Verify accounting logic, currency handling, and dummy data detection.
- `cross-reference-triggers-hooks` group=1 deps=parse-migrations-triggers, inventory-financial-hooks: Cross-reference the triggers matrix with the hooks inventory to detect integration gaps: missing triggers, conflicting operations, double-entry violations, and data integrity risks. Every hook operation is checked against relevant triggers.
- `assembly` group=2 deps=parse-migrations-triggers, inventory-financial-hooks, cross-reference-triggers-hooks, audit-revenue-cycle, audit-expense-cycle, audit-hr-cash, audit-controls-reporting: Collect all findings from prior subtasks, synthesize into a comprehensive financial system integration audit report, and write the final markdown file at docs/financial-system-integration-audit-report.md. Ensure every finding is documented with file:line, categorized by domain, and includes an executive summary.
