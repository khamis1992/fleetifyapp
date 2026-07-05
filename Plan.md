# Plan: READ-ONLY AUDIT MODE: Do not modify source code, do not run self-healing, and only create the requested report artifact if a deliverable file is required.

راجع النظام المالي وتكامله مع بقية الوحدات وقدم لي تقرير كامل بدون تغير الكود فقط تقرير عن تكامل النظام

قم بمراجعة شاملة للنظام المالي في مشروع Fleetify (أو Nutrio) وتكامله مع جميع الوحدات الأخرى. قدم تقريراً كاملاً باللغة العربية يغطي:

1. **هيكل النظام المالي**: الجداول، العلاقات، المفاتيح الخارجية
2. **تكامل النظام المالي مع الوحدات الأخرى**: 
   - المبيعات/الفواتير
   - المشتريات
   - المخزون
   - الموارد البشرية/الرواتب
   - العملاء
   - الموردين
3. **سير العمل المالي**: من إنشاء المعاملة إلى الترحيل إلى دفتر الأستاذ
4. **القيود والمشاكل**: أي مشاكل في التكامل، انقطاع في سير العمل، تناقضات
5. **تقييم عام**: نقاط القوة والضعف في التكامل المالي

هام: لا تقم بتغيير أي كود. هذا تقرير فقط. استخدم read_only=true.

ابحث عن المشروع في C:\Users\khamis\Documents\fleetify أو C:\Users\khamis\Documents\nutrio\

## Reasoning
The task is a read-only audit of the financial system integration in the Fleetify/Nutrio project. We need to produce a comprehensive report in Arabic without modifying any code. The decomposition breaks the audit into 7 parallel analysis subtasks covering schema, integration with sales, purchases, inventory, HR, customers/suppliers, and workflow. Each subtask reads relevant source files and produces findings. The final subtask assembles all findings into the report. This structure maximizes parallelism and ensures each subtask is independently verifiable.

## Risk Level
low

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: analyze-customers-suppliers-integration, analyze-financial-schema, analyze-hr-payroll-integration, analyze-inventory-integration, analyze-purchases-integration, analyze-sales-integration, analyze-workflow-ledger-posting
- Acceptance criteria:
  - A description of how customer and supplier records are linked to financial accounts, including any issues.
  - A structured list of financial tables with columns, foreign keys, and relationships is produced. All tables mentioned in the audit script are covered.
  - A description of how HR/payroll transactions are linked to financial records, including tables used and any issues.
  - A description of how inventory transactions are linked to financial records, including tables used and any issues.
  - A description of how purchase transactions are linked to financial records, including tables used and any issues.
  - A description of how sales transactions are linked to financial records, including which tables are used and any issues found.
  - A description of the end-to-end financial workflow, including key functions, tables involved, and any gaps or inconsistencies.

### Parallel group 2
- Subtasks: assembly
- Acceptance criteria:
  - Final deliverable file is written and contains all findings from prior subtasks in Arabic, covering all required sections.

## DAG
- `analyze-customers-suppliers-integration` group=0 deps=none: Examine source files under src/features/customers/ and src/features/suppliers/ to find how customer and supplier master data links to financial accounts (e.g., default receivable/payable accounts). Look for foreign keys or account code references.
- `analyze-financial-schema` group=0 deps=none: Read types.ts and migration files to identify all financial tables (e.g., payments, journal_entry_lines, chart_of_accounts, etc.), their columns, foreign keys, and relationships. List each table with its columns and note any known corrections from the audit script.
- `analyze-hr-payroll-integration` group=0 deps=none: Examine source files under src/features/hr/ or src/features/payroll/ to find how payroll/salary expenses are recorded in the financial system. Look for journal entries or direct writes to financial tables.
- `analyze-inventory-integration` group=0 deps=none: Examine source files under src/features/inventory/ to find how inventory movements (stock adjustments, transfers) affect financial accounts (COGS, inventory valuation). Look for journal entry creation or direct table writes.
- `analyze-purchases-integration` group=0 deps=none: Examine source files under src/features/purchases/ to find how purchase transactions create financial entries (accounts payable, inventory). Look for references to financial tables and note the flow.
- `analyze-sales-integration` group=0 deps=none: Examine all source files under src/features/sales/ (or similar) to find how sales/invoice transactions create financial entries (e.g., accounts receivable, revenue). Look for calls to financial tables (payments, journal_entry_lines) and note the flow.
- `analyze-workflow-ledger-posting` group=0 deps=none: Examine source files under src/features/finance/ or src/features/accounting/ to understand the workflow from transaction creation (e.g., invoice, payment) to journal entry creation and posting to the general ledger. Look for functions that create journal entries, post to ledger, and any validation logic.
- `assembly` group=1 deps=analyze-financial-schema, analyze-sales-integration, analyze-purchases-integration, analyze-inventory-integration, analyze-hr-payroll-integration, analyze-customers-suppliers-integration, analyze-workflow-ledger-posting: Collect all findings from the previous 7 subtasks and compile a comprehensive report in Arabic covering: 1) financial system structure, 2) integration with each module, 3) workflow, 4) issues/constraints, 5) overall assessment. Write the report to a file named financial-integration-audit-report.md in the project root.
