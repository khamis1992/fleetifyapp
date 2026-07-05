# Plan: READ-ONLY AUDIT MODE: Do not modify source code, do not run self-healing, and only create the requested report artifact if a deliverable file is required.

راجع النظام المالي وتكامله مع بقية الوحدات في مشروع Fleetify وقدم تقريراً كاملاً باللغة العربية. لا تقم بتغيير أي كود.

المشروع: Fleetify - نظام إدارة أسطول (ERP)
المسار: C:\Users\khamis\Documents\fleetifyapp

قم بتحليل شامل للنظام المالي وتكامله مع جميع الوحدات الأخرى. افحص بالتفصيل:

1. **ملفات النظام المالي**: ابحث عن جميع الملفات المتعلقة بالنظام المالي - جداول قاعدة البيانات (migrations, schema)، مكونات الواجهة (Finance-related components, pages, hooks)، خدمات API، أنواع TypeScript، وأي سكريبتات Python/SQL.

2. **هيكل قاعدة البيانات المالية**: حلل جميع الجداول المالية (chart_of_accounts, journal_entries, journal_entry_lines, payments, invoices, credit_notes, tax_rates, financial_reports, budgets, fixed_assets, etc.) - الأعمدة، أنواع البيانات، العلاقات (foreign keys)، الفهارس (indexes)، القيود (constraints).

3. **التكامل مع وحدات المبيعات (Sales)**: كيف ترتبط الفواتير والمبيعات بالنظام المالي؟ هل يتم ترحيل قيود اليومية تلقائياً؟ هل هناك تكامل مع نقاط البيع (POS)؟

4. **التكامل مع وحدات المشتريات (Purchases)**: كيف ترتبط أوامر الشراء والفواتير بالمحاسبة؟ هل يتم تسجيل الالتزامات والمصروفات تلقائياً؟

5. **التكامل مع المخزون (Inventory)**: كيف يؤثر المخزون على التكلفة والمحاسبة؟ هل هناك تقييم للمخزون (FIFO, weighted average)؟

6. **التكامل مع الموارد البشرية (HR/Payroll)**: كيف ترتبط الرواتب والأجور بالنظام المالي؟ هل يتم ترحيل قيود الرواتب تلقائياً؟

7. **التكامل مع العملاء والموردين**: كيف ترتبط أرصدة العملاء والموردين بدفتر الأستاذ العام؟

8. **التكامل مع الأسطول (Fleet)**: كيف ترتبط تكاليف المركبات (الوقود، الصيانة، التأمين، الاستهلاك) بالنظام المالي؟

9. **التكامل مع المدفوعات (Payments)**: كيف تتم معالجة المدفوعات والتحصيلات؟ هل هناك تسوية بنكية؟

10. **التقارير المالية**: ما هي التقارير المالية المتاحة (الميزانية، قائمة الدخل، التدفقات النقدية، دفتر الأستاذ، ميزان المراجعة)؟ هل تستخدم بيانات حية أم mock data؟

11. **نقاط القوة**: ما هي نقاط القوة في التصميم الحالي للنظام المالي؟

12. **نقاط الضعف والثغرات**: ما هي المشاكل والثغرات في التكامل؟ (مثل: missing foreign keys, inconsistent naming, lack of validation, tight coupling, missing audit trails, hardcoded values, mock data, dead code, broken references)

13. **توصيات**: توصيات محددة للتحسين مع الإشارة إلى مسارات الملفات وأرقام الأسطر.

قدم التقرير النهائي كملف Markdown في docs/financial-system-integration-audit-2026-07-05.md مع الإشارة الدقيقة إلى مسارات الملفات وأرقام الأسطر.

## Reasoning
The task is a comprehensive read-only audit of the financial system and its integration with other modules in the Fleetify project. To manage complexity and ensure thorough coverage, I decomposed the work into 7 parallel analysis subtasks (each focusing on a specific area: schema, API, sales, purchases, inventory, other integrations, reports) and 1 assembly subtask that collects all findings and writes the final report in Arabic. This structure allows independent execution of each analysis subtask, with the assembly subtask depending on all of them. The analysis subtasks read source files but do not modify them; only the assembly subtask creates the deliverable file.

