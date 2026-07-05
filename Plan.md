# Plan: قم بتدقيق شامل وكامل للنظام المالي في مشروع Fleetify وتكامله مع بقية وحدات النظام. هذا تدقيق جديد من الصفر - لا تعتمد على تقارير سابقة.

المطلوب: تقرير كامل عن تكامل النظام المالي مع بقية الوحدات (الإيجارات، المركبات، الرواتب، الصيانة، المخالفات، القضايا القانونية، المدفوعات). لا تقم بتعديل أي كود - فقط تدقيق وتقرير.

اتبع المنهجية التالية بدقة:

## المرحلة 1: رسم خريطة النظام المالي
1. اقرأ ملف types.ts في `src/integrations/supabase/types.ts` وحدد جميع الجداول المالية (journal_entries, journal_entry_lines, chart_of_accounts, invoices, payments, vendors, purchase_orders, banks, bank_transactions, bank_reconciliation_batches, cost_centers, fixed_assets, budgets, accounting_periods, account_mappings, customer_deposits, annual_financial_close_runs, إلخ)
2. ابحث في `src/pages/finance/` و `src/components/finance/` عن جميع المسارات والمكونات المالية
3. ابحث عن جميع hooks التكاملية التي تربط وحدات أخرى بالنظام المالي - ابحث في `src/hooks/` عن أي ملف ينشئ journal entries أو يتعامل مع جداول مالية

## المرحلة 2: بناء مصفوفة قيود قاعدة البيانات (TRIGGER MATRIX)
1. اقرأ جميع ملفات الترحيل (migrations) في `supabase/migrations/` المتعلقة بالنظام المالي - خاصة الملفات من 20260627*
2. لكل trigger، وثق: اسمه، الجدول المستهدف، العملية (INSERT/UPDATE/DELETE)، التوقيت (BEFORE/AFTER)، الشرط، والاستثناء
3. حدد آلية التجاوز (bypass mechanism) - ابحث عن `financial_controls_bypass` و `set_config`

## المرحلة 3: تدقيق تكامل الوحدات (INTEGRATION HOOK AUDIT)
لكل hook تكاملي، حلل:
1. مسار الملف ورقم السطر
2. الوحدة المصدر (إيجارات، مركبات، رواتب، صيانة، مخالفات، قضايا قانونية)
3. تسلسل العمليات: هل ينشئ header أولاً ثم lines؟ ما هي حالة (status) الـ header عند الإنشاء؟
4. هل يمرر total_debit و total_credit؟
5. هل يتحقق من توازن القيد (debits = credits)؟
6. هل يستخدم نمط الحذف (delete) أم نمط العكس (reversal)؟
7. تقاطع مع مصفوفة triggers: أي trigger سيمنع أي عملية؟
8. الحسابات المستخدمة: هل هي صحيحة محاسبياً؟ (مدين/دائن للحسابات الصحيحة)
9. العملة: هل يستخدم عملة ثابتة أم ديناميكية؟

## المرحلة 4: تدقيق البيانات المالية والتقارير
1. افحص جميع مكونات التقارير المالية في `src/components/finance/` و `src/pages/finance/`
2. تحقق من وجود mock data أو hardcoded values
3. تحقق من صحة المعادلات المحاسبية (Balance Sheet, Income Statement, Cash Flow)
4. تحقق من ربط التقارير بـ General Ledger

## المرحلة 5: تدقيق الضوابط الداخلية
1. افحص آليات الموافقة (approval workflows)
2. افحص مسار التدقيق (audit trail)
3. افحص صلاحيات الوصول (access controls)
4. افحص الفصل بين المهام (Segregation of Duties)

## المرحلة 6: تدقيق شامل للمشكلات
1. ابحث عن `Math.abs()` في الملفات المالية - هل يخفي إشارات محاسبية؟
2. ابحث عن استخدام `JSON.stringify` أو `JSON.parse` غير آمن
3. ابحث عن أخطاء محاسبية شائعة (مدين/دائن معكوس، حسابات خاطئة)
4. ابحث عن أخطاء في التعامل مع متعدد العملات
5. ابحث عن دوال تصدير (export) وهمية

## مخرجات المرحلة النهائية
قدم تقريراً كاملاً بالصيغة التالية:

# تقرير تدقيق تكامل النظام المالي - Fleetify

## ملخص تنفيذي
- تقييم المخاطر العام
- إجمالي النتائج حسب الخطورة
- التوصية النهائية

## النتائج حسب المجال
لكل مجال: الحالة، النتائج مع مراجع file:line، الخطورة، التوصية

