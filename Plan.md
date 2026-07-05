# Plan: راجع النظام المالي في Fleetify ERP وتكامله مع بقية الوحدات وقدم تقريراً شاملاً. لا تغير أي كود — فقط تحليل وتقرير.

المشروع: C:\Users\khamis\Documents\fleetifyapp
React + TypeScript + Vite + Supabase ERP لتأجير السيارات في قطر.

اتبع المنهجية التالية بدقة (12 مرحلة):

## المرحلة 1: اكتشاف السطح المالي
- ابحث عن كل صفحات المالية (src/pages/finance/)
- ابحث عن كل hooks المالية (src/hooks/ *finance*, *journal*, *payment*, *ledger*)
- ابحث عن كل مكونات المالية (src/components/finance/)
- ابحث عن كل hooks التكامل (*JournalIntegration*)
- اقرأ src/integrations/supabase/types.ts لاستخراج كل الجداول المالية

## المرحلة 2: قراءة كل ملفات migrations المالية
- اقرأ كل ملف في supabase/migrations/ متعلق بالمالية
- لكل ملف: استخرج كل CREATE TRIGGER (الجدول، العملية، التوقيت، الشرط، الاستثناء)
- استخرج كل CREATE OR REPLACE FUNCTION
- استخرج كل RPC
- لاحظ أي set_config('app.*') — هذه آليات تجاوز

## المرحلة 3: بناء مصفوفة triggers
أنشئ جدولاً كاملاً:
| # | Trigger Name | Table | Operation | Timing | Condition | Exception | Source File:Line |

## المرحلة 4: قراءة كل hooks التكامل
لكل hook يطابق *JournalIntegration* وأي hook ينشئ قيوداً محاسبية:
- تتبع تسلسل العمليات خطوة بخطوة
- تحقق: هل يمرر total_debit و total_credit؟
- تحقق: هل يوجد فحص توازن (Math.abs(total_debit - total_credit) > 0.01)؟
- تحقق: ما الحسابات المستخدمة (مدين/دائن)؟
- تحقق: هل المنطق المحاسبي صحيح؟
- تحقق: ما حالة القيد عند الإنشاء (draft أم posted)؟
- تحقق: هل يتم إدراج البنود قبل أم بعد ترحيل القيد؟

## المرحلة 5: تقاطع كل عملية hook مع مصفوفة triggers
لكل خطوة في كل hook اسأل:
- "هل ستثير هذه العملية هذا trigger؟"
- "ماذا سيفعل trigger؟ يمرر؟ يمنع؟ يرفع استثناء؟"
- "إذا منع، ماذا سيحدث بعد ذلك؟ هل يوجد معالجة خطأ؟"

السؤال المفتاحي: هل الـ hook ينشئ القيد كـ posted قبل إدراج البنود؟ إذا نعم، فإن trigger منع تعديل بنود القيد المرحل سيمنع إدراج البنود.

## المرحلة 6: تحقق من آلية التجاوز
- اقرأ دالة financial_controls_bypass_enabled()
- ابحث عن كل استدعاءات set_config('app.financial_controls_bypass', ...)
- حدد: هل يمكن للـ hooks في الواجهة تفعيل التجاوز؟

## المرحلة 7: تحقق من التقارير المالية
لكل تقرير (ميزان المراجعة، قائمة الدخل، المركز المالي، التدفقات النقدية):
- هل يجلب بيانات حقيقية من Supabase أم بيانات وهمية؟
- هل يستخدم Math.abs()؟ أين ولماذا؟
- هل المنطق المحاسبي صحيح؟
- هل نوع التقرير مدعوم فعلاً في الـ hook؟

## المرحلة 8: فحص البيانات الوهمية/المثبتة
ابحث عن:
- معرفات حسابات مثبتة يدوياً
- تعليقات // TODO في hooks المالية
- تعليقات // For now أو // mock
- دوال تصدير ترجع رسائل نجاح كاذبة
- حسابات تقديرية (* 0.8, * 0.1)