## Risk Level
low

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: analyze-financial-api, analyze-financial-reports, analyze-financial-schema, analyze-inventory-integration, analyze-other-integrations, analyze-purchases-integration, analyze-sales-integration
- Acceptance criteria:
  - A documented list of API calls to financial tables with file paths and line numbers is produced and available for the assembly subtask.
  - Documented list of financial reports, their data sources, and any issues (mock data, dead code) is produced and available for the assembly subtask.
  - A structured list of all financial tables with columns, types, and relationships is produced (e.g., as a JSON object) and available for the assembly subtask.
  - Documented findings on inventory-finance integration with file references are produced and available for the assembly subtask.
  - Documented findings on HR, customers, suppliers, fleet, payments integration with file references are produced and available for the assembly subtask.
  - Documented findings on purchases-finance integration with file references are produced and available for the assembly subtask.
  - Documented findings on sales-finance integration with file references are produced and available for the assembly subtask.

### Parallel group 2
- Subtasks: assembly
- Acceptance criteria:
  - Final report file docs/financial-system-integration-audit-2026-07-05.md is written and contains all findings from prior subtasks.

## DAG
- `analyze-financial-api` group=0 deps=none: Analyze financial API and service layer: examine TypeScript files in src/integrations/supabase, src/services, src/hooks for financial data access patterns. Identify all .from() calls on financial tables, filters (.eq, .neq, .in, etc.), selects, inserts, updates, upserts. Document file paths and line numbers.
- `analyze-financial-reports` group=0 deps=none: Analyze financial reports: find files related to report generation (balance sheet, income statement, cash flow, general ledger, trial balance). Check if reports use live data or mock data. Identify any Python scripts for report generation (e.g., analyze_company_jes.py, audit_analysis.py, etc.). Document file paths and line numbers.
- `analyze-financial-schema` group=0 deps=none: Analyze financial database schema: extract all financial tables (chart_of_accounts, journal_entries, journal_entry_lines, payments, invoices, credit_notes, tax_rates, financial_reports, budgets, fixed_assets, etc.) from migration files, types.ts, and any SQL files. Document columns, data types, foreign keys, indexes, constraints, and relationships.
- `analyze-inventory-integration` group=0 deps=none: Analyze integration with Inventory: find files related to stock, inventory valuation, cost of goods sold. Check if inventory costing methods (FIFO, weighted average) are implemented and how inventory movements affect financial accounts. Document file paths and line numbers.
- `analyze-other-integrations` group=0 deps=none: Analyze integration with HR/Payroll, Customers/Suppliers, Fleet, Payments: find files related to payroll, employees, customers, suppliers, vehicles, fuel, maintenance, insurance, depreciation, payment processing, bank reconciliation. Trace how these modules connect to financial records. Document file paths and line numbers.
- `analyze-purchases-integration` group=0 deps=none: Analyze integration with Purchases: find files related to purchase orders, vendor invoices, procurement. Trace how purchases affect accounts payable and expense recognition. Document file paths and line numbers.
- `analyze-sales-integration` group=0 deps=none: Analyze integration with Sales: find files related to invoices, sales orders, POS. Trace how sales transactions affect financial records (journal entries, accounts receivable). Identify any automatic posting or manual processes. Document file paths and line numbers.
- `assembly` group=1 deps=analyze-financial-schema, analyze-financial-api, analyze-sales-integration, analyze-purchases-integration, analyze-inventory-integration, analyze-other-integrations, analyze-financial-reports: Collect all findings from subtasks 1-7, synthesize into a comprehensive report in Arabic. Write the final report to docs/financial-system-integration-audit-2026-07-05.md. Include sections: financial schema, API layer, integration with each module (Sales, Purchases, Inventory, HR, Customers/Suppliers, Fleet, Payments), financial reports, strengths, weaknesses, and recommendations with file paths and line numbers.
