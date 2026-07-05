# Plan: READ-ONLY AUDIT MODE: Do not modify source code, do not run self-healing, and only create the requested report artifact if a deliverable file is required.

راجع النظام المالي وتكامله مع بقية الوحدات وقدم لي تقرير كامل بدون تغير الكود فقط تقرير عن تكامل النظام المالي

قم بتحليل شامل للنظام المالي في هذا المشروع وتكامله مع جميع الوحدات الأخرى. افحص:
1. جميع ملفات قاعدة البيانات (migrations, schema)
2. جميع ملفات النظام المالي (finance-related code)
3. تكامل النظام المالي مع الوحدات الأخرى (المبيعات، المشتريات، المخزون، الموارد البشرية، العملاء، الموردين، إلخ)
4. تدفقات البيانات بين النظام المالي والوحدات الأخرى
5. أي مشاكل أو ثغرات في التكامل
6. نقاط القوة والضعف في التصميم الحالي

قدم تقريراً مفصلاً باللغة العربية مع الإشارة إلى مسارات الملفات وأرقام الأسطر عند الاقتضاء. لا تقم بتغيير أي كود.

## Reasoning
The task is a read-only audit of the financial system and its integration with other modules. We decompose into 6 subtasks: (1) discover all finance-related files, (2) analyze database schema, (3) analyze finance business logic code, (4) analyze integration with other modules, (5) identify issues and strengths, and (6) assemble the final report in Arabic. Each subtask is independently executable and verifiable, with dependencies arranged in parallel groups. The last subtask is the assembly that collects all findings and writes the report.

## Risk Level
low

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: discover-finance-files
- Acceptance criteria:
  - A file 'finance-files-list.txt' is created containing paths and descriptions of all finance-related files.

### Parallel group 2
- Subtasks: analyze-db-schema, analyze-finance-code
- Acceptance criteria:
  - A file 'finance-schema-analysis.md' is created with a complete description of finance tables, columns, and relationships.
  - A file 'finance-code-analysis.md' is created with a summary of each script's purpose, logic, and data flows.

### Parallel group 3
- Subtasks: analyze-integration
- Acceptance criteria:
  - A file 'finance-integration-analysis.md' is created listing all integration points between finance and other modules, with file paths and line numbers.

### Parallel group 4
- Subtasks: identify-issues-strengths
- Acceptance criteria:
  - A file 'finance-issues-strengths.md' is created with a bullet list of issues, gaps, and strengths, each with supporting evidence.

### Parallel group 5
- Subtasks: assembly
- Acceptance criteria:
  - Final deliverable file 'scripts/finance-integration-report.md' is written in Arabic and contains all findings from prior subtasks.

## DAG
- `discover-finance-files` group=0 deps=none: Search the entire project for files related to the financial system: database migrations, schema definitions, finance-related scripts (e.g., analyze_je_structure, apply_fixes, apply_migration), and any TypeScript files that reference finance tables or functions. Produce a list of file paths with brief descriptions.
- `analyze-db-schema` group=1 deps=discover-finance-files: Analyze the database schema from 'src/integrations/supabase/types.ts' and any SQL migration files. Identify all finance-related tables (e.g., chart_of_accounts, journal_entries, journal_entry_lines, payments, etc.), their columns, data types, and foreign key relationships. Document the schema in a structured format.
- `analyze-finance-code` group=1 deps=discover-finance-files: Analyze the finance-related Python scripts (e.g., analyze_je_structure.py, apply_fixes.py, apply_migration.py, apply_migration_psql.py, apply_migration_psycopg.py, apply_migration_v2.py, audit_analysis.py, etc.) to understand the business logic, data flows, and any validation or transformation rules. Summarize the purpose and key operations of each script.
- `analyze-integration` group=2 deps=analyze-db-schema, analyze-finance-code: Examine all TypeScript source files (excluding test files) to find how the financial system integrates with other modules: sales, purchases, inventory, HR, customers, suppliers, etc. Look for imports, function calls, and data references that connect finance tables or functions to other parts of the application. Document each integration point, the direction of data flow, and any potential coupling issues.
- `identify-issues-strengths` group=3 deps=analyze-integration: Based on the schema, code, and integration analyses, compile a list of issues, gaps, and strengths in the current financial system design. Issues may include missing foreign keys, inconsistent column naming, lack of validation, tight coupling, or missing audit trails. Strengths may include well-structured migrations, clear separation of concerns, or comprehensive audit scripts. Provide specific file references and line numbers where applicable.
- `assembly` group=4 deps=discover-finance-files, analyze-db-schema, analyze-finance-code, analyze-integration, identify-issues-strengths: Collect all findings from the previous subtasks (finance-files-list.txt, finance-schema-analysis.md, finance-code-analysis.md, finance-integration-analysis.md, finance-issues-strengths.md) and produce a comprehensive final report in Arabic. The report should cover: 1) overview of the financial system, 2) database schema, 3) business logic, 4) integration with other modules, 5) issues and gaps, 6) strengths, and 7) recommendations. Write the report to 'scripts/finance-integration-report.md'.