## مصفوفة التكامل
جدول يوضح كل hook تكاملي، الوحدة المرتبطة، حالة التكامل، المشكلات، الخطورة

## أولويات المعالجة
مرتبة حسب الخطورة

## ملحق: الاستعلامات المستخدمة

هام جداً:
- كل نتيجة يجب أن تكون مدعومة بمرجع file:line محدد
- لا تعتمد على تقارير سابقة أو ذاكرة - اقرأ الملفات الفعلية
- إذا وجدت تعارضاً مع تقارير سابقة، وثق التعارض
- لا تقم بتعديل أي كود
- استخدم اللغة العربية في التقرير النهائي

## Reasoning
The task is a comprehensive financial system audit requiring analysis of database schema, triggers, integration hooks, reports, internal controls, and code issues. I decomposed it into 7 subtasks: mapping the financial system (Phase 1), building the trigger matrix (Phase 2), auditing integration hooks (Phase 3), auditing financial reports (Phase 4), auditing internal controls (Phase 5), auditing comprehensive issues (Phase 6), and an assembly subtask to compile the final report. Subtasks 1 and 2 are independent and can run in parallel (group 0). Subtasks 3, 4, 5, 6 depend on the map from subtask 1; subtask 3 also depends on the trigger matrix from subtask 2, so they all run in group 1. The assembly subtask depends on all others and runs last (group 2). This maximizes parallelism while respecting dependencies.

## Risk Level
medium

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: build-trigger-matrix, map-financial-system
- Acceptance criteria:
  - A trigger matrix is documented with all required fields and bypass mechanisms identified.
  - A complete list of financial tables, routes, components, and integration hooks with exact file paths is documented.

### Parallel group 2
- Subtasks: audit-comprehensive-issues, audit-financial-reports, audit-integration-hooks, audit-internal-controls
- Acceptance criteria:
  - All instances of the specified code patterns are found and documented with file:line references.
  - All report components are audited; findings include file:line references for mock data, hardcoded values, or equation errors.
  - Each integration hook is analyzed against all 9 criteria with specific file:line evidence.
  - Internal control weaknesses are identified with specific file:line evidence.

### Parallel group 3
- Subtasks: assembly
- Acceptance criteria:
  - Final deliverable file audit_report.md is written and contains all findings from prior subtasks, formatted in Arabic as specified.

## DAG
- `build-trigger-matrix` group=0 deps=none: Read all migration files in supabase/migrations/ related to finance (especially 20260627*). For each trigger, document: name, target table, operation (INSERT/UPDATE/DELETE), timing (BEFORE/AFTER), condition, exception, and bypass mechanism (search for financial_controls_bypass and set_config).
- `map-financial-system` group=0 deps=none: Read types.ts to list all financial tables. Explore src/pages/finance/ and src/components/finance/ to identify all financial routes and components. Search src/hooks/ for any hook that creates journal entries or interacts with financial tables. Produce a structured inventory with file paths.
- `audit-comprehensive-issues` group=1 deps=map-financial-system: Search all financial-related files for: Math.abs() usage that may hide accounting signs, unsafe JSON.stringify/parse, common accounting errors (reversed debits/credits, wrong accounts), multi-currency handling issues, and fake export functions. Document findings with file:line.
- `audit-financial-reports` group=1 deps=map-financial-system: Examine all financial report components in src/components/finance/ and src/pages/finance/. Check for mock data, hardcoded values, correctness of accounting equations (Balance Sheet, Income Statement, Cash Flow), and linkage to General Ledger. Document findings with file:line.
- `audit-integration-hooks` group=1 deps=map-financial-system, build-trigger-matrix: For each integration hook identified in map-financial-system, analyze: source module, operation sequence (header first? status?), total_debit/credit passing, balance check, delete vs reversal pattern, intersection with trigger matrix, account correctness (debit/credit), and currency handling. Provide file:line references.
- `audit-internal-controls` group=1 deps=map-financial-system: Examine approval workflows, audit trail mechanisms, access controls, and segregation of duties in the financial module. Search relevant components, hooks, and pages. Document findings with file:line.
- `assembly` group=2 deps=map-financial-system, build-trigger-matrix, audit-integration-hooks, audit-financial-reports, audit-internal-controls, audit-comprehensive-issues: Collect all findings from the six analysis subtasks. Produce the final audit report in Arabic following the specified format: Executive Summary, Findings by Domain, Integration Matrix, Treatment Priorities, and Appendix with queries used. Ensure every finding has a file:line reference. Write the report to audit_report.md.