## المرحلة 9: فحص عرض العملة
- ابحث عن KWD أو د.ك في المكونات المالية
- تحقق: هل يستخدم النظام useCompanyCurrency() أم يثبت العملة؟

## المرحلة 10: تحقق من ترتيب الإدراج مقابل مصفوفة triggers
لكل موقع إنشاء قيد:
- ما الحالة عند INSERT؟
- متى تُدرج البنود؟
- هل هناك خطوة ترحيل؟
صنف كل موقع: ✅ صحيح (draft → بنود → posted) أو ❌ مكسور (posted → بنود)

## المرحلة 11: تحقق من اتساق أرقام القيود
- اجمع كل أنماط إنشاء entry_number
- صنفها (تسلسلي، بادئة، تاريخي، RPC)
- حدد عدم الاتساق

## المرحلة 12: اكتب التقرير
كل نتيجة يجب أن تتضمن:
- مرجع file:line
- اسم الـ trigger/الدالة ورقم السطر من ملف migration
- بيان واضح عن معنى النتيجة وتأثيرها

هيكل التقرير:
1. ملخص تنفيذي
2. مصفوفة triggers كاملة
3. تسلسل عمليات hooks (متحقق منه مقابل triggers)
4. المنطق المحاسبي لكل hook
5. تحليل التقارير المالية
6. الضوابط والامتثال
7. البيانات الوهمية/المثبتة
8. عرض العملة
9. خريطة التكامل (رسم بياني نصي)
10. تقييم المخاطر (حرج/عالي/متوسط مع الأدلة)
11. توصيات (بدون تغيير كود)
12. بيان المنهجية

احفظ التقرير النهائي في: docs/financial-system-integration-audit-$(date +%Y%m%d).md

تنبيهات مهمة:
- لا تثق في تقارير subagents الذاتية — تحقق من كل نتيجة بنفسك
- كل نتيجة يجب أن يكون لها مرجع file:line
- اقرأ ملفات migrations مباشرة — لا تخمن محتواها
- ابني مصفوفة triggers قبل تحليل hooks التطبيق
- ابحث عن hooks التي تنشئ قيوداً محاسبية حتى لو لم تطابق *JournalIntegration* (مثل useConvertToLegalCase)
- تحقق من الدوال الموجودة لكن غير موصولة (مثل canActorApproveFinancialStep)
- ميز بين البنية التحتية للكود وحالة التشغيل — migrations تثبت وجود البنية وليس تنفيذها

## Reasoning
The task is a comprehensive financial system audit with 12 phases. To stay within 8 subtasks, I grouped phases into logical, independently executable analysis tasks: (1) discover financial surface (pages, hooks, components, types), (2) read migrations and build trigger matrix, (3) analyze integration hooks, (4) cross-reference hooks with triggers, (5) check bypass mechanism and financial reports, (6) check mock data, currency, and entry number consistency, and (7) assembly to write the final report. Dependencies are set so that later analysis tasks depend on earlier discovery and migration reading. The assembly depends on all and produces the final deliverable.

## Risk Level
high

## Assumptions
- Dependencies from earlier milestones remain stable.

## Milestones

### Parallel group 1
- Subtasks: discover-financial-surface, read-migrations-and-build-trigger-matrix
- Acceptance criteria:
  - A JSON file (e.g., financial-surface.json) exists containing arrays of tables, pages, hooks, components with file paths.
  - A JSON file (e.g., trigger-matrix.json) containing the trigger matrix and a list of bypass-related functions with file:line references.

### Parallel group 2
- Subtasks: analyze-integration-hooks, check-bypass-and-reports
- Acceptance criteria:
  - A JSON file (e.g., hook-analysis.json) with one object per hook containing the sequence, balance check, accounts, status, and insertion order.
  - A JSON file (e.g., bypass-reports-findings.json) with bypass analysis and report analysis including file:line references.

### Parallel group 3
- Subtasks: check-mock-data-currency-entry-consistency, cross-reference-hooks-with-triggers
- Acceptance criteria:
  - A JSON file (e.g., mock-currency-entry-findings.json) with lists of hardcoded values, mock comments, currency issues, and entry number patterns with file:line references.
  - A JSON file (e.g., cross-reference-findings.json) listing each hook step, the trigger that would fire, and the conflict analysis.

### Parallel group 4
- Subtasks: assembly
- Acceptance criteria:
  - Final deliverable file is written and contains all findings from prior subtasks, with proper structure and file:line references.

## DAG
- `discover-financial-surface` group=0 deps=none: Scan src/pages/finance/, src/hooks/ (finance, journal, payment, ledger), src/components/finance/, and src/integrations/supabase/types.ts. List all financial tables, pages, hooks, components. Output a JSON file with the list.
- `read-migrations-and-build-trigger-matrix` group=0 deps=none: Read all migration files in supabase/migrations/ related to finance. Extract every CREATE TRIGGER, CREATE OR REPLACE FUNCTION, RPC, and set_config('app.*') calls. Build a trigger matrix table (CSV or JSON) with columns: Trigger Name, Table, Operation, Timing, Condition, Exception, Source File:Line. Also note bypass functions.
- `analyze-integration-hooks` group=1 deps=discover-financial-surface: Read all hooks that create accounting entries (JournalIntegration, useConvertToLegalCase, and any other hook that inserts into journal_entries or journal_entry_lines). For each hook, trace the sequence: check if total_debit/total_credit are passed, if balance check exists (Math.abs(total_debit - total_credit) > 0.01), which accounts are used (debit/credit), whether the entry is created as draft or posted, and whether lines are inserted before or after posting. Output a detailed analysis per hook.
- `check-bypass-and-reports` group=1 deps=discover-financial-surface, read-migrations-and-build-trigger-matrix: Read the bypass function (financial_controls_bypass_enabled) and find all set_config('app.financial_controls_bypass', ...) calls. Determine if hooks can enable bypass. Then check financial reports (trial balance, income statement, balance sheet, cash flow) in src/pages/finance/ and src/hooks/ for: whether they fetch real data from Supabase or use mock data, use of Math.abs(), correctness of accounting logic, and whether the report type is actually supported. Output findings.
- `check-mock-data-currency-entry-consistency` group=2 deps=discover-financial-surface, read-migrations-and-build-trigger-matrix, analyze-integration-hooks: Search for hardcoded account IDs, TODO comments in financial hooks, '// For now' or '// mock' comments, functions returning false success messages, estimated accounts (* 0.8, * 0.1). Check currency display: search for KWD or د.ك in financial components, verify if useCompanyCurrency() is used or currency is hardcoded. Collect all entry_number generation patterns (sequential, prefix, date-based, RPC) and identify inconsistencies. Output findings.
- `cross-reference-hooks-with-triggers` group=2 deps=read-migrations-and-build-trigger-matrix, analyze-integration-hooks: For each step in each hook (from subtask 3), determine which triggers (from subtask 2) would fire. For each trigger, describe what it does (pass, block, raise exception). Identify potential conflicts, especially if a hook creates an entry as 'posted' before inserting lines (trigger may block line insertion). Output findings with file:line references.
- `assembly` group=3 deps=discover-financial-surface, read-migrations-and-build-trigger-matrix, analyze-integration-hooks, cross-reference-hooks-with-triggers, check-bypass-and-reports, check-mock-data-currency-entry-consistency: Collect all findings from previous subtasks (financial-surface.json, trigger-matrix.json, hook-analysis.json, cross-reference-findings.json, bypass-reports-findings.json, mock-currency-entry-findings.json). Write the final report in docs/financial-system-integration-audit-$(date +%Y%m%d).md following the required structure: Executive Summary, Trigger Matrix, Hook Sequence Analysis, Accounting Logic, Financial Reports Analysis, Controls & Compliance, Mock Data, Currency Display, Integration Map, Risk Assessment, Recommendations, Methodology. Ensure every finding includes file:line references. Verify that no subtask result is taken at face value without cross-checking (e.g., ensure trigger matrix matches actual migration files).
